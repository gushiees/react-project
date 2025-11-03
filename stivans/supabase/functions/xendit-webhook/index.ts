// Supabase Edge Function (Deno) – Xendit webhook
// Separates payment_status from fulfillment_status; keeps legacy 'status' in sync.
// Clears the user's cart once payment is PAID.

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
  return body && body.data ? body.data : (body || {});
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors() });

  try {
    // Verify Xendit shared secret
    const token = req.headers.get("x-callback-token") ?? "";
    if (token !== XENDIT_CALLBACK_TOKEN) {
      return new Response(JSON.stringify({ error: "Bad callback token" }), {
        status: 401, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Parse body
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; }
    catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Support {event,data} and flat payloads
    const data = normalize(body);
    const invoiceId  = data?.id || null;
    const externalId = data?.external_id || null;
    const statusStr  = String(data?.status || "").toUpperCase();

    if (!invoiceId && !externalId) {
      return new Response(JSON.stringify({ error: "Bad payload" }), {
        status: 400, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Map Xendit status -> our payment_status + legacy status
    let payment_status: "pending" | "paid" | "failed" | "refunded" | "partial" = "pending";
    let legacy_status = "pending";
    if (statusStr === "PAID" || statusStr === "SETTLED") {
      payment_status = "paid";
      legacy_status  = "paid";
    } else if (statusStr === "EXPIRED" || statusStr === "CANCELED" || statusStr === "CANCELLED") {
      payment_status = "failed";
      legacy_status  = "canceled";
    }

    // Find order by external_id then by invoice_id; select user_id for cart clear
    let order: { id: string; user_id: string } | null = null;

    const byExt = await db.from("orders").select("id,user_id").eq("external_id", externalId).maybeSingle();
    if (byExt.data?.id) order = byExt.data as any;

    if (!order && invoiceId) {
      const byInv = await db.from("orders").select("id,user_id").eq("xendit_invoice_id", invoiceId).maybeSingle();
      if (byInv.data?.id) order = byInv.data as any;
    }

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Update payment fields (+ keep legacy 'status' in sync)
    const patch: Record<string, unknown> = {
      payment_status,
      status: legacy_status,
      xendit_invoice_id: invoiceId || null,
    };
    if (payment_status === "paid") patch.paid_at = new Date().toISOString();

    const upd = await db.from("orders").update(patch).eq("id", order.id).select("id").single();
    if (upd.error) {
      return new Response(JSON.stringify({ error: upd.error.message }), {
        status: 500, headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Clear the user's cart after successful payment
    if (payment_status === "paid" && order.user_id) {
      const { data: carts, error: cartsErr } = await db
        .from("carts")
        .select("id")
        .eq("user_id", order.user_id);

      if (!cartsErr && Array.isArray(carts) && carts.length > 0) {
        const cartIds = carts.map((c) => c.id);
        await db.from("cart_items").delete().in("cart_id", cartIds);
        // If you also want to delete cart rows themselves, uncomment:
        // await db.from("carts").delete().in("id", cartIds);
      }
      // If your cart_items also has user_id, you could add a fallback delete here.
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
