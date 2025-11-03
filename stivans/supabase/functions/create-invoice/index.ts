// Supabase Edge Function (Deno) – Create Xendit invoice
// NOW inserts order_items for the newly-created order.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")!;
const ORIGIN = new URL(FRONTEND_URL).origin;

function cors(extra: HeadersInit = {}) {
  return {
    ...extra,
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  try {
    // 1) Auth (use user's JWT from Authorization header)
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: cors({ "Content-Type": "application/json" }),
      });
    }
    const user = userData.user;

    // 2) Read payload
    const body = await req.json();
    const {
      items,             // ← array of cart items (see frontend mapping below)
      subtotal, tax, shipping, total,
      purchase_type,     // optional
      order_tag,         // optional
      cadaver_details_id // optional (legacy; ok to keep)
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items" }), {
        status: 400, headers: cors({ "Content-Type": "application/json" }),
      });
    }
    if (typeof total !== "number" || total <= 0) {
      return new Response(JSON.stringify({ error: "Invalid totals" }), {
        status: 400, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // 3) Create provisional order
    const external_id = `INV_${Date.now()}_${user.id.slice(0, 8)}`;
    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        // legacy + new fields (safe with your RLS)
        status: "pending",
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        order_tag: order_tag || null,
        cadaver_details_id: cadaver_details_id || null,
        subtotal, tax, shipping, total, external_id,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow?.id) {
      return new Response(JSON.stringify({
        error: "Failed to create order",
        detail: orderErr?.message
      }), { status: 500, headers: cors({ "Content-Type": "application/json" }) });
    }

    // 4) INSERT ORDER ITEMS (this is the missing piece)
    //    Handles different shapes safely (id/product_id & price/unit_price).
    if (Array.isArray(items) && items.length) {
      const rows = items.map((it: any) => ({
        order_id:   orderRow.id,
        product_id: it.product_id ?? it.id ?? it.product?.id,
        quantity:   Number(it.quantity ?? it.qty ?? it.count ?? 1),
        unit_price: Number(it.unit_price ?? it.price ?? it.product?.price ?? it.product_price ?? 0),
      }));
      const { error: oiErr } = await admin.from("order_items").insert(rows);
      if (oiErr) {
        // Not fatal for payment; you'll just see "No items" if this fails.
        console.error("order_items insert failed:", oiErr.message);
      }
    }

    // 5) Build invoice (keep redirects if you like the auto-return)
    const successUrl = `${FRONTEND_URL}/checkout?paid=1&ref=${encodeURIComponent(external_id)}`;
    const failureUrl = `${FRONTEND_URL}/checkout?paid=0&ref=${encodeURIComponent(external_id)}`;

    const xiRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${XENDIT_SECRET_KEY}:`),
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
      return new Response(JSON.stringify({ error: "Xendit error", detail: xiJson }), {
        status: xiRes.status, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // 6) Save invoice fields on the order
    await admin
      .from("orders")
      .update({ xendit_invoice_id: xiJson.id, xendit_invoice_url: xiJson.invoice_url })
      .eq("id", orderRow.id);

    return new Response(JSON.stringify({ invoice_url: xiJson.invoice_url }), {
      status: 200, headers: cors({ "Content-Type": "application/json" }),
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: cors({ "Content-Type": "application/json" }),
    });
  }
});
