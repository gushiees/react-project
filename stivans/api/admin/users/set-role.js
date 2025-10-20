// /api/admin/users/set-role.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; //
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { //
  auth: { persistSession: false, autoRefreshToken: false }, //
});

// Function to assert admin and get ID
async function getAdminUserId(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new Error('No auth token'); //

    const { data: uData, error: uErr } = await supa.auth.getUser(token);
    if (uErr || !uData?.user) throw new Error('Invalid token'); //
    const adminId = uData.user.id;

    // Check profile for admin role
    const { data: prof } = await supa.from('profiles').select('role').eq('id', adminId).single();
    if (prof?.role !== 'admin') throw new Error('Not an admin'); //

    return adminId; // Return admin ID
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' }); //
  try {
    // --- Authenticate admin and get their ID ---
    const adminUserId = await getAdminUserId(req);

    // ***** UPDATE last_active_at for ADMIN *****
    const { error: updateActiveErr } = await supa
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', adminUserId); // <-- Use admin's ID

    if (updateActiveErr) {
        console.warn(`[/api/admin/users/set-role] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- Process role change ---
    const { userId, role } = req.body || {};
    if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' }); //
    if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' }); //

    const { error: upErr } = await supa.from('profiles').update({ role }).eq('id', userId); //
    if (upErr) return res.status(400).json({ error: upErr.message });

    return res.status(200).json({ ok: true }); //

  } catch (e) {
     if (e.message === 'No auth token' || e.message === 'Invalid token' || e.message === 'Not an admin') {
        return res.status(401).json({ error: e.message }); // Or 403
    }
    console.error('[set-role] error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
// export const config = { runtime: 'nodejs' }; // Keep if using node runtime