import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { useCart } from "../../contexts/cartContext"; // Import useCart
import logo from "../../assets/stivanlogo.png";
import "./header.css";

export default function Header() {
  const { user } = useAuth(); // real auth state
  const { cart } = useCart(); // Access cart state from context
  const isLoggedIn = !!user;
  const location = useLocation(); // current page (so login can send you back)
  const emailPrefix = user?.email ? user.email.split("@")[0] : "";
  
  // Calculate the number of unique items in the cart
  const cartItemCount = cart.length;

  return (
    <header className="site-header">
      <div className="nav-wrap">
        {/* LEFT: logo */}
        <Link to="/" className="brand">
          <img src={logo} alt="Stivans Logo" className="logo" />
        </Link>

        {/* CENTER: nav links */}
        <nav className="main-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Catalog
          </NavLink>
          <NavLink
            to="/chapels"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Chapels
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            About
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Contact
          </NavLink>
        </nav>

        {/* RIGHT: cart + auth */}
        <div className="actions">
          <Link to="/cart" className="icon-btn cart">
            🛒
            {/* Display the cart item count */}
            <span className="badge">{cartItemCount}</span>
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/profile" className="profile-link">
                <span className="icon-btn" aria-label="Profile">
                  👤
                </span>
                <span className="user-email-prefix">{emailPrefix}</span>
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: location }} // 👈 tell Login which page we came from
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