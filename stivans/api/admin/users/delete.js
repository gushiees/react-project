// /api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('[delete-user] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1) Validate caller’s session
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No auth token' });

    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller?.user) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const callerUser = caller.user;
    const callerEmail = (callerUser.email || '').toLowerCase();

    // 2) Ensure caller is admin (either via env whitelist or profiles.role === 'admin')
    let isAdmin = ADMIN_EMAILS.includes(callerEmail);
    if (!isAdmin) {
      const { data: prof, error: profErr } = await admin
        .from('profiles').select('role').eq('id', callerUser.id).single();
      if (profErr) {
        return res.status(400).json({ error: 'Failed to check caller role', details: profErr.message });
      }
      isAdmin = prof?.role === 'admin';
    }
    if (!isAdmin) return res.status(403).json({ error: 'Auth error deleting user' });

    // 3) Payload
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (userId === callerUser.id) {
      return res.status(400).json({ error: 'Refusing to delete the currently logged-in admin' });
    }

    // 4) Delete from auth (this also cascades to profiles if you set ON DELETE CASCADE)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return res.status(400).json({ error: 'Auth delete failed', details: delErr.message || delErr });
    }

    // 5) Best effort cleanup of app tables if needed (usually unnecessary if FKs set to CASCADE/SET NULL)
    // Example: await admin.from('payments').delete().eq('user_id', userId);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[delete-user] server error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}

// IMPORTANT: use Node runtime (NOT edge, NOT nodejs18.x)
export const config = { runtime: 'nodejs' };
