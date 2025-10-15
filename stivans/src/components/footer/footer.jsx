import "./footer.css";
import { Link } from "react-router-dom"; 

// Make sure to import your image
import footerLogo from "../../assets/stivanlogolight.png";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand + Description */}
        <div className="footer-brand">
          <h3>St. Ivans</h3>
          <p>
            Supporting families with compassionate funeral services since 2025.
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
        {/* --- ADD THE IMAGE HERE --- */}
        <img src={footerLogo} alt="St. Ivans Funeral Services" className="footer-logo" />
        
        <p>
          © {new Date().getFullYear()} St. Ivans. All rights reserved. |{" "}
          <Link to="/privacy">Privacy Policy</Link> |{" "}
          <Link to="/terms">Terms of Services</Link>
        </p>
      </div>
    </footer>
  );
}