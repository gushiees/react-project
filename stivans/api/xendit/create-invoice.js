// pages/api/xendit/create-invoice.js
// Ready-to-paste Next.js API route

import { createClient } from "@supabase/supabase-js";

// Use the built-in fetch on Node 18+ (Vercel default)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    // 1) Verify Supabase JWT from client
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No auth token" });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const user = userData.user;

    // 2) Validate payload from checkout
    const {
      items,
      subtotal,
      tax,
      shipping,
      total,
      purchase_type,
      order_tag,
      cadaver_details_id, // already inserted by frontend before calling this
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items" });
    }
    if (typeof total !== "number" || total <= 0) {
      return res.status(400).json({ error: "Invalid totals" });
    }

    // 3) Create provisional order
    const external_id = `INV_${Date.now()}_${user.id.slice(0, 8)}`;
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        order_tag: order_tag || null,
        cadaver_details_id: cadaver_details_id || null,
        subtotal,
        tax,
        shipping,
        total,
        external_id,
      })
      .select("id")
      .single();

    if (orderErr) {
      return res.status(500).json({
        error: "Failed to create provisional order",
        detail: orderErr.message,
      });
    }

    // 4) Build redirect URLs (avoid 404 by using absolute FRONTEND_URL)
    const FRONTEND_URL = process.env.FRONTEND_URL; // e.g. https://yourdomain.com
    if (!FRONTEND_URL) {
      return res.status(500).json({ error: "FRONTEND_URL not configured" });
    }
    const successUrl = `${FRONTEND_URL}/checkout?paid=1&ref=${encodeURIComponent(
      external_id
    )}`;
    const failureUrl = `${FRONTEND_URL}/checkout?paid=0&ref=${encodeURIComponent(
      external_id
    )}`;

    // 5) Create Xendit invoice
    const xiRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({
        external_id,
        amount: Math.round(Number(total) * 100) / 100,
        currency: "PHP",
        description: "Memorial service order",
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        metadata: {
          user_id: user.id,
          order_tag: order_tag || null,
          cadaver_details_id: cadaver_details_id || null,
        },
      }),
    });

    const xiJson = await xiRes.json();
    if (!xiRes.ok) {
      return res.status(xiRes.status).json({
        error: "Xendit error",
        detail: xiJson,
      });
    }

    // 6) Persist invoice data on order
    await supabaseAdmin
      .from("orders")
      .update({
        xendit_invoice_id: xiJson.id,
        xendit_invoice_url: xiJson.invoice_url,
      })
      .eq("id", orderRow.id);

    // 7) Return hosted invoice URL to client
    return res.status(200).json({ invoice_url: xiJson.invoice_url });
  } catch (e) {
    console.error("create-invoice error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
