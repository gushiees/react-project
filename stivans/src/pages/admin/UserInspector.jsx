import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

function money(n){ return '₱' + Number(n||0).toLocaleString(); }

export default function UserInspector({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null); // { profile, addresses, cart, orders }
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr(null); setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const u = new URL('/api/admin/users/inspect', window.location.origin);
        u.searchParams.set('userId', user.id);
        const resp = await fetch(u, {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Load failed');
        if (mounted) setData(json);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user.id]);

  const totalCart = useMemo(() => {
    if (!data?.cart?.items) return 0;
    return data.cart.items.reduce((s, it) => s + Number(it?.product?.price||0) * Number(it.quantity||0), 0);
  }, [data]);

  async function cartAction(action, itemId) {
    const t = toast.loading('Updating cart…');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/carts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action, cartId: data.cart.id, itemId })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Cart update failed');
      setData(d => ({ ...d, cart: { ...d.cart, items: json.items || [] }}));
      toast.success('Cart updated', { id: t });
    } catch (e) {
      toast.error(e.message, { id: t });
    }
  }

  async function updateOrder(orderId, patch) {
    const t = toast.loading('Saving order…');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ orderId, patch })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Update failed');
      setData(d => ({ ...d, orders: d.orders.map(o => o.id === orderId ? json.order : o) }));
      toast.success('Order saved', { id: t });
    } catch (e) {
      toast.error(e.message, { id: t });
    }
  }

  return (
    <div className="ui-slide">
      <div className="ui-head">
        <h3>User: {user.email}</h3>
        <button onClick={onClose}>Close</button>
      </div>

      <div className="ui-tabs">
        <button className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}>Profile</button>
        <button className={tab==='cart'?'active':''} onClick={()=>setTab('cart')}>Cart</button>
        <button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>Orders</button>
      </div>

      {loading && <p style={{padding:'12px'}}>Loading…</p>}
      {err && <p className="error-message">{err}</p>}

      {!loading && !err && data && (
        <>
          {tab === 'profile' && (
            <div className="ui-section">
              <h4>Profile</h4>
              <p><b>Name:</b> {data.profile?.full_name || '—'}</p>
              <p><b>Phone:</b> {data.profile?.phone_number || '—'}</p>
              <p><b>Role:</b> {data.profile?.role || 'user'}</p>

              <h4 style={{marginTop:18}}>Addresses</h4>
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
              ) : <p>No addresses</p>}
            </div>
          )}

          {tab === 'cart' && (
            <div className="ui-section">
              {data.cart?.id ? (
                <>
                  <div className="ui-row-between">
                    <h4>Cart Items</h4>
                    <button className="danger" onClick={()=>cartAction('clear')}>Clear Cart</button>
                  </div>
                  {data.cart.items.length ? (
                    <table className="admin-table">
                      <thead>
                        <tr><th>Product</th><th>Price</th><th>Qty</th><th style={{textAlign:'right'}}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {data.cart.items.map(ci => (
                          <tr key={ci.id}>
                            <td>{ci.product?.name || '—'}</td>
                            <td>{money(ci.product?.price)}</td>
                            <td>{ci.quantity}</td>
                            <td style={{textAlign:'right'}}>
                              <button className="danger" onClick={()=>cartAction('remove-item', ci.id)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td><b>Total</b></td>
                          <td colSpan={3} style={{textAlign:'right'}}><b>{money(totalCart)}</b></td>
                        </tr>
                      </tbody>
                    </table>
                  ) : <p>Cart is empty.</p>}
                </>
              ) : <p>No cart created.</p>}
            </div>
          )}

          {tab === 'orders' && (
            <div className="ui-section">
              {data.orders?.length ? data.orders.map(o => (
                <div key={o.id} className="ui-card">
                  <div className="ui-row-between">
                    <h4>Order #{o.id.slice(0,8)}</h4>
                    <div className="ui-inline">
                      <label>Status</label>
                      <select defaultValue={o.status} onChange={(e)=>updateOrder(o.id, { status: e.target.value })}>
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="failed">failed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </div>
                  </div>

                  <div className="ui-grid-2">
                    <div>
                      <label>Shipping Address</label>
                      <textarea
                        defaultValue={o.shipping_address || ''}
                        onBlur={(e)=>updateOrder(o.id, { shipping_address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Billing Address</label>
                      <textarea
                        defaultValue={o.billing_address || ''}
                        onBlur={(e)=>updateOrder(o.id, { billing_address: e.target.value })}
                      />
                    </div>
                  </div>

                  <table className="admin-table" style={{marginTop:8}}>
                    <thead><tr><th>Item</th><th>Price</th><th>Qty</th></tr></thead>
                    <tbody>
                      {o.order_items?.map(it => (
                        <tr key={it.id}>
                          <td>{it.name}</td>
                          <td>
                            <input
                              type="number"
                              defaultValue={it.price}
                              onBlur={(e)=>updateOrder(o.id, { items: [{ id: it.id, price: Number(e.target.value) }] })}
                              style={{width:100}}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              defaultValue={it.quantity}
                              onBlur={(e)=>updateOrder(o.id, { items: [{ id: it.id, quantity: Number(e.target.value) }] })}
                              style={{width:80}}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="ui-grid-4" style={{marginTop:8}}>
                    <div>
                      <label>Subtotal</label>
                      <input type="number" defaultValue={o.subtotal||0}
                        onBlur={(e)=>updateOrder(o.id, { subtotal: Number(e.target.value) })}/>
                    </div>
                    <div>
                      <label>Tax</label>
                      <input type="number" defaultValue={o.tax||0}
                        onBlur={(e)=>updateOrder(o.id, { tax: Number(e.target.value) })}/>
                    </div>
                    <div>
                      <label>Shipping</label>
                      <input type="number" defaultValue={o.shipping||0}
                        onBlur={(e)=>updateOrder(o.id, { shipping: Number(e.target.value) })}/>
                    </div>
                    <div>
                      <label>Total</label>
                      <input type="number" defaultValue={o.total||0}
                        onBlur={(e)=>updateOrder(o.id, { total: Number(e.target.value) })}/>
                    </div>
                  </div>
                </div>
              )) : <p>No orders yet.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
