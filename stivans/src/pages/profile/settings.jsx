import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import "./settings.css";
import { useAuth } from "../../AuthContext.jsx";

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    full_name: "",
    phone_number: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfile({
            full_name: data.full_name || "",
            phone_number: data.phone_number || "",
          });
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
        setError("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to update your profile.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        updated_at: new Date(),
      });

      if (error) throw error;
      setMessage("Profile updated successfully!");
    } catch (e) {
      console.error("Error updating profile:", e);
      setError("Error updating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const newPassword = e.target.elements.newPassword.value;
    const confirmPassword = e.target.elements.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage("Password updated successfully!");
      e.target.reset();
    } catch (e) {
      console.error("Error updating password:", e);
      setError("Error updating password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stg-shell">
      <header className="stg-header">
        <div className="stg-header-inner">
          <h1>Settings</h1>
          <p>Manage your personal information, password, and account preferences.</p>
        </div>
      </header>

      <main className="stg-grid">
        <section className="stg-card">
          <div className="stg-card-head">
            <h2>Profile Settings</h2>
          </div>

          {message && (
            <div className="stg-alert ok" role="status" aria-live="polite">
              {message}
            </div>
          )}
          {error && (
            <div className="stg-alert err" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <form onSubmit={updateProfile} className="stg-form">
            <fieldset className="stg-fieldset">
              <legend>Personal Information</legend>

              <div className="stg-row">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={profile.full_name}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div className="stg-row">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={profile.phone_number}
                  onChange={handleChange}
                  autoComplete="tel"
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
            </fieldset>

            <div className="stg-actions">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setProfile({ full_name: "", phone_number: "" });
                  setMessage(null);
                  setError(null);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="stg-card">
          <div className="stg-card-head">
            <h2>Change Password</h2>
          </div>

          <form onSubmit={changePassword} className="stg-form">
            <fieldset className="stg-fieldset">
              <legend>Security</legend>

              <div className="stg-row">
                <label htmlFor="oldPassword">Current Password</label>
                <input
                  id="oldPassword"
                  name="oldPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="stg-row">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>

              <div className="stg-row">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
            </fieldset>

            <div className="stg-actions">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? "Updating…" : "Change Password"}
              </button>
            </div>
          </form>
        </section>

        <section className="stg-card danger">
          <div className="stg-card-head">
            <h2>Account</h2>
          </div>

          <div className="stg-danger">
            <div>
              <h3>Delete Account</h3>
              <p>
                This action is irreversible. Your data will be permanently removed.
              </p>
            </div>
            <button className="btn danger" type="button">
              Delete Account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
