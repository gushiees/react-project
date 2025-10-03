// /api/admin/users/list.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

async function assertAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('No auth');

  const { data: uData, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !uData?.user?.id) throw new Error('Bad auth');
  const uid = uData.user.id;

  const { data: prof, error: pErr } = await supa
    .from('profiles').select('role').eq('id', uid).maybeSingle();
  if (pErr) throw pErr;
  if (!prof || prof.role !== 'admin') throw new Error('Not admin');
  return true;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    await assertAdmin(req);

    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.max(1, Math.min(200, Number(req.query.perPage || 50)));
    const q = (req.query.q || '').trim();

    // Pull users from auth
    const { data, error } = await supa.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return res.status(400).json({ error: error.message || 'Auth list failed' });

    let users = data?.users || [];

    // Simple search by email (client already filters, this helps)
    if (q) {
      const qq = q.toLowerCase();
      users = users.filter(u => (u.email || '').toLowerCase().includes(qq));
    }

    // join roles from profiles
    const ids = users.map(u => u.id);
    let rolesMap = {};
    if (ids.length) {
      const { data: profs, error: perr } = await supa
        .from('profiles').select('id, role').in('id', ids);
      if (!perr && profs) {
        for (const p of profs) rolesMap[p.id] = p.role || 'user';
      }
    }

    const shaped = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: rolesMap[u.id] || 'user',
    }));

    res.status(200).json({ users: shaped, page, perPage });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to list users' });
  }
}
