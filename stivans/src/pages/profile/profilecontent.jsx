import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // Make sure this path is correct
import "./profilecontent.css"; // Make sure you have this CSS file

export default function ProfileContent() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchUserOrders();
  }, []);

    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Get the current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Use the query builder pattern correctly
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)  // Use the .eq() method instead of adding id=eq. in the URL
            .single();
              
          if (profileError) throw profileError;
            
          setUser({
            ...authUser,
            ...profileData
          });
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if orders table exists first
        try {
          const { data, error } = await supabase
            .from("orders")
            .select(`
              *,
              order_items (
                *,
                product:products (name, image_url)
              )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
            
          if (error) {
            // If the error is about missing table, handle gracefully
            if (error.code === 'PGRST205') {
              console.log("Orders table not yet created - using empty array");
              setOrders([]);
            } else {
              throw error;
            }
          } else {
            setOrders(data || []);
          }
        } catch (innerError) {
          console.error("Error fetching orders:", innerError);
          setOrders([]);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div className="loading">Loading profile data...</div>;
  }

  return (
    <div className="profile-content">
      {error && <div className="error-message">{error}</div>}
      
      {user && (
        <div className="profile-summary">
          <h2>Welcome, {user.full_name || user.email}</h2>
          <p>Email: {user.email}</p>
          <p>Member since: {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      )}
      
      <div className="recent-orders">
        <h3>Recent Orders</h3>
        
        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : orders.length === 0 ? (
          <p>You haven't placed any orders yet.</p>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div>
                    <h4>Order #{order.id.substring(0, 8)}</h4>
                    <p>Placed on: {new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="order-status">{order.status}</div>
                </div>
                
                <div className="order-items">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="order-item">
                      {item.product?.image_url && (
                        <img 
                          src={item.product.image_url} 
                          alt={item.product.name} 
                          className="item-image" 
                        />
                      )}
                      <div className="item-details">
                        <p className="item-name">{item.product?.name || "Product"}</p>
                        <p className="item-quantity">Qty: {item.quantity}</p>
                        <p className="item-price">${item.unit_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="order-footer">
                  <p className="order-total">Total: ${order.total_price}</p>
                  <button className="view-details-button">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}