import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Auth: require admin or a signed-in user
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No auth token' });

    const { data: uData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !uData?.user) return res.status(401).json({ error: 'Invalid session token' });
    const userId = uData.user.id;

    const {
      items = [],       // [{ product_id, name, price, quantity, image_url }]
      subtotal = 0,
      tax = 0,
      shipping = 0,
      payment_method = null,
      cadaver = {}
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items to order' });
    }
    if (!cadaver?.death_certificate_url) {
      return res.status(400).json({ error: 'Death certificate is required' });
    }

    const normSubtotal = Number(subtotal) || 0;
    const normTax = Number(tax) || 0;
    const normShip = Number(shipping) || 0;
    const amountToCharge = Math.round((normSubtotal + normTax + normShip) * 100) / 100;

    // 1) Create order (do NOT touch generated columns)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        subtotal: normSubtotal,
        tax: normTax,
        shipping: normShip,
        xendit_payment_method: payment_method
      })
      .select()
      .single();

    if (oErr) {
      console.error('[create-invoice] order insert error:', oErr);
      return res.status(400).json({ error: 'Failed to create order', details: oErr.message || oErr });
    }

    // 2) Items
    const rows = items.map(it => ({
      order_id: order.id,
      product_id: it.product_id ?? it.id ?? null,
      name: it.name ?? '',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      image_url: it.image_url || null
    }));

    const { error: oiErr } = await supabase.from('order_items').insert(rows);
    if (oiErr) {
      console.error('[create-invoice] order_items insert error:', oiErr);
      return res.status(400).json({ error: 'Failed to add order items', details: oiErr.message || oiErr });
    }

    // 3) Cadaver
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
      residence: cadaver.residence || null
    };

    const { error: cvErr } = await supabase.from('cadaver_details').insert(cadaverRow);
    if (cvErr) {
      console.error('[create-invoice] cadaver insert error:', cvErr);
      return res.status(400).json({ error: 'Failed to save cadaver details', details: cvErr.message || cvErr });
    }

    // 4) Xendit invoice
    const XENDIT_KEY = process.env.XENDIT_SECRET_KEY;
    if (!XENDIT_KEY) return res.status(500).json({ error: 'Missing XENDIT_SECRET_KEY' });

    const SITE_URL = process.env.SITE_URL;
    const payload = {
      external_id: `order_${order.id}`,
      amount: amountToCharge,
      description: 'St. Ivans Order',
      currency: 'PHP',
      success_redirect_url: SITE_URL ? `${SITE_URL}/checkout?paid=1` : undefined,
      failure_redirect_url: SITE_URL ? `${SITE_URL}/checkout?paid=0` : undefined
    };

    const resp = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${XENDIT_KEY}:`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const inv = await resp.json();
    if (!resp.ok) {
      console.error('[create-invoice] Xendit error:', inv);
      return res.status(400).json({ error: 'Xendit error', details: inv });
    }

    await supabase.from('orders')
      .update({ xendit_invoice_id: inv.id || null, xendit_invoice_url: inv.invoice_url || null })
      .eq('id', order.id);

    return res.status(200).json({
      order_id: order.id,
      invoice_id: inv.id,
      invoice_url: inv.invoice_url,
      status: inv.status
    });
  } catch (e) {
    console.error('[create-invoice] server error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
