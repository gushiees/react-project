// supabase/functions/xendit-webhook/index.ts
// Supabase Edge Function (Deno). Xendit callback target to finalize order status.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")!;
const ORIGIN = new URL(FRONTEND_URL).origin;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function cors(h: HeadersInit = {}) {
  return {
    ...h,
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Headers": "x-callback-token, content-type",
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

    const token = req.headers.get("x-callback-token");
    if (token !== XENDIT_CALLBACK_TOKEN) {
      return new Response(JSON.stringify({ error: "Bad callback token" }), { status: 401, headers: cors({ "Content-Type": "application/json" }) });
    }

    const event = await req.json();
    const data = event?.data;
    if (!data?.id || !data?.external_id) {
      return new Response(JSON.stringify({ error: "Bad payload" }), { status: 400, headers: cors({ "Content-Type": "application/json" }) });
    }

    const { id: invoice_id, external_id, status } = data;

    // Find provisional order
    const { data: order, error: findErr } = await supabaseAdmin
      .from("orders")
      .select("id, status, cadaver_details_id")
      .eq("external_id", external_id)
      .single();

    if (findErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: cors({ "Content-Type": "application/json" }) });
    }

    if (status === "PAID") {
      await supabaseAdmin.from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString(), xendit_invoice_id: invoice_id })
        .eq("id", order.id);

      if (order.cadaver_details_id) {
        await supabaseAdmin.from("cadaver_details")
          .update({ order_id: order.id })
          .eq("id", order.cadaver_details_id);
      }
    } else if (status === "EXPIRED") {
      await supabaseAdmin.from("orders").update({ status: "expired" }).eq("id", order.id);
    } else if (status === "FAILED") {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors({ "Content-Type": "application/json" }) });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500, headers: cors({ "Content-Type": "application/json" })
    });
  }
});
