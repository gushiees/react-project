// src/pages/admin/UserInspector.jsx
import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast'; // Ensure import
import { fetchAdminAPI } from '../../utils/adminApi.js';

// Helper function to format date/time
function formatDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString(); }
    catch { return String(d); } // Fallback
}
// Helper function to format currency
function money(n){ return '₱' + Number(n||0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function UserInspector({ user, onClose, handleAuthError }) { // Receive handleAuthError
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null); // Will hold { profile, addresses, cart, orders }
  const [tab, setTab] = useState('profile'); // Default tab

  // Load User Details on mount or when user prop changes
  useEffect(() => {
    let mounted = true; // Flag to prevent state updates on unmounted component
    const loadUserDetails = async () => {
        try {
            setErr(null); setLoading(true); // Reset error and set loading
            // Construct API endpoint URL
            const endpoint = new URL('/api/admin/users/inspect', window.location.origin);
            endpoint.searchParams.set('userId', user.id);

            // Fetch data using the helper, passing the auth error handler
            const json = await fetchAdminAPI(endpoint.toString(), { method: 'GET' }, handleAuthError);

            // If component is still mounted, update state
            if (mounted) {
                setData(json);
            }
        } catch (e) {
            // Only handle non-auth errors here (auth errors trigger redirect via handleAuthError)
            if (mounted && e.message !== 'Authentication required') {
                console.error("Inspector load error:", e);
                const errMsg = e.message || 'Failed to load user details';
                setErr(errMsg); // Set error state for display
                toast.error(errMsg); // Show error toast
            }
        } finally {
             // If component is still mounted, stop loading indicator
            if (mounted) {
                setLoading(false);
            }
        }
    };

    loadUserDetails(); // Execute the async function

    // Cleanup function to set mounted flag to false when component unmounts
    return () => {
        mounted = false;
    };
  }, [user.id, handleAuthError]); // Re-run effect if user ID or auth handler changes

  // Calculate total cart value using useMemo for efficiency
  const totalCart = useMemo(() => {
    if (!data?.cart?.items) return 0; // Return 0 if cart or items are missing
    // Sum up the price * quantity for each item
    return data.cart.items.reduce((sum, item) => {
        const price = Number(item?.product?.price || 0);
        const quantity = Number(item.quantity || 0);
        return sum + (price * quantity);
    }, 0);
  }, [data?.cart?.items]); // Recalculate only when cart items change

  // --- Actions ---

  // Function to perform cart actions (clear, remove item)
  async function cartAction(action, itemId = null) {
    if (!data?.cart?.id) { toast.error("Cart information not available."); return; }

    // Use toast.promise for async operation feedback
    const cartPromise = fetchAdminAPI('/api/admin/carts/update', { // Your API endpoint for cart updates
        method: 'POST',
        body: { action, cartId: data.cart.id, itemId } // Send action type, cart ID, and optional item ID
    }, handleAuthError) // Pass the auth error handler
    .then((json) => {
        // Update local state on successful API call
        setData(d => ({ ...d, cart: { ...d.cart, items: json.items || [] }}));
    });

    toast.promise(cartPromise, {
        loading: 'Updating cart...', // Loading message
        success: 'Cart Updated!',   // Success message
        error: (err) => { // Error message/handler
            console.error("Cart action error:", err);
            // Auth errors are handled by fetchAdminAPI's redirect mechanism
            return err.message || 'Cart update failed'; // Return message for the error toast
        }
    });
  }

  // Function to update order details (status, addresses, item quantities/prices, totals)
  async function updateOrder(orderId, patch) {
    if (!orderId || !patch) { toast.error("Missing order ID or update data."); return; }

     // Use toast.promise for async operation feedback
    const orderPromise = fetchAdminAPI('/api/admin/orders/update', { // Your API endpoint for order updates
        method: 'POST', // Or PUT/PATCH depending on your API
        body: { orderId, patch } // Send order ID and the data patch
    }, handleAuthError) // Pass the auth error handler
    .then((json) => {
        // Update local state with the returned updated order on success
        setData(d => ({ ...d, orders: d.orders.map(o => o.id === orderId ? json.order : o) }));
    });

    toast.promise(orderPromise, {
        loading: 'Saving order...', // Loading message
        success: 'Order Saved!',   // Success message
        error: (err) => { // Error message/handler
            console.error("Order update error:", err);
            // Auth errors are handled by fetchAdminAPI's redirect mechanism
            return err.message || 'Order update failed'; // Return message for the error toast
        }
    });
  }

  // --- JSX Rendering ---
  return (
    // Slide-in panel container
    <div className="ui-slide" role="dialog" aria-modal="true" aria-labelledby="inspector-title">
        {/* Header with title and close button */}
        <div className="ui-head">
            <h3 id="inspector-title">User: {user.email}</h3>
            <button onClick={onClose} aria-label="Close user inspector">×</button>
        </div>
        {/* Tabs for navigation */}
        <div className="ui-tabs" role="tablist">
             <button role="tab" aria-selected={tab==='profile'} className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}>Profile</button>
             <button role="tab" aria-selected={tab==='cart'} className={tab==='cart'?'active':''} onClick={()=>setTab('cart')}>Cart</button>
             <button role="tab" aria-selected={tab==='orders'} className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>Orders</button>
        </div>

        {/* Loading State */}
        {loading && <p style={{padding:'16px'}}>Loading details…</p>}

        {/* Error State */}
        {!loading && err && <p className="error-message" style={{ margin: '16px' }}>{err}</p>}

        {/* Content Area - Renders based on selected tab */}
        {!loading && !err && data && (
            <div className="ui-content" style={{ flexGrow: 1, overflowY: 'auto' }}>

                 {/* --- Profile Tab --- */}
                 {tab === 'profile' && (
                    <div className="ui-section" role="tabpanel" aria-labelledby="tab-profile">
                      <h4>Profile</h4>
                      <p><b>Name:</b> {data.profile?.full_name || '—'}</p>
                      <p><b>Phone:</b> {data.profile?.phone_number || '—'}</p>
                      <p><b>Role:</b> <span className={`role-badge ${data.profile?.role || 'user'}`}>{data.profile?.role || 'user'}</span></p>
                      <p><b>Member Since:</b> {formatDate(data.profile?.created_at)}</p>
                      <p><b>Profile Updated:</b> {formatDate(data.profile?.updated_at)}</p>


                      <h4 style={{marginTop: 18}}>Addresses</h4>
                      {data.addresses?.length > 0 ? (
                        <ul className="ui-list">
                          {data.addresses.map(a => (
                            <li key={a.id}>
                              <div>{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ''}</div>
                              <div>{a.city}, {a.state} {a.postal_code}</div>
                              <div>{a.country} {a.is_default ? <em>(default)</em> : ''}</div>
                            </li>
                          ))}
                        </ul>
                      ) : <p>No addresses found.</p>}
                    </div>
                  )}

                 {/* --- Cart Tab --- */}
                 {tab === 'cart' && (
                    <div className="ui-section" role="tabpanel" aria-labelledby="tab-cart">
                      {data.cart?.id ? ( // Check if cart exists
                        <>
                          <div className="ui-row-between">
                            <h4>Cart Items ({data.cart.items?.length || 0})</h4>
                            {/* Show Clear Cart button only if items exist */}
                            {(data.cart.items?.length || 0) > 0 && (
                                <button className="action-btn delete-btn" onClick={()=>cartAction('clear')}>Clear Cart</button>
                            )}
                          </div>
                          {(data.cart.items?.length || 0) > 0 ? (
                            <table className="admin-table">
                              <thead>
                                <tr><th>Product</th><th>Price</th><th>Qty</th><th style={{textAlign:'right'}}>Actions</th></tr>
                              </thead>
                              <tbody>
                                {data.cart.items.map(ci => (
                                  <tr key={ci.id}>
                                    <td>{ci.product?.name || `(ID: ${ci.product_id})`}</td>
                                    <td>{money(ci.product?.price)}</td>
                                    <td>{ci.quantity}</td>
                                    <td style={{textAlign:'right'}}>
                                      {/* Pass item id to remove specific item */}
                                      <button className="action-btn delete-btn" onClick={()=>cartAction('remove-item', ci.id)}>Remove</button>
                                    </td>
                                  </tr>
                                ))}
                                {/* Cart Total Row */}
                                <tr>
                                  <td colSpan="3"><b>Total</b></td>
                                  <td style={{textAlign:'right'}}><b>{money(totalCart)}</b></td>
                                </tr>
                              </tbody>
                            </table>
                          ) : <p>Cart is currently empty.</p>}
                        </>
                      ) : <p>No cart has been created for this user yet.</p>}
                    </div>
                  )}

                 {/* --- Orders Tab --- */}
                 {tab === 'orders' && (
                    <div className="ui-section" role="tabpanel" aria-labelledby="tab-orders">
                     <h4>Orders ({data.orders?.length || 0})</h4>
                      {data.orders?.length > 0 ? data.orders.map(o => (
                        // Order Card
                        <div key={o.id} className="ui-card">
                          {/* Order Header */}
                          <div className="ui-row-between">
                            <h5>Order #{o.id.slice(0,8)} <small>({formatDate(o.created_at)})</small></h5>
                            <div className="ui-inline">
                              <label htmlFor={`status-${o.id}`}>Status</label>
                              <select id={`status-${o.id}`} value={o.status || 'pending'} onChange={(e)=>updateOrder(o.id, { status: e.target.value })}>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="failed">Failed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                                {/* Add more valid statuses */}
                              </select>
                            </div>
                          </div>

                          {/* Order Items Table (if items exist) */}
                          {o.order_items?.length > 0 && (
                              <table className="admin-table" style={{marginTop: 8}}>
                                <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Item Total</th></tr></thead>
                                <tbody>
                                  {o.order_items.map(it => (
                                    <tr key={it.id}>
                                      <td>{it.name || `(Product ID: ${it.product_id})`}</td>
                                      <td>{money(it.price)}</td>
                                      <td>{it.quantity}</td>
                                      <td>{money(Number(it.price || 0) * Number(it.quantity || 0))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                          )}

                           {/* Order Totals Display */}
                           <div style={{marginTop: 8, fontSize: '0.9rem', textAlign: 'right'}}>
                               <p>Subtotal: {money(o.subtotal)}</p>
                               <p>Tax: {money(o.tax)}</p>
                               <p>Shipping: {money(o.shipping)}</p>
                               <p><b>Total: {money(o.total)}</b></p>
                           </div>
                           {/* Add Xendit link if available */}
                            {o.xendit_invoice_id && (
                                <div style={{marginTop: '0.5rem', textAlign: 'right'}}>
                                    <a
                                    href={`https://dashboard.xendit.co/invoices/${o.xendit_invoice_id}`} // Adjust if URL structure changes
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{fontSize: '0.85rem'}}
                                    >
                                    View Xendit Invoice
                                    </a>
                                </div>
                            )}

                        </div> // End Order Card
                      )) : <p>No orders found for this user.</p>}
                    </div>
                  )}
            </div>
        )}
    </div> // End ui-slide
  );
}