// /api/admin/users/list.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // require a logged-in admin (we trust your client to send a user token)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) return res.status(401).json({ error: 'Invalid session' });

    // check role from your profiles table
    const { data: profile, error: profErr } = await supabase
      .from('profiles').select('role').eq('id', userData.user.id).single();
    if (profErr || profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    // pagination + search
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage || '50', 10), 1), 200);
    const q = (req.query.q || '').trim().toLowerCase();

    // List users using service role (GoTrue Admin API via supabase-js)
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    if (listErr) return res.status(400).json({ error: listErr.message || 'List error' });

    // optional filter by email on the server for convenience
    const users = (list?.users || []).filter(u =>
      !q ? true : (u.email || '').toLowerCase().includes(q)
    ).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    res.status(200).json({ users, page, perPage });
  } catch (e) {
    console.error('[users/list] error', e);
    res.status(500).json({ error: 'Server error' });
  }
}
