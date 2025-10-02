// /api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // require a logged-in admin
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) return res.status(401).json({ error: 'Invalid session' });

    const { data: profile, error: profErr } = await supabase
      .from('profiles').select('role').eq('id', userData.user.id).single();
    if (profErr || profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // delete user from Auth (this also cascades to your tables if you added ON DELETE CASCADE)
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
    if (delErr) return res.status(400).json({ error: 'Auth error deleting user', details: delErr.message });

    // If you kept orders as SET NULL, you’re done. If you want additional cleanup,
    // you could also delete storage folders etc. here.

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[users/delete] error', e);
    res.status(500).json({ error: 'Server error' });
  }
}
