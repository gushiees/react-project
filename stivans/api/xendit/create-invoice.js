// Vercel Node 20 function
export const config = { runtime: "nodejs" };

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const XENDIT_API_KEY = process.env.XENDIT_API_KEY;
// Your deployed site root, e.g. https://stivans.vercel.app
const APP_URL = process.env.APP_URL || "https://stivans.vercel.app";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = auth.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const payload = req.body || {};
    const {
      items = [],
      subtotal = 0,
      tax = 0,
      shipping = 0,
      total = 0,
      cadaver = null,
      chapel_booking = null,
      purchase_type = "self",
    } = payload;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items to invoice" });
    }

    // 1) Create order (pending)
    const { data: orderRow, error: orderErr } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal,
        tax,
        shipping,
        total,
        purchase_type,
      })
      .select("*")
      .single();

    if (orderErr) {
      console.error(orderErr);
      return res.status(400).json({ error: "Failed to create order" });
    }

    const orderId = orderRow.id;

    // 2) Insert order items
    const orderItemsPayload = items.map((it) => ({
      order_id: orderId,
      product_id: it.product_id,          // may be null for add-ons
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.price) || 0,
      price: Number(it.price) || 0,
      image_url: it.image_url || null,
    }));

    const { error: itemsErr } = await sb.from("order_items").insert(orderItemsPayload);
    if (itemsErr) {
      console.error(itemsErr);
      return res.status(400).json({ error: "Failed to add order items" });
    }

    // 3) If chapel booking intent → create a pending hold
    let chapelHoldId = null;
    if (chapel_booking?.chapel_id && chapel_booking.start_date && chapel_booking.end_date) {
      const { data: hold, error: holdErr } = await sb
        .from("chapel_bookings")
        .insert({
          user_id: user.id,
          chapel_id: chapel_booking.chapel_id,
          start_date: chapel_booking.start_date,
          end_date: chapel_booking.end_date,
          days: chapel_booking.days || 1,
          status: "hold", // change to 'paid' on webhook success
          order_id: orderId,
          snapshot_daily_rate: null, // optional snapshot column
          base_amount: chapel_booking.chapel_amount || 0,
          cold_storage_days: chapel_booking.cold_storage_days || 0,
          cold_storage_amount: chapel_booking.cold_storage_amount || 0,
          amount: (chapel_booking.chapel_amount || 0) + (chapel_booking.cold_storage_amount || 0),
        })
        .select("id")
        .single();
      if (holdErr) {
        console.error(holdErr);
        // don't block; you can also return error if you want it strict
      } else {
        chapelHoldId = hold.id;
      }
    }

    // 4) Store cadaver details if provided
    if (cadaver) {
      const { error: cadErr } = await sb
        .from("cadaver_details")
        .insert({
          order_id: orderId,
          ...cadaver,
        });
      if (cadErr) console.error("cadaver insert failed", cadErr);
    }

    // Build Xendit items
    const xenditItems = items.map((it) => ({
      name: it.name,
      quantity: Number(it.quantity) || 1,
      price: Math.round(Number(it.price) || 0), // Xendit wants integer (IDR) but for PHP: /v2 should accept amount
      category: "funeral",
      url: it.image_url || undefined,
    }));

    // 5) Create Xendit invoice with success/failure redirect URLs
    const externalId = `order_${orderId}`;
    const successUrl = `${APP_URL}/payment/success?order_id=${orderId}`;
    const failureUrl = `${APP_URL}/payment/failed?order_id=${orderId}`;

    const invRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(XENDIT_API_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: Math.round(Number(total) || 0),
        description: `St. Ivans Order ${orderId}`,
        currency: "PHP",
        items: xenditItems,
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        // recommended: add customer email to improve experience
        payer_email: user.email,
      }),
    });

    if (!invRes.ok) {
      const errText = await invRes.text();
      console.error("Xendit invoice error:", errText);
      return res.status(400).json({ error: "Failed to create invoice" });
    }

    const invoice = await invRes.json();

    // 6) save invoice id
    await sb.from("orders").update({ xendit_invoice_id: invoice.id }).eq("id", orderId);

    return res.status(200).json({
      order_id: orderId,
      invoice_id: invoice.id,
      invoice_url: invoice.invoice_url,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
