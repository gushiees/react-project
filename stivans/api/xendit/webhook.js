// /api/xendit/webhook.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Let us read the raw body
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

    // Xendit sends event names like: invoice.paid / INVOICE_PAID etc.
    const event = payload?.event;
    const invoice = payload?.data || {};
    const invoiceId = invoice.id;
    const externalId = invoice.external_id;   // e.g. "order_<uuid>"
    const amount = invoice.amount;

    let orderId = null;
    if (externalId && externalId.startsWith('order_')) {
      orderId = externalId.replace('order_', '');
    }

    // Record the webhook call in payments table
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
        await supabase
          .from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', orderId);
      } else if (
        event === 'invoice.expired' ||
        event === 'INVOICE_EXPIRED' ||
        event === 'invoice.failed' ||
        event === 'INVOICE_FAILED'
      ) {
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderId);
      }
    }

    // Always 200 so Xendit stops retrying
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[webhook] error', e);
    return res.status(200).json({ ok: true });
  }
}
