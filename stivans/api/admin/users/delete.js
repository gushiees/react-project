// /api/admin/users/delete.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { //
  auth: { persistSession: false, autoRefreshToken: false }, //
});

// Helper to get authenticated admin ID
async function getAdminUserId(req) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new Error("No bearer token");

    const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller?.user?.id) throw new Error("Invalid session token");

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles").select("role").eq("id", caller.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "admin") throw new Error("Admin required");

    return caller.user.id; // Return admin ID
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { /* ... config check ... */ } //

    // --- Authenticate admin and get their ID ---
    const adminUserId = await getAdminUserId(req); // <-- Get admin ID

    // ***** UPDATE last_active_at for ADMIN *****
    const { error: updateActiveErr } = await supabaseAdmin
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', adminUserId); // <-- Use admin's ID

    if (updateActiveErr) {
        console.warn(`[/api/admin/users/delete] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- Process user deletion ---
    const { userId } = req.body || {};
    if (!userId) { return res.status(400).json({ step: "input", error: "Missing userId" }); } //
    if (userId === adminUserId) { return res.status(400).json({ step: "input", error: "You cannot delete yourself" }); } //

    // DB cleanup (CASCADE should handle this, but explicit calls are okay)
    try {
      // Use supabaseAdmin which has service role bypass RLS
      await supabaseAdmin.from("payment_methods").delete().eq("user_id", userId); //
      await supabaseAdmin.from("user_addresses").delete().eq("user_id", userId); //
      await supabaseAdmin.from("profiles").delete().eq("id", userId); //
      // Add deletes for carts, cart_items, orders, order_items, bookings etc. if CASCADE DELETE is not set
      // Example: await supabaseAdmin.from("orders").delete().eq("user_id", userId);
    } catch (dbErr) { /* ... handle DB error ... */ } //

    // Delete Auth User (using Supabase JS Admin Client)
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId); //

    if (delError) {
      // Log the specific error for debugging
      console.error(`Auth delete error for user ${userId}:`, delError);
      // Attempt soft delete as fallback (using fetch as before)
       try {
           const gotrueResp = await fetch(/* ... soft delete fetch call ... */); //
           if (!gotrueResp.ok) { /* ... handle soft delete fetch error ... */ } //
           return res.status(200).json({ ok: true, mode: "soft", message: "User soft-deleted" }); //
       } catch (softErr) { /* ... handle soft delete generic error ... */ } //
       // If both hard and soft delete fail, return the original hard delete error
      return res.status(400).json({ step: "auth", code: delError.status || "unexpected_failure", error: "Auth delete failed", details: delError.message }); //
    }

    // Hard delete success
    return res.status(200).json({ ok: true, mode: "hard" }); //

  } catch (e) {
     // Handle specific auth errors from getAdminUserId
    if (e.message === 'No bearer token' || e.message === 'Invalid session token' || e.message === 'Admin required') {
        return res.status(401).json({ step: "authz", error: e.message }); // Or 403 for 'Admin required'
    }
    // Handle other errors
    console.error("[admin/users/delete] server err:", e);
    return res.status(500).json({ step: "server", error: "Server error", details: e?.message });
  }
}