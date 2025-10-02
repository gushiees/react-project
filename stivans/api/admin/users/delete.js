import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    // Optional: verify requester is admin (profiles.role === 'admin')
    // const { data: prof } = await admin.from('profiles').select('role').eq('id', uData.user.id).single();
    // if (prof?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // This cascades if your FKs are ON DELETE CASCADE and deletes the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[users/delete] auth error', delErr);
      return res.status(400).json({ error: 'Auth error deleting user' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[users/delete] error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
