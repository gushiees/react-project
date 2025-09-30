// /api/xendit/webhook.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// NOTE: add SUPABASE_SERVICE_ROLE_KEY in Vercel (Server-side only).
export const config = { api: { bodyParser: false } };

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const raw = await readBody(req);
    const payload = JSON.parse(raw || '{}');

    // Common invoice events: INVOICE_PAID, INVOICE_EXPIRED, INVOICE_FAILED
    const event = payload.event;
    const invoice = payload.data || {};
    const invoiceId = invoice.id;
    const externalId = invoice.external_id; // e.g., "order_<uuid>"
    const amount = invoice.amount;

    let orderId = null;
    if (externalId && externalId.startsWith('order_')) {
      orderId = externalId.replace('order_', '');
    }

    // Record payment row
    await supabase.from('payments').insert({
      order_id: orderId || null,
      provider: 'xendit',
      provider_event: event,
      provider_reference: invoiceId,
      amount,
      currency: 'PHP',
      raw_payload: payload,
    });

    if (orderId) {
      if (event === 'invoice.paid' || event === 'INVOICE_PAID') {
        await supabase.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', orderId);
      } else if (event === 'invoice.expired' || event === 'INVOICE_EXPIRED') {
        await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
      } else if (event === 'invoice.failed' || event === 'INVOICE_FAILED') {
        await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook error', e);
    return res.status(200).json({ ok: true }); // respond 200 so Xendit stops retrying; log for investigation
  }
}
