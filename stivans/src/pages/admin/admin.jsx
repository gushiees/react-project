import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { fetchProducts, createProduct, updateProduct, deleteProduct, addProductImage, deleteProductImage, deleteImageFromStorage } from '../../data/products.jsx';
import ProductForm from './productform.jsx';
import { supabase } from '../../supabaseClient';
import './admin.css';
import { usePersistentState } from '../../hooks/usepersistentstate.js';

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth(); 
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = usePersistentState('adminFormView', 'list');
  const [selectedProduct, setSelectedProduct] = usePersistentState('adminSelectedProduct', null);

  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);

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
      console.error("Failed to log out:", error);
    }
  };

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err); 
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
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteProduct(id);
      await loadProducts();
    }
  };

  const handleCancelForm = () => {
    setView('list');
    setSelectedProduct(null);
  };
  
  const handleFormSubmit = async (productData, mainImageFile, additionalImageFiles = [], imagesToDelete = []) => {
    try {
      setLoading(true);
      setError(null);
      let finalProductData = { ...productData };
      let savedProduct;

      if (imagesToDelete.length > 0) {
        for (const image of imagesToDelete) {
          await deleteProductImage(image.id);
          await deleteImageFromStorage(image.url);
        }
      }

      if (mainImageFile) {
        const fileName = `${Date.now()}_${mainImageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, mainImageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        finalProductData.image_url = publicUrl;
      }

      if (view === 'edit') {
        savedProduct = await updateProduct(selectedProduct.id, finalProductData);
      } else {
        savedProduct = await createProduct(finalProductData);
      }
      
      if (!savedProduct) throw new Error("Failed to save product.");

      if (additionalImageFiles.length > 0) {
        for (const file of additionalImageFiles) {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
          await addProductImage(savedProduct.id, publicUrl);
        }
      }
      
      setView('list');
      setSelectedProduct(null);
      await loadProducts();

    } catch(err) {
      console.error("Error submitting product form:", err);
      setError("Failed to save product. Check the console for details.");
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
      console.error("Failed to update stock:", err);
      setError("Failed to update stock.");
    }
  };
  
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

      {activeTab === 'products' && (
        <div className="admin-section">
          {loading && <p>Loading products...</p>}
          {error && <p className="error-message">{error}</p>}
          
          {!loading && !error && (
            <>
              {view === 'list' && (
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
                      {products.map(product => (
                        <tr key={product.id} className={product.stock_quantity === 0 ? 'out-of-stock-row' : ''}>
                          <td>{product.name}</td>
                          <td>₱{product.price ? product.price.toLocaleString() : '0'}</td>
                          
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
              )}

              {(view === 'create' || view === 'edit') && (
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

      {activeTab === 'users' && (
        <div className="admin-section">
          <h2>User Management</h2>
          <p>This is where you will build the interface to view, edit, and manage user accounts.</p>
        </div>
      )}
    </div>
  );
}