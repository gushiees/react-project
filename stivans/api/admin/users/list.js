// /api/admin/users/list.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

// Function to assert admin and get admin user ID
async function getAdminUserId(req) { // Renamed and modified
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('No auth');

  // Use the regular getUser as this client is already using service key
  const { data: uData, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !uData?.user?.id) throw new Error('Bad auth');
  const adminId = uData.user.id; // <-- Get the Admin's ID

  // Verify the user making the request has an 'admin' role in the profiles table
  const { data: prof, error: pErr } = await supa
    .from('profiles').select('role').eq('id', adminId).maybeSingle();
  if (pErr) throw pErr; // Throw database errors
  if (!prof || prof.role !== 'admin') throw new Error('Not admin'); // Check role

  return adminId; // <-- Return the Admin's ID if checks pass
}

export default async function handler(req, res) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // --- Get Admin User ID (this also handles the authentication check) ---
    const adminUserId = await getAdminUserId(req); // <-- Get admin ID

    // ***** UPDATE last_active_at for the ADMIN making the request *****
    const { error: updateActiveErr } = await supa
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() }) // Set current timestamp
      .eq('id', adminUserId); // <-- Use the admin's ID obtained above

    if (updateActiveErr) {
        // Log the error but don't stop the request
        console.warn(`[/api/admin/users/list] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE last_active_at *****

    // --- Proceed with fetching the user list ---
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.max(1, Math.min(200, Number(req.query.perPage || 50)));
    const q = (req.query.q || '').trim();

    // Pull users list using the admin client
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage });
    if (error) {
        console.error("Supabase auth admin listUsers error:", error);
        return res.status(400).json({ error: error.message || 'Auth list failed' });
    }

    let users = data?.users || [];

    // Simple server-side search filter (optional, can also be done frontend)
    if (q) {
      const qq = q.toLowerCase();
      users = users.filter(u => (u.email || '').toLowerCase().includes(qq));
    }

    // Join roles AND last_active_at from the profiles table for the listed users
    const ids = users.map(u => u.id);
    let profilesMap = {}; // Use a map to store profile data keyed by user ID
    if (ids.length > 0) {
      // Select id, role, and last_active_at for the user IDs in the current list
      const { data: profs, error: perr } = await supa
        .from('profiles')
        .select('id, role, last_active_at') // <-- Fetch last_active_at
        .in('id', ids);

      if (perr) {
          console.error("Error fetching profiles for user list:", perr);
          // Continue without profile data, or throw error? Decide based on requirements.
          // For now, continue but log the error. Roles/last_active might be missing.
      } else if (profs) {
        // Populate the map with fetched profile data
        for (const p of profs) {
            profilesMap[p.id] = {
                role: p.role || 'user', // Default to 'user' if role is null
                last_active_at: p.last_active_at || null // Store last_active_at (null if not set)
            };
        }
      }
    }

    // Shape the final user data array for the response
    const shaped = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at, // User account creation time
      last_sign_in_at: u.last_sign_in_at, // Last successful login time
      // Get role and last_active_at from the map, provide defaults if not found
      role: profilesMap[u.id]?.role || 'user',
      last_active_at: profilesMap[u.id]?.last_active_at || null // <-- Add last_active_at to response
    }));

    // Send the successful response
    res.status(200).json({ users: shaped, page, perPage });

  } catch (e) {
    // Handle specific authentication/authorization errors from getAdminUserId
    if (e.message === 'No auth' || e.message === 'Bad auth' || e.message === 'Not admin') {
        // Return 401 for auth issues, 403 for not being an admin
        return res.status(e.message === 'Not admin' ? 403 : 401).json({ error: e.message });
    }
    // Handle other potential errors during execution
    console.error("Error in /api/admin/users/list handler:", e);
    res.status(500).json({ error: e.message || 'Failed to list users due to server error' });
  }
}