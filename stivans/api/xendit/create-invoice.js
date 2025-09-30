// /api/xendit/create-invoice.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // allow either
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('[create-invoice] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- 0) Auth: get user from Bearer token (optional but recommended) ---
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let userId = null;

    if (token) {
      const { data: uData, error: uErr } = await supabase.auth.getUser(token);
      if (uErr || !uData?.user?.id) {
        return res.status(401).json({ error: 'Invalid session token' });
      }
      userId = uData.user.id;
    } else {
      return res.status(401).json({ error: 'No auth token' });
    }

    // --- 1) Parse payload from Checkout ---
    const {
      items = [],                 // [{ product_id, name, price, quantity, image_url }]
      subtotal = 0,
      tax = 0,
      shipping = 0,
      total,                      // we will NOT insert total_price; DB computes that; this 'total' is only for Xendit amount consistency check
      payment_method = null,
      cadaver = {},               // cadaver details with urls already uploaded client-side
    } = req.body || {};

    // Normalize numbers
    const normSubtotal = Number(subtotal) || 0;
    const normTax      = Number(tax) || 0;
    const normShip     = Number(shipping) || 0;
    const amountToCharge = Math.round((normSubtotal + normTax + normShip) * 100) / 100;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items to order' });
    }

    // Validate required cadaver fields (death certificate URL MUST be present)
    if (!cadaver?.death_certificate_url) {
      return res.status(400).json({ error: 'Death certificate is required' });
    }

    // --- 2) Create order (DO NOT set total_price – it’s generated in your DB) ---
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        subtotal: normSubtotal,
        tax: normTax,
        shipping: normShip,
        // do not set total_price here; let DB computed column handle it
        xendit_payment_method: payment_method,
      })
      .select()
      .single();

    if (oErr || !order) {
      console.error('[create-invoice] order insert error:', oErr);
      return res.status(400).json({ error: 'Failed to create order', details: oErr?.message || oErr });
    }

    // --- 3) Insert order items (includes image_url column) ---
    const itemRows = items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id ?? it.id ?? null,
      name: it.name ?? '',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      image_url: it.image_url || null,
    }));

    const { error: oiErr } = await supabase.from('order_items').insert(itemRows);
    if (oiErr) {
      console.error('[create-invoice] order_items insert error:', oiErr);
      return res.status(400).json({ error: 'Failed to add order items', details: oiErr.message || oiErr });
    }

    // --- 4) Insert cadaver details (requires order_id + URLs already uploaded) ---
    const cadaverRow = {
      order_id: order.id,

      full_name: cadaver.full_name,
      dob: cadaver.dob || null,
      age: cadaver.age ?? null,
      sex: cadaver.sex,
      civil_status: cadaver.civil_status,
      religion: cadaver.religion,

      death_datetime: cadaver.death_datetime,
      place_of_death: cadaver.place_of_death,
      cause_of_death: cadaver.cause_of_death || null,

      kin_name: cadaver.kin_name,
      kin_relation: cadaver.kin_relation,
      kin_mobile: cadaver.kin_mobile,
      kin_email: cadaver.kin_email,
      kin_address: cadaver.kin_address,

      remains_location: cadaver.remains_location,
      pickup_datetime: cadaver.pickup_datetime,
      special_instructions: cadaver.special_instructions || null,

      death_certificate_url: cadaver.death_certificate_url,
      claimant_id_url: cadaver.claimant_id_url || null,
      permit_url: cadaver.permit_url || null,

      occupation: cadaver.occupation || null,
      nationality: cadaver.nationality || null,
      residence: cadaver.residence || null,
    };

    const { error: cvErr } = await supabase
      .from('cadaver_details')
      .insert(cadaverRow);
    if (cvErr) {
      console.error('[create-invoice] cadaver_details insert error:', cvErr);
      return res.status(400).json({ error: 'Failed to save cadaver details', details: cvErr.message || cvErr });
    }

    // --- 5) Create Xendit invoice ---
    const XENDIT_KEY = process.env.XENDIT_SECRET_KEY;
    if (!XENDIT_KEY) {
      return res.status(500).json({ error: 'Missing XENDIT_SECRET_KEY' });
    }

    const SITE_URL = process.env.SITE_URL; // e.g. https://stivans.vercel.app
    const invoicePayload = {
      external_id: `order_${order.id}`,
      amount: amountToCharge,
      description: 'St. Ivans Order',
      currency: 'PHP',
      success_redirect_url: SITE_URL ? `${SITE_URL}/checkout?paid=1` : undefined,
      failure_redirect_url: SITE_URL ? `${SITE_URL}/checkout?paid=0` : undefined,
      // payer_email: optional – you can add from user metadata if you want
    };

    const resp = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${XENDIT_KEY}:`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    const inv = await resp.json();
    if (!resp.ok) {
      console.error('[create-invoice] Xendit error:', inv);
      return res.status(400).json({ error: 'Xendit error', details: inv });
    }

    // --- 6) Update order with invoice id/url (still pending until webhook marks paid) ---
    const { error: upErr } = await supabase
      .from('orders')
      .update({
        xendit_invoice_id: inv.id || null,
        xendit_invoice_url: inv.invoice_url || null,
      })
      .eq('id', order.id);

    if (upErr) {
      console.warn('[create-invoice] could not store invoice refs:', upErr);
      // not fatal for the flow
    }

    // --- 7) Return invoice URL to redirect the user ---
    return res.status(200).json({
      order_id: order.id,
      invoice_id: inv.id,
      invoice_url: inv.invoice_url,
      status: inv.status,
    });
  } catch (e) {
    console.error('[create-invoice] server error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
