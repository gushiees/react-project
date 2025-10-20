// /api/admin/carts/update.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; //
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } }); //

// Function to assert admin and get ID
async function getAdminUserId(req) { // Combined assertion and ID retrieval
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
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // --- Authenticate admin and get their ID ---
    const adminUserId = await getAdminUserId(req); // <-- Get admin ID

    // ***** UPDATE last_active_at for ADMIN *****
    const { error: updateActiveErr } = await supa
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', adminUserId); // <-- Use admin's ID

    if (updateActiveErr) {
        console.warn(`[/api/admin/carts/update] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- Process cart action ---
    const { action, cartId, itemId } = req.body || {};
    if (!action || !cartId) return res.status(400).json({ error: 'Invalid payload' }); //

    if (action === 'remove-item') {
      if (!itemId) return res.status(400).json({ error: 'Missing itemId' }); //
      const { error } = await supa.from('cart_items').delete().eq('id', itemId).eq('cart_id', cartId); //
      if (error) return res.status(400).json({ error: error.message || 'Remove failed' });
    } else if (action === 'clear') {
      const { error } = await supa.from('cart_items').delete().eq('cart_id', cartId); //
      if (error) return res.status(400).json({ error: error.message || 'Clear failed' });
    } else {
      return res.status(400).json({ error: 'Unsupported action' }); //
    }

    // --- Return fresh cart items ---
    const { data: items, error: ciErr } = await supa
      .from('cart_items')
      .select('id, quantity, product:products(id, name, price, image_url)') //
      .eq('cart_id', cartId);
    if (ciErr) throw ciErr; // Let the main catch block handle this

    res.status(200).json({ items: items || [] }); // Return items (or empty array)
  } catch (e) {
    // Handle specific auth errors from getAdminUserId
    if (e.message === 'No auth' || e.message === 'Bad auth' || e.message === 'Not admin') {
        return res.status(401).json({ error: e.message }); // Or 403 for 'Not admin'
    }
    // Handle other errors
    console.error('Cart update error:', e); // Log the full error
    res.status(400).json({ error: e.message || 'Cart update failed' });
  }
}