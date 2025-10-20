// src/pages/admin/admin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaBoxOpen, FaUsers, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../AuthContext.jsx";
import AdminProducts from "./AdminProducts.jsx";
import AdminUsers from "./AdminUsers.jsx";
import adminLogo from "../../assets/stivanlogolight.png"; // Import the logo
import "./admin.css";

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth(); // Get user object
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("products");

  // Auth Guard (remains the same)
  useEffect(() => {
    if (!loadingAuth) {
      if (!user || user.role !== "admin") {
        toast.error("Admin access required. Please log in.", { id: 'admin-auth-redirect' });
        navigate("/admin/login", { replace: true });
      }
    }
  }, [user, loadingAuth, navigate]);

  // Logout Handler (remains the same)
  const handleLogout = async () => {
    try { await logout(); toast.success("Logged out successfully."); navigate("/admin/login"); }
    catch (err) { console.error("Failed to log out:", err); toast.error("Logout failed: " + err.message); }
  };

  // Loading State (remains the same)
  if (loadingAuth) { /* ... loading JSX ... */ }

  // Redirect State (remains the same)
  if (!user || user.role !== "admin") { return null; }

  // --- Render Admin Layout ---
  return (
    <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
             <div className="admin-sidebar-header">
                <img src={adminLogo} alt="St. Ivans Admin Logo" className="admin-sidebar-logo" />
                <h2>Admin Menu</h2>
             </div>
             <nav className="admin-sidebar-nav" aria-label="Admin Sections">
                {/* Navigation Buttons (remain the same) */}
                <button onClick={() => setActiveSection("products")} className={activeSection === "products" ? "active" : ""} aria-current={activeSection === 'products' ? 'page' : undefined} > <FaBoxOpen aria-hidden="true" /> Products </button>
                <button onClick={() => setActiveSection("users")} className={activeSection === "users" ? "active" : ""} aria-current={activeSection === 'users' ? 'page' : undefined} > <FaUsers aria-hidden="true" /> Users </button>
             </nav>
             {/* Sidebar Footer with User Info */}
             <div className="admin-sidebar-footer">
                {/* --- User Info Added Here --- */}
                {user && (
                    <div className="admin-user-info">
                        <p className="user-label">Logged in as:</p>
                        <p>{user.email}</p>
                    </div>
                )}
                <button onClick={handleLogout} className="logout-button sidebar-logout">
                   <FaSignOutAlt aria-hidden="true" /> Logout
                </button>
             </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main-content">
             <div className="admin-content-header"> <h1>Admin Dashboard</h1> </div>
             {activeSection === "products" && <AdminProducts />}
             {activeSection === "users" && <AdminUsers />}
        </main>
    </div>
  );
}