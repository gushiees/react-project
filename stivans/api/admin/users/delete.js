// api/admin/users/delete.js

import { createClient } from '@supabase/supabase-js';

const URL  = process.env.SUPABASE_URL;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SVC) {
  console.warn('[admin/delete] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

/**
 * Utility to delete from a table and surface errors with context.
 */
async function safeDelete({ table, where, label }) {
  const q = admin.from(table).delete().match(where);
  const { error, count } = await q.select('*', { count: 'exact' });
  if (error) {
    const info = {
      where: 'db-delete',
      table,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
    throw Object.assign(new Error(`DB delete failed on ${table}`), { info });
  }
  return { table, deleted: count ?? 0, label };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorization } = req.headers;
    const { userId } = req.body || {};
    if (!authorization) return res.status(401).json({ error: 'Missing bearer token' });
    if (!userId)       return res.status(400).json({ error: 'Missing userId' });

    // Verify caller & role
    const token = authorization.replace(/^Bearer\s+/i, '');
    const adminCaller = createClient(URL, SVC);
    const { data: me, error: meErr } = await adminCaller.auth.getUser(token);
    if (meErr || !me?.user) return res.status(401).json({ error: 'Invalid session' });

    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', me.user.id)
      .maybeSingle();
    if (profErr) {
      return res.status(500).json({ error: 'Failed to read caller role', details: profErr.message });
    }
    if (!prof || prof.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin role required' });
    }

    const report = [];

    // --- 1) Delete from public tables FIRST (safe order) ---
    // adjust this list to match your schema; they are all keyed by user_id
    const tablesInOrder = [
      { table: 'payment_methods', where: { user_id: userId } },
      { table: 'user_addresses',  where: { user_id: userId } },
      // Orders: choose ONE of the two blocks below depending on how you want to handle orders.
      // If you want to preserve order history, comment the next line out and ensure FK is SET NULL.
      { table: 'orders',          where: { user_id: userId } },
      // If you keep orders, you may also need to delete cadaver_details/payments after finding order ids.
      // Example (uncomment and adapt if needed):
      // { table: 'payments',       where: { order_id: someId } },
      // { table: 'cadaver_details',where: { order_id: someId } },
      { table: 'profiles',        where: { id: userId } }, // profile row
    ];

    for (const t of tablesInOrder) {
      try {
        const r = await safeDelete({ ...t, label: 'pre-auth' });
        report.push(r);
      } catch (e) {
        // Bubble the exact table failure
        return res.status(400).json({
          error: 'Database error deleting user',
          step: 'db',
          ...e.info,
        });
      }
    }

    // --- 2) Delete from auth.users last ---
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) {
      return res.status(400).json({
        error: 'Auth delete failed',
        step: 'auth',
        code: authErr.code,
        message: authErr.message,
      });
    }
    report.push({ step: 'auth', deleted: 1 });

    return res.status(200).json({ ok: true, where: 'delete-v2', report });
  } catch (e) {
    console.error('[admin/delete] Unexpected', e);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
