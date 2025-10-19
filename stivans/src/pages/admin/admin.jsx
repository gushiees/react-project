// src/pages/admin/admin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaBoxOpen, FaUsers, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../AuthContext.jsx";
import AdminProducts from "./AdminProducts.jsx"; // Import the component
import AdminUsers from "./AdminUsers.jsx";     // Import the component
import "./admin.css"; // Import the main layout CSS

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  // Active section state - default to 'products'
  const [activeSection, setActiveSection] = useState("products");

  // ----- AUTH GUARD -----
  // This effect checks authentication status and role on mount and when auth state changes.
  useEffect(() => {
    // Wait until authentication status is determined
    if (!loadingAuth) {
      // If no user is logged in OR the user is not an admin
      if (!user || user.role !== "admin") {
        // Redirect non-admins or logged-out users to the admin login page
        toast.error("Admin access required. Please log in.", { id: 'admin-auth-redirect' });
        // Use replace to prevent going back to the admin page via browser history
        navigate("/admin/login", { replace: true });
      }
      // If user is logged in and IS an admin, do nothing (allow rendering)
    }
  }, [user, loadingAuth, navigate]); // Dependencies: run when auth status or user changes

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      navigate("/admin/login"); // Redirect to admin login after successful logout
    } catch (err) {
      console.error("Failed to log out:", err);
      toast.error("Logout failed: " + err.message);
    }
  };

  // ----- RENDER -----

  // Show a loading state while authentication is being checked
  if (loadingAuth) {
    return (
      <div className="admin-layout">
         {/* Basic layout structure during load */}
         <aside className="admin-sidebar loading-state">
             <div className="admin-sidebar-header"><h2>Admin Menu</h2></div>
         </aside>
         <main className="admin-main-content">
             <div className="admin-content-header"><h1>Admin Dashboard</h1></div>
             <p>Verifying access…</p> {/* Loading message */}
         </main>
      </div>
    );
  }

  // If auth has loaded but the user is not an admin (redundant check due to useEffect, but safe)
  // This prevents rendering the admin UI briefly before redirection happens.
  if (!user || user.role !== "admin") {
     // Render nothing, as the useEffect will handle the redirect.
     return null;
  }

  // --- Render the main admin layout ONLY if authenticated as admin ---
  return (
    <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
             <div className="admin-sidebar-header">
                <h2>Admin Menu</h2>
                {/* Optional: Display admin email */}
                {/* <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', wordBreak: 'break-all' }}>{user.email}</p> */}
             </div>
             <nav className="admin-sidebar-nav" aria-label="Admin Sections">
                {/* Products Button */}
                <button
                   onClick={() => setActiveSection("products")}
                   className={activeSection === "products" ? "active" : ""}
                   aria-current={activeSection === 'products' ? 'page' : undefined} // Accessibility
                >
                   <FaBoxOpen aria-hidden="true" /> Products
                </button>
                {/* Users Button */}
                <button
                   onClick={() => setActiveSection("users")}
                   className={activeSection === "users" ? "active" : ""}
                   aria-current={activeSection === 'users' ? 'page' : undefined} // Accessibility
                >
                   <FaUsers aria-hidden="true" /> Users
                </button>
                {/* Add more sections here if needed */}
             </nav>
             {/* Logout Button in Footer */}
             <div className="admin-sidebar-footer">
                <button onClick={handleLogout} className="logout-button sidebar-logout">
                   <FaSignOutAlt aria-hidden="true" /> Logout
                </button>
             </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main-content">
             {/* Header inside main content */}
             <div className="admin-content-header">
                 <h1>Admin Dashboard</h1>
                 {/* Optional: Add breadcrumbs or user info */}
                 {/* <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Welcome, {user.email}</span> */}
             </div>

             {/* Conditionally render the active section component */}
             {/* Mount/Unmount components based on selection */}
             {activeSection === "products" && <AdminProducts />}
             {activeSection === "users" && <AdminUsers />}
             {/* Add conditions for other sections here */}

        </main>
    </div>
  );
}