import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaUsers, FaChartBar, FaBox, FaSignInAlt, FaShippingFast, FaRedo } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { fetchAdminAPI } from '../../utils/adminApi.js';
import { useAuth } from '../../AuthContext.jsx';
import './AdminAnalytics.css';

const StatCard = ({ icon, title, value, change, isLoading }) => (
  <div className={`stat-card ${isLoading ? 'loading' : ''}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <p className="stat-title">{title}</p>
      {isLoading ? (
        <div className="stat-value-loading" />
      ) : (
        <p className="stat-value">{value}</p>
      )}
    </div>
  </div>
);

export default function AdminAnalytics() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const initialFetchDone = useRef(false);

  const handleAuthError = useCallback(() => {
    if (logout) logout();
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  const fetchAnalytics = useCallback(async (currentFrame) => {
    const toastId = toast.loading(`Fetching analytics data for '${currentFrame}'...`);
    setLoading(true);
    try {
      const endpoint = new URL("/api/admin/analytics", window.location.origin);
      endpoint.searchParams.set('timeframe', currentFrame);
      const data = await fetchAdminAPI(endpoint.toString(), {}, handleAuthError);
      setStats(data);
      toast.success("Analytics data updated!", { id: toastId });
    } catch (e) {
      if (e.message !== 'Authentication required') {
        console.error("Failed to fetch analytics:", e);
        toast.error(`Failed to load analytics: ${e.message}`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    if (!initialFetchDone.current) {
      fetchAnalytics(timeframe);
      initialFetchDone.current = true;
    }
  }, [fetchAnalytics, timeframe]);

  const handleTimeframeChange = (e) => {
    const newTimeframe = e.target.value;
    setTimeframe(newTimeframe);
    fetchAnalytics(newTimeframe);
  };

  const handleRefresh = () => {
    fetchAnalytics(timeframe);
  };
  
  const timeframeLabel = {
    '1d': 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    'yesterday': 'Yesterday'
  }[timeframe];


  return (
    <div className="admin-section analytics-section">
      <div className="analytics-header">
        <h2>Analytics Overview</h2>
        <div className="analytics-controls">
          <select value={timeframe} onChange={handleTimeframeChange}>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="1d">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
          <button onClick={handleRefresh} className="refresh-btn" aria-label="Refresh data">
            <FaRedo />
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<FaChartBar />}
          title={`Orders (${timeframeLabel})`}
          value={stats?.ordersCount ?? 0}
          isLoading={loading}
        />
        <StatCard
          icon={<FaUsers />}
          title="New Users"
          value={stats?.newUsersCount ?? 0}
          isLoading={loading}
        />
        <StatCard
          icon={<FaSignInAlt />}
          title="User Logins"
          value={stats?.loginsCount ?? 0}
          isLoading={loading}
        />
        <StatCard
          icon={<FaShippingFast />}
          title="Unshipped Orders"
          value={stats?.unshippedOrdersCount ?? 0}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

