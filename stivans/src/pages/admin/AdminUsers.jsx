// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import UserInspector from './UserInspector.jsx';
import { fetchAdminAPI } from "../../utils/adminApi.js";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal/ConfirmDeleteModal.jsx";
import './AdminUsers.css'; // Import the specific CSS

// Formats date and time consistently
function formatDate(d) {
    if (!d) return "—"; // Return em dash if date is null or undefined
    try {
        // Example format: 10/20/2025, 10:49:25 AM
        return new Date(d).toLocaleString('en-US', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
        });
    } catch {
        return String(d); // Fallback to simple string conversion if formatting fails
    }
}

export default function AdminUsers() {
  const { user, logout } = useAuth(); // Current admin user and logout function
  const navigate = useNavigate();
  const [users, setUsers] = useState([]); // State for the list of users
  const [loading, setLoading] = useState(true); // Loading state for API calls
  const [error, setError] = useState(null); // Error state for API calls
  const [inspectUser, setInspectUser] = useState(null); // State for the user being inspected
  const [q, setQ] = useState(""); // Search query state
  const [page, setPage] = useState(1); // Pagination state
  const perPage = 50; // Items per page
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Modal visibility
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, email } of user to delete
  const [isDeleting, setIsDeleting] = useState(false); // Tracks if delete API call is in progress

  // --- Auth Error Handler ---
  const handleAuthError = useCallback(() => {
     toast.error('Session expired or invalid. Redirecting to login.', { id: 'auth-error-redirect' });
     if (logout) { logout(); }
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  // --- Load Users ---
  const loadUsers = useCallback(async (resetPage = false) => {
    const targetPage = resetPage ? 1 : page;
    try {
      setError(null); setLoading(true);
      const endpoint = new URL("/api/admin/users/list", window.location.origin);
      endpoint.searchParams.set("page", String(targetPage));
      endpoint.searchParams.set("perPage", String(perPage));
      if (q) endpoint.searchParams.set("q", q);
      const json = await fetchAdminAPI(endpoint.toString(), { method: 'GET' }, handleAuthError);
      setUsers(json.users || []);
      if (resetPage) setPage(1);
    } catch (e) {
      if (e.message !== 'Authentication required') {
        console.error("Load users error:", e);
        const errMsg = e.message || "Failed to load users";
        setError(errMsg); toast.error(errMsg);
      }
    } finally { setLoading(false); }
  }, [page, q, perPage, handleAuthError]);

  // --- Effect to Load Users ---
   useEffect(() => {
       if (user?.role === 'admin') { loadUsers(); }
       else if (!user && logout) { handleAuthError(); }
   }, [loadUsers, user, handleAuthError, logout]);

   // --- Search Handler ---
   const handleSearch = () => { loadUsers(true); };

  // --- Delete Logic ---
  const deleteUserInitiate = (userToDelete) => {
    if (user?.id === userToDelete.id) { toast.error("You cannot delete your own account."); return; }
    setItemToDelete({ id: userToDelete.id, email: userToDelete.email });
    setShowDeleteModal(true);
    setIsDeleting(false);
  };

  const confirmDeleteUser = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const deletePromise = fetchAdminAPI("/api/admin/users/delete", {
        method: "POST", body: { userId: itemToDelete.id }
    }, handleAuthError).then(() => {
        setShowDeleteModal(false); setItemToDelete(null); loadUsers();
    });
    toast.promise(deletePromise, {
        loading: 'Deleting user...', success: 'User Deleted!',
        error: (err) => { console.error("Delete user error:", err); return err.message || 'Delete failed'; }
    }).finally(() => setIsDeleting(false));
  };

  const handleCancelDelete = () => { setShowDeleteModal(false); setItemToDelete(null); setIsDeleting(false); };

  // --- Change Role Logic ---
  const changeRole = async (userId, newRole) => {
    setError(null);
    const changePromise = fetchAdminAPI("/api/admin/users/role", {
        method: "POST", body: { userId, role: newRole }
    }, handleAuthError).then(() => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    });
    toast.promise(changePromise, {
        loading: 'Updating role...', success: 'Role Updated!',
        error: (err) => { console.error("Change role error:", err); loadUsers(); return err.message || 'Role update failed'; }
    });
  };

  // --- JSX Rendering ---
  return (
    <div className="admin-section users-section">
      <h2>User Management</h2>
      <div className="admin-toolbar users-toolbar">
         <input type="search" placeholder="Search user email..." value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="admin-search-input" />
        <button onClick={handleSearch} className="search-users-btn">Search Users</button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {loading && <p>Loading users…</p>}

      {!loading && (
        <table className="admin-table users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Date Created</th> {/* Retained */}
              <th>Time In (Last Active)</th> {/* Changed Label */}
              <th>Time Out (Last Login)</th> {/* Kept (uses same data as Time In before, now separate) */}
              <th style={{ textAlign: 'center'}}>Role</th>
              <th>User ID</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              // Adjust colspan to 7
              <tr><td colSpan="7" style={{textAlign: 'center'}}>{ q ? `No users found matching "${q}".` : "No users found." }</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{formatDate(u.created_at)}</td>      {/* Date Created column */}
                  <td>{formatDate(u.last_active_at)}</td>   {/* Time In (Last Active) column */}
                  <td>{formatDate(u.last_sign_in_at)}</td> {/* Time Out (Last Login) column */}
                  <td className="role-display-cell">
                    <span className={`role-badge ${u.role || 'user'}`}>{u.role || 'user'}</span>
                     <select
                       value={u.role || "user"}
                       onChange={(e) => changeRole(u.id, e.target.value)}
                       className="role-select"
                       aria-label={`Change role for ${u.email || u.id}`}
                     >
                       <option value="user">user</option>
                       <option value="admin">admin</option>
                     </select>
                  </td>
                  <td className="user-id-cell">{u.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button>
                    {user?.id !== u.id && (
                         <button
                            className="action-btn delete-btn"
                            onClick={() => deleteUserInitiate(u)}
                            style={{ marginLeft: 8 }}
                            disabled={isDeleting && itemToDelete?.id === u.id}
                         > Delete </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {inspectUser && ( <UserInspector user={inspectUser} onClose={() => setInspectUser(null)} handleAuthError={handleAuthError} /> )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        itemName={itemToDelete?.email || itemToDelete?.id}
        itemType="user"
        onConfirm={confirmDeleteUser}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}