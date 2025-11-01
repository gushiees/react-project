// Supabase Edge Function (Deno) – Xendit invoice webhook
// Accepts both legacy flat payloads and newer { event, data } payloads.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://stivans.vercel.app";
const CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN")!;

const ORIGIN = new URL(FRONTEND_URL).origin;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function cors(extra: HeadersInit = {}) {
  return {
    ...extra,
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "x-callback-token, content-type, x-client-info, apikey",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors() });
    }

    // Verify shared secret from Xendit
    const token = req.headers.get("x-callback-token") ?? "";
    if (!CALLBACK_TOKEN || token !== CALLBACK_TOKEN) {
      return new Response(JSON.stringify({ error: "Bad callback token" }), {
        status: 401,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Parse JSON safely
    const raw = await req.text();
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Normalise: support legacy (flat) and newer {event,data} payloads
    const data = body?.data ?? body;
    const invoiceId = data?.id ?? null;
    const externalId = data?.external_id ?? null;
    const statusStr = (data?.status ?? "").toString().toUpperCase();

    if ((!invoiceId && !externalId) || !statusStr) {
      return new Response(JSON.stringify({ error: "Bad payload" }), {
        status: 400,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    let newStatus: "paid" | "expired" | "canceled" | "pending" = "pending";
    if (statusStr === "PAID" || statusStr === "SETTLED") newStatus = "paid";
    else if (statusStr === "EXPIRED") newStatus = "expired";
    else if (statusStr === "CANCELED" || statusStr === "CANCELLED") newStatus = "canceled";

    const updateDoc: Record<string, unknown> = { status: newStatus };
    if (invoiceId) updateDoc.xendit_invoice_id = invoiceId;

    // Update the matching order by invoice id OR by external id
    let q = db.from("orders").update(updateDoc);
    if (invoiceId) q = q.eq("xendit_invoice_id", invoiceId);
    else q = q.eq("external_id", externalId);

    const { error } = await q.select("id").limit(1);
    if (error) {
      return new Response(JSON.stringify({ error: "DB update failed", detail: error.message }), {
        status: 500,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: cors({ "Content-Type": "application/json" }),
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }
});
