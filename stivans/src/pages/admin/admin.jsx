// src/pages/admin/admin.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaBoxOpen, FaUsers, FaSignOutAlt } from "react-icons/fa"; // Import icons
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
import UserInspector from "./UserInspector.jsx";
import { supabase } from "../../supabaseClient";
import "./admin.css";
import { usePersistentState } from "../../hooks/usepersistentstate.js";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

// Helper function for sorting products
function sortProducts(products, sortKey) {
  const sorted = [...products]; // Create a copy to avoid mutating state directly
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
    case 'default': // Optional: Add a default sort (e.g., by creation date if available, or just name)
    default:
       sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Default to name asc
      break;
  }
  return sorted;
}


export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  // Active section state (replaces activeTab)
  const [activeSection, setActiveSection] = useState("products"); // 'products' or 'users'

  // PRODUCTS STATE
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // Manages loading state for API calls
  const [formSubmitting, setFormSubmitting] = useState(false); // Specific state for form submission process
  const [error, setError] = useState(null); // Error state specifically for the form OR list view fetch errors
  const [view, setView] = usePersistentState("adminFormView", "list");
  const [selectedProduct, setSelectedProduct] = usePersistentState(
    "adminSelectedProduct",
    null
  );
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSortOrder, setProductSortOrder] = useState('default');

  // USERS STATE
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  // ----- AUTH GUARD -----
  useEffect(() => {
    if (!loadingAuth) {
      if (!user || user.role !== "admin") navigate("/");
    }
  }, [user, loadingAuth, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out:", err);
      toast.error("Logout failed");
    }
  };

  // ----- PRODUCTS -----
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true); // Use general loading state for fetching
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err);
      const fetchErrorMsg = `Failed to load products: ${err.message}`;
      setError(fetchErrorMsg); // Set general error for list view
      toast.error(fetchErrorMsg); // Also show toast for fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load products if the section is active and user is admin
    if (activeSection === "products" && user?.role === "admin") {
      loadProducts();
    }
  }, [activeSection, user, loadProducts]); // Depend on activeSection

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    // Apply search filter first
    if (productSearchTerm) {
      const lowerCaseSearch = productSearchTerm.toLowerCase();
      result = result.filter(product =>
        product.name?.toLowerCase().includes(lowerCaseSearch) ||
        product.description?.toLowerCase().includes(lowerCaseSearch) ||
        product.category?.toLowerCase().includes(lowerCaseSearch)
      );
    }

    // Apply sorting
    result = sortProducts(result, productSortOrder); // Use the helper function

    return result;
  }, [products, productSearchTerm, productSortOrder]); // <-- Include sort order in dependencies


  const handleEdit = (product) => {
    setError(null); // Clear error when switching to edit
    setSelectedProduct(product);
    setView("edit");
  };

  const handleAddNew = () => {
    setError(null); // Clear error when switching to add
    setSelectedProduct(null);
    setView("create");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const t = toast.loading("Deleting…");
    try {
      setError(null); // Clear any previous errors
      await deleteProduct(id);
      await loadProducts(); // Reload products after deletion
      toast.success("Deleted", { id: t });
    } catch (err) {
      console.error(err);
      setError("Delete failed"); // Set error for list view display if needed
      toast.error("Delete failed", { id: t });
    }
  };


  const handleCancelForm = () => {
    setView("list");
    setSelectedProduct(null);
    setError(null); // Clear errors when cancelling
  };

  const handleFormSubmit = async (
    productData,
    mainImageFile,
    additionalImageFiles = [],
    imagesToDelete = []
  ) => {
    let loadingToastId = null; // To potentially dismiss loading toast early
    try {
      setFormSubmitting(true); // Use specific submitting state
      setError(null); // Clear previous form errors
      loadingToastId = toast.loading("Saving..."); // Show loading toast

      // --- DUPLICATE NAME CHECK ---
      if (view === 'create') {
        const productNameLower = productData.name?.trim().toLowerCase();
        const nameExists = products.some(p => p.name?.toLowerCase() === productNameLower);
        if (nameExists) {
           setError(`A product named "${productData.name}" already exists.`);
           toast.dismiss(loadingToastId); // Dismiss loading toast
           setFormSubmitting(false); // Stop submitting state
           return; // Stop the function here
        }
      }
      // --- END DUPLICATE NAME CHECK ---

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

      if (!savedProduct) throw new Error("Failed to save product data."); // More specific error

      // upload additional images (async without await for faster UI)
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
      await loadProducts(); // Reload products after submit
      toast.success("Saved", { id: loadingToastId }); // Update loading toast to success
    } catch (err) {
      // Catch OTHER errors (API errors, image upload errors etc.)
      console.error("Error submitting product form:", err);
      const errorMessage = err.message || "Failed to save product.";
      setError(errorMessage); // Set error state for display IN THE FORM
      toast.error(errorMessage, { id: loadingToastId }); // Show error TOAST
    } finally {
      setFormSubmitting(false); // Stop submitting state regardless of outcome
      // Do not dismiss toast here if it became success/error
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
      setError(null); // Clear list error
      await updateProduct(productId, { stock_quantity: Number(newStockValue) });
      setEditingStockId(null);
      await loadProducts(); // Reload products after stock update
      toast.success("Stock updated", { id: t });
    } catch (err) {
      console.error("Failed to update stock:", err);
      // setError("Failed to update stock."); // Error state is mainly for form
      toast.error("Update failed", { id: t });
    }
  };

  // ----- USERS -----
    const loadUsers = useCallback(async () => {
    try {
      setUsersErr(null);
      setUsersLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const u = new URL("/api/admin/users/list", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      if (q) u.searchParams.set("q", q);

      const resp = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to load users");

      setUsers(json.users || []);
    } catch (e) {
      console.error(e);
      setUsersErr(e.message);
    } finally {
      setUsersLoading(false);
    }
  }, [page, q, perPage]);

  useEffect(() => {
    // Load users if the section is active and user is admin
    if (activeSection === "users" && user?.role === "admin") {
      loadUsers();
    }
  }, [activeSection, user, loadUsers]); // Depend on activeSection

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email || userId}? This cannot be undone.`)) return;
    const t = toast.loading("Deleting user…");
    try {
      setUsersErr(null); // Clear previous errors
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Delete failed");
      await loadUsers();
      toast.success("User deleted", { id: t });
    } catch (e) {
      console.error(e);
      setUsersErr(e.message || "Delete failed"); // Set error state for user list
      toast.error(e.message || "Delete failed", { id: t });
    }
  };

  const changeRole = async (userId, newRole) => {
    const t = toast.loading("Updating role…");
    try {
      setUsersErr(null); // Clear previous errors
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Role update failed");
      await loadUsers();
      toast.success("Role updated", { id: t });
    } catch (e) {
      console.error(e);
      setUsersErr(e.message || "Role update failed"); // Set error state for user list
      toast.error(e.message || "Role update failed", { id: t });
    }
  };


  // ----- RENDER -----
  if (loadingAuth || !user || user.role !== "admin") {
    // Keep a simple loading state, maybe improve later
    return (
      <div className="admin-layout">
         {/* Render sidebar even during initial load for structure */}
         <aside className="admin-sidebar">
             <div className="admin-sidebar-header"><h2>Admin Menu</h2></div>
             {/* Nav items could be disabled or hidden */}
         </aside>
         <main className="admin-main-content">
             <div className="admin-content-header"><h1>Admin Dashboard</h1></div>
             <p>Loading or verifying access…</p>
         </main>
      </div>
    );
  }

  return (
    <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
             <div className="admin-sidebar-header">
                <h2>Admin Menu</h2>
             </div>
             <nav className="admin-sidebar-nav">
                <button
                   onClick={() => setActiveSection("products")}
                   className={activeSection === "products" ? "active" : ""}
                >
                   <FaBoxOpen /> Products
                </button>
                <button
                   onClick={() => setActiveSection("users")}
                   className={activeSection === "users" ? "active" : ""}
                >
                   <FaUsers /> Users
                </button>
             </nav>
             <div className="admin-sidebar-footer">
                <button onClick={handleLogout} className="logout-button sidebar-logout">
                   <FaSignOutAlt /> Logout
                </button>
             </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main-content">
             {/* Header inside main content */}
             <div className="admin-content-header">
                 <h1>Admin Dashboard</h1>
             </div>

             {/* PRODUCTS */}
             {activeSection === "products" && (
                <div className="admin-section">
                   {/* Headers specific to the current view */}
                   {view === 'list' && <h2>Product Management</h2>}
                   {view === 'edit' && <h2>Edit Product</h2>}
                   {view === 'create' && <h2>Add New Product</h2>}

                   {/* General Loading state for fetching */}
                   {loading && view === 'list' && <p>Loading products…</p>}

                   {/* --- REMOVED THIS BLOCK --- */}
                   {/* {error && view !== 'list' && <p className="error-message">{error}</p>} */}
                   {/* --- END REMOVAL --- */}


                   {/* Only render content when NOT loading (for list view) */}
                   {!loading && view === 'list' && (
                     <>
                       {/* List view specific error */}
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
                       <table className="admin-table">
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
                                   <button onClick={() => handleEdit(product)}>Edit Page</button>
                                   <button onClick={() => handleDelete(product.id)} className="delete" style={{ marginLeft: 8 }}>Delete</button>
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

                   {/* Render Form when view is 'edit' or 'create' */}
                   {(view === 'edit' || view === 'create') && (
                     <ProductForm
                       onSubmit={handleFormSubmit}
                       onCancel={handleCancelForm}
                       initialData={selectedProduct}
                       loading={formSubmitting} // Use formSubmitting state here
                       apiError={error} // Pass form-specific error
                     />
                   )}
                </div>
             )}


             {/* USERS */}
             {activeSection === "users" && (
                <div className="admin-section">
                   <h2>User Management</h2> {/* Add section header */}
                   <div className="admin-toolbar users-toolbar">
                     <input
                       type="search"
                       placeholder="Search user email..."
                       value={q}
                       onChange={(e) => setQ(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadUsers())}
                       className="admin-search-input"
                     />
                     <button onClick={() => (setPage(1), loadUsers())}>Search Users</button>
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
                           <th>Role</th>
                           <th>User ID</th>
                           <th style={{ textAlign: "right" }}>Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {users.length === 0 ? (
                           <tr><td colSpan="6" style={{textAlign: 'center'}}>No users found.</td></tr>
                         ) : (
                           users.map((u) => (
                             <tr key={u.id}>
                               <td>{u.email || "—"}</td>
                               <td>{formatDate(u.created_at)}</td>
                               <td>{formatDate(u.last_sign_in_at)}</td>
                               <td>
                                 <select
                                   defaultValue={u.role || "user"}
                                   onChange={(e) => changeRole(u.id, e.target.value)}
                                   className="admin-sort-select"
                                 >
                                   <option value="user">user</option>
                                   <option value="admin">admin</option>
                                 </select>
                               </td>
                               <td style={{ fontFamily: "monospace" }}>{u.id}</td>
                               <td style={{ textAlign: "right" }}>
                                 <button onClick={() => setInspectUser(u)}>View</button>
                                 <button className="delete" onClick={() => deleteUser(u.id, u.email)} style={{ marginLeft: 8 }}>Delete</button>
                               </td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   )}
                </div>
             )}

             {inspectUser && (
                <UserInspector user={inspectUser} onClose={() => setInspectUser(null)} />
             )}
        </main>
    </div>
  );
}