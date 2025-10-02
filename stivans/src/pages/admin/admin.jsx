// src/pages/admin/admin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  deleteImageFromStorage,
} from '../../data/products.jsx';
import ProductForm from './productform.jsx';
import { supabase } from '../../supabaseClient';
import './admin.css';
import { usePersistentState } from '../../hooks/usepersistentstate.js';

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  // tabs
  const [activeTab, setActiveTab] = useState('products');

  // products state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = usePersistentState('adminFormView', 'list');
  const [selectedProduct, setSelectedProduct] = usePersistentState('adminSelectedProduct', null);
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);

  // users state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const perPage = 50;

  useEffect(() => {
    if (!loadingAuth) {
      if (!user || user.role !== 'admin') {
        navigate('/');
      }
    }
  }, [user, loadingAuth, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // ----- Products -----
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(`Failed to load products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'products' && user?.role === 'admin') {
      loadProducts();
    }
  }, [activeTab, user, loadProducts]);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setView('edit');
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setView('create');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      await loadProducts();
    }
  };

  const handleCancelForm = () => {
    setView('list');
    setSelectedProduct(null);
  };

  const handleFormSubmit = async (
    productData,
    mainImageFile,
    additionalImageFiles = [],
    imagesToDelete = []
  ) => {
    try {
      setLoading(true);
      setError(null);
      let finalProductData = { ...productData };
      let savedProduct;

      // delete removed images
      if (imagesToDelete.length > 0) {
        for (const image of imagesToDelete) {
          await deleteProductImage(image.id);
          await deleteImageFromStorage(image.url);
        }
      }

      // upload main image (replace)
      if (mainImageFile) {
        const fileName = `${Date.now()}_${mainImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, mainImageFile);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from('product-images').getPublicUrl(fileName);
        finalProductData.image_url = publicUrl;
      }

      if (view === 'edit') {
        savedProduct = await updateProduct(selectedProduct.id, finalProductData);
      } else {
        savedProduct = await createProduct(finalProductData);
      }

      if (!savedProduct) throw new Error('Failed to save product.');

      // upload additional images
      if (additionalImageFiles.length > 0) {
        for (const file of additionalImageFiles) {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          const {
            data: { publicUrl },
          } = supabase.storage.from('product-images').getPublicUrl(fileName);
          await addProductImage(savedProduct.id, publicUrl);
        }
      }

      setView('list');
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error('Error submitting product form:', err);
      setError('Failed to save product. Check the console for details.');
      setLoading(false);
    }
  };

  const handleEditStockClick = (product) => {
    setEditingStockId(product.id);
    setNewStockValue(product.stock_quantity);
  };

  const handleCancelStockEdit = () => {
    setEditingStockId(null);
    setNewStockValue(0);
  };

  const handleSaveStock = async (productId) => {
    try {
      await updateProduct(productId, { stock_quantity: Number(newStockValue) });
      setEditingStockId(null);
      await loadProducts();
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError('Failed to update stock.');
    }
  };

  // ----- Users -----
  const fetchUsers = useCallback(async () => {
    try {
      setUsersErr(null);
      setUsersLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const u = new URL('/api/admin/users/list', window.location.href);
      u.searchParams.set('page', String(page));
      u.searchParams.set('perPage', String(perPage));
      if (q) u.searchParams.set('q', q);

      const resp = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      let payload = null;
      try { payload = await resp.json(); } catch {}

      if (!resp.ok) {
        const msg = payload?.details || payload?.error || `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      setUsersList(payload.users || []);
    } catch (e) {
      console.error('[users/list] error:', e);
      setUsersErr(e.message);
    } finally {
      setUsersLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    if (activeTab === 'users' && user?.role === 'admin') {
      fetchUsers();
    }
  }, [activeTab, user, fetchUsers]);

  const deleteUserCompletely = async (targetUserId, targetEmail) => {
    if (!window.confirm(`Delete user ${targetEmail || targetUserId}? This cannot be undone.`)) return;

    try {
      setUsersLoading(true);
      setUsersErr(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const resp = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: targetUserId }),
      });

      let payload = null;
      try { payload = await resp.json(); } catch {}

      if (!resp.ok) {
        const msg = payload?.details || payload?.error || `HTTP ${resp.status}`;
        console.error('Delete failed:', payload || resp.statusText);
        throw new Error(msg);
      }

      alert('User deleted.');
      await fetchUsers();
    } catch (e) {
      console.error(e);
      setUsersErr(`Delete failed: ${e.message}`);
    } finally {
      setUsersLoading(false);
    }
  };

  // ----- Render -----
  if (loadingAuth || !user || user.role !== 'admin') {
    return (
      <div className="admin-container">
        <p>Loading or verifying access...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>

      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab('products')}
          className={activeTab === 'products' ? 'active' : ''}
        >
          Product Management
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'active' : ''}
        >
          User Management
        </button>
      </div>

      {/* PRODUCTS */}
      {activeTab === 'products' && (
        <div className="admin-section">
          {loading && <p>Loading products...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <>
              {view === 'list' ? (
                <>
                  <button onClick={handleAddNew}>Add New Product</button>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className={product.stock_quantity === 0 ? 'out-of-stock-row' : ''}>
                          <td>{product.name}</td>
                          <td>₱{product.price ? Number(product.price).toLocaleString() : '0'}</td>
                          <td>
                            {editingStockId === product.id ? (
                              <div className="inline-edit-stock">
                                <input
                                  type="number"
                                  value={newStockValue}
                                  onChange={(e) => setNewStockValue(e.target.value)}
                                  className="inline-stock-input"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveStock(product.id)} className="save-stock">Save</button>
                                <button onClick={handleCancelStockEdit} className="cancel-stock">Cancel</button>
                              </div>
                            ) : (
                              <span
                                className="editable-stock-value"
                                onClick={() => handleEditStockClick(product)}
                              >
                                {product.stock_quantity}
                              </span>
                            )}
                          </td>
                          <td className="actions">
                            <button onClick={() => handleEdit(product)}>Edit Page</button>
                            <button onClick={() => handleDelete(product.id)} className="delete">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <ProductForm
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancelForm}
                  initialData={selectedProduct}
                  loading={loading}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <h2>Users</h2>

          <div className="users-toolbar">
            <input
              type="search"
              placeholder="Search email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchUsers())}
            />
            <button onClick={() => (setPage(1), fetchUsers())}>Search</button>
          </div>

          {usersErr && <p className="error-message">{usersErr}</p>}
          {usersLoading && <p>Loading users…</p>}

          {!usersLoading && !usersErr && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Last sign-in</th>
                  <th>User ID</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="5">No users found.</td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email || '—'}</td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>{formatDate(u.last_sign_in_at)}</td>
                      <td style={{ fontFamily: 'monospace' }}>{u.id}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="delete"
                          onClick={() => deleteUserCompletely(u.id, u.email)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
