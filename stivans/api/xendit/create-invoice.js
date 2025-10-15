// api/xendit/create-invoice.js
export const config = { runtime: "nodejs" };

import { createClient } from "@supabase/supabase-js";

// ---------- tiny helpers ----------
function sendJSON(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
function needEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
function toPhpInteger(n) {
  // Xendit expects an integer for PHP amounts (whole pesos).
  return Math.round(Number(n || 0));
}

// ---------- handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJSON(res, 405, { error: "Method not allowed" });
  }

  let step = "start";

  try {
    // env + admin client
    step = "env";
    const SUPABASE_URL = needEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = needEnv("SUPABASE_SERVICE_ROLE_KEY");
    const XENDIT_SECRET_KEY = needEnv("XENDIT_SECRET_KEY"); // use TEST key for test mode
    const BASE_URL = process.env.BASE_URL || "https://stivans.vercel.app";

    step = "supabase-admin";
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // auth (bearer from your frontend session)
    step = "auth";
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return sendJSON(res, 401, { error: "No Authorization bearer token" });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return sendJSON(res, 401, { error: "Invalid/expired session token" });
    }
    const user = userData.user;

    // parse body
    step = "parse-body";
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      items = [],
      subtotal = 0,
      tax = 0,
      shipping = 0,
      total = 0,
      // payment_method = null, // ❌ column doesn’t exist — don’t use
      cadaver = null,
      chapel_booking = null,         // { chapel_id, start_date, end_date, days, chapel_amount, (legacy) cold_storage_days, (legacy) cold_storage_amount }
      cold_storage_booking = null,   // NEW: { start_date, end_date, days, amount }
      purchase_type = "self",
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendJSON(res, 400, { error: "No items" });
    }

    // server-side total sanity check (don’t trust client fully)
    // line items
    const itemsSubtotal = items.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.quantity || 0),
      0
    );

    // add-ons (support both old & new shapes)
    const chapelAmount = chapel_booking ? Number(chapel_booking.chapel_amount || 0) : 0;
    const legacyColdAmount = chapel_booking ? Number(chapel_booking.cold_storage_amount || 0) : 0;
    const newColdAmount = cold_storage_booking ? Number(cold_storage_booking.amount || 0) : 0;

    const calcSubtotal = itemsSubtotal + chapelAmount + (newColdAmount || legacyColdAmount);
    const calcTax = Number(tax || 0);
    const calcShipping = Number(shipping || 0);
    const calcTotal = calcSubtotal + calcTax + calcShipping;

    // If you want to enforce match, uncomment:
    // if (toPhpInteger(calcTotal) !== toPhpInteger(total)) {
    //   return sendJSON(res, 400, { error: "Total mismatch" });
    // }

    // 1) create order (pending) — NOTE: no payment_method column
    step = "insert-order";
    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal: calcSubtotal,
        tax: calcTax,
        shipping: calcShipping,
        total: calcTotal,
        // payment_method,  // ❌ remove, column not present
      })
      .select("*")
      .single();

    if (orderErr) {
      return sendJSON(res, 500, {
        error: "DB: create order failed",
        details: orderErr.message,
        step,
      });
    }

    // 2) order items
    step = "insert-items";
    const orderItems = items.map((it) => ({
      order_id: orderRow.id,
      product_id: it.product_id || it.id || null,
      name: it.name,
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.price || 0),
      price: Number(it.price || 0) * Number(it.quantity || 0),
      image_url: it.image_url || null,
    }));

    if (orderItems.length) {
      const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
      if (itemsErr) {
        return sendJSON(res, 500, {
          error: "DB: insert order_items failed",
          details: itemsErr.message,
          step,
        });
      }
    }

    // 3) cadaver details (if at-need)
    if (cadaver) {
      step = "insert-cadaver";
      const cadaverRow = { ...cadaver, order_id: orderRow.id };
      const { error: cadErr } = await admin.from("cadaver_details").insert(cadaverRow);
      if (cadErr) {
        return sendJSON(res, 500, {
          error: "DB: insert cadaver_details failed",
          details: cadErr.message,
          step,
        });
      }
    }

    // 4) chapel booking “hold” (if provided)
    // We keep storing cold storage info *with* the chapel booking row (per your existing table).
    // If user enabled only cold storage without chapel, we **skip** the insert (your table likely requires chapel_id).
    if (chapel_booking) {
      step = "insert-booking";
      const {
        chapel_id,
        start_date,
        end_date,
        days,
        // legacy cold fields (if frontend still sends them here)
        cold_storage_days,
        cold_storage_amount,
        chapel_amount,
      } = chapel_booking;

      // prefer NEW cold_storage_booking if present
      const mergedColdDays =
        (cold_storage_booking && Number(cold_storage_booking.days || 0)) ||
        Number(cold_storage_days || 0) ||
        0;
      const mergedColdAmount =
        (cold_storage_booking && Number(cold_storage_booking.amount || 0)) ||
        Number(cold_storage_amount || 0) ||
        0;

      const bookingPayload = {
        order_id: orderRow.id,
        user_id: user.id,
        chapel_id, // assumes NOT NULL in schema
        start_date,
        end_date,
        days: Number(days || 0),
        status: "pending",
        snapshot_daily_rate: null, // optional: look up chapels.daily_rate and store here if you want
        base_amount: Number(chapel_amount || 0),
        cold_storage_days: mergedColdDays,
        cold_storage_amount: mergedColdAmount,
        total_amount: Number(chapel_amount || 0) + mergedColdAmount,
      };

      const { error: bookErr } = await admin.from("chapel_bookings").insert(bookingPayload);
      if (bookErr) {
        return sendJSON(res, 500, {
          error: "DB: insert chapel_bookings failed",
          details: bookErr.message,
          step,
        });
      }
    }

    // 5) Xendit invoice
    step = "xendit-create";
    const basicAuth = Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64");

    const xenditBody = {
      external_id: String(orderRow.id),
      amount: toPhpInteger(calcTotal),
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
      return sendJSON(res, 502, {
        error: "Xendit invoice create failed",
        step,
        details: txt.slice(0, 2000),
      });
    }
    const xJson = await xRes.json();

    // 6) save invoice id/url to order
    step = "update-order";
    const { error: updErr } = await admin
      .from("orders")
      .update({
        xendit_invoice_id: xJson.id,
        xendit_invoice_url: xJson.invoice_url || xJson.url || null,
      })
      .eq("id", orderRow.id);
    if (updErr) {
      return sendJSON(res, 500, {
        error: "DB: update order invoice id failed",
        details: updErr.message,
        step,
      });
    }

    // 7) done
    return sendJSON(res, 200, {
      ok: true,
      order_id: orderRow.id,
      invoice_id: xJson.id,
      invoice_url: xJson.invoice_url || xJson.url,
    });
  } catch (e) {
    console.error("create-invoice error", step, e);
    return sendJSON(res, 500, {
      error: "FUNCTION_INVOCATION_FAILED",
      step,
      details: e?.message || String(e),
    });
  }
}
