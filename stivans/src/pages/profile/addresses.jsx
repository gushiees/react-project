import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // Make sure this path is correct
import "./addresses.css"; // Make sure you have this CSS file

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAddress, setNewAddress] = useState({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    is_default: false
  });
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user logged in");
      
      // Fetch addresses from the database
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      setError("Failed to load addresses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAddress({
      ...newAddress,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user logged in");
      
      // Handle default address logic
      if (newAddress.is_default) {
        // First, remove default status from all other addresses
        const { error: updateError } = await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", editing ? currentId : -1);  // Use -1 for new addresses
        
        if (updateError) throw updateError;
      }
      
      if (editing && currentId) {
        // Update existing address
        const { error } = await supabase
          .from("user_addresses")
          .update({ ...newAddress })
          .eq("id", currentId)
          .eq("user_id", user.id);
        
        if (error) throw error;
        
        setMessage("Address updated successfully!");
      } else {
        // Insert new address
        // If it's the first address, make it default automatically
        let isFirstAddress = false;
        if (addresses.length === 0) {
          isFirstAddress = true;
          newAddress.is_default = true;
        }
        
        const { error } = await supabase
          .from("user_addresses")
          .insert([{ ...newAddress, user_id: user.id }]);
        
        if (error) throw error;
        
        setMessage(isFirstAddress 
          ? "Address added successfully and set as default!" 
          : "Address added successfully!");
      }
      
      // Reset form and refetch addresses
      setNewAddress({
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        is_default: false
      });
      setEditing(false);
      setCurrentId(null);
      fetchAddresses();
    } catch (error) {
      console.error("Error saving address:", error);
      setError(`Failed to save address: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address) => {
    setNewAddress({...address});
    setEditing(true);
    setCurrentId(address.id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user logged in");
      
      // Check if this is the default address
      const addressToDelete = addresses.find(addr => addr.id === id);
      
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      // If we deleted the default address and there are other addresses,
      // make another one the default
      if (addressToDelete && addressToDelete.is_default) {
        const remainingAddresses = addresses.filter(addr => addr.id !== id);
        if (remainingAddresses.length > 0) {
          const { error: updateError } = await supabase
            .from("user_addresses")
            .update({ is_default: true })
            .eq("id", remainingAddresses[0].id);
          
          if (updateError) throw updateError;
        }
      }
      
      setMessage("Address deleted successfully!");
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      setError(`Failed to delete address: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user logged in");
      
      // First, remove default status from all addresses
      const { error: updateAllError } = await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
      
      if (updateAllError) throw updateAllError;
      
      // Then set the selected address as default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setMessage("Default address updated successfully!");
      fetchAddresses();
    } catch (error) {
      console.error("Error setting default address:", error);
      setError(`Failed to update default address: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewAddress({
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      is_default: false
    });
    setEditing(false);
    setCurrentId(null);
  };

  if (loading && addresses.length === 0) {
    return <div className="loading">Loading addresses...</div>;
  }

  return (
    <div className="addresses-container">
      <h2>{editing ? "Edit Address" : "Add New Address"}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <form onSubmit={handleSubmit} className="address-form">
        <div className="form-group">
          <label htmlFor="address_line1">Address Line 1*</label>
          <input
            type="text"
            id="address_line1"
            name="address_line1"
            value={newAddress.address_line1}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="address_line2">Address Line 2</label>
          <input
            type="text"
            id="address_line2"
            name="address_line2"
            value={newAddress.address_line2 || ""}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City*</label>
            <input
              type="text"
              id="city"
              name="city"
              value={newAddress.city}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="state">State/Province*</label>
            <input
              type="text"
              id="state"
              name="state"
              value={newAddress.state}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="postal_code">Postal Code*</label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value={newAddress.postal_code}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="country">Country*</label>
            <input
              type="text"
              id="country"
              name="country"
              value={newAddress.country}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="is_default"
            name="is_default"
            checked={newAddress.is_default}
            onChange={handleInputChange}
          />
          <label htmlFor="is_default">Set as default address</label>
        </div>
        
        <div className="form-buttons">
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : editing ? "Update Address" : "Add Address"}
          </button>
          
          {editing && (
            <button type="button" onClick={handleCancel} className="cancel-button">
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <h2>Your Addresses</h2>
      
      {addresses.length === 0 ? (
        <p>You haven't added any addresses yet.</p>
      ) : (
        <div className="addresses-list">
          {addresses.map((address) => (
            <div key={address.id} className={`address-card ${address.is_default ? 'default-address' : ''}`}>
              {address.is_default && <div className="default-badge">Default</div>}
              <p>{address.address_line1}</p>
              {address.address_line2 && <p>{address.address_line2}</p>}
              <p>
                {address.city}, {address.state} {address.postal_code}
              </p>
              <p>{address.country}</p>
              
              <div className="address-actions">
                <button onClick={() => handleEdit(address)}>Edit</button>
                <button onClick={() => handleDelete(address.id)} className="delete-button">
                  Delete
                </button>
                {!address.is_default && (
                  <button onClick={() => handleSetDefault(address.id)} className="default-button">
                    Set as Default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}