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
  const [loading, setLoading] = useState(true);
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
    // Load products if the section is active and user is admin
    if (activeSection === "products" && user?.role === "admin") {
      loadProducts();
    }
  }, [activeSection, user, loadProducts]); // Depend on activeSection

  // Filter and sort products
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
    setSelectedProduct(product);
    setView("edit");
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setView("create");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const t = toast.loading("Deleting…");
    try {
      await deleteProduct(id);
      await loadProducts();
      toast.success("Deleted", { id: t });
    } catch (err) {
      console.error(err);
      toast.error("Delete failed", { id: t });
    }
  };


  const handleCancelForm = () => {
    setView("list");
    setSelectedProduct(null);
  };

    const handleFormSubmit = async (
    productData,
    mainImageFile,
    additionalImageFiles = [],
    imagesToDelete = []
  ) => {
    const t = toast.loading("Saving…");
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

      if (!savedProduct) throw new Error("Failed to save product.");

      if (additionalImageFiles.length > 0) {
        for (const file of additionalImageFiles) {
          const fileName = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
          await addProductImage(savedProduct.id, publicUrl);
        }
      }

      setView("list");
      setSelectedProduct(null);
      await loadProducts();
      toast.success("Saved", { id: t });
    } catch (err) {
      console.error("Error submitting product form:", err);
      setError("Failed to save product.");
      toast.error("Save failed", { id: t });
    } finally {
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
    const t = toast.loading("Updating stock…");
    try {
      await updateProduct(productId, { stock_quantity: Number(newStockValue) });
      setEditingStockId(null);
      await loadProducts();
      toast.success("Stock updated", { id: t });
    } catch (err) {
      console.error("Failed to update stock:", err);
      setError("Failed to update stock.");
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
      toast.error(e.message || "Delete failed", { id: t });
    }
  };

  const changeRole = async (userId, newRole) => {
    const t = toast.loading("Updating role…");
    try {
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
      toast.error(e.message || "Role update failed", { id: t });
    }
  };


  // ----- RENDER -----
  if (loadingAuth || !user || user.role !== "admin") {
    return (
      <div className="admin-container">
        <p>Loading or verifying access…</p>
      </div>
    );
  }

  return (
    // --- UPDATED LAYOUT ---
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
                 {/* Logout button can optionally be moved here instead of sidebar footer */}
                 {/* <button onClick={handleLogout} className="logout-button">Logout</button> */}
             </div>

             {/* Removed the Tab buttons div */}

             {/* PRODUCTS */}
             {activeSection === "products" && (
                <div className="admin-section">
                   {loading && <p>Loading products…</p>}
                   {error && <p className="error-message">{error}</p>}
                   {!loading && !error && (
                     <>
                       {view === "list" ? (
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
             {activeSection === "users" && (
                <div className="admin-section">
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
                           <tr><td colSpan="6">No users found.</td></tr>
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
    // --- END UPDATED LAYOUT ---
  );
}