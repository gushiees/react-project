import { NavLink, Link } from "react-router-dom";
import logo from "../../assets/stivan.png"; // adjust path if needed
import "./header.css";

export default function Header() {
  const isLoggedIn = false; // later replace with real auth state

  return (
    <header className="site-header">
      <div className="nav-wrap">
        {/* LEFT: logo */}
        <Link to="/" className="brand">
          <img src={logo} alt="Stivans Logo" className="logo" />
        </Link>

        {/* CENTER: nav links */}
        <nav className="main-nav">
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/services" className="nav-link">
            Services
          </NavLink>
          <NavLink to="/insurance" className="nav-link">
            Insurance
          </NavLink>
          <NavLink to="/about" className="nav-link">
            About
          </NavLink>
          <NavLink to="/contact" className="nav-link">
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
            <Link to="/profile" className="icon-btn">👤</Link>
          ) : (
            <Link to="/signin" className="signin-btn">Sign In</Link>
          )}
        </div>
      </div>
    </header>
  );
}
