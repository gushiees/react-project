import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!ignore) setSession(session);
      setLoading(false);
    })();

    // ✅ correct destructuring: { data: { subscription } }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    // ✅ correct cleanup: subscription.unsubscribe()
    return () => {
      ignore = true;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
