// /api/admin/analytics.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

// Helper to assert admin privileges
async function assertAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('No auth token');

  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error || !user) throw new Error('Invalid auth token');

  const { data: profile } = await supa.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Admin privileges required');
}

// Helper to calculate start date based on period
function getStartDate(period) {
    const now = new Date();
    switch (period) {
        case 'today':
            now.setHours(0, 0, 0, 0);
            return now;
        case 'yesterday':
            now.setDate(now.getDate() - 1);
            now.setHours(0, 0, 0, 0);
            return now;
        case '7days':
            now.setDate(now.getDate() - 7);
            return now;
        case '30days':
        default:
            now.setDate(now.getDate() - 30);
            return now;
    }
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await assertAdmin(req);

    const { period = '30days' } = req.query;
    const startDate = getStartDate(period);

    // 1. Total orders in the period
    const { count: ordersCount, error: ordersError } = await supa
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    if (ordersError) throw ordersError;

    // 2. Total user sign-ins (logins) in the period
    // Supabase auth logs are not directly queryable via API for this.
    // A common workaround is to track logins in a separate table using triggers.
    // For this example, we will return a placeholder value.
    // In a real scenario, you would query your 'user_logins' table.
    const userLogins = 'N/A'; // Placeholder

    // 3. Unshipped orders (assuming 'paid' status means it needs shipping)
    const { count: unshippedCount, error: unshippedError } = await supa
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'paid') // Assuming 'paid' orders are the ones to be shipped
      .gte('created_at', startDate.toISOString());

    if (unshippedError) throw unshippedError;
    
    // You could also add other stats like total revenue here if needed

    res.status(200).json({
      ordersCount: ordersCount ?? 0,
      userLogins: userLogins, // Placeholder
      unshippedOrders: unshippedCount ?? 0,
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    res.status(400).json({ error: error.message || 'An error occurred.' });
  }
}

