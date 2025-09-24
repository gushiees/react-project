// In profile.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaCog,
  FaCreditCard,
  FaMapMarkerAlt
} from 'react-icons/fa';
import './profile.css';
import { useAuth } from '../../AuthContext.jsx';

// --- UPDATED: Import Header and Footer ---
import Header from '../../components/header/header.jsx';
import Footer from '../../components/footer/footer.jsx';

// Imports for subpages
import ProfileContent from './profilecontent.jsx';
import Settings from './settings.jsx';
import Payments from './payments.jsx';
import Addresses from './addresses.jsx';

const Profile = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const isGuest = !user;

  useEffect(() => {
    setLoading(false);
  }, [user]);

  // --- UPDATED LINE ---
  const displayName = user?.email ? user.email.split("@")[0] : 'Guest';

  const getLinkClass = (path) => {
    if (path === '/profile' && location.pathname === '/profile') return 'menu-item active';
    return location.pathname.startsWith(path) && path !== '/profile' ? 'menu-item active' : 'menu-item';
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    // --- UPDATED: Wrapped in a Fragment with Header and Footer ---
    <>
      <Header />
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
            <a href="#" onClick={handleLogout} className="logout-button">Logout</a>
          </aside>

          <div className="main-content">
            {isGuest ? (
              <div className="profile-card guest-section">
                <h3>You're browsing as a guest</h3>
                <p>You can add items to your cart, but you'll need to register to save your profile and orders.</p>
                <a href="/register" className="register-button">Go to Registration</a>
                <a href="/shop" className="continue-button">Continue as Guest</a>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={
                  <ProfileContent 
                    user={user} 
                    loading={loading}
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
      <Footer />
    </>
  );
};

export default Profile;