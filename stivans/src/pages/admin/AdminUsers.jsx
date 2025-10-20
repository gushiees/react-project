// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; // Ensure toast is imported
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import UserInspector from './UserInspector.jsx';
import { fetchAdminAPI } from "../../utils/adminApi.js";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal/ConfirmDeleteModal.jsx"; // Import the modal
import './AdminUsers.css'; // Import the specific CSS

// Formats date and time consistently
function formatDate(d) {
    if (!d) return "—"; // Return em dash if date is null or undefined
    try {
        // Format to standard date and time (e.g., 10/20/2025, 10:49:25 AM)
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
  const [inspectUser, setInspectUser] = useState(null); // State for the user being inspected in the side panel
  const [q, setQ] = useState(""); // Search query state
  const [page, setPage] = useState(1); // Pagination state (currently unused in UI)
  const perPage = 50; // Items per page

  // --- State for Delete Confirmation ---
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Modal visibility
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, email } of user to delete
  const [isDeleting, setIsDeleting] = useState(false); // Tracks if delete API call is in progress

  // --- Auth Error Handler ---
  // Redirects to login if auth fails or session expires
  const handleAuthError = useCallback(() => {
     toast.error('Session expired or invalid. Redirecting to login.', { id: 'auth-error-redirect' });
     if (logout) { logout(); }
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  // --- Load Users ---
  // Fetches users from the backend API
  const loadUsers = useCallback(async (resetPage = false) => {
    const targetPage = resetPage ? 1 : page; // Reset to page 1 if searching/filtering
    try {
      setError(null); setLoading(true); // Reset error, start loading
      // Construct API endpoint URL with query parameters
      const endpoint = new URL("/api/admin/users/list", window.location.origin);
      endpoint.searchParams.set("page", String(targetPage));
      endpoint.searchParams.set("perPage", String(perPage));
      if (q) endpoint.searchParams.set("q", q); // Add search query if present

      // Call the API using the helper function
      const json = await fetchAdminAPI(endpoint.toString(), { method: 'GET' }, handleAuthError);

      setUsers(json.users || []); // Update state with fetched users, default to empty array
      if (resetPage) setPage(1); // Reset page number if needed

    } catch (e) {
      // Handle errors (auth errors are handled by fetchAdminAPI)
      if (e.message !== 'Authentication required') {
        console.error("Load users error:", e);
        const errMsg = e.message || "Failed to load users";
        setError(errMsg); toast.error(errMsg); // Show error toast
      }
    } finally { setLoading(false); } // Stop loading indicator
  }, [page, q, perPage, handleAuthError]); // Dependencies for useCallback

  // --- Effect to Load Users on Mount/User Change ---
   useEffect(() => {
       // Only load if the current user is an admin
       if (user?.role === 'admin') { loadUsers(); }
       // Redirect if user context is lost unexpectedly
       else if (!user && logout) { handleAuthError(); }
   }, [loadUsers, user, handleAuthError, logout]); // Dependencies for useEffect

   // --- Search Handler ---
   // Triggered by search button or Enter key in search input
   const handleSearch = () => { loadUsers(true); }; // Reload users, resetting to page 1

  // --- Delete Logic ---
  // Step 1: Initiate deletion by setting state and opening the modal
  const deleteUserInitiate = (userToDelete) => {
    // Prevent admin from deleting themselves
    if (user?.id === userToDelete.id) {
        toast.error("You cannot delete your own account.");
        return;
    }
    // Set user info for the modal and show it
    setItemToDelete({ id: userToDelete.id, email: userToDelete.email });
    setShowDeleteModal(true);
    setIsDeleting(false); // Reset deleting state
  };

  // Step 2: Perform the actual deletion after modal confirmation and countdown
  const confirmDeleteUser = async () => {
    if (!itemToDelete) return; // Safety check
    setIsDeleting(true); // Indicate deletion is in progress

    // Use toast.promise for async feedback
    const deletePromise = fetchAdminAPI("/api/admin/users/delete", {
        method: "POST", body: { userId: itemToDelete.id } // Send ID to backend
    }, handleAuthError).then(() => {
        // Actions on successful deletion
        setShowDeleteModal(false); setItemToDelete(null); loadUsers(); // Close modal, clear item, refresh list
    });

    toast.promise(deletePromise, {
        loading: 'Deleting user...', // Loading message
        success: 'User Deleted!',   // Success message
        error: (err) => { // Error message/handler
            console.error("Delete user error:", err);
            // Auth errors already handled by redirect in fetchAdminAPI
            return err.message || 'Delete failed'; // Return message for the error toast
        }
    }).finally(() => setIsDeleting(false)); // Reset deleting state regardless of outcome
  };

  // Step 3: Handle modal cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
    setIsDeleting(false);
  };

  // --- Change Role Logic ---
  const changeRole = async (userId, newRole) => {
    setError(null); // Clear previous errors

    // Use toast.promise for async feedback
    const changePromise = fetchAdminAPI("/api/admin/users/role", {
        method: "POST", body: { userId, role: newRole } // Send user ID and new role
    }, handleAuthError).then(() => {
        // Optimistic UI update: change role in local state immediately
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    });

    toast.promise(changePromise, {
        loading: 'Updating role...', // Loading message
        success: 'Role Updated!',   // Success message
        error: (err) => { // Error message/handler
            console.error("Change role error:", err);
            loadUsers(); // Revert optimistic update on failure by reloading user list
            // Auth errors already handled by redirect in fetchAdminAPI
            return err.message || 'Role update failed'; // Return message for the error toast
        }
    });
  };

  // --- JSX Rendering ---
  return (
    <div className="admin-section users-section">
      <h2>User Management</h2>
      {/* Toolbar with Search */}
      <div className="admin-toolbar users-toolbar">
         <input type="search" placeholder="Search user email..." value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="admin-search-input" />
        <button onClick={handleSearch} className="search-users-btn">Search Users</button>
      </div>

      {/* Display error message if any */}
      {error && <p className="error-message">{error}</p>}
      {/* Display loading indicator */}
      {loading && <p>Loading users…</p>}

      {/* User Table - Renders only when not loading */}
      {!loading && (
        <table className="admin-table users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Date Created</th> {/* Retained */}
              <th>Last Active</th>    {/* New column */}
              <th>Time Out (Last Login)</th> {/* Clarified meaning */}
              <th style={{ textAlign: 'center'}}>Role</th>
              <th>User ID</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Handle no users found */}
            {users.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center'}}>{ q ? `No users found matching "${q}".` : "No users found." }</td></tr>
            ) : (
              // Map through users and render rows
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{formatDate(u.created_at)}</td>      {/* Date Created column */}
                  <td>{formatDate(u.last_active_at)}</td>   {/* Last Active column */}
                  <td>{formatDate(u.last_sign_in_at)}</td> {/* Last Login column */}
                  <td className="role-display-cell">
                    {/* Display Role Badge */}
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
                  {/* Action Buttons */}
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button>
                    {/* Delete Button - Conditionally Rendered */}
                    {user?.id !== u.id && ( // Prevent admin from deleting themselves
                         <button
                            className="action-btn delete-btn"
                            onClick={() => deleteUserInitiate(u)} // Trigger the modal
                            style={{ marginLeft: 8 }}
                            disabled={isDeleting && itemToDelete?.id === u.id} // Disable button while deleting this specific user
                         > Delete </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Pagination Controls could go here if needed */}
      {/* ... */}

      {/* User Inspector Side Panel */}
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