// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "../../AuthContext.jsx"; // Import useAuth
// import { supabase } from '../../supabaseClient'; // No longer needed directly here
import UserInspector from './UserInspector.jsx';
import { fetchAdminAPI } from "../../utils/adminApi.js"; // Import the helper
import './AdminUsers.css'; // Import the specific CSS

function formatDate(d) {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleString();
    } catch {
        return String(d); // Return as string if formatting fails
    }
}

export default function AdminUsers() {
  const { user, logout } = useAuth(); // Get user and logout function
  const navigate = useNavigate(); // Get navigate function

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // Changed initial state to true
  const [error, setError] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  // --- Define the logout and redirect function ---
  const handleAuthError = useCallback(() => {
    // Check if logout exists to prevent errors during initial renders
     if (logout) {
       logout();
     }
    // Use replace to prevent going back to the admin page via browser history
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  // --- UPDATED loadUsers ---
  const loadUsers = useCallback(async (resetPage = false) => {
    // Determine the page number to fetch
    const targetPage = resetPage ? 1 : page;

    try {
      setError(null);
      setLoading(true);

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
        toast.error(errMsg);
      }
      // If it was an auth error, handleAuthError was already called by fetchAdminAPI
    } finally {
      setLoading(false);
    }
    // Add user dependency to ensure it runs if user context changes
  }, [page, q, perPage, handleAuthError, user]);

  // Initial load effect
   useEffect(() => {
       // Only load if the user is definitely an admin
       if (user?.role === 'admin') {
           loadUsers();
       } else if (!user && logout) {
           // If somehow user becomes null while in admin, redirect
            handleAuthError();
       }
       // Depend on user role to reload if it changes (e.g., after login)
   }, [user, loadUsers, handleAuthError, logout]);

  // Function to handle search initiation
   const handleSearch = () => {
       loadUsers(true); // Call loadUsers and reset page to 1
   };


  // --- UPDATED deleteUser ---
  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email || userId}? This cannot be undone.`)) return;
    const t = toast.loading("Deleting user…");
    try {
      setError(null);

      // Use the helper for the API call
      await fetchAdminAPI("/api/admin/users/delete", {
        method: "POST",
        body: { userId } // fetchAdminAPI handles stringify
      }, handleAuthError);

      await loadUsers(); // Refresh the list
      toast.success("User deleted", { id: t });
    } catch (e) {
      // Only handle non-auth errors here
      if (e.message !== 'Authentication required') {
          console.error("Delete user error:", e);
          const errMsg = e.message || "Delete failed";
          setError(errMsg);
          toast.error(errMsg, { id: t });
      } else {
           toast.dismiss(t); // Dismiss loading if auth error occurred
      }
    }
  };

  // --- UPDATED changeRole ---
  const changeRole = async (userId, newRole) => {
    const t = toast.loading("Updating role…");
    try {
      setError(null);

       // Use the helper for the API call
      await fetchAdminAPI("/api/admin/users/role", { // Ensure this endpoint exists and works
        method: "POST",
        body: { userId, role: newRole } // fetchAdminAPI handles stringify
      }, handleAuthError);

      // Optimistic UI update (update local state immediately)
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Role updated", { id: t });
      // Optionally await loadUsers() if strict consistency is needed over optimistic update
      // await loadUsers();
    } catch (e) {
       // Only handle non-auth errors here
       if (e.message !== 'Authentication required') {
          console.error("Change role error:", e);
          const errMsg = e.message || "Role update failed";
          setError(errMsg);
          toast.error(errMsg, { id: t });
          // Revert optimistic update on failure by reloading
          loadUsers();
       } else {
            toast.dismiss(t); // Dismiss loading if auth error occurred
       }
    }
  };

  // --- JSX ---
  return (
    <div className="admin-section users-section">
      <h2>User Management</h2>
      <div className="admin-toolbar users-toolbar">
         <input
          type="search"
          placeholder="Search user email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // Trigger search on Enter
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="admin-search-input"
        />
        {/* Trigger search on button click */}
        <button onClick={handleSearch} className="search-users-btn">Search Users</button>
      </div>
      {/* Display error message if exists */}
      {error && <p className="error-message">{error}</p>}
      {/* Show loading indicator */}
      {loading && <p>Loading users…</p>}
      {/* Show table only when not loading and no critical error occurred */}
      {!loading && ( // Removed !error check here to potentially show stale data even if last fetch failed
        <table className="admin-table users-table">
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
              <tr><td colSpan="6" style={{textAlign: 'center'}}>{ q ? `No users found matching "${q}".` : "No users found." }</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDate(u.last_sign_in_at)}</td>
                  <td>
                    <select
                      value={u.role || "user"} // Controlled component
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="admin-sort-select role-select"
                      aria-label={`Role for ${u.email || u.id}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="user-id-cell">{u.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button>
                    {/* Prevent admin from deleting themselves */}
                    {user?.id !== u.id && (
                         <button className="action-btn delete-btn" onClick={() => deleteUser(u.id, u.email)} style={{ marginLeft: 8 }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Pagination Controls could go here */}
      {/* ... */}


      {/* User Inspector Modal */}
      {inspectUser && (
        // Pass handleAuthError down to UserInspector
        <UserInspector user={inspectUser} onClose={() => setInspectUser(null)} handleAuthError={handleAuthError} />
      )}
    </div>
  );
}