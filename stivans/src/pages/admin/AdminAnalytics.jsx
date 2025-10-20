import React, { useState, useEffect, useCallback } from 'react';
import { FaSync, FaChartBar, FaBox, FaSignInAlt, FaShippingFast } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { fetchAdminAPI } from '../../utils/adminApi.js';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import './AdminAnalytics.css';

const StatCard = ({ title, value, icon, period }) => (
  <div className="stat-card">
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-info">
      <p>{title}</p>
      <h3>{value}</h3>
      <span>{`Last ${period}`}</span>
    </div>
  </div>
);

export default function AdminAnalytics() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    ordersCount: 0,
    userLogins: 'N/A',
    unshippedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days'); // 'today', 'yesterday', '7days', '30days'

  const handleAuthError = useCallback(() => {
    logout();
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const toastId = toast.loading('Fetching analytics data...');
    try {
      const endpoint = new URL('/api/admin/analytics', window.location.origin);
      endpoint.searchParams.set('period', period);

      const data = await fetchAdminAPI(endpoint.toString(), { method: 'GET' }, handleAuthError);
      
      setStats({
        ordersCount: data.ordersCount,
        userLogins: data.userLogins,
        unshippedOrders: data.unshippedOrders,
      });
      toast.success('Analytics data updated!', { id: toastId });
    } catch (error) {
      if (error.message !== 'Authentication required') {
        console.error("Failed to fetch analytics:", error);
        toast.error(`Failed to load analytics: ${error.message}`, { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  }, [period, handleAuthError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const periodLabel = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7days': '7 Days',
    '30days': '30 Days',
  }[period];

  return (
    <div className="admin-section analytics-section">
      <div className="analytics-header">
        <h2><FaChartBar /> Analytics Overview</h2>
        <div className="analytics-controls">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="30days">Last 30 Days</option>
            <option value="7days">Last 7 Days</option>
            <option value="yesterday">Yesterday</option>
            <option value="today">Today</option>
          </select>
          <button onClick={fetchAnalytics} disabled={loading} className="refresh-btn">
            <FaSync className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>
      
      <div className="stats-grid">
        <StatCard 
          title="Total Orders" 
          value={loading ? '...' : stats.ordersCount} 
          icon={<FaBox />}
          period={periodLabel}
        />
        <StatCard 
          title="User Logins" 
          value={loading ? '...' : stats.userLogins} 
          icon={<FaSignInAlt />}
          period={periodLabel}
        />
        <StatCard 
          title="Unshipped Orders" 
          value={loading ? '...' : stats.unshippedOrders} 
          icon={<FaShippingFast />}
          period={periodLabel}
        />
      </div>
       <div className="analytics-note">
        <p><strong>Note on User Logins:</strong> Tracking user logins requires specific database setup (e.g., a dedicated logging table and triggers) which is not currently implemented. This metric is a placeholder.</p>
      </div>
    </div>
  );
}
