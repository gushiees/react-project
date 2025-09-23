import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // This useEffect handles session restoration on page load
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({ ...session.user, ...profile });
      }
      setLoadingAuth(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user) {
          // This will run if the session is updated (e.g., password change)
          fetchSession();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- NEW LOGIN FUNCTION ---
  // This function will be called by the login page.
  const login = async (email, password) => {
    // 1. Sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // 2. Fetch their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profileError) throw profileError;

    // 3. Set the user state and return the full user object
    const fullUser = { ...data.user, ...profile };
    setUser(fullUser);
    return fullUser;
  };

  const value = {
    user,
    loadingAuth,
    login, // <-- Expose the new login function
    logout: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}