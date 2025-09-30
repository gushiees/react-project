// /api/xendit/create-invoice.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // --- ENV ---
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY; // same as your frontend anon key
    const XENDIT_KEY = process.env.XENDIT_SECRET_KEY;             // Test or Live secret key
    const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Missing Supabase env (URL/ANON KEY)' });
    }
    if (!XENDIT_KEY) {
      return res.status(500).json({ error: 'Missing XENDIT_SECRET_KEY' });
    }

    // --- AUTH (use the user's session from the header) ---
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    }

    // Create a Supabase client that runs under the user's identity (RLS-friendly)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Optionally fetch user (for payer email)
    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userResp?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const user = userResp.user;

    // --- PAYLOAD ---
    // Expecting:
    // {
    //   items: [{ product_id, name, price, quantity, image_url }],
    //   subtotal, tax, shipping, total,
    //   payment_method,
    //   cadaver: {... with death_certificate_url etc ...}
    // }
    const body = req.body || {};
    const { items = [], subtotal, tax, shipping, total, payment_method, cadaver } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }
    if (typeof total !== 'number' || Number.isNaN(total)) {
      return res.status(400).json({ error: 'Invalid total' });
    }
    if (!cadaver?.death_certificate_url) {
      return res.status(400).json({ error: 'Missing death_certificate_url in cadaver' });
    }

    // --- 1) Create order (RLS policy allows auth.uid() == user_id) ---
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        subtotal,
        tax,
        shipping,
        total,
        xendit_payment_method: payment_method || null
      })
      .select()
      .single();

    if (orderErr) {
      console.error('create order error', orderErr);
      return res.status(400).json({ error: 'Failed to create order', details: orderErr.message });
    }

    // --- 2) Insert order items ---
    const rows = items.map(i => ({
      order_id: order.id,
      product_id: i.product_id ?? null,
      name: String(i.name || ''),
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 1),
      image_url: i.image_url || null,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(rows);
    if (itemsErr) {
      console.error('insert items error', itemsErr);
      return res.status(400).json({ error: 'Failed to add order items', details: itemsErr.message });
    }

    // --- 3) Insert cadaver details ---
    const cadaverPayload = {
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
      death_certificate_url: cadaver.death_certificate_url, // required
      claimant_id_url: cadaver.claimant_id_url || null,
      permit_url: cadaver.permit_url || null,
      occupation: cadaver.occupation || null,
      nationality: cadaver.nationality || null,
      residence: cadaver.residence || null,
    };

    const { error: cadErr } = await supabase.from('cadaver_details').insert(cadaverPayload);
    if (cadErr) {
      console.error('insert cadaver error', cadErr);
      return res.status(400).json({ error: 'Failed to save cadaver details', details: cadErr.message });
    }

    // --- 4) Create Xendit invoice ---
    const resp = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${XENDIT_KEY}:`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: `order_${order.id}`,
        amount: Number(total),
        payer_email: user.email || undefined,
        description: 'St. Ivans Order',
        currency: 'PHP',
        success_redirect_url: `${SITE_URL}/checkout?paid=1`,
        failure_redirect_url: `${SITE_URL}/checkout?paid=0`,
      }),
    });

    const invoice = await resp.json();
    if (!resp.ok) {
      console.error('Xendit create invoice error', invoice);
      return res.status(400).json({ error: 'Xendit error', details: invoice });
    }

    // --- 5) Save invoice refs back to order (optional) ---
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        xendit_invoice_id: invoice.id,
        xendit_invoice_url: invoice.invoice_url
      })
      .eq('id', order.id);
    if (updErr) console.error('update order invoice refs error', updErr);

    // --- 6) Return invoice URL ---
    return res.status(200).json({
      order_id: order.id,
      invoice_id: invoice.id,
      invoice_url: invoice.invoice_url,
      status: invoice.status,
    });
  } catch (e) {
    console.error('create-invoice handler error', e);
    return res.status(500).json({ error: 'FUNCTION_INVOCATION_FAILED' });
  }
}
