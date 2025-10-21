// /api/admin/analytics.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

async function assertAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('No auth');

  const { data: uData, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !uData?.user?.id) throw new Error('Bad auth');
  const uid = uData.user.id;

  const { data: prof, error: pErr } = await supa
    .from('profiles').select('role').eq('id', uid).maybeSingle();
  if (pErr) throw pErr;
  if (!prof || prof.role !== 'admin') throw new Error('Not admin');
  return true;
}

const getTimeRange = (timeframe) => {
    const now = new Date();
    const start = new Date();
    switch (timeframe) {
        case '1d':
            start.setHours(0, 0, 0, 0);
            break;
        case '7d':
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            now.setDate(now.getDate() - 1);
            now.setHours(23, 59, 59, 999);
            break;
        case '30d':
        default:
            start.setDate(now.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            break;
    }
    return { start: start.toISOString(), end: now.toISOString() };
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    await assertAdmin(req);

    const timeframe = req.query.timeframe || '30d';
    const { start, end } = getTimeRange(timeframe);

    // 1. Get All Paid Orders in the timeframe for stats and graphs
    const { data: ordersData, error: ordersError } = await supa
        .from('orders')
        .select('total, created_at')
        .eq('status', 'paid') 
        .gte('created_at', start)
        .lte('created_at', end);

    if (ordersError) throw ordersError;
    
    // --- Calculate Aggregates and Graph Data ---
    const ordersCount = ordersData.length;
    const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);

    // Group by day for the graph
    const dailyData = ordersData.reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = { orders: 0, revenue: 0 };
        }
        acc[date].orders += 1;
        acc[date].revenue += order.total || 0;
        return acc;
    }, {});

    const graphData = {
      orders: Object.entries(dailyData).map(([date, values]) => ({ date, value: values.orders })),
      revenue: Object.entries(dailyData).map(([date, values]) => ({ date, value: values.revenue })),
    };

    // 2. Get Unshipped Orders (this is not time-based)
    const { count: unshippedOrdersCount, error: unshippedError } = await supa
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['paid', 'processing']); 

    if (unshippedError) throw unshippedError;
    
    res.status(200).json({
      ordersCount: ordersCount ?? 0,
      totalRevenue: totalRevenue,
      unshippedOrdersCount: unshippedOrdersCount ?? 0,
      siteVisits: null, // Placeholder
      graphData: graphData, // Add graph data to response
    });

  } catch (e) {
    console.error('[analytics API] error:', e);
    res.status(400).json({ error: e.message || 'Failed to fetch analytics data' });
  }
}

