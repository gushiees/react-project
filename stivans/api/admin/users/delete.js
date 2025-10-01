// /api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function assertAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('Unauthorized');

  const { data: uData, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !uData?.user) throw new Error('Unauthorized');

  const { data: profile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', uData.user.id)
    .single();
  if (pErr || profile?.role !== 'admin') throw new Error('Forbidden');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await assertAdmin(req);
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // 1) Clean up app data that references the user (bypasses RLS via service role)
    // Adjust to your preference: cascade delete vs keeping orphaned orders.
    // Here we delete children then the profile row.
    await supabaseAdmin.from('payment_methods').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_addresses').delete().eq('user_id', userId);

    // If you want to keep historical orders, comment the next line; if not, delete them:
    // await supabaseAdmin.from('orders').delete().eq('user_id', userId);

    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 2) Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin delete user]', e);
    const msg = /Unauthorized|Forbidden/.test(e.message) ? e.message : 'Server error';
    res.status(/Unauthorized|Forbidden/.test(msg) ? 401 : 500).json({ error: msg });
  }
}
