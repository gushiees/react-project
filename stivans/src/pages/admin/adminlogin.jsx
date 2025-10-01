import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './adminlogin.css';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signErr) throw signErr;

      // Fetch profile to check role
      const userId = signIn.user.id;
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profErr) throw profErr;

      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        // Not admin — sign out & show message
        await supabase.auth.signOut();
        setError('This account is not authorized for the admin portal.');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-form">
        <h2>Admin Portal Login</h2>
        <p>Please sign in to continue.</p>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email" id="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password" id="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
