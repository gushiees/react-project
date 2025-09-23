import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx"; // Import useAuth
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // <-- Get the new login function from context

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // --- UPDATED handleSubmit FUNCTION ---
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);

    try {
      // Call the login function from the context. It returns the full user object.
      const user = await login(email, password);

      // Redirect based on the role from the returned user object
      if (user && user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
      setPending(false); // Make sure to stop pending on error
    }
    // No 'finally' block needed anymore
  }

  return (
    <div className="login__wrap">
      {/* Left image panel */}
      <div className="login__left" aria-hidden="true">
        <img src="/login-side.jpg" alt="" />
      </div>

      {/* Right form panel */}
      <div className="login__right">
        <div className="login__card">
          <h1 className="login__title">Log In</h1>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
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
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login__eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    // eye-off
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                  ) : (
                    // eye
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <div className="login__row">
              <label className="login__check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <Link className="login__link" to="/forgot-password">
                Forgot Password?
              </Link>
            </div>

            {error && <div className="login__error">{error}</div>}

            <button className="login__btn" type="submit" disabled={pending}>
              {pending ? "Please wait…" : "Log In"}
            </button>
          </form>

          <div className="login__sub">
            <span> </span>
            <Link to="/signup" className="login__cta">
              Create an account.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}