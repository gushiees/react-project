import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY; // optional

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing bearer token" });

    const { data: userData, error: authErr } = await supabaseAnon
      .auth
      .getUser(token);
    if (authErr || !userData?.user)
      return res.status(401).json({ error: "Invalid session" });

    const authedUser = userData.user;
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    // Load order
    const { data: order, error: ordErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, xendit_invoice_id")
      .eq("id", orderId)
      .single();

    if (ordErr || !order) return res.status(404).json({ error: "Order not found" });
    if (order.user_id !== authedUser.id) return res.status(403).json({ error: "Not your order" });
    if (order.status !== "pending") return res.status(400).json({ error: "Only pending orders can be cancelled" });

    // expire Xendit invoice (optional)
    if (XENDIT_SECRET_KEY && order.xendit_invoice_id) {
      try {
        await fetch(`https://api.xendit.co/v2/invoices/${order.xendit_invoice_id}/expire!`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64"),
          },
        });
      } catch (e) {
        console.warn("Xendit expire failed:", e?.message || e);
      }
    }

    // cancel order
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    if (updErr) throw updErr;

    // release chapel holds (if any)
    await supabaseAdmin
      .from("chapel_bookings")
      .update({ status: "cancelled" })
      .eq("order_id", orderId)
      .eq("status", "hold");

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Cancel failed" });
  }
}
