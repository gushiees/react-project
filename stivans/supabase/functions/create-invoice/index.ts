// supabase/functions/create-invoice/index.ts
// Supabase Edge Function (Deno). Creates a provisional order + Xendit invoice.
// Expects Authorization: Bearer <supabase access token> from the client.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")!; // e.g. https://yourdomain.com

const ORIGIN = new URL(FRONTEND_URL).origin;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function cors(h: HeadersInit = {}) {
  return {
    ...h,
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors() });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), { status: 401, headers: cors({ "Content-Type": "application/json" }) });
    }

    // Verify user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: cors({ "Content-Type": "application/json" }) });
    }
    const user = userData.user;

    // Read payload
    const body = await req.json();
    const {
      items,
      subtotal,
      tax,
      shipping,
      total,
      purchase_type,
      order_tag,
      cadaver_details_id, // created earlier in frontend flow
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items" }), { status: 400, headers: cors({ "Content-Type": "application/json" }) });
    }
    if (typeof total !== "number" || total <= 0) {
      return new Response(JSON.stringify({ error: "Invalid totals" }), { status: 400, headers: cors({ "Content-Type": "application/json" }) });
    }

    // Create provisional order (align columns to your schema)
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
      return new Response(JSON.stringify({ error: "Failed to create provisional order", detail: orderErr.message }), {
        status: 500, headers: cors({ "Content-Type": "application/json" })
      });
    }

    // Build absolute redirects to prevent 404
    const successUrl = `${FRONTEND_URL}/checkout?paid=1&ref=${encodeURIComponent(external_id)}`;
    const failureUrl = `${FRONTEND_URL}/checkout?paid=0&ref=${encodeURIComponent(external_id)}`;

    // Call Xendit
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
        metadata: {
          user_id: user.id,
          order_tag: order_tag || null,
          cadaver_details_id: cadaver_details_id || null,
        },
      }),
    });

    const xiJson = await xiRes.json();
    if (!xiRes.ok) {
      return new Response(JSON.stringify({ error: "Xendit error", detail: xiJson }), { status: xiRes.status, headers: cors({ "Content-Type": "application/json" }) });
    }

    // Save invoice back to order
    await supabaseAdmin
      .from("orders")
      .update({ xendit_invoice_id: xiJson.id, xendit_invoice_url: xiJson.invoice_url })
      .eq("id", orderRow.id);

    return new Response(JSON.stringify({ invoice_url: xiJson.invoice_url }), {
      status: 200, headers: cors({ "Content-Type": "application/json" })
    });
  } catch (e) {
    console.error("create-invoice error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500, headers: cors({ "Content-Type": "application/json" })
    });
  }
});
