import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  FaUser,
  FaCog,
  FaCreditCard,
  FaMapMarkerAlt
} from 'react-icons/fa';
import './profile.css';
import { useUser } from '../../contexts/UserContext';

// Imports for subpages
import ProfileContent from './profilecontent.jsx';
import Settings from './settings.jsx';
import Payments from './payments.jsx';
import Addresses from './addresses.jsx';

const Profile = () => {
  const { user } = useUser();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isGuest = !user || !user.token;

  useEffect(() => {
    // The API call to fetch orders has been removed for now.
    // We just set loading to false to prevent the component from
    // being stuck in a loading state.
    setLoading(false); 

    /*
    const fetchOrders = async () => {
      if (isGuest) {
        setLoading(false);
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(${API_URL}/api/orders/myorders, {
          headers: {
            Authorization: Bearer ${user.token},
          },
        });

        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError('Failed to load orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    */
  }, [user]);

  const displayName = user?.firstName || user?.name || 'Guest';

  const getLinkClass = (path) => {
    if (path === '/profile' && location.pathname === '/profile') return 'menu-item active';
    return location.pathname.startsWith(path) && path !== '/profile' ? 'menu-item active' : 'menu-item';
  };

  return (
    <div className="app">
      <div className="profile-main">
        <aside className="sidebar">
          <div>
            <div className="profile-info">
              <div className="avatar-placeholder"></div>
              <h2>{displayName}</h2>
            </div>
            <nav className="menu-list">
              <Link to="/profile" className={getLinkClass('/profile')}><FaUser /> Profile</Link>
              <Link to="/profile/settings" className={getLinkClass('/profile/settings')}><FaCog /> Settings</Link>
              <Link to="/profile/payments" className={getLinkClass('/profile/payments')}><FaCreditCard /> Payments</Link>
              <Link to="/profile/addresses" className={getLinkClass('/profile/addresses')}><FaMapMarkerAlt /> Address</Link>
            </nav>
          </div>
          <a href="#" className="logout-button">Logout</a>
        </aside>

        <div className="main-content">
          {isGuest ? (
             <div className="profile-card guest-section">
                <h3>You’re browsing as a guest</h3>
                <p>You can add items to your cart, but you’ll need to register to save your profile and orders.</p>
                <a href="/register" className="register-button">Go to Registration</a>
                <a href="/shop" className="continue-button">Continue as Guest</a>
             </div>
          ) : (
            <Routes>
                <Route path="/" element={
                  <ProfileContent 
                    user={user} 
                    orders={orders} 
                    loading={loading} 
                    error={error} 
                  />} 
                />
                <Route path="settings" element={<Settings />} />
                <Route path="payments" element={<Payments />} />
                <Route path="addresses" element={<Addresses />} />
            </Routes>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;