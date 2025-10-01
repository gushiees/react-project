// src/pages/auth/callback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: you can read params here if needed
    // After Supabase finishes the magic link flow, the session is set.
    // You can also show a spinner while checking the session.
    const go = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Send them somewhere nice
      navigate(session ? "/profile" : "/login", { replace: true });
    };
    go();
  }, [navigate]);

  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <h2>Signing you in…</h2>
      <p>Please wait a moment.</p>
    </div>
  );
}
