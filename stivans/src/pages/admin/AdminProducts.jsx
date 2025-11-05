// src/pages/admin/AdminProducts.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
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
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal/ConfirmDeleteModal.jsx";
import "./AdminProducts.css";

// Helper function for sorting products
function sortProducts(products, sortKey) {
  const sorted = [...products];
  switch (sortKey) {
    case "name_asc":
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
    case "name_desc":
      sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      break;
    case "price_asc":
      sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      break;
    case "price_desc":
      sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case "stock_asc":
      sorted.sort(
        (a, b) =>
          (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0)
      );
      break;
    case "stock_desc":
      sorted.sort(
        (a, b) =>
          (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0)
      );
      break;
    case "default":
    default:
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
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
  const [selectedProduct, setSelectedProduct] = usePersistentState(
    "adminSelectedProduct",
    null
  );
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSortOrder, setProductSortOrder] = useState("default");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name }
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect helper
  const handleAuthError = useCallback(() => {
    if (logout) logout();
    navigate("/admin/login", { replace: true });
  }, [logout, navigate]);

  // Load products (keeps product_images for the edit form “Existing Images”)
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .order("name", { ascending: true });

      if (error) {
        // Fallback to existing helper if direct query fails
        console.warn("Supabase select failed, falling back:", error.message);
        const fallback = await fetchProducts();
        setProducts(fallback || []);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error("Error loading products:", err);
      const msg = `Failed to load products: ${err.message}`;
      setError(msg);
      toast.error(msg);
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        err?.message?.includes("JWT") ||
        err?.message?.includes("Unauthorized")
      ) {
        handleAuthError();
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  // Initial load/guard
  useEffect(() => {
    if (user?.role === "admin") {
      loadProducts();
    } else if (!user) {
      handleAuthError();
    }
  }, [user, loadProducts, handleAuthError]);

  // Filter/sort memo
  const filteredAndSortedProducts = useMemo(() => {
    let result = products;
    if (productSearchTerm) {
      const q = productSearchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    result = sortProducts(result, productSortOrder);
    return result;
  }, [products, productSearchTerm, productSortOrder]);

  // Navigation
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
  const handleCancelForm = () => {
    setView("list");
    setSelectedProduct(null);
    setError(null);
    window.localStorage.removeItem("productFormDraft");
  };

  // Delete flow
  const handleDeleteInitiate = (product) => {
    setItemToDelete({ id: product.id, name: product.name });
    setShowDeleteModal(true);
    setIsDeleting(false);
  };

  const confirmDeleteProduct = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const t = toast.loading("Deleting product…");
    try {
      setError(null);
      const { error: delErr } = await supabase
        .from("products")
        .delete()
        .eq("id", itemToDelete.id);

      if (delErr && (delErr.code === "42501" || delErr.message?.includes("permission denied"))) {
        throw new Error("Permission denied. Ensure RLS allows admin deletes.");
      } else if (delErr) {
        throw delErr;
      }

      await loadProducts();
      toast.success("Product deleted", { id: t });
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete product error:", err);
      toast.error(err.message || "Delete failed", { id: t });
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
    setIsDeleting(false);
  };

  // Create/update form submit
  const handleFormSubmit = async (
    productData,
    mainImageFile,
    additionalImageFiles = [],
    imagesToDelete = []
  ) => {
    let toastId = null;
    try {
      setFormSubmitting(true);
      setError(null);
      toastId = toast.loading("Saving...");

      if (view === "create") {
        const exists =
          products?.some(
            (p) =>
              p.name?.trim().toLowerCase() ===
              productData.name?.trim().toLowerCase()
          ) || false;
        if (exists) {
          throw new Error(
            `A product named "${productData.name}" already exists.`
          );
        }
      }

      // Handle deletions first
      if (imagesToDelete.length > 0) {
        for (const img of imagesToDelete) {
          try {
            await deleteProductImage(img.id);
          } catch (e) {
            console.warn("deleteProductImage failed:", e?.message);
          }
          try {
            await deleteImageFromStorage(img.url);
          } catch (e) {
            console.warn("deleteImageFromStorage failed:", e?.message);
          }
        }
      }

      // Upload main image if provided
      const finalProductData = { ...productData };
      if (mainImageFile) {
        const fileName = `${Date.now()}_${mainImageFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(fileName, mainImageFile);
        if (upErr) throw new Error(`Main image upload failed: ${upErr.message}`);
        const {
          data: { publicUrl },
        } = supabase.storage.from("product-images").getPublicUrl(fileName);
        finalProductData.image_url = publicUrl;
      }

      // Save product
      let saved;
      if (view === "edit") {
        saved = await updateProduct(selectedProduct.id, finalProductData);
        if (!saved) throw new Error("Update product failed.");
      } else {
        saved = await createProduct(finalProductData);
        if (!saved) throw new Error("Create product failed.");
      }

      // Upload/link additional images
      if (additionalImageFiles.length > 0) {
        const uploadJobs = additionalImageFiles.map(async (file) => {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("product-images")
            .upload(fileName, file);
          if (upErr) {
            console.error("Additional image upload failed:", upErr);
            toast.error(`Failed to upload ${file.name}`);
            return;
          }
          const {
            data: { publicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(fileName);
          await addProductImage(saved.id, publicUrl);
        });
        await Promise.allSettled(uploadJobs);
      }

      // Success → back to list
      setView("list");
      setSelectedProduct(null);
      await loadProducts();
      toast.success("Saved", { id: toastId });
      window.localStorage.removeItem("productFormDraft");
    } catch (err) {
      console.error("Error submitting product form:", err);
      const msg = err.message || "Failed to save product.";
      setError(msg);
      if (toastId) toast.error(msg, { id: toastId });
      else toast.error(msg);
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError();
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Inline stock edit
  const handleEditStockClick = (product) => {
    setEditingStockId(product.id);
    setNewStockValue(product.stock_quantity ?? 0);
  };
  const handleCancelStockEdit = () => {
    setEditingStockId(null);
    setNewStockValue(0);
  };
  const handleSaveStock = async (productId) => {
    const t = toast.loading("Updating stock…");
    try {
      setError(null);
      const { error: updErr } = await supabase
        .from("products")
        .update({ stock_quantity: Number(newStockValue) })
        .eq("id", productId);

      if (updErr && (updErr.code === "42501" || updErr.message?.includes("permission denied"))) {
        throw new Error("Permission denied. Ensure RLS allows admin stock updates.");
      } else if (updErr) {
        throw updErr;
      }

      setEditingStockId(null);
      await loadProducts();
      toast.success("Stock updated", { id: t });
    } catch (err) {
      console.error("Failed to update stock:", err);
      toast.error(err.message || "Stock update failed", { id: t });
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError();
      }
    }
  };

  // JSX
  return (
    <div className="admin-section">
      {view === "list" && <h2>Product Management</h2>}
      {view === "edit" && <h2>Edit Product</h2>}
      {view === "create" && <h2>Add New Product</h2>}

      {loading && view === "list" && <p>Loading products…</p>}
      {!loading && view === "list" && error && (
        <p className="error-message">{error}</p>
      )}

      {!loading && view === "list" && (
        <>
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

          <table className="admin-table products-table">
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
                    <td>
                      ₱
                      {product.price
                        ? Number(product.price).toLocaleString()
                        : "0"}
                    </td>
                    <td>
                      {editingStockId === product.id ? (
                        <div className="inline-edit-stock">
                          <input
                            type="number"
                            value={newStockValue}
                            onChange={(e) => setNewStockValue(e.target.value)}
                            className="inline-stock-input"
                            autoFocus
                            min="0"
                          />
                          <button
                            onClick={() => handleSaveStock(product.id)}
                            className="action-btn save-btn"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelStockEdit}
                            className="action-btn cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span
                          className="editable-stock-value"
                          onClick={() => handleEditStockClick(product)}
                        >
                          {product.stock_quantity ?? 0}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleEdit(product)}
                        className="action-btn edit-btn"
                      >
                        Edit Page
                      </button>
                      <button
                        onClick={() => handleDeleteInitiate(product)}
                        className="action-btn delete-btn"
                        style={{ marginLeft: 8 }}
                        disabled={isDeleting && itemToDelete?.id === product.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    {productSearchTerm
                      ? `No products found matching "${productSearchTerm}".`
                      : "No products available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {(view === "edit" || view === "create") && (
        <ProductForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          initialData={selectedProduct}
          loading={formSubmitting}
          apiError={error}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        itemName={itemToDelete?.name}
        itemType="product"
        onConfirm={confirmDeleteProduct}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
