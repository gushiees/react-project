// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; // Ensure import
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import UserInspector from './UserInspector.jsx';
import { fetchAdminAPI } from "../../utils/adminApi.js";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal/ConfirmDeleteModal.jsx";
import './AdminUsers.css'; // Import the specific CSS

function formatDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

export default function AdminUsers() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1); // Consider adding pagination controls later
  const perPage = 50; // Or make this configurable

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Auth Error Handler ---
  const handleAuthError = useCallback(() => {
    toast.error('Session expired or invalid. Redirecting to login.', { id: 'auth-error-redirect' }); // Added ID
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

      // Make API call using the helper
      const json = await fetchAdminAPI(endpoint.toString(), { method: 'GET' }, handleAuthError);

      setUsers(json.users || []); // Ensure users is always an array
      if (resetPage) setPage(1); // Reset page state if requested

    } catch (e) {
      // fetchAdminAPI throws errors, including the specific auth error
      if (e.message !== 'Authentication required') {
        // Only handle non-auth errors here; auth errors trigger redirect
        console.error("Load users error:", e);
        const errMsg = e.message || "Failed to load users";
        setError(errMsg);
        toast.error(errMsg); // Use toast for error
      }
    } finally { setLoading(false); }
  }, [page, q, perPage, handleAuthError]); // Add handleAuthError

  // --- Effect to Load Users ---
   useEffect(() => {
       if (user?.role === 'admin') { loadUsers(); }
       else if (!user && logout) { handleAuthError(); }
   }, [loadUsers, user, handleAuthError, logout]);

   // --- Search Handler ---
   const handleSearch = () => { loadUsers(true); }; // Call loadUsers and reset page to 1

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
    // Use toast.promise
    const deletePromise = fetchAdminAPI("/api/admin/users/delete", {
        method: "POST", body: { userId: itemToDelete.id }
    }, handleAuthError).then(() => {
        setShowDeleteModal(false); setItemToDelete(null); loadUsers();
    });

    toast.promise(deletePromise, {
        loading: 'Deleting user...',
        success: 'User Deleted!',
        error: (err) => {
            console.error("Delete user error:", err);
            // Auth error is handled by fetchAdminAPI redirect
            return err.message || 'Delete failed';
        }
    }).finally(() => setIsDeleting(false));
  };

  const handleCancelDelete = () => { setShowDeleteModal(false); setItemToDelete(null); setIsDeleting(false); };

  // --- Change Role Logic ---
  const changeRole = async (userId, newRole) => {
    setError(null);
    // Use toast.promise
    const changePromise = fetchAdminAPI("/api/admin/users/role", {
        method: "POST", body: { userId, role: newRole }
    }, handleAuthError).then(() => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    });

    toast.promise(changePromise, {
        loading: 'Updating role...',
        success: 'Role Updated!',
        error: (err) => {
            console.error("Change role error:", err);
            loadUsers(); // Revert optimistic update on failure
            // Auth error is handled by fetchAdminAPI redirect
            return err.message || 'Role update failed';
        }
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
            <tr><th>Email</th><th>Created</th><th>Last sign-in</th><th style={{ textAlign: 'center'}}>Role</th><th>User ID</th><th style={{ textAlign: "right" }}>Actions</th></tr>
          </thead>
          <tbody>
            {users.length === 0 ? ( <tr><td colSpan="6" style={{textAlign: 'center'}}>{ q ? `No users found matching "${q}".` : "No users found." }</td></tr> )
             : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDate(u.last_sign_in_at)}</td>
                  <td className="role-display-cell">
                    <span className={`role-badge ${u.role || 'user'}`}>{u.role || 'user'}</span>
                     <select value={u.role || "user"} onChange={(e) => changeRole(u.id, e.target.value)} className="role-select" aria-label={`Change role for ${u.email || u.id}`} >
                       <option value="user">user</option> <option value="admin">admin</option>
                     </select>
                  </td>
                  <td className="user-id-cell">{u.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button>
                    {user?.id !== u.id && (
                         <button className="action-btn delete-btn" onClick={() => deleteUserInitiate(u)} style={{ marginLeft: 8 }} disabled={isDeleting && itemToDelete?.id === u.id} > Delete </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {inspectUser && ( <UserInspector user={inspectUser} onClose={() => setInspectUser(null)} handleAuthError={handleAuthError} /> )}

      <ConfirmDeleteModal isOpen={showDeleteModal} itemName={itemToDelete?.email || itemToDelete?.id} itemType="user" onConfirm={confirmDeleteUser} onCancel={handleCancelDelete} isDeleting={isDeleting} />
    </div>
  );
}