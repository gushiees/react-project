import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaSearch, FaSync, FaTruck, FaCheck, FaSave, FaHashtag } from "react-icons/fa";
import { supabase } from "../../../supabaseClient"; // keep this path if supabaseClient is in /src
import "./AdminOrders.css";

const PAGE_SIZE = 20;

const TABS = [
  { key: "unshipped", label: "Unshipped" },   // status = 'paid'
  { key: "in_transit", label: "In Transit" }, // status = 'in_transit'
  { key: "shipped", label: "Shipped" },       // status = 'shipped'
  { key: "all", label: "All" },
];

const SORT_FIELDS = [
  { key: "created_at", label: "Date" },
  { key: "total", label: "Total" },
];

export default function AdminOrders() {
  const [tab, setTab] = useState("unshipped");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("asc"); // FCFS (oldest first)
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const statusFilter = useMemo(() => {
    if (tab === "unshipped") return { status: "paid" };
    if (tab === "in_transit") return { status: "in_transit" };
    if (tab === "shipped") return { status: "shipped" };
    return null; // all
  }, [tab]);

  async function fetchOrders() {
    try {
      setLoading(true);
      let q = supabase
        .from("orders")
        .select(
          "id, created_at, user_id, external_id, total, status, tracking_number, shipping_carrier, xendit_invoice_url",
          { count: "exact" }
        );

      if (statusFilter) q = q.eq("status", statusFilter.status);

      if (search?.trim()) {
        const qstr = search.trim();
        q = q.or(`external_id.ilike.%${qstr}%,tracking_number.ilike.%${qstr}%`);
      }

      q = q.order(sortField, { ascending: sortDir === "asc", nullsFirst: true });
      q = q.range(from, to);

      const { data, error, count: totalCount } = await q;
      if (error) throw error;

      setRows(data || []);
      setCount(totalCount || 0);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, sortField, sortDir, page]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function updateRow(orderId, patch) {
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) throw error;
  }

  async function handleStatusChange(row, nextStatus) {
    try {
      await updateRow(row.id, { status: nextStatus });
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, status: nextStatus } : r)));
      toast.success(`Status → ${nextStatus}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update status");
    }
  }

  async function handleSaveShipping(row) {
    try {
      await updateRow(row.id, {
        shipping_carrier: row.shipping_carrier || null,
        tracking_number: row.tracking_number || null,
      });
      toast.success("Saved");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    }
  }

  async function handleGenerateTracking(row) {
    try {
      const { data, error } = await supabase.rpc("assign_tracking_number", {
        p_order_id: row.id,
        p_carrier: row.shipping_carrier || null,
      });
      if (error) throw error;
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, tracking_number: data } : r)));
      toast.success(`Tracking assigned: ${data}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to generate tracking");
    }
  }

  function fmtPhp(n) {
    if (typeof n !== "number") return "₱0.00";
    return n.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
  }

  function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  }

  return (
    <div className="admin-orders">
      {/* Toolbar */}
      <div className="ao-toolbar">
        <div className="ao-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ao-tab ${t.key === tab ? "active" : ""}`}
              onClick={() => { setTab(t.key); setPage(0); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ao-actions">
          <div className="ao-search">
            <FaSearch />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search external id / tracking…"
            />
          </div>

          <div className="ao-sort">
            <label>Sort:</label>
            <select value={sortField} onChange={e => setSortField(e.target.value)}>
              {SORT_FIELDS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>

          <button className="ao-refresh" onClick={fetchOrders} disabled={loading} title="Refresh">
            <FaSync /> {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="ao-table-wrap">
        <table className="ao-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order</th>
              <th>Total</th>
              <th>Status</th>
              <th>Carrier</th>
              <th>Tracking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24 }}>No orders</td></tr>
            )}

            {rows.map(row => (
              <tr key={row.id}>
                <td>{fmtDate(row.created_at)}</td>
                <td>
                  <div className="ao-orderid">
                    <div>Ext: <code>{row.external_id}</code></div>
                    {row.xendit_invoice_url && (
                      <a href={row.xendit_invoice_url} target="_blank" rel="noreferrer">Invoice</a>
                    )}
                  </div>
                </td>
                <td>{fmtPhp(Number(row.total || 0))}</td>
                <td>
                  <select
                    value={row.status || ""}
                    onChange={(e) => handleStatusChange(row, e.target.value)}
                  >
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="in_transit">in_transit</option>
                    <option value="shipped">shipped</option>
                    <option value="canceled">canceled</option>
                  </select>
                </td>
                <td>
                  <input
                    value={row.shipping_carrier || ""}
                    onChange={(e) =>
                      setRows(prev => prev.map(p =>
                        p.id === row.id ? { ...p, shipping_carrier: e.target.value } : p
                      ))
                    }
                    placeholder="LBC / J&T / Ninja"
                  />
                </td>
                <td>
                  <div className="ao-track">
                    <FaHashtag style={{ opacity: 0.7 }} />
                    <input
                      value={row.tracking_number || ""}
                      onChange={(e) =>
                        setRows(prev => prev.map(p =>
                          p.id === row.id ? { ...p, tracking_number: e.target.value } : p
                        ))
                      }
                      placeholder="YYMMDD000001"
                    />
                    <button className="ao-gen" title="Generate tracking"
                      onClick={() => handleGenerateTracking(row)}>
                      <FaTruck />
                    </button>
                  </div>
                </td>
                <td className="ao-actions-td">
                  <button className="ao-save" onClick={() => handleSaveShipping(row)}>
                    <FaSave /> Save
                  </button>
                  {row.status !== "shipped" && (
                    <button className="ao-markshipped" onClick={() => handleStatusChange(row, "shipped")}>
                      <FaCheck /> Mark Shipped
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="ao-pager">
        <span>{count} result{count === 1 ? "" : "s"}</span>
        <div className="ao-pagebtns">
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
          <span>Page {page + 1} / {totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
