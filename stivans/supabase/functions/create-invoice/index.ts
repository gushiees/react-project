// supabase/functions/create-invoice/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")!; // e.g. https://stivans.vercel.app
const ORIGINS_ENV = Deno.env.get("ALLOWED_ORIGINS") || FRONTEND_URL;

const ALLOWED_ORIGINS = ORIGINS_ENV.split(",").map(s => s.trim()).filter(Boolean);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function corsHeadersFor(req: Request, extra: HeadersInit = {}) {
  const reqOrigin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin)
    ? reqOrigin
    : (ALLOWED_ORIGINS[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    ...extra,
  };
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeadersFor(req) });
    }

    // Auth
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
      });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
      });
    }
    const user = userData.user;

    // Input
    const body = await req.json().catch(() => ({}));
    const { items, subtotal, tax, shipping, total, purchase_type, order_tag, cadaver_details_id } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items" }), {
        status: 400, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
      });
    }
    if (typeof total !== "number" || !isFinite(total) || total <= 0) {
      return new Response(JSON.stringify({ error: "Invalid totals" }), {
        status: 400, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
      });
    }

    // Provisional order
    const external_id = `INV_${Date.now()}_${user.id.slice(0, 8)}`;
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        order_tag: order_tag || null,
        cadaver_details_id: cadaver_details_id || null,
        subtotal, tax, shipping, total,
        external_id
      })
      .select("id")
      .single();

    if (orderErr || !orderRow?.id) {
      return new Response(JSON.stringify({ error: "Failed to create provisional order", detail: orderErr?.message }), {
        status: 500, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
      });
    }

    // Redirects
    const successUrl = `${FRONTEND_URL}/checkout?paid=1&ref=${encodeURIComponent(external_id)}`;
    const failureUrl = `${FRONTEND_URL}/checkout?paid=0&ref=${encodeURIComponent(external_id)}`;

    // Xendit
    const xiRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(XENDIT_SECRET_KEY + ":"),
      },
      body: JSON.stringify({
        external_id,
        amount: Math.round(Number(total) * 100) / 100,
        currency: "PHP",
        description: "Memorial service order",
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        metadata: { user_id: user.id, order_tag: order_tag || null, cadaver_details_id: cadaver_details_id || null }
      }),
    });

    const xiJson = await xiRes.json().catch(() => ({}));
    if (!xiRes.ok) {
      return new Response(JSON.stringify({ error: "Xendit error", detail: xiJson }), {
        status: xiRes.status, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
      });
    }

    // Save invoice URL
    await supabaseAdmin
      .from("orders")
      .update({ xendit_invoice_id: xiJson.id, xendit_invoice_url: xiJson.invoice_url })
      .eq("id", orderRow.id);

    return new Response(JSON.stringify({ invoice_url: xiJson.invoice_url }), {
      status: 200, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
    });
  } catch (e) {
    console.error("create-invoice error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: corsHeadersFor(req, { "Content-Type": "application/json" })
    });
  }
});
