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

export const config = { runtime: 'nodejs' }; // important

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1) Validate caller’s session
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No auth token' });

    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller?.user) {
      return res.status(401).json({ error: 'Invalid session token', details: callerErr?.message || callerErr });
    }

    const callerUser = caller.user;
    const callerEmail = (callerUser.email || '').toLowerCase();

    // 2) Ensure caller is admin
    let isAdmin = ADMIN_EMAILS.includes(callerEmail);
    if (!isAdmin) {
      const { data: prof, error: profErr } = await admin
        .from('profiles')
        .select('role')
        .eq('id', callerUser.id)
        .single();

      if (profErr) {
        return res.status(400).json({ error: 'Failed to check caller role', details: profErr.message || profErr });
      }
      isAdmin = prof?.role === 'admin';
    }
    if (!isAdmin) {
      return res.status(403).json({ error: 'Auth error deleting user', details: 'Caller is not admin' });
    }

    // 3) Payload
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (userId === callerUser.id) {
      return res.status(400).json({ error: 'Refusing to delete the currently logged-in admin' });
    }

    // 4) Delete from auth (service role required)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      // Show the exact supabase error back to the client so we can see what's wrong
      return res.status(400).json({
        error: 'Auth delete failed',
        details: delErr.message || delErr.error_description || delErr.error || delErr,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[delete-user] server error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message || e });
  }
}
