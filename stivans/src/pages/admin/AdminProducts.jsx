// src/pages/admin/AdminProducts.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "../../AuthContext.jsx"; // Import useAuth
import {
  fetchProducts, // Keep for initial load if not using admin API
  createProduct, // We'll replace the direct calls below if needed
  updateProduct, // We'll replace the direct calls below if needed
  deleteProduct, // We'll replace the direct calls below if needed
  addProductImage, // Keep direct call assuming RLS allows
  deleteProductImage, // Keep direct call assuming RLS allows
  deleteImageFromStorage, // Keep direct call
} from "../../data/products.jsx";
import ProductForm from "./productform.jsx";
import { supabase } from "../../supabaseClient";
import { usePersistentState } from "../../hooks/usepersistentstate.js";
import { fetchAdminAPI } from "../../utils/adminApi.js"; // Import the helper
import "./AdminProducts.css"; // Import the specific CSS

// Helper function for sorting products (keep as is)
function sortProducts(products, sortKey) {
  const sorted = [...products];
  switch (sortKey) {
    case 'name_asc':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'name_desc':
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'price_asc':
      sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      break;
    case 'price_desc':
      sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case 'stock_asc':
      sorted.sort((a, b) => (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0));
      break;
    case 'stock_desc':
      sorted.sort((a, b) => (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0));
      break;
    case 'default':
    default:
       sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
  }
  return sorted;
}


export default function AdminProducts() {
  const { user, logout } = useAuth(); // Get user and logout function from context
  const navigate = useNavigate(); // Get navigate function

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = usePersistentState("adminFormView", "list");
  const [selectedProduct, setSelectedProduct] = usePersistentState(
    "adminSelectedProduct",
    null
  );
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSortOrder, setProductSortOrder] = useState('default');

  // --- Define the logout and redirect function ---
  const handleAuthError = useCallback(() => {
    // Check if logout exists to prevent errors during initial renders
    if (logout) {
      logout();
    }
    // Use replace to prevent going back to the admin page via browser history
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  const loadProducts = useCallback(async () => {
    // NOTE: fetchProducts likely uses the public client. If you have a separate
    // admin API endpoint for fetching products, use fetchAdminAPI here instead.
    // For now, assuming fetchProducts is okay or uses the authenticated client correctly.
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts(); // Assuming this works fine
      setProducts(data || []); // Ensure it's an array
    } catch (err) {
      console.error("Error loading products:", err);
      const fetchErrorMsg = `Failed to load products: ${err.message}`;
      setError(fetchErrorMsg);
      toast.error(fetchErrorMsg);
       // Check if the error is auth-related (might need adjustment based on fetchProducts implementation)
      if (err?.status === 401 || err?.status === 403 || err?.message?.includes('JWT') || err?.message?.includes('Unauthorized')) {
        handleAuthError();
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]); // Add handleAuthError dependency

  useEffect(() => {
    // Only load if the user is definitely an admin
     if (user?.role === 'admin') {
         loadProducts();
     } else if (!user && logout) {
         // If somehow user becomes null while in admin, redirect
         handleAuthError();
     }
    // Add user dependency
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

  const handleEdit = (product) => {
    setError(null);
    setSelectedProduct(product);
    setView("edit");
  };

  const handleAddNew = () => {
    setError(null);
    setSelectedProduct(null);
    setView("create");
  };

  // --- UPDATED handleDelete ---
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const t = toast.loading("Deleting…");
    try {
      setError(null);
      // Using direct Supabase client call assuming RLS allows admins
      // If not, you MUST use fetchAdminAPI with your own backend endpoint.
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      // Check specifically for RLS violation error
       if (deleteError && (deleteError.code === '42501' || deleteError.message.includes('permission denied'))) {
          throw new Error('Permission denied. Ensure RLS allows admin deletes.');
       } else if (deleteError) {
           throw deleteError; // Throw other Supabase errors
       }

      // If using fetchAdminAPI:
      // await fetchAdminAPI('/api/admin/products/delete', { // Replace with your actual endpoint
      //   method: 'POST', // or DELETE
      //   body: { productId: id }
      // }, handleAuthError);

      await loadProducts(); // Refresh list
      toast.success("Deleted", { id: t });
    } catch (err) {
      console.error("Delete product error:", err);
      const errMsg = err.message || "Delete failed";
      setError(errMsg);
      toast.error(errMsg, { id: t });
      // handleAuthError is called within fetchAdminAPI if used, or handle manually for direct calls if needed
      if (err?.status === 401 || err?.status === 403) {
         handleAuthError();
      }
    }
  };

  const handleCancelForm = () => {
    setView("list");
    setSelectedProduct(null);
    setError(null);
    window.localStorage.removeItem('productFormDraft');
  };

  // --- UPDATED handleFormSubmit ---
  const handleFormSubmit = async (
    productData,
    mainImageFile,
    additionalImageFiles = [],
    imagesToDelete = []
  ) => {
    let loadingToastId = null;
    try {
      setFormSubmitting(true);
      setError(null); // Clear previous errors
      loadingToastId = toast.loading("Saving...");

      // --- Duplicate Name Check ---
      if (view === 'create') {
        const productNameLower = productData.name?.trim().toLowerCase();
        // Ensure products array is available before checking
        const nameExists = products && products.some(p => p.name?.toLowerCase() === productNameLower);
        if (nameExists) {
           throw new Error(`A product named "${productData.name}" already exists.`);
        }
      }

      let finalProductData = { ...productData };
      let savedProductResult; // To hold result from DB operation

      // --- Image Deletions (Assuming RLS allows or using functions) ---
      if (imagesToDelete.length > 0) {
        for (const image of imagesToDelete) {
          await deleteProductImage(image.id); // Direct call
          await deleteImageFromStorage(image.url); // Direct call
        }
        // If using API: Call fetchAdminAPI for deletion endpoint
      }

      // --- Main Image Upload (Direct Supabase Storage) ---
      if (mainImageFile) {
        const fileName = `${Date.now()}_${mainImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, mainImageFile);
        if (uploadError) throw new Error(`Main image upload failed: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
        finalProductData.image_url = publicUrl;
      }

      // --- Save Product Data (Create or Update using direct calls assuming RLS allows) ---
       if (view === 'edit') {
           savedProductResult = await updateProduct(selectedProduct.id, finalProductData);
           if (!savedProductResult) throw new Error("Update product failed. Check RLS or function permissions.");
       } else {
           savedProductResult = await createProduct(finalProductData);
            if (!savedProductResult) throw new Error("Create product failed. Check RLS or function permissions.");
       }
       // If using API: Replace above with fetchAdminAPI calls
       // const apiEndpoint = view === 'edit' ? '/api/admin/products/update' : '/api/admin/products/create';
       // const method = view === 'edit' ? 'PUT' : 'POST';
       // const bodyPayload = view === 'edit' ? { productId: selectedProduct.id, data: finalProductData } : { data: finalProductData };
       // savedProductResult = await fetchAdminAPI(apiEndpoint, { method, body: bodyPayload }, handleAuthError);
       // --- End Save Product Data ---


      // --- Additional Image Uploads & Linking (Direct calls assuming RLS allows) ---
      if (additionalImageFiles.length > 0) {
        const uploadPromises = additionalImageFiles.map(async (file) => {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, file);
          if (uploadError) {
              console.error(`Failed to upload additional image ${file.name}:`, uploadError);
              toast.error(`Failed to upload ${file.name}`);
              return { status: 'rejected', reason: uploadError };
          }
          const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
          await addProductImage(savedProductResult.id, publicUrl); // Direct call
          // If using API: await fetchAdminAPI('/api/admin/products/add-image', { method: 'POST', body: { productId: savedProductResult.id, imageUrl: publicUrl }}, handleAuthError);
           return { status: 'fulfilled' };
        });
        await Promise.allSettled(uploadPromises);
      }
      // --- End Additional Images ---

      // --- Success ---
      setView("list");
      setSelectedProduct(null);
      await loadProducts(); // Refresh list
      toast.success("Saved", { id: loadingToastId });
      window.localStorage.removeItem('productFormDraft'); // Clear draft

    } catch (err) { // --- Error Handling ---
      console.error("Error submitting product form:", err);
      const errorMessage = err.message || "Failed to save product.";
      setError(errorMessage); // Set form error state
      if (loadingToastId) {
          toast.error(errorMessage, { id: loadingToastId });
      } else {
          toast.error(errorMessage);
      }
      // Check for auth error specifically if not using fetchAdminAPI for DB ops
       if (!err.message?.includes('API call failed') && (err?.status === 401 || err?.status === 403)) {
          handleAuthError();
       }
    } finally {
      setFormSubmitting(false); // Ensure submitting state is always reset
    }
  };


    // --- UPDATED handleSaveStock ---
    const handleSaveStock = async (productId) => {
        const t = toast.loading("Updating stock…");
        try {
            setError(null);
            const stockData = { stock_quantity: Number(newStockValue) };

            // Using direct Supabase call assuming RLS allows admin update
            const { error: updateError } = await supabase
                .from('products')
                .update(stockData)
                .eq('id', productId);

            if (updateError && (updateError.code === '42501' || updateError.message.includes('permission denied'))) {
                 throw new Error('Permission denied. Ensure RLS allows admin stock updates.');
            } else if (updateError) {
                throw updateError;
            }

            // If using fetchAdminAPI:
            // await fetchAdminAPI(`/api/admin/products/update-stock`, { // Replace with your endpoint
            //     method: 'POST',
            //     body: { productId: productId, stock: Number(newStockValue) }
            // }, handleAuthError);

            setEditingStockId(null); // Clear editing state
            await loadProducts(); // Refresh list
            toast.success("Stock updated", { id: t });
        } catch (err) {
            console.error("Failed to update stock:", err);
            const errMsg = err.message || "Stock update failed";
            toast.error(errMsg, { id: t });
            // Handle auth error if necessary (and not using fetchAdminAPI)
            if (err?.status === 401 || err?.status === 403) {
               handleAuthError();
            }
        }
    };


  // --- JSX (mostly unchanged, just ensure error is displayed correctly) ---
  return (
    <div className="admin-section">
      {view === 'list' && <h2>Product Management</h2>}
      {view === 'edit' && <h2>Edit Product</h2>}
      {view === 'create' && <h2>Add New Product</h2>}

      {/* Show loading indicator */}
      {loading && view === 'list' && <p>Loading products…</p>}

      {/* Display general list error */}
      {!loading && view === 'list' && error && <p className="error-message">{error}</p>}

      {/* Product List View */}
      {!loading && view === 'list' && ( // Removed !error condition here to show list even if there was a previous error
        <>
          {/* Display list-specific error again if needed, or rely on toast */}
          {/* {error && <p className="error-message">{error}</p>} */}
          <div className="admin-toolbar product-toolbar">
            {/* Search and Sort controls... */}
             <input
              type="search"
              placeholder="Search products..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="admin-search-input"
            />
            <div className="admin-toolbar-right">
              <select
                value={productSortOrder}
                onChange={(e) => setProductSortOrder(e.target.value)}
                className="admin-sort-select"
                aria-label="Sort products by"
              >
                <option value="default">Sort by...</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="price_asc">Price (Low-High)</option>
                <option value="price_desc">Price (High-Low)</option>
                <option value="stock_asc">Stock (Low-High)</option>
                <option value="stock_desc">Stock (High-Low)</option>
              </select>
              <button onClick={handleAddNew} className="add-product-btn">
                Add New Product
              </button>
            </div>
          </div>
          <table className="admin-table products-table">
            <thead>
              {/* Table headers... */}
               <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={product.stock_quantity === 0 ? "out-of-stock-row" : ""}
                  >
                    {/* Table data cells... */}
                     <td>{product.name}</td>
                    <td>₱{product.price ? Number(product.price).toLocaleString() : "0"}</td>
                    <td>
                      {editingStockId === product.id ? (
                        <div className="inline-edit-stock">
                          {/* Stock edit input... */}
                           <input
                            type="number"
                            value={newStockValue}
                            onChange={(e) => setNewStockValue(e.target.value)}
                            className="inline-stock-input"
                            autoFocus
                            min="0" // Ensure non-negative stock
                           />
                           <button onClick={() => handleSaveStock(product.id)} className="save-stock">Save</button>
                           <button onClick={handleCancelStockEdit} className="cancel-stock">Cancel</button>
                        </div>
                      ) : (
                        <span className="editable-stock-value" onClick={() => handleEditStockClick(product)}>
                          {product.stock_quantity ?? 0} {/* Display 0 if null/undefined */}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {/* Action buttons... */}
                       <button onClick={() => handleEdit(product)} className="action-btn edit-btn">Edit Page</button>
                       <button onClick={() => handleDelete(product.id)} className="action-btn delete-btn" style={{ marginLeft: 8 }}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center' }}>
                    {productSearchTerm ? `No products found matching "${productSearchTerm}".` : "No products available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* Product Form View */}
      {(view === 'edit' || view === 'create') && (
        <ProductForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          initialData={selectedProduct}
          loading={formSubmitting}
          apiError={error} // Pass the error state specifically to the form
        />
      )}
    </div>
  );
}