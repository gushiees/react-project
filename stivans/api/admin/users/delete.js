// api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// IMPORTANT: this version ONLY deletes from Supabase Auth.
// All DB rows should be handled by your FK "ON DELETE" rules.
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  // Small CORS helper (optional; safe)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', where: 'delete-v2' });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({
        error: 'Server is not configured',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        where: 'delete-v2',
      });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', details: 'Missing bearer token', where: 'delete-v2' });
    }

    // Who is calling?
    const { data: me, error: meErr } = await supabaseAdmin.auth.getUser(token);
    if (meErr || !me?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized', details: meErr?.message || 'Invalid token', where: 'delete-v2' });
    }
    const callerId = me.user.id;

    // Verify role=admin (profiles table)
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (profErr) {
      return res.status(403).json({
        error: 'Forbidden',
        details: `Could not read caller profile: ${profErr.message}`,
        where: 'delete-v2',
      });
    }
    if (prof?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', details: 'Caller must have role=admin', where: 'delete-v2' });
    }

    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'Bad request', details: 'Missing userId', where: 'delete-v2' });
    }
    if (userId === callerId) {
      return res.status(400).json({ error: 'Auth delete failed', details: 'Refusing to delete your own admin account', where: 'delete-v2' });
    }

    // AUTH delete (DB constraints should handle the rest via ON DELETE rules)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      return res.status(400).json({
        error: 'Auth delete failed',
        details: delErr.message || String(delErr),
        where: 'delete-v2',
      });
    }

    return res.status(200).json({ ok: true, where: 'delete-v2' });
  } catch (e) {
    console.error('[api/admin/users/delete] error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message, where: 'delete-v2' });
  }
}
