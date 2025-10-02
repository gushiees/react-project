// api/admin/users/set-role.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No auth token' });

    const { data: uData, error: uErr } = await supa.auth.getUser(token);
    if (uErr || !uData?.user) return res.status(401).json({ error: 'Invalid token' });

    // optional: allow only admins by email list or by profile role === 'admin'
    const callerEmail = uData.user.email?.toLowerCase() || '';
    if (!ADMIN_EMAILS.includes(callerEmail)) {
      // fallback check against profiles
      const { data: prof } = await supa.from('profiles').select('role').eq('id', uData.user.id).single();
      if (prof?.role !== 'admin') return res.status(403).json({ error: 'Not an admin' });
    }

    const { userId, role } = req.body || {};
    if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' });
    if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const { error: upErr } = await supa.from('profiles').update({ role }).eq('id', userId);
    if (upErr) return res.status(400).json({ error: upErr.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[set-role] error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
export const config = { runtime: 'nodejs' };
