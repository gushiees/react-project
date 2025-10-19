// src/pages/admin/admin.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
import "./admin.css"; // Ensure admin.css is imported
import { usePersistentState } from "../../hooks/usepersistentstate.js";
import Button from "../../components/button/button.jsx"; // <<<--- 1. IMPORT BUTTON

// ... (rest of the imports and formatDate function remain the same)

export default function Admin() {
  const { user, loadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  // tabs
  const [activeTab, setActiveTab] = useState("products");

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

  // USERS STATE
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  // ... (AUTH GUARD, handleLogout, PRODUCTS functions remain the same)
  // ... (handleEdit, handleAddNew, handleDelete, handleCancelForm, handleFormSubmit)
  // ... (handleEditStockClick, handleCancelStockEdit, handleSaveStock)
  // ... (USERS functions: loadUsers, deleteUser, changeRole remain the same)


  // ----- RENDER -----
  if (loadingAuth || !user || user.role !== "admin") {
    return (
      <div className="admin-container">
        <p>Loading or verifying access…</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        {/* Using custom Button for logout */}
        <Button
          type="primary" // Or choose another appropriate type
          label="Logout"
          action={handleLogout}
          externalStyles="logout-button-custom" // Optional: Add specific class if needed
        />
      </div>

      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab("products")}
          className={activeTab === "products" ? "active" : ""}
        >
          Product Management
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={activeTab === "users" ? "active" : ""}
        >
          User Management
        </button>
      </div>

      {/* PRODUCTS */}
      {activeTab === "products" && (
        <div className="admin-section">
          {loading && <p>Loading products…</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <>
              {view === "list" ? (
                <>
                  {/* <<<--- 2. REPLACE HTML BUTTON & ADD WRAPPER --- */}
                  <div className="admin-section-toolbar">
                    <Button
                      label="Add New Product"
                      action={handleAddNew}
                      type="primary" // Or choose a style you prefer
                      icon="fa-solid fa-plus" // Example Font Awesome icon
                      iconPosition="left"
                    />
                  </div>
                  {/* <<<--- END REPLACEMENT --- */}

                  <table className="admin-table">
                    {/* ... (table head remains the same) */}
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    {/* ... (table body remains the same) */}
                    <tbody>
                      {products.map((product) => (
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
                                  onChange={(e) =>
                                    setNewStockValue(e.target.value)
                                  }
                                  className="inline-stock-input"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveStock(product.id)}
                                  className="save-stock"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelStockEdit}
                                  className="cancel-stock"
                                >
                                  Cancel
                                </button>
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
                          <td style={{ textAlign: "right" }}>
                             {/* Using custom Button for Edit */}
                            <Button
                                type="secondary" // Example type
                                label="Edit"
                                action={() => handleEdit(product)}
                                externalStyles="admin-action-button"
                             />
                             {/* Using custom Button for Delete */}
                            <Button
                                type="gray" // Example type, maybe a red one?
                                label="Delete"
                                action={() => handleDelete(product.id)}
                                externalStyles="admin-action-button delete"
                            />
                          </td>
                        </tr>
                      ))}
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
      {activeTab === "users" && (
         <div className="admin-section">
          <div className="admin-section-toolbar users-toolbar"> {/* Added admin-section-toolbar */}
            <input
              type="search"
              placeholder="Search email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadUsers())}
            />
            {/* Using custom Button for Search */}
            <Button
              label="Search"
              action={() => { setPage(1); loadUsers(); }}
              type="secondary" // Example type
            />
          </div>

          {usersErr && <p className="error-message">{usersErr}</p>}
          {usersLoading && <p>Loading users…</p>}

          {!usersLoading && !usersErr && (
            <table className="admin-table">
              {/* ... (user table head remains the same) ... */}
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
                  <tr>
                    <td colSpan="6">No users found.</td>
                  </tr>
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
                          className="role-select" // Added class for potential styling
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{u.id}</td>
                      <td style={{ textAlign: "right" }}>
                         {/* Using custom Button for View */}
                        <Button
                            type="secondary" // Example type
                            label="View"
                            action={() => setInspectUser(u)}
                            externalStyles="admin-action-button"
                        />
                        {/* Using custom Button for Delete */}
                        <Button
                            type="gray" // Example type, maybe a red one?
                            label="Delete"
                            action={() => deleteUser(u.id, u.email)}
                            externalStyles="admin-action-button delete"
                        />
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
    </div>
  );
}