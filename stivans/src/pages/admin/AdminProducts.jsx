// src/pages/admin/AdminProducts.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  deleteImageFromStorage,
} from "../../data/products.jsx";
import ProductForm from "./productform.jsx";
import { supabase } from "../../supabaseClient";
import { usePersistentState } from "../../hooks/usepersistentstate.js";
import "./AdminProducts.css"; // Import the specific CSS

// Helper function for sorting products
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

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err);
      const fetchErrorMsg = `Failed to load products: ${err.message}`;
      setError(fetchErrorMsg);
      toast.error(fetchErrorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const t = toast.loading("Deleting…");
    try {
      setError(null);
      await deleteProduct(id);
      await loadProducts();
      toast.success("Deleted", { id: t });
    } catch (err) {
      console.error(err);
      setError("Delete failed");
      toast.error("Delete failed", { id: t });
    }
  };

  const handleCancelForm = () => {
    setView("list");
    setSelectedProduct(null);
    setError(null);
  };

  const handleFormSubmit = async (
    productData,
    mainImageFile,
    additionalImageFiles = [],
    imagesToDelete = []
  ) => {
    let loadingToastId = null;
    try {
      setFormSubmitting(true);
      setError(null);
      loadingToastId = toast.loading("Saving...");

      if (view === 'create') {
        const productNameLower = productData.name?.trim().toLowerCase();
        const nameExists = products.some(p => p.name?.toLowerCase() === productNameLower);
        if (nameExists) {
           setError(`A product named "${productData.name}" already exists.`);
           toast.dismiss(loadingToastId);
           setFormSubmitting(false);
           return;
        }
      }

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
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, mainImageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
        finalProductData.image_url = publicUrl;
      }

      if (view === "edit") {
        savedProduct = await updateProduct(selectedProduct.id, finalProductData);
      } else {
        savedProduct = await createProduct(finalProductData);
      }

      if (!savedProduct) throw new Error("Failed to save product data.");

      if (additionalImageFiles.length > 0) {
        additionalImageFiles.forEach(async (file) => {
          try {
             const fileName = `${Date.now()}_${file.name}`;
             const { error: uploadError } = await supabase.storage
               .from("product-images")
               .upload(fileName, file);
             if (uploadError) throw uploadError;
             const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
             await addProductImage(savedProduct.id, publicUrl);
          } catch (imgErr) {
             console.error("Failed to add additional image:", imgErr);
             toast.error(`Product saved, but failed to add image: ${file.name}`);
          }
        });
      }

      setView("list");
      setSelectedProduct(null);
      await loadProducts();
      toast.success("Saved", { id: loadingToastId });
      window.localStorage.removeItem('productFormDraft'); // Clear draft on successful submit
    } catch (err) {
      console.error("Error submitting product form:", err);
      const errorMessage = err.message || "Failed to save product.";
      setError(errorMessage);
      toast.error(errorMessage, { id: loadingToastId });
    } finally {
      setFormSubmitting(false);
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
    const t = toast.loading("Updating stock…");
    try {
      setError(null);
      await updateProduct(productId, { stock_quantity: Number(newStockValue) });
      setEditingStockId(null);
      await loadProducts();
      toast.success("Stock updated", { id: t });
    } catch (err) {
      console.error("Failed to update stock:", err);
      toast.error("Update failed", { id: t });
    }
  };

  return (
    <div className="admin-section">
      {view === 'list' && <h2>Product Management</h2>}
      {view === 'edit' && <h2>Edit Product</h2>}
      {view === 'create' && <h2>Add New Product</h2>}

      {loading && view === 'list' && <p>Loading products…</p>}

      {!loading && view === 'list' && (
        <>
          {error && <p className="error-message">{error}</p>}
          <div className="admin-toolbar product-toolbar">
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
          <table className="admin-table products-table"> {/* Added products-table class */}
            <thead>
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
                    className={
                      product.stock_quantity === 0 ? "out-of-stock-row" : ""
                    }
                  >
                    <td>{product.name}</td>
                    <td>₱{product.price ? Number(product.price).toLocaleString() : "0"}</td>
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
                        <span className="editable-stock-value" onClick={() => handleEditStockClick(product)}>
                          {product.stock_quantity}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button onClick={() => handleEdit(product)} className="action-btn edit-btn">Edit Page</button> {/* Added classes */}
                      <button onClick={() => handleDelete(product.id)} className="action-btn delete-btn" style={{ marginLeft: 8 }}>Delete</button> {/* Added classes */}
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

      {(view === 'edit' || view === 'create') && (
        <ProductForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          initialData={selectedProduct}
          loading={formSubmitting}
          apiError={error} // Pass form-specific error down
        />
      )}
    </div>
  );
}