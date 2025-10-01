// src/pages/auth/callback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      // Let Supabase parse the URL hash and set the session if present
      await supabase.auth.getSession();
      if (!active) return;
      navigate("/profile", { replace: true });
    })();
    return () => { active = false; };
  }, [navigate]);

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <h1>Signing you in…</h1>
      <p>You’ll be redirected shortly.</p>
    </div>
  );
}
