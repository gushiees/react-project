import React from 'react';
import {
  FaUser, FaCog, FaCreditCard, FaMapMarkerAlt
} from 'react-icons/fa';
import './profile.css';

const Profile = () => {
  return (
    <div className="app">
      <div className="profile-main">
        {/* 🔷 Sidebar */}
        <aside className="sidebar">
          <div>
            <div className="profile-info">
              <div className="avatar-placeholder">👤</div>
              <h2>Guest</h2>
            </div>
            <nav className="menu-list">
              <a href="#" className="menu-item"><FaUser /> Profile</a>
              <a href="#" className="menu-item"><FaCog /> Settings</a>
              <a href="#" className="menu-item"><FaCreditCard /> Payments</a>
              <a href="#" className="menu-item active"><FaMapMarkerAlt /> Address</a>
            </nav>
          </div>
          <a href="#" className="logout-button">Logout</a>
        </aside>

        {/* 🔷 Main Content */}
        <div className="main-content">
          <div className="guest-section">
            <h3>You’re browsing as a guest</h3>
            <p>You can add items to your cart, but you’ll need to register to save your profile and orders.</p>
            <a href="#" className="register-button">Go to Registration</a>
            <a href="#" className="continue-button">Continue as Guest</a>
          </div>

          <div className="user-details">
            <p><strong>Email:</strong> Not provided</p>
            <p><strong>Phone:</strong> Not provided</p>
            <p><strong>Registration Date:</strong> Not available</p>
          </div>

          <div className="order-section">
            <h2>Completed Orders</h2>
            <p>You don't have any completed orders yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
