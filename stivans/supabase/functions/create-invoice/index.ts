// Supabase Edge Function (Deno) – Create Xendit invoice
// - Idempotency via order_tag / idempotency_key
// - Inserts order_items so Admin shows products
// - Works with plain React + Supabase (no Next.js assumptions)

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
    // ----- Auth (get current user from Bearer token)
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

    // ----- Body
    const body = await req.json().catch(() => ({}));
    const {
      items,
      subtotal,
      tax,
      shipping,
      total,
      purchase_type,
      cadaver_details_id,
      // use any of these as the idempotency key (stable for this click)
      idempotency_key,
      order_tag,
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

    // Stable key for this order; used to avoid duplicates
    const idemKey: string =
      (idempotency_key && String(idempotency_key)) ||
      (order_tag && String(order_tag)) ||
      `ui_${user.id}_${Date.now()}`;

    // ----- IDEMPOTENCY: if an order with same order_tag exists, reuse it
    {
      const { data: existing, error } = await admin
        .from("orders")
        .select("id,xendit_invoice_url,xendit_invoice_id")
        .eq("user_id", user.id)
        .eq("order_tag", idemKey)
        .maybeSingle();

      if (!error && existing?.id) {
        // already created previously; return same invoice url
        return new Response(JSON.stringify({ invoice_url: existing.xendit_invoice_url }), {
          status: 200, headers: cors({ "Content-Type": "application/json" }),
        });
      }
    }

    // ----- Create provisional order
    const external_id = `INV_${Date.now()}_${user.id.slice(0, 8)}`;
    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        // legacy
        status: "pending",
        // separate statuses
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        order_tag: idemKey, // idempotency anchor
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
      // If a unique index enforces order_tag uniqueness, we might hit 23505.
      // In that case, fetch and return the existing.
      if ((orderErr as any).code === "23505") {
        const { data: existing } = await admin
          .from("orders")
          .select("id,xendit_invoice_url")
          .eq("user_id", user.id)
          .eq("order_tag", idemKey)
          .maybeSingle();
        if (existing?.xendit_invoice_url) {
          return new Response(JSON.stringify({ invoice_url: existing.xendit_invoice_url }), {
            status: 200, headers: cors({ "Content-Type": "application/json" }),
          });
        }
      }
      return new Response(JSON.stringify({ error: "Failed to create order", detail: orderErr.message }), {
        status: 500, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // ----- Insert order_items (so Admin shows purchased products)
    {
      const rows = (items as any[]).map((it) => {
        const product_id =
          it.product_id ?? it.id ?? it.product?.id;
        const quantity = Number(it.quantity ?? it.qty ?? 1);
        const unit_price = Number(it.unit_price ?? it.price ?? it.product?.price ?? 0);
        const total_price = Number((quantity || 0) * (unit_price || 0));

        return {
          order_id: orderRow.id,
          product_id,
          quantity,
          unit_price,
          total_price,
          // optional: image_url if you store it on order_items
          image_url: it.image_url ?? it.product?.image_url ?? null,
        };
      });

      const { error: oiErr } = await admin.from("order_items").insert(rows);
      if (oiErr) {
        // Not fatal for payment, but Admin "Items" will be empty if this fails
        console.error("order_items insert failed:", oiErr.message);
      }
    }

    // (Optional) success/failure redirect pages
    const successUrl = `${FRONTEND_URL}/checkout?paid=1&ref=${encodeURIComponent(external_id)}`;
    const failureUrl = `${FRONTEND_URL}/checkout?paid=0&ref=${encodeURIComponent(external_id)}`;

    // ----- Create Xendit invoice
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
          order_tag: idemKey,
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

    // Persist invoice fields
    await admin
      .from("orders")
      .update({ xendit_invoice_id: xiJson.id, xendit_invoice_url: xiJson.invoice_url })
      .eq("id", orderRow.id);

    return new Response(JSON.stringify({ invoice_url: xiJson.invoice_url }), {
      status: 200, headers: cors({ "Content-Type": "application/json" }),
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: cors({ "Content-Type": "application/json" }),
    });
  }
});
