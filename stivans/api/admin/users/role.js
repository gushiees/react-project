// /api/admin/users/role.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; //
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } }); //

// Function to assert admin and get ID
async function getAdminUserId(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('No auth');

  const { data: uData, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !uData?.user?.id) throw new Error('Bad auth');
  const adminId = uData.user.id;

  const { data: prof, error: pErr } = await supa
    .from('profiles').select('role').eq('id', adminId).maybeSingle();
  if (pErr) throw pErr;
  if (!prof || prof.role !== 'admin') throw new Error('Not admin');
  return adminId; // Return the admin ID
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' }); //

    // --- Authenticate admin and get their ID ---
    const adminUserId = await getAdminUserId(req);

    // ***** UPDATE last_active_at for ADMIN *****
    const { error: updateActiveErr } = await supa
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', adminUserId); // <-- Use admin's ID

    if (updateActiveErr) {
        console.warn(`[/api/admin/users/role] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- Process role change ---
    const { userId, role } = req.body || {};
    const allowed = ['user', 'admin']; //
    if (!userId || !allowed.includes(role)) { //
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { error } = await supa.from('profiles').update({ role }).eq('id', userId); //
    if (error) return res.status(400).json({ error: error.message || 'Update role failed' });

    res.status(200).json({ ok: true }); //

  } catch (e) {
    if (e.message === 'No auth' || e.message === 'Bad auth' || e.message === 'Not admin') {
        return res.status(401).json({ error: e.message });
    }
    console.error('Update role error:', e);
    res.status(400).json({ error: e.message || 'Failed to update role' });
  }
}