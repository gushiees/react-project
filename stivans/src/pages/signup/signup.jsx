// src/pages/signup/signup.jsx
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
      // Prefer an explicit env var if you set one (VITE_SITE_URL). Fallback to prod/local.
      const siteUrl =
        import.meta.env.VITE_SITE_URL ||
        (import.meta.env.PROD
          ? "https://stivans.vercel.app"
          : window.location.origin);

      const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/callback`;

      // Pass full_name to user metadata AND set a correct redirect
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: fullName ? { full_name: fullName } : undefined,
        },
      });
      if (signErr) throw signErr;

      // Best-effort: upsert into profiles table too
      if (data.user) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .upsert({ id: data.user.id, full_name: fullName || null });
        if (profileErr) {
          // Non-fatal
          console.warn("Profile upsert warning:", profileErr.message || profileErr);
        }
      }

      // If email confirmations are ON, supabase returns no session here
      if (data.session) {
        navigate("/profile");
      } else {
        setNotice("We’ve sent a confirmation link to your email. Please verify to finish signup.");
      }
    } catch (err) {
      setError(err?.message || "Signup failed. Please try again.");
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
