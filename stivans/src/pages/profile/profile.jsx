<<<<<<< Updated upstream
import "./profile.css";
=======
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

  //const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // The error state is now commented out for future use.
  // const [error, setError] = useState(null); 

  const isGuest = !user || !user.token;

  useEffect(() => {
    setLoading(false); 
  }, [user]);

  const displayName = user?.firstName || user?.name || 'Guest';

  const getLinkClass = (path) => {
    if (path === '/profile' && location.pathname === '/profile') return 'menu-item active';
    return location.pathname.startsWith(path) && path !== '/profile' ? 'menu-item active' : 'menu-item';
  };
>>>>>>> Stashed changes

export default function Profile() {
  return (
<<<<<<< Updated upstream
    <div style={{ padding: "2rem" }}>
      <h1>Profile Page</h1>
      <p>Welcome! This is a protected route.</p>
=======
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
                    //orders={orders} 
                    loading={loading}
                    // Since 'error' is commented out, we don't pass it.
                  />} 
                />
                <Route path="settings" element={<Settings />} />
                <Route path="payments" element={<Payments />} />
                <Route path="addresses" element={<Addresses />} />
            </Routes>
          )}
        </div>
      </div>
>>>>>>> Stashed changes
    </div>
  );
}
