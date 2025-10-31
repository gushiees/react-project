// supabase/functions/create-invoice/index.ts
// Supabase Edge Function (Deno). Creates a provisional order + Xendit invoice.
// Client must send: Authorization: Bearer <supabase access token>

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Required env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") ?? "";

// CORS config
// Prefer a comma-separated allowlist in ALLOWED_ORIGINS;
// fallback to single FRONTEND_URL; if neither exists, echo back the request Origin.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const FRONTEND_URL = (Deno.env.get("FRONTEND_URL") ?? "").trim();

function pickAllowOrigin(origin: string): string {
  if (ALLOWED_ORIGINS.length > 0) return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  if (FRONTEND_URL) {
    const f = (() => {
      try { return new URL(FRONTEND_URL).origin; } catch { return FRONTEND_URL; }
    })();
    return origin === f ? origin : f;
  }
  // Last resort: echo request origin (works for dev), but set ALLOWED_ORIGINS/FRONTEND_URL in prod.
  return origin || "*";
}

function corsHeaders(req: Request, extra: Record<string, string> = {}): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = pickAllowOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...extra,
  };
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

serve(async (req: Request): Promise<Response> => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders(req) });
  }

  try {
    // 1) Auth: verify Supabase JWT sent from the browser
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: corsHeaders(req, { "Content-Type": "application/json" }),
      });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders(req, { "Content-Type": "application/json" }),
      });
    }
    const user = userData.user;

    // 2) Parse input
    const body = await req.json().catch(() => ({}));
    const {
      items,
      subtotal,
      tax,
      shipping,
      total,
      purchase_type,
      order_tag,
      cadaver_details_id,
    } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items" }), {
        status: 400,
        headers: corsHeaders(req, { "Content-Type": "application/json" }),
      });
    }
    if (typeof total !== "number" || !isFinite(total) || total <= 0) {
      return new Response(JSON.stringify({ error: "Invalid totals" }), {
        status: 400,
        headers: corsHeaders(req, { "Content-Type": "application/json" }),
      });
    }

    // 3) Create provisional order (adapt columns to your schema)
    const external_id = `INV_${Date.now()}_${user.id.slice(0, 8)}`;
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        order_tag: order_tag ?? null,
        cadaver_details_id: cadaver_details_id ?? null,
        subtotal: Number(subtotal ?? 0),
        tax: Number(tax ?? 0),
        shipping: Number(shipping ?? 0),
        total: Number(total),
        external_id,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow?.id) {
      return new Response(
        JSON.stringify({ error: "Failed to create provisional order", detail: orderErr?.message }),
        { status: 500, headers: corsHeaders(req, { "Content-Type": "application/json" }) },
      );
    }

    // 4) Create Xendit invoice
    const successUrl = `${FRONTEND_URL}/checkout?paid=1&ref=${encodeURIComponent(external_id)}`;
    const failureUrl = `${FRONTEND_URL}/checkout?paid=0&ref=${encodeURIComponent(external_id)}`;

    const xiRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Xendit Basic Auth: base64("<secret_key>:")
        "Authorization": "Basic " + btoa(`${XENDIT_SECRET_KEY}:`),
      },
      body: JSON.stringify({
        external_id,
        amount: Math.round(Number(total) * 100) / 100, // 2-decimal precision
        currency: "PHP",
        description: "Memorial service order",
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        metadata: {
          user_id: user.id,
          order_id: orderRow.id,
          order_tag: order_tag ?? null,
          cadaver_details_id: cadaver_details_id ?? null,
          purchase_type: purchase_type ?? null,
        },
      }),
    });

    const xiJson = await xiRes.json().catch(() => ({}));
    if (!xiRes.ok || !xiJson?.invoice_url) {
      return new Response(
        JSON.stringify({ error: "Xendit error", detail: xiJson }),
        { status: xiRes.status || 500, headers: corsHeaders(req, { "Content-Type": "application/json" }) },
      );
    }

    // 5) Save invoice info back to the order
    await supabaseAdmin
      .from("orders")
      .update({ xendit_invoice_id: xiJson.id, xendit_invoice_url: xiJson.invoice_url })
      .eq("id", orderRow.id);

    // 6) Respond
    return new Response(JSON.stringify({ invoice_url: xiJson.invoice_url }), {
      status: 200,
      headers: corsHeaders(req, { "Content-Type": "application/json" }),
    });
  } catch (e) {
    console.error("create-invoice error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500,
      headers: corsHeaders(req, { "Content-Type": "application/json" }),
    });
  }
});
