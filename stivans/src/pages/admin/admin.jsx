import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, addProductImage, deleteProductImage } from '../../data/products.jsx';
import ProductForm from './productform.jsx';
import { supabase } from '../../supabaseClient';
import './admin.css';
import { usePersistentState } from '../../hooks/usepersistentstate.js';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = usePersistentState('adminFormView', 'list');
  const [selectedProduct, setSelectedProduct] = usePersistentState('adminSelectedProduct', null);

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
    if (activeTab === 'products') {
      loadProducts();
    }
  }, [activeTab]);

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
  
  const handleFormSubmit = async (productData, mainImageFile, additionalImageFiles, imagesToDelete) => {
    try {
      setLoading(true);
      setError(null);
      let finalProductData = { ...productData };
      let savedProduct;

      // Sanitize numeric inputs before sending to the database.
      // An empty string for a number field would cause a database error.
      if (finalProductData.stock_quantity === '') {
        finalProductData.stock_quantity = 0;
      }

      // 1. Delete images marked for deletion
      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          await deleteProductImage(imageId);
        }
      }

      // 2. Upload main image if a new one was provided
      if (mainImageFile) {
        const fileName = `${Date.now()}_${mainImageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, mainImageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        finalProductData.image_url = publicUrl;
      }

      // 3. Save the product data (create or update)
      if (view === 'edit') {
        savedProduct = await updateProduct(selectedProduct.id, finalProductData);
      } else {
        savedProduct = await createProduct(finalProductData);
      }
      
      if (!savedProduct) {
        // If the save failed, we should stop.
        // The updateProduct/createProduct functions return null on error.
        throw new Error("Failed to save product data.");
      }

      // 4. Upload and link additional images
      if (additionalImageFiles && additionalImageFiles.length > 0) {
        for (const file of additionalImageFiles) {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
          // Link the new image to the product (whether it was new or edited)
          await addProductImage(savedProduct.id, publicUrl);
        }
      }

      // On success, reset the view
      setView('list');
      setSelectedProduct(null);
      await loadProducts();
      
    } catch(err) {
      console.error("Error submitting product form:", err);
      setError("Failed to save product. Check the console for details.");
      // Keep the form open so the user can see the error and their data
      setLoading(false);
    }
  };
  
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
          
          {/* --- FIX IS HERE: Display the error message if it exists --- */}
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