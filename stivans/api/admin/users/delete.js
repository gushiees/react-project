// api/admin/users/delete.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This client uses the Service Role key (server-side only!)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(500).json({
        step: "config",
        error:
          "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server env)",
      });
    }

    // 1) Require an authenticated *admin* caller
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ step: "authz", error: "No bearer token" });
    }

    const caller = await supabaseAdmin.auth.getUser(token);
    if (caller.error || !caller.data?.user?.id) {
      return res.status(401).json({
        step: "authz",
        error: "Invalid session token",
        details: caller.error?.message,
      });
    }

    // (Optional) If you keep roles in profiles, verify caller is admin here.
    // If not, remove or adapt this section.
    const adminCheck = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.data.user.id)
      .maybeSingle();

    const callerRole = adminCheck.data?.role || "user";
    if (callerRole !== "admin") {
      return res.status(403).json({ step: "authz", error: "Admin required" });
    }

    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ step: "input", error: "Missing userId" });
    }

    if (userId === caller.data.user.id) {
      return res
        .status(400)
        .json({ step: "input", error: "You cannot delete yourself" });
    }

    // 2) DB cleanup first (safe even if user not in these tables)
    // These should be CASCADE in your schema already, but we call them anyway
    // to keep the error reporting granular.
    try {
      await supabaseAdmin.from("payment_methods").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_addresses").delete().eq("user_id", userId);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
    } catch (dbErr) {
      // If RLS blocks these, you’ll see it here
      return res.status(400).json({
        step: "db",
        error: "Database error deleting user-linked rows",
        details: dbErr?.message || dbErr,
      });
    }

    // 3) Try deleting via supabase-js admin first (hard delete)
    const del = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (del.error) {
      // 3b) Fallback: call GoTrue REST with should_soft_delete=true
      //     Some "unexpected_failure" cases succeed as soft deletes.
      try {
        const gotrueResp = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}?should_soft_delete=true`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              apiKey: SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );

        if (!gotrueResp.ok) {
          let body = {};
          try {
            body = await gotrueResp.json();
          } catch {}
          return res.status(400).json({
            step: "auth",
            code: body?.error_code || body?.code || "unexpected_failure",
            error: "Auth delete failed (soft)",
            details: body?.error || body?.message || del.error?.message,
          });
        }

        // Soft delete success
        return res.status(200).json({
          ok: true,
          mode: "soft",
          step: "auth",
          message: "User soft-deleted via GoTrue",
        });
      } catch (softErr) {
        return res.status(400).json({
          step: "auth",
          code: del.error?.status || "unexpected_failure",
          error: "Auth delete failed",
          details: del.error?.message || String(softErr),
        });
      }
    }

    // Hard delete success
    return res.status(200).json({ ok: true, mode: "hard" });
  } catch (e) {
    console.error("[admin/users/delete] server err:", e);
    return res.status(500).json({
      step: "server",
      error: "Server error",
      details: e?.message || e,
    });
    // no throw
  }
}
