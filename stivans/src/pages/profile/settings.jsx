import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // Make sure this path is correct
import "./settings.css"; // Make sure you have this CSS file
import { useAuth } from "../../AuthContext.jsx"; 

export default function Settings() {
  // 1. Get the user from the AuthContext
  const { user } = useAuth(); 

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone_number: "",
    address: "",
  });

  useEffect(() => {
    // 2. We already have the user from context, so we can use it directly.
    const fetchProfile = async () => {
      // Only run if the user object exists
      if (!user) return; 

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (error) throw error;
        
        if (data){
            setProfile({
              full_name: data.full_name || "",
              phone_number: data.phone_number || "",
              address: data.address || "",
            });
          }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]); // Rerun the effect if the user object changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    
    // 3. Use the user from context, no need to fetch it again.
    if (!user) {
        setError("You must be logged in to update your profile.");
        return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          address: profile.address,
          updated_at: new Date(),
        });
      
      if (error) {
        throw error;
      }
      
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Error updating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    
    // Note: The 'oldPassword' field is not used by Supabase's updateUser function.
    // The user just needs to be authenticated.
    // const oldPassword = e.target.elements.oldPassword.value; 
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
        password: newPassword
      });
      
      if (error) throw error;
      
      setMessage("Password updated successfully!");
      e.target.reset();
    } catch (error) {
      console.error("Error updating password:", error);
      setError("Error updating password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-card">
      <h2>Profile Settings</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div className="settings-section">
        <h3>Personal Information</h3>
        <form onSubmit={updateProfile}>
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={profile.phone_number}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="address">Default Address</label>
            <textarea
              id="address"
              name="address"
              value={profile.address}
              onChange={handleChange}
              rows={3}
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
      
      <div className="settings-section">
        <h3>Change Password</h3>
        <form onSubmit={changePassword}>
          <div className="form-group">
            <label htmlFor="oldPassword">Current Password</label>
            <input
              type="password"
              id="oldPassword"
              name="oldPassword"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              required
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
      
      <div className="settings-section">
        <h3>Account Settings</h3>
        <button className="delete-account-button">Delete Account</button>
        <p className="warning-text">
          This action cannot be undone. All your data will be permanently removed.
        </p>
      </div>
    </div>
  );
}