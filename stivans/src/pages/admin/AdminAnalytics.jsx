import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FaShoppingCart, FaDollarSign, FaEye, FaShippingFast, FaRedo } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { fetchAdminAPI } from '../../utils/adminApi.js';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import './AdminAnalytics.css';

// SVG Graph Component
const AnalyticsGraph = ({ data, metric }) => {
    const svgRef = useRef(null);
    const [viewBox, setViewBox] = useState('0 0 800 300');

    useEffect(() => {
        const handleResize = () => {
            if (svgRef.current) {
                const { width } = svgRef.current.getBoundingClientRect();
                setViewBox(`0 0 ${width} 300`);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const points = useMemo(() => {
        if (!data || data.length === 0) return '';
        const values = data.map(d => d.value);
        const maxVal = Math.max(...values, 1); // Avoid division by zero
        const width = 800;
        const height = 280; // Padding from top/bottom
        const pointGap = width / (data.length - 1 || 1);
        
        return data.map((point, i) => {
            const x = i * pointGap;
            const y = height - (point.value / maxVal) * (height - 20) + 10; // Scale with padding
            return `${x},${y}`;
        }).join(' ');
    }, [data]);

    const lineColor = metric === 'revenue' ? '#16a34a' : '#3b82f6';

    return (
        <div className="graph-container">
            <svg ref={svgRef} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="analytics-svg">
                <polyline
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />
            </svg>
        </div>
    );
};

const StatCard = ({ icon, title, value, isLoading, cardColor, onClick, isActive }) => (
  <div className={`stat-card ${isLoading ? 'loading' : ''} ${cardColor} ${isActive ? 'active' : ''}`} onClick={onClick}>
    <div className="stat-icon-wrapper">{icon}</div>
    <div className="stat-content">
      {isLoading ? <div className="stat-value-loading" /> : <p className="stat-value">{value}</p>}
      <p className="stat-title">{title}</p>
    </div>
  </div>
);

export default function AdminAnalytics() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeMetric, setActiveMetric] = useState('orders'); // 'orders' or 'revenue'
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

  const handleRefresh = () => fetchAnalytics(timeframe);

  const timeframeLabel = { '1d': 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days', 'yesterday': 'Yesterday' }[timeframe];

  return (
    <div className="admin-section analytics-section">
      <div className="analytics-header">
        <h2>Analytics</h2>
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
      
      <h3 className="analytics-subtitle">Response stats</h3>

      <div className="stats-grid">
        <StatCard
          icon={<FaShoppingCart />}
          title={`Orders (${timeframeLabel})`}
          value={stats?.ordersCount ?? 0}
          isLoading={loading}
          cardColor="blue"
          isActive={activeMetric === 'orders'}
          onClick={() => setActiveMetric('orders')}
        />
        <StatCard
          icon={<FaDollarSign />}
          title={`Revenue (${timeframeLabel})`}
          value={`₱${Number(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          isLoading={loading}
          cardColor="green"
          isActive={activeMetric === 'revenue'}
          onClick={() => setActiveMetric('revenue')}
        />
        <StatCard icon={<FaEye />} title="Site Visits" value={"N/A"} isLoading={false} cardColor="orange" />
        <StatCard icon={<FaShippingFast />} title="Unshipped Orders" value={stats?.unshippedOrdersCount ?? 0} isLoading={loading} cardColor="dark" />
      </div>

      <div className="graph-wrapper">
          <h3 className="analytics-subtitle" style={{ textTransform: 'capitalize' }}>{activeMetric} Breakdown</h3>
          <AnalyticsGraph data={stats?.graphData?.[activeMetric]} metric={activeMetric} />
      </div>

      <div className="analytics-note">
        <p><strong>Note:</strong> "Site Visits" requires a third-party analytics tool and is not tracked by default.</p>
      </div>
    </div>
  );
}

