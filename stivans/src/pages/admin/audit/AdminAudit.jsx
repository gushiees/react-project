// src/pages/admin/audit/AdminAudit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import toast from "react-hot-toast";

const PAGE_SIZE = 50;

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [realtimeOn, setRealtimeOn] = useState(true);

  // simple filters (optional)
  const [actionFilter, setActionFilter] = useState("");     // INSERT / UPDATE / DELETE / CUSTOM
  const [tableFilter, setTableFilter] = useState("");       // products / orders / etc
  const [q, setQ] = useState("");                           // search actor_email / table_name / row_id

  const tableOptions = useMemo(() => {
    const s = new Set(logs.map(l => l.table_name).filter(Boolean));
    return Array.from(s).sort();
  }, [logs]);

  async function fetchPage(nextPage = 0, replace = false) {
    try {
      if (nextPage === 0) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from("audit_log")
        .select("id, at, table_name, action, row_id, changed_keys, actor_email, reason, new_data, old_data", { count: "exact" })
        .order("at", { ascending: false })
        .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (actionFilter) query = query.eq("action", actionFilter);
      if (tableFilter) query = query.eq("table_name", tableFilter);
      if (q) {
        // search actor_email OR table_name OR row_id (case-insensitive)
        const needle = q.replace(/%/g, ""); // sanitize %
        query = query.or(
          `actor_email.ilike.%${needle}%,table_name.ilike.%${needle}%,row_id.ilike.%${needle}%`
        );
      }

      const { data, error: err, count } = await query;
      if (err) throw err;

      const next = replace ? (data || []) : [...logs, ...(data || [])];
      setLogs(next);

      const fetchedTotal = (nextPage + 1) * PAGE_SIZE;
      setHasMore((count ?? 0) > fetchedTotal);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
      setError(e.message);
      toast.error(e.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // initial load + refetch on filters
  useEffect(() => {
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, tableFilter, q]);

  // realtime feed (INSERT only; audit_log is append-only)
  useEffect(() => {
    if (!realtimeOn) return;

    const channel = supabase
      .channel("audit_log_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const row = payload.new;
          // optional: apply current client-side filters before prepending
          if (actionFilter && row.action !== actionFilter) return;
          if (tableFilter && row.table_name !== tableFilter) return;
          if (q) {
            const needle = q.toLowerCase();
            const hit =
              (row.actor_email || "").toLowerCase().includes(needle) ||
              (row.table_name || "").toLowerCase().includes(needle) ||
              (row.row_id || "").toLowerCase().includes(needle);
            if (!hit) return;
          }
          setLogs((prev) => {
            // de-dupe just in case (id should be unique)
            if (prev.length && prev[0]?.id === row.id) return prev;
            return [row, ...prev];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // ok
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeOn, actionFilter, tableFilter, q]);

  return (
    <section>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <h2>Audit Trail</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>

          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="">All tables</option>
            {tableOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Search email / table / row id"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240 }}
          />

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={realtimeOn} onChange={(e) => setRealtimeOn(e.target.checked)} />
            Live updates
          </label>
        </div>
      </div>

      {loading ? (
        <p>Loading audit logs…</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Time</th>
                <th>Table</th>
                <th>Action</th>
                <th>Row ID</th>
                <th>Changed Keys</th>
                <th>Actor</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center" }}>No audit entries.</td></tr>
              ) : (
                logs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.at ? new Date(r.at).toLocaleString() : ""}
                    </td>
                    <td>{r.table_name}</td>
                    <td>{r.action}</td>
                    <td style={{ fontFamily: "monospace" }}>{r.row_id || ""}</td>
                    <td>{Array.isArray(r.changed_keys) ? r.changed_keys.join(", ") : ""}</td>
                    <td>{r.actor_email || "—"}</td>
                    <td title={r.reason || ""} style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.reason || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button
              className="add-product-btn"
              onClick={() => fetchPage(0, true)}
              disabled={loading || loadingMore}
            >
              Refresh
            </button>

            {hasMore && (
              <button
                className="add-product-btn"
                onClick={() => fetchPage(page + 1)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
