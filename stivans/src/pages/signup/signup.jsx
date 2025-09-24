import { useState } from "react";
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
              <span>Full name (optional)</span>
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

            {error && <div className="login__error">{error}</div>}
            {notice && <div className="login__notice">{notice}</div>}

            <button className="login__btn" type="submit" disabled={pending}>
              {pending ? "Please wait…" : "Create account"}
            </button>
          </form>

          <div className="login__sub">
            <span>Already have an account?</span>
            <Link to="/login" className="login__cta">Log in.</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
