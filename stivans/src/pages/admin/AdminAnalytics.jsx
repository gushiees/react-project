import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaShoppingCart, FaDollarSign, FaEye, FaShippingFast, FaRedo } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { fetchAdminAPI } from '../../utils/adminApi.js';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import './AdminAnalytics.css';

const StatCard = ({ icon, title, value, isLoading }) => (
  <div className={`stat-card ${isLoading ? 'loading' : ''}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <p className="stat-title">{title}</p>
      {isLoading ? (
        <div className="stat-value-loading" />
      ) : (
        <p className="stat-value">
          {title.toLowerCase().includes('revenue')
            ? `₱${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : Number(value || 0).toLocaleString('en-US')}
        </p>
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
    const toastId = toast.loading(`Fetching analytics data...`);
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
        <h2>Response Stats</h2>
        <div className="analytics-controls">
          <select value={timeframe} onChange={handleTimeframeChange}>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="1d">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
          <button onClick={handleRefresh} className="refresh-btn" aria-label="Refresh data">
            <FaRedo className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<FaShoppingCart />}
          title={`Orders (${timeframeLabel})`}
          value={stats?.ordersCount ?? '0'}
          isLoading={loading}
        />
        <StatCard
          icon={<FaDollarSign />}
          title={`Revenue (${timeframeLabel})`}
          value={stats?.totalRevenue ?? '0'}
          isLoading={loading}
        />
        <StatCard
          icon={<FaEye />}
          title="Site Visits (Users)"
          value={"N/A"}
          isLoading={false}
        />
        <StatCard
          icon={<FaShippingFast />}
          title="Unshipped Orders"
          value={stats?.unshippedOrdersCount ?? '0'}
          isLoading={loading}
        />
      </div>
      <div className="analytics-note">
        <p><strong>Note:</strong> "Site Visits" requires a third-party analytics tool (like Vercel Analytics or Google Analytics) and is not tracked by default.</p>
      </div>
    </div>
  );
}

