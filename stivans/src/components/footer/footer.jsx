import "./footer.css";
import { Link } from "react-router-dom"; 

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand + Description */}
        <div className="footer-brand">
          <h3>St. Ivans</h3>
          <p>
            Supporting families with compassionate funeral services and
            insurance solutions since 2025.
          </p>
          <div className="social-links">
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Twitter">🐦</a>
            <a href="#" aria-label="Instagram">📸</a>
            <a href="#" aria-label="LinkedIn">💼</a>
          </div>
        </div>

        {/* Services */}
        <div className="footer-column">
          <h4>Services</h4>
          <ul>
            <li><Link to="/funerals">Traditional Funerals</Link></li>
            <li><Link to="/cremation">Cremation Services</Link></li>
            <li><Link to="/memorials">Memorial Services</Link></li>
            <li><Link to="/planning">Pre-Planning</Link></li>
            <li><Link to="/support">Grief Support</Link></li>
          </ul>
        </div>

        {/* Insurance */}
        <div className="footer-column">
          <h4>Insurance</h4>
          <ul>
            <li><Link to="/insurance">Basic Protection</Link></li>
            <li><Link to="/insurance">Family Protection</Link></li>
            <li><Link to="/insurance">Premium Legacy</Link></li>
            <li><Link to="/insurance">Policy Management</Link></li>
            <li><Link to="/insurance">Claims Process</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div className="footer-column">
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/team">Our Team</Link></li>
            <li><Link to="/testimonials">Testimonials</Link></li>
            <li><Link to="/careers">Careers</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>
      </div>

      {/* Copyright row */}
      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} St. Ivans. All rights reserved. |{" "}
          <Link to="/privacy">Privacy Policy</Link> |{" "}
          <Link to="/terms">Terms of Services</Link>
        </p>
      </div>
    </footer>
  );
}
