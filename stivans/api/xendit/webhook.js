export const config = { runtime: "nodejs" };

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN || ""; // optional verification header
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // (optional) verify header 'x-callback-token'
    if (XENDIT_CALLBACK_TOKEN) {
      const token = req.headers["x-callback-token"];
      if (token !== XENDIT_CALLBACK_TOKEN) return res.status(401).end();
    }

    const event = req.body || {};
    // Typical: event.status === 'PAID' and event.id = invoice_id, event.external_id = 'order_<id>'
    const invoiceId = event.id;
    const status = (event.status || "").toLowerCase();
    const ext = String(event.external_id || "");
    const orderId = ext.startsWith("order_") ? ext.slice(6) : null;

    if (!orderId || !invoiceId) return res.status(200).json({ ok: true });

    if (status === "paid") {
      await sb.from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .eq("xendit_invoice_id", invoiceId);

      // if there was a chapel hold → mark paid
      await sb.from("chapel_bookings")
        .update({ status: "paid" })
        .eq("order_id", orderId)
        .neq("status", "cancelled");
    } else if (status === "expired" || status === "voided") {
      await sb.from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("xendit_invoice_id", invoiceId);

      await sb.from("chapel_bookings")
        .update({ status: "cancelled" })
        .eq("order_id", orderId);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true }); // avoid retries storm
  }
}
