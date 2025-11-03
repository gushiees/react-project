// Supabase Edge Function (Deno) – Xendit webhook
// Separates payment_status from fulfillment_status; keeps legacy 'status' in sync.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")!;
const ORIGIN = new URL(FRONTEND_URL).origin;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function cors(extra: HeadersInit = {}) {
  return {
    ...extra,
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "x-callback-token, content-type",
  };
}

function normalize(body: any) {
  if (!body) return {};
  return body.data ? body.data : body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  try {
    const token = req.headers.get("x-callback-token") ?? "";
    if (token !== XENDIT_CALLBACK_TOKEN) {
      return new Response(JSON.stringify({ error: "Bad callback token" }), {
        status: 401, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; }
    catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors({ "Content-Type": "application/json" }) }); }

    const data = normalize(body);
    const invoiceId = data?.id || null;
    const externalId = data?.external_id || null;
    const statusStr = String(data?.status || "").toUpperCase();
    if (!invoiceId && !externalId) {
      return new Response(JSON.stringify({ error: "Bad payload" }), {
        status: 400, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Map Xendit status -> our payment_status + legacy status
    let payment_status: "pending"|"paid"|"failed"|"refunded"|"partial" = "pending";
    let legacy_status = "pending";
    if (statusStr === "PAID" || statusStr === "SETTLED") { payment_status = "paid"; legacy_status = "paid"; }
    else if (statusStr === "EXPIRED" || statusStr === "CANCELED" || statusStr === "CANCELLED") { payment_status = "failed"; legacy_status = "canceled"; }

    // Find order by external_id first, then invoice id
    let orderId: string | null = null;
    {
      const a = await db.from("orders").select("id").eq("external_id", externalId).maybeSingle();
      if (a.data?.id) orderId = a.data.id;
      if (!orderId && invoiceId) {
        const b = await db.from("orders").select("id").eq("xendit_invoice_id", invoiceId).maybeSingle();
        if (b.data?.id) orderId = b.data.id;
      }
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404, headers: cors({ "Content-Type": "application/json" }),
        });
      }
    }

    const patch: Record<string, unknown> = {
      payment_status,
      status: legacy_status,
      xendit_invoice_id: invoiceId || null,
    };
    if (payment_status === "paid") patch.paid_at = new Date().toISOString();

    const upd = await db.from("orders").update(patch).eq("id", orderId).select("id").single();
    if (upd.error) {
      return new Response(JSON.stringify({ error: upd.error.message }), {
        status: 500, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: cors({ "Content-Type": "application/json" }),
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: cors({ "Content-Type": "application/json" }),
    });
  }
});
