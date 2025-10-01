// /api/admin/users/list.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Verify caller is an authenticated admin
async function assertAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('Unauthorized');

  // Get the user from the token
  const { data: uData, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !uData?.user) throw new Error('Unauthorized');

  // Check role from profiles
  const { data: profile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', uData.user.id)
    .single();
  if (pErr || profile?.role !== 'admin') throw new Error('Forbidden');
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await assertAdmin(req);

    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 50), 200); // cap
    const q = (req.query.q || '').trim().toLowerCase();

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return res.status(400).json({ error: error.message });

    // Simple client-side email search
    const users = (data?.users || []).filter(u =>
      q ? (u.email || '').toLowerCase().includes(q) : true
    );

    res.status(200).json({
      users,
      page,
      perPage,
      total: data?.total ?? users.length,
    });
  } catch (e) {
    console.error('[admin list users]', e);
    const msg = /Unauthorized|Forbidden/.test(e.message) ? e.message : 'Server error';
    res.status(/Unauthorized|Forbidden/.test(msg) ? 401 : 500).json({ error: msg });
  }
}
