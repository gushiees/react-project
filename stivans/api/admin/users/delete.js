// api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

// ---- ENV ----
// Make sure these are set in Vercel (Production + Preview + Development):
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({
        error: 'Server is not configured',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      });
    }

    const token = (req.headers.authorization || '').startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', details: 'Missing bearer token' });
    }

    // Who is calling this endpoint?
    const { data: me, error: meErr } = await supabaseAdmin.auth.getUser(token);
    if (meErr || !me?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized', details: meErr?.message || 'Invalid token' });
    }
    const adminUserId = me.user.id;

    // Check role=admin in your public.profiles table
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (profErr) {
      return res.status(403).json({
        error: 'Forbidden',
        details: `Could not read caller profile: ${profErr.message}`,
      });
    }
    if (profile?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Caller must have role=admin',
      });
    }

    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'Bad request', details: 'Missing userId' });
    }

    if (userId === adminUserId) {
      return res.status(400).json({
        error: 'Auth delete failed',
        details: 'Refusing to delete your own admin account',
      });
    }

    // Perform the Auth delete (DB rows should be handled by your ON DELETE rules)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      return res.status(400).json({
        error: 'Auth delete failed',
        details: delErr.message || String(delErr),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[api/admin/users/delete] server error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
}
