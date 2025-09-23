import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import { useAuth } from '../../AuthContext.jsx'; // Import your auth hook
import { fetchProducts, createProduct, updateProduct, deleteProduct, addProductImage, deleteProductImage } from '../../data/products.jsx';
import ProductForm from './productform.jsx';
import { supabase } from '../../supabaseClient';
import './admin.css';
import { usePersistentState } from '../../hooks/usepersistentstate.js';

export default function Admin() {
  // --- FIX: Get user and auth status from the Auth context ---
  const { user, loadingAuth } = useAuth(); 
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = usePersistentState('adminFormView', 'list');
  const [selectedProduct, setSelectedProduct] = usePersistentState('adminSelectedProduct', null);

  // --- FIX: This new useEffect handles security and redirection ---
  useEffect(() => {
    // First, wait until the authentication status is fully loaded
    if (!loadingAuth) {
      // If there is no logged-in user, or the user's role is not 'admin',
      // redirect them to the homepage.
      if (!user || user.role !== 'admin') {
        navigate('/'); 
      }
    }
  }, [user, loadingAuth, navigate]);

  const loadProducts = async () => {
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
  };

  useEffect(() => {
    // Only load products if the user is confirmed to be an admin
    if (activeTab === 'products' && user?.role === 'admin') {
      loadProducts();
    }
  }, [activeTab, user]);

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
  
  const handleFormSubmit = async (productData, files, imagesToDelete) => {
    try {
      setLoading(true);
      setError(null);
      let finalProductData = { ...productData };
      let savedProduct;

      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          await deleteProductImage(imageId);
        }
      }

      if (files.length > 0) {
        const mainImageFile = files[0];
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

      if (files.length > 1) {
        const additionalImages = files.slice(1);
        for (const file of additionalImages) {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
          await addProductImage(savedProduct.id, publicUrl);
        }
      }
    } catch(err) {
      console.error("Error submitting product form:", err);
      setError("Failed to save product. Check the console for details.");
    } finally {
      setView('list');
      setSelectedProduct(null);
      await loadProducts();
    }
  };
  
  // --- FIX: While checking auth or if user is not an admin, show a loading/empty state ---
  if (loadingAuth || !user || user.role !== 'admin') {
    return (
      <div className="admin-container">
        <p>Loading or verifying access...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
      
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
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>₱{product.price ? product.price.toLocaleString() : '0'}</td>
                          <td>{product.stock_quantity}</td>
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