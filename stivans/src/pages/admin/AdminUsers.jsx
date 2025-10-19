// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import UserInspector from './UserInspector.jsx';
import './AdminUsers.css'; // Import the specific CSS

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

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
      setError(e.message);
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, q, perPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]); // Initial load and on page/query change

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email || userId}? This cannot be undone.`)) return;
    const t = toast.loading("Deleting user…");
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Delete failed");
      await loadUsers(); // Refresh the list
      toast.success("User deleted", { id: t });
    } catch (e) {
      console.error(e);
      setError(e.message || "Delete failed");
      toast.error(e.message || "Delete failed", { id: t });
    }
  };

  const changeRole = async (userId, newRole) => {
    const t = toast.loading("Updating role…");
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Role update failed");
      // Update role locally immediately for better UX before full refresh
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
      // await loadUsers(); // Optional: uncomment if immediate consistency needed
      toast.success("Role updated", { id: t });
    } catch (e) {
      console.error(e);
      setError(e.message || "Role update failed");
      toast.error(e.message || "Role update failed", { id: t });
    }
  };

  return (
    <div className="admin-section users-section"> {/* Added users-section class */}
      <h2>User Management</h2>
      <div className="admin-toolbar users-toolbar">
        <input
          type="search"
          placeholder="Search user email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadUsers())}
          className="admin-search-input"
        />
        <button onClick={() => (setPage(1), loadUsers())} className="search-users-btn">Search Users</button> {/* Added class */}
      </div>
      {error && <p className="error-message">{error}</p>}
      {loading && <p>Loading users…</p>}
      {!loading && !error && (
        <table className="admin-table users-table"> {/* Added users-table class */}
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
                      value={u.role || "user"} // Controlled component
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="admin-sort-select role-select" // Reusing sort style + new class
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="user-id-cell">{u.id}</td> {/* Added class */}
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => setInspectUser(u)} className="action-btn view-btn">View</button> {/* Added classes */}
                    <button className="action-btn delete-btn" onClick={() => deleteUser(u.id, u.email)} style={{ marginLeft: 8 }}>Delete</button> {/* Added classes */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {inspectUser && (
        <UserInspector user={inspectUser} onClose={() => setInspectUser(null)} />
      )}
    </div>
  );
}