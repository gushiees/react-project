// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import UserInspector from './UserInspector.jsx';
import { fetchAdminAPI } from "../../utils/adminApi.js";
import './AdminUsers.css';

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

  const handleAuthError = useCallback(() => {
     if (logout) { logout(); }
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

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
  }, [page, q, perPage, handleAuthError]); // Removed user dependency here

   useEffect(() => {
       if (user?.role === 'admin') { loadUsers(); }
       else if (!user && logout) { handleAuthError(); }
   // Depend only on loadUsers to avoid re-running just because user object reference changes
   }, [loadUsers, user, handleAuthError, logout]);

   const handleSearch = () => { loadUsers(true); };

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email || userId}? This cannot be undone.`)) return;
    const t = toast.loading("Deleting user…");
    try {
      setError(null);
      await fetchAdminAPI("/api/admin/users/delete", { method: "POST", body: { userId } }, handleAuthError);
      await loadUsers(); toast.success("User deleted", { id: t });
    } catch (e) {
      if (e.message !== 'Authentication required') {
          console.error("Delete user error:", e); const errMsg = e.message || "Delete failed";
          setError(errMsg); toast.error(errMsg, { id: t });
      } else { toast.dismiss(t); }
    }
  };

  const changeRole = async (userId, newRole) => {
    const t = toast.loading("Updating role…");
    try {
      setError(null);
      await fetchAdminAPI("/api/admin/users/role", { method: "POST", body: { userId, role: newRole } }, handleAuthError);
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u)); // Optimistic update
      toast.success("Role updated", { id: t });
    } catch (e) {
       if (e.message !== 'Authentication required') {
          console.error("Change role error:", e); const errMsg = e.message || "Role update failed";
          setError(errMsg); toast.error(errMsg, { id: t });
          loadUsers(); // Revert optimistic update on failure
       } else { toast.dismiss(t); }
    }
  };

  // --- JSX ---
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
              <th>Email</th><th>Created</th><th>Last sign-in</th>
              <th style={{ textAlign: 'center'}}>Role</th> {/* Centered Role Header */}
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
                  {/* --- Role Cell --- */}
                  <td className="role-display-cell">
                    {/* Display Badge */}
                    <span className={`role-badge ${u.role || 'user'}`}>
                      {u.role || 'user'}
                    </span>
                    {/* Hidden Select for Changing Role (Could be shown on click/hover later) */}
                    {/* For now, just have the dropdown to trigger the change */}
                     <select
                       value={u.role || "user"}
                       onChange={(e) => changeRole(u.id, e.target.value)}
                       className="role-select" // Style as needed, maybe hide initially
                       aria-label={`Change role for ${u.email || u.id}`}
                       // Maybe add style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} to hide visually
                       // Or use a button to reveal this select for editing
                     >
                       <option value="user">user</option>
                       <option value="admin">admin</option>
                     </select>
                  </td>
                  <td className="user-id-cell">{u.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button>
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
      {inspectUser && (
        <UserInspector user={inspectUser} onClose={() => setInspectUser(null)} handleAuthError={handleAuthError} />
      )}
    </div>
  );
}