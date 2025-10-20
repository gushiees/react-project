// src/pages/admin/UserInspector.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
// import { supabase } from '../../supabaseClient'; // No longer needed directly
import { fetchAdminAPI } from '../../utils/adminApi.js'; // Import helper

function money(n){ return '₱' + Number(n||0).toLocaleString(); }

// Accept handleAuthError as a prop
export default function UserInspector({ user, onClose, handleAuthError }) {
  const [loading, setLoading] = useState(true); // Start loading immediately
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null); // { profile, addresses, cart, orders }
  const [tab, setTab] = useState('profile');

  // --- UPDATED useEffect to use fetchAdminAPI ---
  useEffect(() => {
    let mounted = true;
    const loadUserDetails = async () => {
        try {
            setErr(null);
            setLoading(true); // Ensure loading state is true at the start
            const endpoint = new URL('/api/admin/users/inspect', window.location.origin);
            endpoint.searchParams.set('userId', user.id);

            // Fetch data using the helper, passing the auth error handler
            const json = await fetchAdminAPI(endpoint.toString(), { method: 'GET' }, handleAuthError);

            if (mounted) {
                setData(json); // Set data on success
            }
        } catch (e) {
            // Only handle non-auth errors here
            if (mounted && e.message !== 'Authentication required') {
                console.error("Inspector load error:", e);
                const errMsg = e.message || 'Failed to load user details';
                setErr(errMsg); // Set error state
                toast.error(errMsg);
            }
            // Auth errors trigger redirect via handleAuthError within fetchAdminAPI
        } finally {
            if (mounted) {
                setLoading(false); // Set loading to false after fetch attempt
            }
        }
    };

    loadUserDetails(); // Call the async function

    // Cleanup function
    return () => {
        mounted = false;
    };
  // Add handleAuthError as a dependency
  }, [user.id, handleAuthError]);

  // Calculate total cart value
  const totalCart = useMemo(() => {
    if (!data?.cart?.items) return 0;
    return data.cart.items.reduce((sum, item) => {
        const price = Number(item?.product?.price || 0);
        const quantity = Number(item.quantity || 0);
        return sum + (price * quantity);
    }, 0);
  }, [data?.cart?.items]); // Depend only on items

  // --- UPDATED cartAction ---
  async function cartAction(action, itemId = null) { // Made itemId optional
    // Prevent action if cartId is missing
     if (!data?.cart?.id) {
         toast.error("Cart information not available.");
         return;
     }

    const t = toast.loading('Updating cart…');
    try {
      // Use the helper for the API call
      const json = await fetchAdminAPI('/api/admin/carts/update', { // Ensure this endpoint exists
        method: 'POST',
        body: { action, cartId: data.cart.id, itemId } // Pass necessary data
      }, handleAuthError); // Pass the auth error handler

      // Update local state with the response from the API
      setData(d => ({ ...d, cart: { ...d.cart, items: json.items || [] }}));
      toast.success('Cart updated', { id: t });
    } catch (e) {
      // Only handle non-auth errors here
      if (e.message !== 'Authentication required') {
          console.error("Cart action error:", e);
          const errMsg = e.message || 'Cart update failed';
          toast.error(errMsg, { id: t });
      } else {
           toast.dismiss(t); // Dismiss loading if auth error occurred
      }
    }
  }

  // --- UPDATED updateOrder ---
  async function updateOrder(orderId, patch) {
    // Prevent action if orderId or patch is missing
     if (!orderId || !patch) {
         toast.error("Missing order ID or update data.");
         return;
     }
    const t = toast.loading('Saving order…');
    try {
       // Use the helper for the API call
       const json = await fetchAdminAPI('/api/admin/orders/update', { // Make sure this endpoint exists
        method: 'POST', // or PUT/PATCH depending on your API design
        body: { orderId, patch } // Send order ID and the changes
      }, handleAuthError); // Pass the auth error handler

      // Assuming API returns the fully updated order object
      setData(d => ({
          ...d,
          // Replace the old order with the updated one from the API response
          orders: d.orders.map(o => o.id === orderId ? json.order : o)
      }));
      toast.success('Order saved', { id: t });
    } catch (e) {
       // Only handle non-auth errors here
       if (e.message !== 'Authentication required') {
           console.error("Order update error:", e);
           const errMsg = e.message || 'Order update failed';
           toast.error(errMsg, { id: t });
       } else {
            toast.dismiss(t); // Dismiss loading if auth error occurred
       }
    }
  }

  // --- JSX ---
  return (
    <div className="ui-slide" role="dialog" aria-modal="true" aria-labelledby="inspector-title">
      <div className="ui-head">
        <h3 id="inspector-title">User: {user.email}</h3>
        <button onClick={onClose} aria-label="Close user inspector">×</button>
      </div>

      <div className="ui-tabs" role="tablist">
        <button role="tab" aria-selected={tab==='profile'} className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}>Profile</button>
        <button role="tab" aria-selected={tab==='cart'} className={tab==='cart'?'active':''} onClick={()=>setTab('cart')}>Cart</button>
        <button role="tab" aria-selected={tab==='orders'} className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>Orders</button>
      </div>

      {/* Loading State */}
      {loading && <p style={{padding:'16px'}}>Loading details…</p>}

      {/* Error State */}
      {!loading && err && <p className="error-message" style={{ margin: '16px' }}>{err}</p>}

      {/* Content Area */}
      {!loading && !err && data && (
        <div className="ui-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="ui-section" role="tabpanel" aria-labelledby="tab-profile">
              <h4>Profile</h4>
              <p><b>Name:</b> {data.profile?.full_name || '—'}</p>
              <p><b>Phone:</b> {data.profile?.phone_number || '—'}</p>
              <p><b>Role:</b> {data.profile?.role || 'user'}</p>
              {/* Add created_at/updated_at if available in profile data */}
              {/* <p><b>Member Since:</b> {formatDate(data.profile?.created_at)}</p> */}

              <h4 style={{marginTop: 18}}>Addresses</h4>
              {data.addresses?.length ? (
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

          {/* Cart Tab */}
          {tab === 'cart' && (
            <div className="ui-section" role="tabpanel" aria-labelledby="tab-cart">
              {data.cart?.id ? (
                <>
                  <div className="ui-row-between">
                    <h4>Cart Items ({data.cart.items.length})</h4>
                    {data.cart.items.length > 0 && (
                        <button className="action-btn delete-btn" onClick={()=>cartAction('clear')}>Clear Cart</button>
                    )}
                  </div>
                  {data.cart.items.length > 0 ? (
                    <table className="admin-table" style={{ fontSize: '0.85rem' }}>
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

          {/* Orders Tab */}
          {tab === 'orders' && (
            <div className="ui-section" role="tabpanel" aria-labelledby="tab-orders">
             <h4>Orders ({data.orders?.length || 0})</h4>
              {data.orders?.length > 0 ? data.orders.map(o => (
                <div key={o.id} className="ui-card">
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
                        {/* Add more statuses if needed */}
                      </select>
                    </div>
                  </div>

                  {/* Optional Addresses Display/Edit */}
                  {/* <div className="ui-grid-2">
                    <div>
                      <label>Shipping Address</label>
                      <textarea defaultValue={o.shipping_address || ''} onBlur={(e)=>updateOrder(o.id, { shipping_address: e.target.value })} />
                    </div>
                    <div>
                      <label>Billing Address</label>
                      <textarea defaultValue={o.billing_address || ''} onBlur={(e)=>updateOrder(o.id, { billing_address: e.target.value })} />
                    </div>
                  </div> */}

                  {/* Order Items Table */}
                  {o.order_items?.length > 0 && (
                      <table className="admin-table" style={{marginTop: 8, fontSize: '0.85rem'}}>
                        <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Item Total</th></tr></thead>
                        <tbody>
                          {o.order_items.map(it => (
                            <tr key={it.id}>
                              <td>{it.name || `(Product ID: ${it.product_id})`}</td>
                              <td>{money(it.price)}</td>
                              <td>{it.quantity}</td>
                              <td>{money(Number(it.price || 0) * Number(it.quantity || 0))}</td>
                               {/* Input fields for editing price/qty removed for simplicity, use patch if needed */}
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
                   {/* Inputs for editing totals removed for simplicity, use patch if needed */}
                </div>
              )) : <p>No orders found for this user.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}