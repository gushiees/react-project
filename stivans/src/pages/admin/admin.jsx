// src/pages/admin/admin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '../../AuthContext.jsx';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  addProductImage, deleteProductImage, deleteImageFromStorage,
} from '../../data/products.jsx';
import ProductForm from './productform.jsx';
import { supabase } from '../../supabaseClient';
import './admin.css';

function fmtDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return d || '—'; }
}

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  // tabs
  const [tab, setTab] = useState('products');

  // products
  const [products, setProducts] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [pErr, setPErr] = useState(null);
  const [view, setView] = useState('list');
  const [selProduct, setSelProduct] = useState(null);
  const [editStockId, setEditStockId] = useState(null);
  const [newStock, setNewStock] = useState(0);

  // users
  const [users, setUsers] = useState([]);
  const [uLoading, setULoading] = useState(false);
  const [uErr, setUErr] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!loadingAuth && (!user || user.role !== 'admin')) navigate('/');
  }, [loadingAuth, user, navigate]);

  // PRODUCTS
  const loadProducts = useCallback(async () => {
    try {
      setPErr(null);
      setPLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      setPErr(e.message || 'Failed to load products');
      toast.error('Failed to load products');
    } finally {
      setPLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'products') loadProducts();
  }, [tab, loadProducts]);

  const onDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    const t = toast.loading('Deleting…');
    try {
      await deleteProduct(id);
      await loadProducts();
      toast.success('Product deleted', { id: t });
    } catch (e) {
      toast.error(e.message || 'Delete failed', { id: t });
    }
  };

  const onSubmitForm = async (data, mainImage, extraImages = [], deleteImgs = []) => {
    const t = toast.loading(view === 'edit' ? 'Saving changes…' : 'Creating product…');
    try {
      let payload = { ...data };

      // remove images
      for (const img of deleteImgs) {
        await deleteProductImage(img.id);
        await deleteImageFromStorage(img.url);
      }

      // upload main
      if (mainImage) {
        const fileName = `${Date.now()}_${mainImage.name}`;
        const { error: upErr } = await supabase.storage
          .from('product-images').upload(fileName, mainImage);
        if (upErr) throw upErr;
        const { data: pu } = supabase.storage.from('product-images').getPublicUrl(fileName);
        payload.image_url = pu.publicUrl;
      }

      let saved;
      if (view === 'edit') saved = await updateProduct(selProduct.id, payload);
      else saved = await createProduct(payload);
      if (!saved) throw new Error('Save failed');

      // additional images
      for (const f of extraImages) {
        const fn = `${Date.now()}_${f.name}`;
        const { error: upErr2 } = await supabase.storage.from('product-images').upload(fn, f);
        if (upErr2) throw upErr2;
        const { data: pu2 } = supabase.storage.from('product-images').getPublicUrl(fn);
        await addProductImage(saved.id, pu2.publicUrl);
      }

      setView('list'); setSelProduct(null);
      await loadProducts();
      toast.success('Saved!', { id: t });
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to save', { id: t });
    }
  };

  const onStartEditStock = (p) => { setEditStockId(p.id); setNewStock(p.stock_quantity); };
  const onCancelEditStock = () => { setEditStockId(null); setNewStock(0); };
  const onSaveStock = async (id) => {
    const t = toast.loading('Updating stock…');
    try {
      await updateProduct(id, { stock_quantity: Number(newStock) });
      setEditStockId(null);
      await loadProducts();
      toast.success('Stock updated', { id: t });
    } catch (e) {
      toast.error(e.message || 'Stock update failed', { id: t });
    }
  };

  // USERS
  const loadUsers = useCallback(async () => {
    try {
      setUErr(null);
      setULoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const u = new URL('/api/admin/users/list', window.location.origin);
      u.searchParams.set('page', String(page));
      u.searchParams.set('perPage', '50');
      if (q) u.searchParams.set('q', q);

      const resp = await fetch(u, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Load users failed');
      setUsers(json.users || []);
    } catch (e) {
      setUErr(e.message || 'Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setULoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, loadUsers]);

  const onChangeRole = async (userId, role) => {
    const t = toast.loading('Updating role…');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const resp = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, role }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Role update failed');

      await loadUsers();
      toast.success('Role updated', { id: t });
    } catch (e) {
      toast.error(e.message || 'Role update failed', { id: t });
    }
  };

  const onDeleteUser = async (id, email) => {
    if (!window.confirm(`Delete ${email || id}? This removes all their data.`)) return;
    const t = toast.loading('Deleting user…');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const resp = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: id }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.details || json?.error || 'Delete failed');

      await loadUsers();
      toast.success('User deleted', { id: t });
    } catch (e) {
      toast.error(e.message || 'Delete failed', { id: t });
    }
  };

  if (loadingAuth || !user || user.role !== 'admin') {
    return <div className="admin-container"><p>Loading or verifying access…</p><Toaster/></div>;
  }

  return (
    <div className="admin-container">
      <Toaster position="top-right" />
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={async () => { await logout(); navigate('/login'); }} className="logout-button">Logout</button>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
      </div>

      {/* PRODUCTS */}
      {tab === 'products' && (
        <div className="admin-section">
          {pErr && <p className="error-message">{pErr}</p>}
          {pLoading && <p>Loading products…</p>}

          {!pLoading && !pErr && (
            <>
              {view === 'list' ? (
                <>
                  <div className="toolbar">
                    <button onClick={() => { setSelProduct(null); setView('create'); }}>Add Product</button>
                  </div>

                  <table className="admin-table">
                    <thead>
                      <tr><th>Name</th><th>Price</th><th>Stock</th><th style={{textAlign:'right'}}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} className={p.stock_quantity === 0 ? 'out-of-stock-row' : ''}>
                          <td>{p.name}</td>
                          <td>₱{Number(p.price||0).toLocaleString()}</td>
                          <td>
                            {editStockId === p.id ? (
                              <div className="inline-edit">
                                <input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} />
                                <button onClick={()=>onSaveStock(p.id)} className="save">Save</button>
                                <button onClick={onCancelEditStock} className="ghost">Cancel</button>
                              </div>
                            ) : (
                              <span className="stock-value" onClick={()=>onStartEditStock(p)}>{p.stock_quantity}</span>
                            )}
                          </td>
                          <td style={{textAlign:'right'}}>
                            <button onClick={()=>{ setSelProduct(p); setView('edit'); }}>Edit</button>
                            <button className="danger" onClick={()=>onDeleteProduct(p.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <ProductForm
                  onSubmit={onSubmitForm}
                  onCancel={()=>{ setView('list'); setSelProduct(null); }}
                  initialData={selProduct}
                  loading={pLoading}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="admin-section">
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search email…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==='Enter') { setPage(1); loadUsers(); }}}
            />
            <button onClick={()=>{ setPage(1); loadUsers(); }}>Search</button>
          </div>

          {uErr && <p className="error-message">{uErr}</p>}
          {uLoading && <p>Loading users…</p>}

          {!uLoading && !uErr && (
            <table className="admin-table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>Created</th><th>Last Sign-In</th><th style={{textAlign:'right'}}>Actions</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="5">No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email || '—'}</td>
                    <td>
                      <div className="role-inline">
                        <span className={`badge ${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role}</span>
                        <select
                          defaultValue={u.role}
                          onChange={(e)=>onChangeRole(u.id, e.target.value)}
                          className="role-select"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>{fmtDate(u.last_sign_in_at)}</td>
                    <td style={{textAlign:'right'}}>
                      <button className="danger" onClick={()=>onDeleteUser(u.id, u.email)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
