// /api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('[admin/delete] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// (Optional) force Node runtime on Vercel
export const config = { runtime: 'nodejs18.x' };

function fail(res, status, msg, details) {
  return res.status(status).json({ error: msg, details });
}

async function assertAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false, reason: 'No auth token' };

  // Validate session
  const { data: userData, error: tokenErr } = await admin.auth.getUser(token);
  if (tokenErr || !userData?.user?.id) {
    return { ok: false, reason: tokenErr?.message || 'Invalid session token' };
  }

  // Check role in profiles
  const { data: prof, error: profErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profErr) return { ok: false, reason: `Profile lookup failed: ${profErr.message}` };
  if (prof?.role !== 'admin') return { ok: false, reason: 'Not an admin' };

  return { ok: true, adminId: userData.user.id };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const guard = await assertAdmin(req);
  if (!guard.ok) return fail(res, 401, 'Unauthorized', guard.reason);

  const { userId } = req.body || {};
  if (!userId) return fail(res, 400, 'userId is required');

  try {
    // 0) Make sure target user exists
    const { data: target, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr) return fail(res, 400, 'Auth lookup failed', getErr.message || getErr);
    if (!target?.user) return fail(res, 404, 'User not found');

    // 1) Gather order ids for this user
    const { data: orders, error: ordErr } = await admin
      .from('orders')
      .select('id')
      .eq('user_id', userId);

    if (ordErr) return fail(res, 400, 'Failed to fetch orders', ordErr.message || ordErr);

    const orderIds = (orders || []).map(o => o.id);

    // 2) Delete dependents tied to orders
    if (orderIds.length) {
      // payments
      const { error: payErr } = await admin
        .from('payments')
        .delete()
        .in('order_id', orderIds);
      if (payErr) return fail(res, 400, 'Failed to delete payments', payErr.message || payErr);

      // cadaver_details
      const { error: cadErr } = await admin
        .from('cadaver_details')
        .delete()
        .in('order_id', orderIds);
      if (cadErr) return fail(res, 400, 'Failed to delete cadaver details', cadErr.message || cadErr);

      // order_items
      const { error: oiErr } = await admin
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (oiErr) return fail(res, 400, 'Failed to delete order items', oiErr.message || oiErr);

      // orders
      const { error: oDelErr } = await admin
        .from('orders')
        .delete()
        .eq('user_id', userId);
      if (oDelErr) return fail(res, 400, 'Failed to delete orders', oDelErr.message || oDelErr);
    }

    // 3) Carts & cart_items
    const { data: carts, error: cartErr } = await admin
      .from('carts')
      .select('id')
      .eq('user_id', userId);
    if (cartErr) return fail(res, 400, 'Failed to fetch carts', cartErr.message || cartErr);

    const cartIds = (carts || []).map(c => c.id);
    if (cartIds.length) {
      const { error: ciErr } = await admin
        .from('cart_items')
        .delete()
        .in('cart_id', cartIds);
      if (ciErr) return fail(res, 400, 'Failed to delete cart items', ciErr.message || ciErr);

      const { error: cDelErr } = await admin
        .from('carts')
        .delete()
        .eq('user_id', userId);
      if (cDelErr) return fail(res, 400, 'Failed to delete carts', cDelErr.message || cDelErr);
    }

    // 4) Other direct tables
    const directTables = [
      ['payment_methods', 'user_id'],
      ['user_addresses', 'user_id'],
      ['profiles', 'id'], // will cascade if you added ON DELETE CASCADE; this is just in case
    ];

    for (const [table, col] of directTables) {
      const { error } = await admin.from(table).delete().eq(col, userId);
      if (error) return fail(res, 400, `Failed to delete from ${table}`, error.message || error);
    }

    // 5) Finally, delete from Auth
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) return fail(res, 400, 'Auth error deleting user', authErr.message || authErr);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin/delete] unexpected:', e);
    return fail(res, 500, 'Unexpected server error', String(e));
  }
}
