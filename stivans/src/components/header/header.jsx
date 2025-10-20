// src/components/header/header.jsx
import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { useCart } from "../../contexts/cartContext";
import logo from "../../assets/stivanlogo.png";
import "./header.css";

export default function Header() {
  const { user } = useAuth();
  const { cart } = useCart();
  const isLoggedIn = !!user;
  const location = useLocation();
  const emailPrefix = user?.email ? user.email.split("@")[0] : "";
  const cartItemCount = cart.length;

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link to="/" className="brand">
          <img src={logo} alt="Stivans Logo" className="logo" />
        </Link>

        <nav className="main-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Home
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Bundles
          </NavLink>
          <NavLink to="/chapels" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Chapels
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            About
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Contact
          </NavLink>
        </nav>

        <div className="actions">
          <Link to="/cart" className="icon-btn cart">
            🛒
            <span className="badge">{cartItemCount}</span>
          </Link>

          {isLoggedIn ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="admin-btn">
                  Admin Dashboard
                </Link>
              )}
              <Link to="/profile" className="profile-link">
                <span className="icon-btn" aria-label="Profile">
                  👤
                </span>
                <span className="user-email-prefix">{emailPrefix}</span>
              </Link>
            </>
          ) : (
            <Link to="/login" state={{ from: location }} className="signin-btn">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}