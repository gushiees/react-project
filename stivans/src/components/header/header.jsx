import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import logo from "../../assets/stivan.png";
import "./header.css";

export default function Header() {
  const { user } = useAuth();       // real auth state
  const isLoggedIn = !!user;
  const location = useLocation();   // current page (so login can send you back)

  return (
    <header className="site-header">
      <div className="nav-wrap">
        {/* LEFT: logo */}
        <Link to="/" className="brand">
          <img src={logo} alt="Stivans Logo" className="logo" />
        </Link>

        {/* CENTER: nav links */}
        <nav className="main-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Home
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Bundles
          </NavLink>
          <NavLink to="/insurance" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Insurance
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

        {/* RIGHT: cart + auth */}
        <div className="actions">
          <Link to="/cart" className="icon-btn cart">
            🛒
            <span className="badge">0</span>
          </Link>

          {isLoggedIn ? (
            <Link to="/profile" className="icon-btn" aria-label="Profile">👤</Link>
          ) : (
            <Link
              to="/login"
              state={{ from: location }}   // 👈 tell Login which page we came from
              className="signin-btn"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
