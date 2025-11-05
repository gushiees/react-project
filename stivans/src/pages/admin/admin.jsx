// src/pages/admin/admin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaBoxOpen,
  FaUsers,
  FaSignOutAlt,
  FaHome,
  FaChartBar,
  FaListAlt,
  FaEdit,                // ← NEW
} from "react-icons/fa";
import { useAuth } from "../../AuthContext.jsx";
import AdminProducts from "./AdminProducts.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminAnalytics from "./AdminAnalytics.jsx";
import AdminOrders from "./orders/AdminOrders.jsx";
import AdminCMS from "./cms/AdminCMS.jsx";     // ← NEW
import adminLogo from "../../assets/stivanlogolight.png";
import "./admin.css";

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("analytics");

  useEffect(() => {
    if (!loadingAuth) {
      if (!user || user.role !== "admin") {
        toast.error("Admin access required. Please log in.", { id: "admin-auth-redirect" });
        navigate("/admin/login", { replace: true });
      }
    }
  }, [user, loadingAuth, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      navigate("/admin/login");
    } catch (err) {
      console.error("Failed to log out:", err);
      toast.error("Logout failed: " + err.message);
    }
  };

  if (loadingAuth) return null;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img src={adminLogo} alt="St. Ivans Admin Logo" className="admin-sidebar-logo" />
          <h2>Admin Menu</h2>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin Sections">
          <button
            onClick={() => setActiveSection("analytics")}
            className={activeSection === "analytics" ? "active" : ""}
            aria-current={activeSection === "analytics" ? "page" : undefined}
          >
            <FaChartBar aria-hidden="true" /> Analytics
          </button>

          <button
            onClick={() => setActiveSection("orders")}
            className={activeSection === "orders" ? "active" : ""}
            aria-current={activeSection === "orders" ? "page" : undefined}
          >
            <FaListAlt aria-hidden="true" /> Orders
          </button>

          <button
            onClick={() => setActiveSection("products")}
            className={activeSection === "products" ? "active" : ""}
            aria-current={activeSection === "products" ? "page" : undefined}
          >
            <FaBoxOpen aria-hidden="true" /> Products
          </button>

          <button
            onClick={() => setActiveSection("users")}
            className={activeSection === "users" ? "active" : ""}
            aria-current={activeSection === "users" ? "page" : undefined}
          >
            <FaUsers aria-hidden="true" /> Users
          </button>

          {/* NEW: CMS */}
          <button
            onClick={() => setActiveSection("cms")}
            className={activeSection === "cms" ? "active" : ""}
            aria-current={activeSection === "cms" ? "page" : undefined}
          >
            <FaEdit aria-hidden="true" /> CMS
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          {user && (
            <div className="admin-user-info">
              <p className="user-label">Logged in as:</p>
              <p>{user.email}</p>
            </div>
          )}
          <Link to="/" className="view-as-user-btn" onClick={() => toast.success("Switched to User View")}>
            <FaHome aria-hidden="true" /> View as User
          </Link>
          <button onClick={handleLogout} className="logout-button sidebar-logout">
            <FaSignOutAlt aria-hidden="true" /> Logout
          </button>
        </div>
      </aside>

      <main className="admin-main-content">
        <div className="admin-content-header">
          <h1>Admin Dashboard</h1>
        </div>

        {activeSection === "analytics" && <AdminAnalytics />}
        {activeSection === "orders" && <AdminOrders />}
        {activeSection === "products" && <AdminProducts />}
        {activeSection === "users" && <AdminUsers />}
        {activeSection === "cms" && <AdminCMS />}{/* ← NEW */}
      </main>
    </div>
  );
}
