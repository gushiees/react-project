import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Require a valid session (front-end sends Bearer token)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No auth token' });

    const userClient = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: uData, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !uData?.user) return res.status(401).json({ error: 'Invalid token' });

    // (Optional) check if requester is admin by reading your profiles table
    // const { data: prof } = await admin.from('profiles').select('role').eq('id', uData.user.id).single();
    // if (prof?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const page = Number(req.query.page || 1);
    const perPage = Math.min(Number(req.query.perPage || 50), 200);
    const q = (req.query.q || '').trim().toLowerCase();

    // Admin API to list users
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage
    });
    if (error) throw error;

    let users = data?.users || [];
    if (q) {
      users = users.filter(u => (u.email || '').toLowerCase().includes(q));
    }

    return res.status(200).json({ users });
  } catch (e) {
    console.error('[users/list] error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
