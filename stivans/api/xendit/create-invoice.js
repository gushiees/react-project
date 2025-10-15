// api/xendit/create-invoice.js
export const config = { runtime: "nodejs" };

import { createClient } from "@supabase/supabase-js";

// ---- Helpers ---------------------------------------------------------------

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function requiredEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

function phpToCentLike(amount) {
  // Xendit expects integer amount; for PHP use whole pesos.
  // Round just in case the client computed decimals.
  return Math.round(Number(amount || 0));
}

// ---- Handler ---------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  let step = "start";
  try {
    step = "env";
    const SUPABASE_URL = requiredEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const XENDIT_SECRET_KEY = requiredEnv("XENDIT_SECRET_KEY"); // use TEST key in test mode
    const BASE_URL = process.env.BASE_URL || "https://stivans.vercel.app";

    step = "supabase-admin";
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    step = "auth";
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!token) {
      return json(res, 401, { error: "No Authorization bearer token" });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(res, 401, { error: "Invalid session token" });
    }
    const user = userData.user;

    step = "parse-body";
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      items = [],
      subtotal = 0,
      tax = 0,
      shipping = 0,
      total = 0,
      payment_method = null,
      cadaver = null,
      chapel_booking = null,
      purchase_type = "self",
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return json(res, 400, { error: "No items" });
    }

    // Server-side recompute total to sanity-check client values
    const calcSubtotal =
      items.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0) +
      (chapel_booking ? Number(chapel_booking.chapel_amount || 0) + Number(chapel_booking.cold_storage_amount || 0) : 0);

    const calcTax = Number(tax || 0); // your client already applies 12%
    const calcShipping = Number(shipping || 0);
    const calcTotal = calcSubtotal + calcTax + calcShipping;

    // If you want strict match, enforce here; otherwise just trust server calc
    // if (phpToCentLike(calcTotal) !== phpToCentLike(total)) {
    //   return json(res, 400, { error: "Total mismatch" });
    // }

    step = "insert-order";
    // 1) Create order row (pending)
    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal: calcSubtotal,
        tax: calcTax,
        shipping: calcShipping,
        total: calcTotal,
        payment_method,
      })
      .select("*")
      .single();

    if (orderErr) {
      return json(res, 500, { error: "DB: create order failed", details: orderErr.message, step });
    }

    // 2) Insert order items
    step = "insert-items";
    const orderItems = items.map((it) => ({
      order_id: orderRow.id,
      product_id: it.product_id || it.id || null, // normal products use actual product id
      name: it.name,
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.price || 0),
      price: Number(it.price || 0) * Number(it.quantity || 0),
      image_url: it.image_url || null,
    }));

    if (orderItems.length > 0) {
      const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
      if (itemsErr) {
        return json(res, 500, { error: "DB: insert order_items failed", details: itemsErr.message, step });
      }
    }

    // 3) Optional cadaver details (at-need)
    if (cadaver) {
      step = "insert-cadaver";
      const cadaverRow = { ...cadaver, order_id: orderRow.id };
      const { error: cadErr } = await admin.from("cadaver_details").insert(cadaverRow);
      if (cadErr) {
        return json(res, 500, { error: "DB: insert cadaver_details failed", details: cadErr.message, step });
      }
    }

    // 4) Optional chapel booking hold (pending)
    if (chapel_booking) {
      step = "insert-booking";
      const {
        chapel_id,
        start_date,
        end_date,
        days,
        cold_storage_days,
        chapel_amount,
        cold_storage_amount,
      } = chapel_booking;

      const bookingPayload = {
        order_id: orderRow.id,
        user_id: user.id,
        chapel_id,
        start_date,
        end_date,
        days: Number(days || 0),
        status: "pending",
        cold_storage_days: Number(cold_storage_days || 0),
        snapshot_daily_rate: null, // you can store current daily_rate if you want (lookup chapels table first)
        cold_storage_amount: Number(cold_storage_amount || 0),
        base_amount: Number(chapel_amount || 0),
        total_amount: Number(chapel_amount || 0) + Number(cold_storage_amount || 0),
      };

      const { error: bookErr } = await admin.from("chapel_bookings").insert(bookingPayload);
      if (bookErr) {
        return json(res, 500, { error: "DB: insert chapel_bookings failed", details: bookErr.message, step });
      }
    }

    // 5) Create Xendit invoice
    step = "xendit-create";
    const basicAuth = Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64");

    const xenditBody = {
      external_id: String(orderRow.id),
      amount: phpToCentLike(calcTotal),
      currency: "PHP",
      payer_email: user.email || undefined,
      description: `St. Ivans Order #${String(orderRow.id).slice(0, 8)}`,
      success_redirect_url: `${BASE_URL}/payment/success?order=${orderRow.id}`,
      failure_redirect_url: `${BASE_URL}/payment/failed?order=${orderRow.id}`,
    };

    const xRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(xenditBody),
    });

    if (!xRes.ok) {
      const txt = await xRes.text();
      return json(res, 502, { error: "Xendit invoice create failed", step, details: txt.slice(0, 2000) });
    }
    const xJson = await xRes.json();

    // 6) Save invoice id/url to order
    step = "update-order";
    const { error: updErr } = await admin
      .from("orders")
      .update({
        xendit_invoice_id: xJson.id,
        xendit_invoice_url: xJson.invoice_url || xJson.url || null,
      })
      .eq("id", orderRow.id);
    if (updErr) {
      return json(res, 500, { error: "DB: update order invoice id failed", details: updErr.message, step });
    }

    // 7) Done
    return json(res, 200, {
      ok: true,
      order_id: orderRow.id,
      invoice_id: xJson.id,
      invoice_url: xJson.invoice_url || xJson.url,
    });
  } catch (e) {
    // Surface step + message so you immediately see where/why it failed
    console.error("create-invoice error", step, e);
    return json(res, 500, {
      error: "FUNCTION_INVOCATION_FAILED",
      step,
      details: e?.message || String(e),
    });
  }
}
