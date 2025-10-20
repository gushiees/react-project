// /api/xendit/create-invoice.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // allow either
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('[create-invoice] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Service key client for backend operations
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- 0) Auth: get user from Bearer token ---
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No auth token' });
    }

    const { data: uData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !uData?.user?.id) {
      return res.status(401).json({ error: 'Invalid session token' });
    }
    const userId = uData.user.id; // <-- userId obtained

    // ***** UPDATE last_active_at *****
    const { error: updateActiveErr } = await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateActiveErr) {
        // Log error but continue
        console.warn(`[/api/xendit/create-invoice] Failed to update last_active_at for user ${userId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- 1) Parse payload ---
    const {
      items = [], subtotal = 0, tax = 0, shipping = 0,
      payment_method = null, cadaver = {}, purchase_type, // Added purchase_type
      chapel_booking = null, cold_storage_booking = null // Added bookings
    } = req.body || {}; //

    if (!Array.isArray(items) || items.length === 0) { //
      return res.status(400).json({ error: 'No items to order' });
    }

    // Example validation - adapt as needed
    if (purchase_type === 'someone' && !cadaver?.full_name) { //
       // Check for essential cadaver details if it's an at-need purchase
       // The check for death_certificate_url might happen later or be assumed
       // based on your frontend logic. Add more checks if necessary.
      // return res.status(400).json({ error: 'Cadaver details required for at-need purchase.' });
      console.warn('Potential issue: At-need purchase initiated without full cadaver details in payload.'); // Log for monitoring
    }


    // Recompute amount on server
    const normSubtotal = Number(subtotal) || 0;
    const normTax      = Number(tax) || 0;
    const normShip     = Number(shipping) || 0;
    const amountToCharge = Math.round((normSubtotal + normTax + normShip) * 100) / 100; //

    // --- 2) Create order ---
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        subtotal: normSubtotal,
        tax: normTax,
        shipping: normShip,
        total: amountToCharge, // Store the server-calculated total
        purchase_type: purchase_type, // Store purchase type
        // Note: xendit_payment_method might be premature here, update after successful payment?
        // xendit_payment_method: payment_method, //
      })
      .select()
      .single();

    if (oErr || !order) {
      console.error('[create-invoice] order insert error:', oErr);
      return res.status(400).json({ error: 'Failed to create order', details: oErr?.message });
    }

    // --- 3) Insert order items ---
    const itemRows = items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id ?? null, // Handle null product_id for add-ons
        name: it.name ?? 'Unnamed Item',
        image_url: it.image_url || null,
        unit_price: Number(it.price) || 0, // Ensure unit_price is set
        quantity: Math.max(1, Number(it.quantity) || 1),
        // Calculate total_price per item on the server
        total_price: (Number(it.price) || 0) * Math.max(1, Number(it.quantity) || 1)
    }));


    const { error: oiErr } = await supabase.from('order_items').insert(itemRows);
    if (oiErr) {
      console.error('[create-invoice] order_items insert error:', oiErr);
      // Consider rolling back the order insert or marking it as failed
      await supabase.from('orders').update({ status: 'failed', failure_reason: 'Item insert failed' }).eq('id', order.id);
      return res.status(400).json({ error: 'Failed to add order items', details: oiErr.message });
    }

    // --- 4) Insert cadaver details (only if purchase_type is 'someone') ---
    if (purchase_type === 'someone' && cadaver?.full_name) { // Ensure details exist
        const cadaverRow = {
          order_id: order.id,
          full_name: cadaver.full_name,
          dob: cadaver.dob || null, age: cadaver.age ?? null, sex: cadaver.sex,
          civil_status: cadaver.civil_status, religion: cadaver.religion,
          death_datetime: cadaver.death_datetime, place_of_death: cadaver.place_of_death,
          cause_of_death: cadaver.cause_of_death || null, kin_name: cadaver.kin_name,
          kin_relation: cadaver.kin_relation, kin_mobile: cadaver.kin_mobile,
          kin_email: cadaver.kin_email, kin_address: cadaver.kin_address,
          remains_location: cadaver.remains_location, pickup_datetime: cadaver.pickup_datetime,
          special_instructions: cadaver.special_instructions || null,
          death_certificate_url: cadaver.death_certificate_url, // URL should be passed from frontend
          claimant_id_url: cadaver.claimant_id_url || null, // URL passed from frontend
          permit_url: cadaver.permit_url || null, // URL passed from frontend
          occupation: cadaver.occupation || null, nationality: cadaver.nationality || null,
          residence: cadaver.residence || null,
        };
        const { error: cvErr } = await supabase.from('cadaver_details').insert(cadaverRow);
        if (cvErr) {
          console.error('[create-invoice] cadaver_details insert error:', cvErr);
          await supabase.from('orders').update({ status: 'failed', failure_reason: 'Cadaver insert failed' }).eq('id', order.id);
          return res.status(400).json({ error: 'Failed to save cadaver details', details: cvErr.message });
        }
    } else if (purchase_type === 'someone' && !cadaver?.full_name) {
         console.warn(`[create-invoice] At-need purchase for order ${order.id} missing full_name in cadaver payload.`);
         // Decide if you want to fail the order here or allow it to proceed pending details
         // await supabase.from('orders').update({ status: 'pending_details' }).eq('id', order.id);
         // return res.status(400).json({ error: 'Missing required cadaver details for at-need order.' });
    }


    // --- 4.5) Insert Chapel/Cold Storage Bookings (if provided) ---
    if (chapel_booking && chapel_booking.chapel_id) { //
        const { error: chapelErr } = await supabase.from('chapel_bookings').insert({
            order_id: order.id,
            user_id: userId,
            chapel_id: chapel_booking.chapel_id,
            start_date: chapel_booking.start_date,
            end_date: chapel_booking.end_date,
            days: chapel_booking.days,
            amount: chapel_booking.chapel_amount, //
            status: 'pending_payment' // Or 'confirmed' if payment handles it later
        });
         if (chapelErr) {
            console.error('[create-invoice] chapel_booking insert error:', chapelErr);
            // Consider rollback or marking order as failed
            await supabase.from('orders').update({ status: 'failed', failure_reason: 'Chapel booking failed' }).eq('id', order.id);
            return res.status(400).json({ error: 'Failed to save chapel booking', details: chapelErr.message });
        }
    }
     if (cold_storage_booking && cold_storage_booking.start_date) { //
        const { error: coldErr } = await supabase.from('cold_storage_bookings').insert({ // Assuming table name
            order_id: order.id,
            user_id: userId,
            start_date: cold_storage_booking.start_date,
            end_date: cold_storage_booking.end_date,
            days: cold_storage_booking.days,
            amount: cold_storage_booking.amount, //
            status: 'pending_payment'
        });
         if (coldErr) {
            console.error('[create-invoice] cold_storage_booking insert error:', coldErr);
            await supabase.from('orders').update({ status: 'failed', failure_reason: 'Cold storage booking failed' }).eq('id', order.id);
            return res.status(400).json({ error: 'Failed to save cold storage booking', details: coldErr.message });
        }
    }


    // --- 5) Create Xendit invoice ---
    const XENDIT_KEY = process.env.XENDIT_SECRET_KEY;
    if (!XENDIT_KEY) { return res.status(500).json({ error: 'Missing XENDIT_SECRET_KEY' }); }

    const SITE_URL = process.env.SITE_URL || req.headers.origin; // Use origin as fallback
    const invoicePayload = {
      external_id: `order_${order.id}`,
      amount: amountToCharge, // Use server-calculated amount
      description: `St. Ivans Order #${order.id.slice(0, 8)}`, // More specific description
      payer_email: uData.user.email, // Pre-fill email
      currency: 'PHP',
      // success_redirect_url: SITE_URL ? `${SITE_URL}/checkout/success?order=${order.id}` : undefined, // Example success URL
      // failure_redirect_url: SITE_URL ? `${SITE_URL}/checkout/failure?order=${order.id}` : undefined, // Example failure URL
       success_redirect_url: SITE_URL ? `${SITE_URL}/profile?order_status=success&order_id=${order.id}` : undefined, // Redirect to profile
       failure_redirect_url: SITE_URL ? `${SITE_URL}/profile?order_status=failed&order_id=${order.id}` : undefined, // Redirect to profile
       // customer: { // Optional: Add customer details if available and desired
       //     given_names: profile?.full_name || '', // Fetch profile if needed
       //     email: uData.user.email,
       //     mobile_number: profile?.phone_number || ''
       // },
       // items: items.map(it => ({ // Optional: Add line items to Xendit invoice
       //     name: it.name,
       //     quantity: it.quantity,
       //     price: it.price,
       //     // category: it.category || 'Funeral Services',
       //     // url: SITE_URL ? `${SITE_URL}/catalog/${it.product_id}` : undefined
       // })),
       fees: [ // Explicitly show tax and shipping as fees if desired
           { type: 'TAX', value: normTax },
           { type: 'SHIPPING', value: normShip }
       ].filter(fee => fee.value > 0) // Only include fees > 0
    };

    const resp = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${XENDIT_KEY}:`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    const inv = await resp.json();
    if (!resp.ok) {
      console.error('[create-invoice] Xendit error:', inv);
      await supabase.from('orders').update({ status: 'failed', failure_reason: 'Xendit invoice creation failed' }).eq('id', order.id);
      return res.status(400).json({ error: 'Xendit invoice creation error', details: inv });
    }

    // --- 6) Store invoice id/url on the order ---
    const { error: upErr } = await supabase
      .from('orders')
      .update({
        xendit_invoice_id: inv.id || null,
        xendit_invoice_url: inv.invoice_url || null,
      })
      .eq('id', order.id);
    if (upErr) console.warn('[create-invoice] could not store invoice refs:', upErr.message);

    // --- 7) Done: return hosted invoice URL ---
    return res.status(200).json({
      order_id: order.id,
      invoice_id: inv.id,
      invoice_url: inv.invoice_url, // URL to redirect user to
      status: inv.status,
    });

  } catch (e) {
    console.error('[create-invoice] server error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
}