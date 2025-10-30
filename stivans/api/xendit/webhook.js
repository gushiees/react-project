// pages/api/xendit/webhook.js
// Ready-to-paste Next.js API route for Xendit invoice callbacks

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Next.js parses JSON automatically; Xendit sends `application/json`.
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    // 1) Verify callback token
    const token = req.headers["x-callback-token"];
    if (token !== process.env.XENDIT_CALLBACK_TOKEN) {
      return res.status(401).json({ error: "Bad callback token" });
    }

    const event = req.body;
    if (!event?.data?.id || !event?.data?.external_id) {
      return res.status(400).json({ error: "Bad payload" });
    }

    const { id: invoice_id, external_id, status } = event.data;

    // 2) Find provisional order by external_id
    const { data: order, error: findErr } = await supabaseAdmin
      .from("orders")
      .select("id, status, cadaver_details_id")
      .eq("external_id", external_id)
      .single();

    if (findErr || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 3) Update order based on status
    if (status === "PAID") {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          xendit_invoice_id: invoice_id,
        })
        .eq("id", order.id);

      // Optional: link cadaver_details to the order (if present)
      if (order.cadaver_details_id) {
        await supabaseAdmin
          .from("cadaver_details")
          .update({ order_id: order.id })
          .eq("id", order.cadaver_details_id);
      }
    } else if (status === "EXPIRED") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "expired" })
        .eq("id", order.id);
    } else if (status === "FAILED") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("webhook error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
