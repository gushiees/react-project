// src/pages/admin/admin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaBoxOpen, FaUsers, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../AuthContext.jsx";
import AdminProducts from "./AdminProducts.jsx"; // Import the new component
import AdminUsers from "./AdminUsers.jsx";     // Import the new component
import "./admin.css"; // Import the main layout CSS

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  // Active section state
  const [activeSection, setActiveSection] = useState("products"); // 'products' or 'users'

  // ----- AUTH GUARD -----
  useEffect(() => {
    if (!loadingAuth) {
      if (!user || user.role !== "admin") {
        // Redirect non-admins or logged-out users
        // Consider redirecting to '/' or '/admin/login' if preferred
        navigate("/");
        // Optionally show a message
        // toast.error("Admin access required.");
      }
    }
  }, [user, loadingAuth, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login"); // Redirect to admin login after logout
    } catch (err) {
      console.error("Failed to log out:", err);
      toast.error("Logout failed");
    }
  };

  // ----- RENDER -----
  // Show loading indicator or nothing while auth check is in progress
  if (loadingAuth) {
    return (
      <div className="admin-layout">
         <aside className="admin-sidebar">
             <div className="admin-sidebar-header"><h2>Admin Menu</h2></div>
             {/* Nav items could be disabled or hidden */}
         </aside>
         <main className="admin-main-content">
             <div className="admin-content-header"><h1>Admin Dashboard</h1></div>
             <p>Loading or verifying access…</p>
         </main>
      </div>
    );
  }

  // If auth loaded but user is not an admin, render nothing (or a message)
  // The redirect in useEffect should handle this, but this adds robustness
  if (!user || user.role !== "admin") {
     return null; // Or <p>Redirecting...</p>
  }

  // Render the main admin layout if authenticated as admin
  return (
    <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
             <div className="admin-sidebar-header">
                <h2>Admin Menu</h2>
             </div>
             <nav className="admin-sidebar-nav">
                <button
                   onClick={() => setActiveSection("products")}
                   className={activeSection === "products" ? "active" : ""}
                   aria-current={activeSection === 'products'} // Accessibility
                >
                   <FaBoxOpen aria-hidden="true" /> Products
                </button>
                <button
                   onClick={() => setActiveSection("users")}
                   className={activeSection === "users" ? "active" : ""}
                   aria-current={activeSection === 'users'} // Accessibility
                >
                   <FaUsers aria-hidden="true" /> Users
                </button>
             </nav>
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
                 {/* Optional: Add breadcrumbs or user info here */}
             </div>

             {/* Conditionally render the active section component */}
             {activeSection === "products" && <AdminProducts />}
             {activeSection === "users" && <AdminUsers />}

        </main>
    </div>
  );
}