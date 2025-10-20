// src/pages/admin/AdminProducts.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast"; // Ensure import
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  addProductImage, deleteProductImage, deleteImageFromStorage,
} from "../../data/products.jsx";
import ProductForm from "./productform.jsx";
import { supabase } from "../../supabaseClient";
import { usePersistentState } from "../../hooks/usepersistentstate.js";
import { fetchAdminAPI } from "../../utils/adminApi.js";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal/ConfirmDeleteModal.jsx";
import "./AdminProducts.css";

// Helper function for sorting products
function sortProducts(products, sortKey) {
  const sorted = [...products];
  switch (sortKey) {
    case 'name_asc': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
    case 'name_desc': sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
    case 'price_asc': sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
    case 'price_desc': sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
    case 'stock_asc': sorted.sort((a, b) => (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0)); break;
    case 'stock_desc': sorted.sort((a, b) => (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0)); break;
    case 'default': default: sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
  }
  return sorted;
}


export default function AdminProducts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = usePersistentState("adminFormView", "list");
  const [selectedProduct, setSelectedProduct] = usePersistentState("adminSelectedProduct", null);
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSortOrder, setProductSortOrder] = useState('default');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAuthError = useCallback(() => {
    // Show toast *before* redirecting
    toast.error('Session expired or invalid. Redirecting to login.', { id: 'auth-error-redirect' }); // Added ID
    if (logout) logout();
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await fetchProducts();
      setProducts(data || []);
    } catch (err) {
      console.error("Error loading products:", err);
      const fetchErrorMsg = `Failed to load products: ${err.message}`;
      setError(fetchErrorMsg);
      toast.error(fetchErrorMsg); // Use toast for error
      if (err?.status === 401 || err?.status === 403 || err?.message?.includes('JWT') || err?.message?.includes('Unauthorized')) {
        handleAuthError();
      }
    } finally { setLoading(false); }
  }, [handleAuthError]);

  useEffect(() => {
     if (user?.role === 'admin') loadProducts();
     else if (!user && logout) handleAuthError();
  }, [loadProducts, user, handleAuthError, logout]);

  const filteredAndSortedProducts = useMemo(() => {
    let result = products;
    if (productSearchTerm) {
      const lowerCaseSearch = productSearchTerm.toLowerCase();
      result = result.filter(product =>
        product.name?.toLowerCase().includes(lowerCaseSearch) ||
        product.description?.toLowerCase().includes(lowerCaseSearch) ||
        product.category?.toLowerCase().includes(lowerCaseSearch)
      );
    }
    result = sortProducts(result, productSortOrder);
    return result;
  }, [products, productSearchTerm, productSortOrder]);

  const handleEdit = (product) => { setError(null); setSelectedProduct(product); setView("edit"); };
  const handleAddNew = () => { setError(null); setSelectedProduct(null); setView("create"); };
  const handleCancelForm = () => { setView("list"); setSelectedProduct(null); setError(null); window.localStorage.removeItem('productFormDraft'); };

  // --- Delete Logic ---
  const handleDeleteInitiate = (product) => {
    setItemToDelete({ id: product.id, name: product.name });
    setShowDeleteModal(true);
    setIsDeleting(false);
  };

  const confirmDeleteProduct = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    // Use toast.promise for loading, success, error handling
    const deletePromise = supabase.from('products').delete().eq('id', itemToDelete.id).then(({ error }) => {
        if (error && (error.code === '42501' || error.message.includes('permission denied'))) {
          throw new Error('Permission denied.');
        } else if (error) { throw error; }
        // Success case inside then()
        setShowDeleteModal(false);
        setItemToDelete(null);
        loadProducts(); // Refresh list *after* success
    });

    toast.promise(deletePromise, {
        loading: 'Deleting product...',
        success: 'Product Deleted!',
        error: (err) => {
            console.error("Delete product error:", err);
            // Handle auth error redirect if needed from promise error
            if (err?.status === 401 || err?.status === 403 || err?.message?.includes('Permission denied')) {
                handleAuthError();
                return 'Authentication/Permission Error'; // Prevent default error toast
            }
            return err.message || 'Delete failed'; // Message for error toast
        }
    }).finally(() => setIsDeleting(false)); // Reset deleting state regardless of outcome
  };

  const handleCancelDelete = () => { setShowDeleteModal(false); setItemToDelete(null); setIsDeleting(false); };

  // --- Form Submission Logic ---
  const handleFormSubmit = async ( productData, mainImageFile, additionalImageFiles = [], imagesToDelete = [] ) => {
    setFormSubmitting(true); setError(null);
    let loadingToastId = toast.loading("Saving..."); // Start loading toast

    try {
        if (view === 'create') {
           const productNameLower = productData.name?.trim().toLowerCase();
           const nameExists = products && products.some(p => p.name?.toLowerCase() === productNameLower);
           if (nameExists) { throw new Error(`A product named "${productData.name}" already exists.`); }
        }

        let finalProductData = { ...productData }; let savedProductResult;

        if (imagesToDelete.length > 0) {
           for (const image of imagesToDelete) { await deleteProductImage(image.id); await deleteImageFromStorage(image.url); }
        }
        if (mainImageFile) {
            const fileName = `${Date.now()}_${mainImageFile.name}`;
            const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, mainImageFile);
            if (uploadError) throw new Error(`Main image upload failed: ${uploadError.message}`);
            const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
            finalProductData.image_url = publicUrl;
        }

       if (view === 'edit') {
           savedProductResult = await updateProduct(selectedProduct.id, finalProductData);
           if (!savedProductResult) throw new Error("Update product failed.");
       } else {
           savedProductResult = await createProduct(finalProductData);
            if (!savedProductResult) throw new Error("Create product failed.");
       }

        if (additionalImageFiles.length > 0) {
            const uploadPromises = additionalImageFiles.map(async (file) => {
              try {
                 const fileName = `${Date.now()}_${file.name}`;
                 const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
                 if (uploadError) throw uploadError;
                 const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
                 await addProductImage(savedProductResult.id, publicUrl);
              } catch (imgErr) { console.error("Failed to add additional image:", imgErr); toast.error(`Product saved, but failed to add image: ${file.name}`); } // Separate toast for image error
            });
            await Promise.allSettled(uploadPromises);
        }

        setView("list"); setSelectedProduct(null); await loadProducts();
        toast.success("Product Saved!", { id: loadingToastId }); // Update loading toast to success
        window.localStorage.removeItem('productFormDraft');

    } catch (err) { // Error Handling
      console.error("Error submitting product form:", err);
      const errorMessage = err.message || "Failed to save product.";
      setError(errorMessage);
      toast.error(errorMessage, { id: loadingToastId }); // Update loading toast to error
      if (!err.message?.includes('API call failed') && (err?.status === 401 || err?.status === 403 || err?.message?.includes('Permission denied'))) {
          handleAuthError(); // Redirect on auth/permission error
      }
    } finally { setFormSubmitting(false); }
  };

  // --- Stock Editing Logic ---
  const handleEditStockClick = (product) => { setEditingStockId(product.id); setNewStockValue(product.stock_quantity ?? 0); };
  const handleCancelStockEdit = () => { setEditingStockId(null); setNewStockValue(0); };
  const handleSaveStock = async (productId) => {
    setError(null);
    const stockData = { stock_quantity: Number(newStockValue) };
    // Use toast.promise
    const savePromise = supabase.from('products').update(stockData).eq('id', productId).then(({ error }) => {
        if (error && (error.code === '42501' || error.message.includes('permission denied'))) { throw new Error('Permission denied.'); }
        else if (error) { throw error; }
        setEditingStockId(null);
        loadProducts(); // Refresh list after success
    });

    toast.promise(savePromise, {
        loading: 'Updating stock...',
        success: 'Stock Updated!',
        error: (err) => {
            console.error("Failed to update stock:", err);
            if (err?.status === 401 || err?.status === 403 || err?.message?.includes('Permission denied')) {
                handleAuthError(); // Redirect on auth/permission error
                return 'Authentication/Permission Error'; // Prevent default error toast
            }
            return err.message || 'Stock update failed';
        }
    });
  };

  // --- JSX Rendering ---
  return (
    <div className="admin-section">
      {view === 'list' && <h2>Product Management</h2>}
      {view === 'edit' && <h2>Edit Product</h2>}
      {view === 'create' && <h2>Add New Product</h2>}

      {loading && view === 'list' && <p>Loading products…</p>}
      {!loading && view === 'list' && error && <p className="error-message">{error}</p>}

      {!loading && view === 'list' && (
        <>
          <div className="admin-toolbar product-toolbar">
             <input type="search" placeholder="Search products..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="admin-search-input" />
             <div className="admin-toolbar-right">
               <select value={productSortOrder} onChange={(e) => setProductSortOrder(e.target.value)} className="admin-sort-select" aria-label="Sort products by">
                 <option value="default">Sort by...</option> <option value="name_asc">Name (A-Z)</option> <option value="name_desc">Name (Z-A)</option>
                 <option value="price_asc">Price (Low-High)</option> <option value="price_desc">Price (High-Low)</option>
                 <option value="stock_asc">Stock (Low-High)</option> <option value="stock_desc">Stock (High-Low)</option>
               </select>
               <button onClick={handleAddNew} className="add-product-btn"> Add New Product </button>
             </div>
           </div>
           <table className="admin-table products-table">
             <thead> <tr><th>Name</th><th>Price</th><th>Stock</th><th style={{ textAlign: "right" }}>Actions</th></tr> </thead>
             <tbody>
               {filteredAndSortedProducts.length > 0 ? (
                 filteredAndSortedProducts.map((product) => (
                   <tr key={product.id} className={product.stock_quantity === 0 ? "out-of-stock-row" : ""}>
                     <td>{product.name}</td>
                     <td>₱{product.price ? Number(product.price).toLocaleString() : "0"}</td>
                     <td>
                       {editingStockId === product.id ? (
                         <div className="inline-edit-stock">
                            <input type="number" value={newStockValue} onChange={(e) => setNewStockValue(e.target.value)} className="inline-stock-input" autoFocus min="0" />
                            <button onClick={() => handleSaveStock(product.id)} className="action-btn save-btn">Save</button>
                            <button onClick={handleCancelStockEdit} className="action-btn cancel-btn">Cancel</button>
                         </div>
                       ) : ( <span className="editable-stock-value" onClick={() => handleEditStockClick(product)}>{product.stock_quantity ?? 0}</span> )}
                     </td>
                     <td style={{ textAlign: "right" }}>
                       <button onClick={() => handleEdit(product)} className="action-btn edit-btn">Edit Page</button>
                       <button onClick={() => handleDeleteInitiate(product)} className="action-btn delete-btn" style={{ marginLeft: 8 }} disabled={isDeleting && itemToDelete?.id === product.id}> Delete </button>
                     </td>
                   </tr>
                 ))
               ) : ( <tr><td colSpan="4" style={{ textAlign: 'center' }}>{productSearchTerm ? `No products found matching "${productSearchTerm}".` : "No products available."}</td></tr> )}
             </tbody>
           </table>
        </>
      )}

      {(view === 'edit' || view === 'create') && ( <ProductForm onSubmit={handleFormSubmit} onCancel={handleCancelForm} initialData={selectedProduct} loading={formSubmitting} apiError={error} /> )}

      <ConfirmDeleteModal isOpen={showDeleteModal} itemName={itemToDelete?.name} itemType="product" onConfirm={confirmDeleteProduct} onCancel={handleCancelDelete} isDeleting={isDeleting} />
    </div>
  );
}