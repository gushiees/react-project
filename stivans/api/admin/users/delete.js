// /api/admin/users/delete.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // must be service role
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// very basic guard: require an authenticated admin from your app
async function assertAdmin(req) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (prof?.role !== 'admin') return null;
    return user;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await assertAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    // 1) Gather the user’s order IDs
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('user_id', userId);

    if (ordersErr) {
      console.error('[delete] fetch orders error:', ordersErr);
      return res.status(400).json({ error: 'Database error fetching orders', details: ordersErr.message || ordersErr });
    }

    const orderIds = (orders || []).map(o => o.id);
    // 2) Delete child rows that reference those orders (if any)
    if (orderIds.length > 0) {
      // order_items
      const { error: oiErr } = await supabaseAdmin
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (oiErr) {
        console.error('[delete] order_items error:', oiErr);
        return res.status(400).json({ error: 'Database error deleting order items', details: oiErr.message || oiErr });
      }

      // cadaver_details
      const { error: cvErr } = await supabaseAdmin
        .from('cadaver_details')
        .delete()
        .in('order_id', orderIds);
      if (cvErr) {
        console.error('[delete] cadaver_details error:', cvErr);
        return res.status(400).json({ error: 'Database error deleting cadaver details', details: cvErr.message || cvErr });
      }

      // payments (if linked to orders by order_id)
      const { error: payErr } = await supabaseAdmin
        .from('payments')
        .delete()
        .in('order_id', orderIds);
      if (payErr) {
        console.error('[delete] payments error:', payErr);
        return res.status(400).json({ error: 'Database error deleting payments', details: payErr.message || payErr });
      }

      // finally delete orders
      const { error: delOrdersErr } = await supabaseAdmin
        .from('orders')
        .delete()
        .in('id', orderIds);
      if (delOrdersErr) {
        console.error('[delete] orders error:', delOrdersErr);
        return res.status(400).json({ error: 'Database error deleting orders', details: delOrdersErr.message || delOrdersErr });
      }
    }

    // 3) Delete user-scoped tables
    // user_addresses
    const { error: addrErr } = await supabaseAdmin
      .from('user_addresses')
      .delete()
      .eq('user_id', userId);
    if (addrErr) {
      console.error('[delete] user_addresses error:', addrErr);
      return res.status(400).json({ error: 'Database error deleting addresses', details: addrErr.message || addrErr });
    }

    // payment_methods
    const { error: pmErr } = await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('user_id', userId);
    if (pmErr) {
      console.error('[delete] payment_methods error:', pmErr);
      return res.status(400).json({ error: 'Database error deleting payment methods', details: pmErr.message || pmErr });
    }

    // profiles (FK to auth.users; you added ON DELETE CASCADE, but we remove explicitly anyway)
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profErr) {
      console.error('[delete] profiles error:', profErr);
      return res.status(400).json({ error: 'Database error deleting profile', details: profErr.message || profErr });
    }

    // 4) Delete the auth user (last)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error('[delete] auth deleteUser error:', authErr);
      return res.status(400).json({ error: 'Auth error deleting user', details: authErr.message || authErr });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[delete] unexpected error:', e);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
