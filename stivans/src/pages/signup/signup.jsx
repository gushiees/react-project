import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../login/login.css";
import regImg from "../../assets/regis.jpg";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [showEulaModal, setShowEulaModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const modalBodyRef = useRef(null);

  // Track if user has scrolled to the bottom of the terms
  useEffect(() => {
    const handleScroll = () => {
      if (modalBodyRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current;
        // Consider scrolled to bottom when within 10px of the actual bottom
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          setHasScrolledToBottom(true);
        }
      }
    };

    const modalBody = modalBodyRef.current;
    if (modalBody) {
      modalBody.addEventListener('scroll', handleScroll);
      // Reset state when modal opens
      setHasScrolledToBottom(false);
      return () => {
        modalBody.removeEventListener('scroll', handleScroll);
      };
    }
  }, [showEulaModal]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setPending(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      // --- UPDATED LOGIC ---
      // If a user was created and a full name was provided, try to update the profile.
      if (data.user && fullName) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: data.user.id, full_name: fullName });

        // If the profile update fails, log it for the developer but don't stop the user.
        if (profileError) {
          console.error("Post-signup profile update failed:", profileError);
        }
      }

      if (data.session) {
        navigate("/profile");
      } else {
        setNotice("Check your email to confirm your account, then log in.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const handleAcceptTerms = () => {
    setEulaAccepted(true);
    setShowEulaModal(false);
  };

  const handleDeclineTerms = () => {
    setEulaAccepted(false);
    setShowEulaModal(false);
  };

  return (
    <div className="login__wrap">
      {/* Left image (reuse same layout as login) */}
      <div className="login__left" aria-hidden="true">
        <img src={regImg} alt="" />
      </div>

      <div className="login__right">
        <div className="login__card">
          <h1 className="login__title">Create account</h1>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <label className="login__label">
              <span>Full name</span>
              <input
                className="login__input"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>

            <label className="login__label">
              <span>Email</span>
              <input
                className="login__input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="login__label">
              <span>Password</span>
              <div className="login__passwordRow">
                <input
                  className="login__input login__input--password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  className="login__eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label className="login__label login__checkbox">
              <input
                type="checkbox"
                checked={eulaAccepted}
                onChange={(e) => setEulaAccepted(e.target.checked)}
                required
              />
              <span>
                I accept the{" "}
                <button
                  type="button"
                  className="login__link"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowEulaModal(true);
                  }}
                >
                  Terms & Conditions
                </button>
              </span>
            </label>

            {error && <div className="login__error">{error}</div>}
            {notice && <div className="login__notice">{notice}</div>}

            <button 
              className="login__btn" 
              type="submit" 
              disabled={pending || !eulaAccepted}
            >
              {pending ? "Please wait…" : "Create account"}
            </button>
          </form>

          <div className="login__sub">
            <span>Already have an account?</span>
            <Link to="/login" className="login__cta">Log in.</Link>
          </div>
        </div>
      </div>

      {/* Enhanced EULA Modal */}
      {showEulaModal && (
        <div className="modal-overlay" onClick={() => setShowEulaModal(false)}>
          <div 
            className="modal-content enhanced-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header enhanced-header">
              <h2>Terms & Conditions</h2>
              <button 
                className="modal-close enhanced-close" 
                onClick={() => setShowEulaModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body enhanced-body" ref={modalBodyRef}>
              <div className="terms-container">
                <h3>1. Acceptance of Terms</h3>
                <p>By creating an account, you agree to be bound by these Terms & Conditions.</p>
                
                <h3>2. User Accounts</h3>
                <p>You are responsible for maintaining the confidentiality of your account and password.</p>
                
                <h3>3. Privacy Policy</h3>
                <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
                
                <h4>3.1 Information We Collect</h4>
                <p>We collect information you provide directly to us, such as when you create an account, update your profile, or contact us. This may include your name, email address, and other information you choose to provide.</p>
                
                <h4>3.2 How We Use Your Information</h4>
                <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products, services, and promotional offers.</p>
                
                <h4>3.3 Information Sharing</h4>
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with trusted third-party service providers who assist us in operating our service.</p>
                
                <h4>3.4 Data Security</h4>
                <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
                
                <h4>3.5 Your Rights</h4>
                <p>You have the right to access, update, or delete your personal information. You may also opt out of receiving promotional communications from us. To exercise these rights, please contact us at support@example.com.</p>
                
                <h4>3.6 Cookies and Tracking</h4>
                <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
                
                <h4>3.7 Changes to This Privacy Policy</h4>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
                
                <h3>4. Prohibited Uses</h3>
                <p>You may not use our service for any illegal or unauthorized purpose.</p>
                
                <h3>5. Intellectual Property</h3>
                <p>The service and its original content, features and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret and other intellectual property or proprietary rights laws.</p>
                
                <h3>6. Termination</h3>
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                
                <h3>7. Limitation of Liability</h3>
                <p>In no event shall our company, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.</p>
                
                <h3>8. Governing Law</h3>
                <p>These Terms shall be interpreted and governed by the laws of the country in which our company is based.</p>
                
                <h3>9. Changes to Terms</h3>
                <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.</p>
                
                <h3>10. Contact Information</h3>
                <p>If you have any questions about these Terms or our Privacy Policy, please contact us at stivans@gmail.com.</p>
              </div>
              
              {!hasScrolledToBottom && (
                <div className="scroll-indicator">
                  <p>Please scroll to the bottom to enable the Accept button</p>
                  <div className="scroll-animation">
                    <span></span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer enhanced-footer">
              <button 
                className="modal-decline-btn"
                onClick={handleDeclineTerms}
              >
                Decline
              </button>
              <button 
                className={`modal-accept-btn ${hasScrolledToBottom ? 'enabled' : 'disabled'}`}
                onClick={handleAcceptTerms}
                disabled={!hasScrolledToBottom}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}