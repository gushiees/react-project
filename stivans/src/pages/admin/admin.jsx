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
                        {/* --- IMPLEMENTATION: Add Status column header --- */}
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(product => (
                        // --- IMPLEMENTATION: Add conditional class to row for styling ---
                        <tr key={product.id} className={product.stock_quantity === 0 ? 'out-of-stock-row' : ''}>
                          <td>{product.name}</td>
                          <td>₱{product.price ? product.price.toLocaleString() : '0'}</td>
                          <td>{product.stock_quantity}</td>
                          {/* --- IMPLEMENTATION: Add Status badge cell --- */}
                          <td>
                            {product.stock_quantity > 0 ? (
                              <span className="stock-status in-stock">In Stock</span>
                            ) : (
                              <span className="stock-status out-of-stock-badge">Out of Stock</span>
                            )}
                          </td>
                          <td className="actions">
                            <button onClick={() => handleEdit(product)}>Edit</button>
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