// /api/xendit/create-invoice.js
import { createClient } from "@supabase/supabase-js";

// ENV on Vercel (Project → Settings → Environment Variables)
// SUPABASE_URL = https://xxxxx.supabase.co
// SUPABASE_SERVICE_ROLE_KEY = <service role>
// XENDIT_SECRET_KEY = xnd_development_xxx or xnd_production_xxx
// SITE_URL = https://yourdomain.com  (for invoice redirect URLs)

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Get & validate caller (we expect Authorization: Bearer <supabase access token>)
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    // Validate token → get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const userId = userData.user.id;

    // Parse payload from Checkout.jsx
    const {
      items = [],               // [{ product_id, name, price, quantity, image_url }]
      subtotal,
      tax,
      shipping,
      total,
      payment_method = null,    // optional string if you choose
      cadaver = {},             // full object including URLs you uploaded client-side
      payerEmail,               // optional
      description = "St. Ivans Order", // optional
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items to place order." });
    }
    if (typeof total !== "number") {
      return res.status(400).json({ error: "Total must be a number." });
    }
    if (!cadaver?.death_certificate_url) {
      return res.status(400).json({ error: "Death certificate URL is required." });
    }

    // 1) Create Order (status = pending)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        status: "pending",
        subtotal: Number((subtotal ?? 0).toFixed(2)),
        tax: Number((tax ?? 0).toFixed(2)),
        shipping: Number((shipping ?? 0).toFixed(2)),
        total: Number(total.toFixed(2)),
        xendit_payment_method: payment_method,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("orders.insert error:", orderErr);
      return res.status(400).json({ error: "Failed to create order" });
    }

    // 2) Insert Order Items
    const itemsRows = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id ?? null, // ensure this type matches your products.id
      name: i.name ?? "",
      price: Number(i.price ?? 0),
      quantity: Number(i.quantity ?? 1),
      image_url: i.image_url ?? null,
    }));

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemsRows);
    if (itemsErr) {
      console.error("order_items.insert error:", itemsErr);
      return res.status(400).json({ error: "Failed to add order items" });
    }

    // 3) Insert Cadaver Details (uses URLs you already uploaded on the client)
    const cadaverRow = {
      order_id: order.id,

      full_name: cadaver.full_name,
      dob: cadaver.dob || null,
      age: cadaver.age ?? null,
      sex: cadaver.sex,
      civil_status: cadaver.civil_status,
      religion: cadaver.religion,

      death_datetime: cadaver.death_datetime,
      place_of_death: cadaver.place_of_death,
      cause_of_death: cadaver.cause_of_death || null,

      kin_name: cadaver.kin_name,
      kin_relation: cadaver.kin_relation,
      kin_mobile: cadaver.kin_mobile,
      kin_email: cadaver.kin_email,
      kin_address: cadaver.kin_address,

      remains_location: cadaver.remains_location,
      pickup_datetime: cadaver.pickup_datetime,
      special_instructions: cadaver.special_instructions || null,

      death_certificate_url: cadaver.death_certificate_url, // required
      claimant_id_url: cadaver.claimant_id_url || null,
      permit_url: cadaver.permit_url || null,

      occupation: cadaver.occupation || null,
      nationality: cadaver.nationality || null,
      residence: cadaver.residence || null,
    };

    const { error: cadErr } = await supabaseAdmin.from("cadaver_details").insert(cadaverRow);
    if (cadErr) {
      console.error("cadaver_details.insert error:", cadErr);
      return res.status(400).json({ error: "Failed to save cadaver details" });
    }

    // 4) Create Xendit Invoice
    const XENDIT_KEY = process.env.XENDIT_SECRET_KEY;
    if (!XENDIT_KEY) {
      return res.status(500).json({ error: "Missing XENDIT_SECRET_KEY" });
    }

    const successURL = process.env.SITE_URL
      ? `${process.env.SITE_URL}/checkout?paid=1`
      : undefined;
    const failureURL = process.env.SITE_URL
      ? `${process.env.SITE_URL}/checkout?paid=0`
      : undefined;

    const invResp = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${XENDIT_KEY}:`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: `order_${order.id}`,
        amount: Number(total),
        payer_email: payerEmail || undefined,
        description,
        currency: "PHP",
        success_redirect_url: successURL,
        failure_redirect_url: failureURL,
      }),
    });

    const invData = await invResp.json();
    if (!invResp.ok) {
      console.error("Xendit create invoice error", invData);
      return res.status(400).json({ error: invData });
    }

    // 5) Save invoice refs to order
    await supabaseAdmin
      .from("orders")
      .update({
        xendit_invoice_id: invData.id,
        xendit_invoice_url: invData.invoice_url,
      })
      .eq("id", order.id);

    // 6) Respond to client with invoice URL
    return res.status(200).json({
      order_id: order.id,
      invoice_id: invData.id,
      invoice_url: invData.invoice_url,
      status: invData.status,
    });
  } catch (err) {
    console.error("create-invoice handler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
