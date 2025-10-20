// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import UserInspector from './UserInspector.jsx';
import { fetchAdminAPI } from "../../utils/adminApi.js";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal/ConfirmDeleteModal.jsx"; // Import the modal
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
  const [page, setPage] = useState(1);
  const perPage = 50;

  // --- State for Delete Confirmation ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id: string, email: string }
  const [isDeleting, setIsDeleting] = useState(false); // Tracks if delete API call is in progress

  // --- Auth Error Handler ---
  const handleAuthError = useCallback(() => {
     if (logout) { logout(); }
    // Use replace to prevent going back to the admin page via browser history
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
        setError(errMsg); toast.error(errMsg);
      }
    } finally { setLoading(false); }
  }, [page, q, perPage, handleAuthError]); // Add handleAuthError

  // --- Effect to Load Users ---
   useEffect(() => {
       // Only load if the user is definitely an admin
       if (user?.role === 'admin') {
           loadUsers();
       } else if (!user && logout) { // Redirect if user context lost while loading
            handleAuthError();
       }
   // Depend on loadUsers callback, user context, auth error handler, and logout function
   }, [loadUsers, user, handleAuthError, logout]);

   // --- Search Handler ---
   const handleSearch = () => { loadUsers(true); }; // Call loadUsers and reset page to 1

  // --- Delete Logic ---
  // Step 1: Initiate deletion by opening the modal
  const deleteUserInitiate = (userToDelete) => {
    // Prevent admin from deleting themselves
    if (user?.id === userToDelete.id) {
        toast.error("You cannot delete your own account.");
        return;
    }
    // No window.confirm needed here, modal handles confirmation

    setItemToDelete({ id: userToDelete.id, email: userToDelete.email });
    setShowDeleteModal(true); // Open the modal
    setIsDeleting(false); // Ensure deleting state is reset when modal opens
  };

  // Step 2: Perform the actual deletion after modal confirmation
  const confirmDeleteUser = async () => {
    if (!itemToDelete) return; // Should not happen if modal is open correctly

    setIsDeleting(true); // Show deleting indicator in modal
    const t = toast.loading("Deleting user…");
    try {
      setError(null);
      // Use the fetch helper for the API call
      await fetchAdminAPI("/api/admin/users/delete", {
        method: "POST",
        body: { userId: itemToDelete.id } // Send user ID to delete
      }, handleAuthError); // Pass auth error handler

      await loadUsers(); // Refresh the user list on success
      toast.success("User deleted", { id: t });
      setShowDeleteModal(false); // Close modal on success
      setItemToDelete(null); // Clear the item to delete

    } catch (e) {
      // Only handle non-auth errors here, auth errors trigger redirect
      if (e.message !== 'Authentication required') {
          console.error("Delete user error:", e);
          const errMsg = e.message || "Delete failed";
          // setError(errMsg); // Optional: Set list error if needed
          toast.error(errMsg, { id: t });
      } else {
           toast.dismiss(t); // Dismiss loading toast if auth error occurred
      }
    } finally {
        setIsDeleting(false); // Always reset deleting state
        // Keep modal open on error by default for user feedback
        // setShowDeleteModal(false); // Uncomment to close modal even on error
        // setItemToDelete(null); // Uncomment to clear item even on error
    }
  };

  // Step 3: Handle modal cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
    setIsDeleting(false);
  };

  // --- Change Role Logic ---
  const changeRole = async (userId, newRole) => {
    const t = toast.loading("Updating role…");
    try {
      setError(null);
       // Use the fetch helper for the API call
      await fetchAdminAPI("/api/admin/users/role", {
        method: "POST",
        body: { userId, role: newRole }
      }, handleAuthError);

      // Optimistic UI update (update local state immediately)
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Role updated", { id: t });
      // Optionally await loadUsers() if strict consistency is needed
    } catch (e) {
       // Only handle non-auth errors here
       if (e.message !== 'Authentication required') {
          console.error("Change role error:", e);
          const errMsg = e.message || "Role update failed";
          setError(errMsg); toast.error(errMsg, { id: t });
          loadUsers(); // Revert optimistic update on failure by reloading
       } else {
            toast.dismiss(t); // Dismiss loading toast if auth error occurred
       }
    }
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

      {/* Display error message if exists */}
      {error && <p className="error-message">{error}</p>}
      {/* Show loading indicator */}
      {loading && <p>Loading users…</p>}

      {/* Show table only when not loading */}
      {!loading && (
        <table className="admin-table users-table">
          <thead>
            <tr>
              <th>Email</th><th>Created</th><th>Last sign-in</th>
              <th style={{ textAlign: 'center'}}>Role</th>
              <th>User ID</th><th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>{ q ? `No users found matching "${q}".` : "No users found." }</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDate(u.last_sign_in_at)}</td>
                  <td className="role-display-cell">
                    {/* Display Badge */}
                    <span className={`role-badge ${u.role || 'user'}`}>{u.role || 'user'}</span>
                    {/* Role Change Select Dropdown */}
                     <select
                       value={u.role || "user"} // Controlled component
                       onChange={(e) => changeRole(u.id, e.target.value)}
                       className="role-select" // CSS class for styling
                       aria-label={`Change role for ${u.email || u.id}`}
                     >
                       <option value="user">user</option>
                       <option value="admin">admin</option>
                     </select>
                  </td>
                  <td className="user-id-cell">{u.id}</td>
                  <td style={{ textAlign: "right" }}>
                    {/* View Button */}
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button>
                    {/* Delete Button - Conditionally Rendered */}
                    {user?.id !== u.id && ( // Prevent admin from deleting themselves
                         <button
                            className="action-btn delete-btn"
                            onClick={() => deleteUserInitiate(u)} // Trigger the modal
                            style={{ marginLeft: 8 }}
                            disabled={isDeleting && itemToDelete?.id === u.id} // Disable button while deleting this specific user
                         >
                            Delete
                         </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* User Inspector Modal/Drawer */}
      {inspectUser && (
        <UserInspector
            user={inspectUser}
            onClose={() => setInspectUser(null)}
            handleAuthError={handleAuthError} // Pass down the auth handler
        />
      )}

      {/* --- Delete Confirmation Modal --- */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        itemName={itemToDelete?.email || itemToDelete?.id} // Show email or ID as identifier
        itemType="user" // Specify item type for modal text
        onConfirm={confirmDeleteUser} // Function to call on confirmation
        onCancel={handleCancelDelete} // Function to call on cancel/close
        isDeleting={isDeleting} // Pass deleting status for feedback
      />
    </div>
  );
}