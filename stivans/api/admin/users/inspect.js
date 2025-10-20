// /api/admin/users/inspect.js
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
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // --- Authenticate admin and get their ID ---
    const adminUserId = await getAdminUserId(req);

    // ***** UPDATE last_active_at for ADMIN *****
    const { error: updateActiveErr } = await supa
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', adminUserId); // <-- Use admin's ID

    if (updateActiveErr) {
        console.warn(`[/api/admin/users/inspect] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- Process user inspection ---
    const userId = req.query.userId; // User ID to inspect
    if (!userId) return res.status(400).json({ error: 'Missing userId' }); //

    // PROFILE of the target user
    const { data: profile, error: profErr } = await supa
      .from('profiles')
      .select('id, full_name, phone_number, role, created_at, updated_at, last_active_at') // Include last_active_at
      .eq('id', userId)
      .maybeSingle(); //
    if (profErr) throw profErr;

    // ADDRESSES of the target user
    const { data: addresses, error: addrErr } = await supa
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }); //
    if (addrErr) throw addrErr;

    // CART of the target user
    const { data: cartRow } = await supa.from('carts').select('id').eq('user_id', userId).maybeSingle(); //
    let cart = { id: null, items: [] };
    if (cartRow?.id) {
      const { data: items, error: ciErr } = await supa
        .from('cart_items')
        .select(`id, quantity, product:products(id, name, price, image_url)`) //
        .eq('cart_id', cartRow.id);
      if (ciErr) throw ciErr;
      cart = { id: cartRow.id, items: items || [] }; //
    }

    // ORDERS of the target user
    const { data: orders, error: ordErr } = await supa
      .from('orders')
      .select(`id, status, created_at, updated_at, shipping_address, billing_address, subtotal, tax, shipping, total, xendit_invoice_id, order_items (id, product_id, name, price, quantity, image_url)`) // Added xendit_invoice_id
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); //
    if (ordErr) throw ordErr;

    res.status(200).json({ profile, addresses, cart, orders }); //

  } catch (e) {
    if (e.message === 'No auth' || e.message === 'Bad auth' || e.message === 'Not admin') {
        return res.status(401).json({ error: e.message });
    }
    console.error('Inspect user error:', e);
    res.status(400).json({ error: e.message || 'Failed to inspect user' });
  }
}