// /api/xendit/create-invoice.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // allow either
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('[create-invoice] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Service key bypasses RLS (intended for server-only code)
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
    const userId = uData.user.id;

    // --- 1) Parse payload from Checkout ---
    const {
      items = [],                 // [{ product_id, name, price, quantity, image_url }]
      subtotal = 0,
      tax = 0,
      shipping = 0,
      total,                      // client-side computed; we recompute on server
      payment_method = null,
      cadaver = {},               // includes already-uploaded doc URLs
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items to order' });
    }

    // Require death certificate
    if (!cadaver?.death_certificate_url) {
      return res.status(400).json({ error: 'Death certificate is required' });
    }

    // Normalize numbers and recompute amount for Xendit
    const normSubtotal = Number(subtotal) || 0;
    const normTax      = Number(tax) || 0;
    const normShip     = Number(shipping) || 0;
    const amountToCharge = Math.round((normSubtotal + normTax + normShip) * 100) / 100;

    // --- 2) Create order (do NOT set total_price; your DB handles it) ---
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        subtotal: normSubtotal,
        tax: normTax,
        shipping: normShip,
        xendit_payment_method: payment_method,
      })
      .select()
      .single();

    if (oErr || !order) {
      console.error('[create-invoice] order insert error:', oErr);
      return res.status(400).json({ error: 'Failed to create order', details: oErr?.message || oErr });
    }

    // --- 3) Insert order items (include REQUIRED unit_price & total_price) ---
    const itemRows = items.map((it) => {
      const unit = Number(it.price) || 0;
      const qty  = Math.max(1, Number(it.quantity) || 1);

      return {
        order_id: order.id,
        product_id: it.product_id ?? it.id ?? null,
        name: it.name ?? '',
        image_url: it.image_url || null,

        // Your schema requires these NOT NULL:
        unit_price: unit,
        total_price: unit * qty,

        // Keep existing columns too (your table has them)
        price: unit,
        quantity: qty,
      };
    });

    const { error: oiErr } = await supabase.from('order_items').insert(itemRows);
    if (oiErr) {
      console.error('[create-invoice] order_items insert error:', oiErr);
      return res.status(400).json({ error: 'Failed to add order items', details: oiErr.message || oiErr });
    }

    // --- 4) Insert cadaver details ---
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

    const { error: cvErr } = await supabase.from('cadaver_details').insert(cadaverRow);
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
      return res.status(400).json({ error: 'Xendit error', details: inv });
    }

    // --- 6) Store invoice id/url on the order ---
    const { error: upErr } = await supabase
      .from('orders')
      .update({
        xendit_invoice_id: inv.id || null,
        xendit_invoice_url: inv.invoice_url || null,
      })
      .eq('id', order.id);
    if (upErr) console.warn('[create-invoice] could not store invoice refs:', upErr);

    // --- 7) Done: return hosted invoice URL ---
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
