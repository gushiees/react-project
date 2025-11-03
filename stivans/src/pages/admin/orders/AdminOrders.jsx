import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaSearch,
  FaSync,
  FaTruck,
  FaCheck,
  FaSave,
  FaHashtag,
  FaFileMedical,
  FaChevronDown,
  FaChevronRight,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { supabase } from "../../../supabaseClient";
import "./AdminOrders.css";

const PAGE_SIZE = 20;

const TABS = [
  { key: "unshipped", label: "Unshipped" },   // fulfillment_status in ('unfulfilled','processing')
  { key: "in_transit", label: "In Transit" }, // fulfillment_status = 'in_transit'
  { key: "shipped", label: "Shipped" },       // fulfillment_status in ('shipped','delivered')
  { key: "all", label: "All" },
];

const SORT_FIELDS = [
  { key: "created_at", label: "Date" },
  { key: "total", label: "Total" },
];

const CADAVER_LABELS = {
  full_name: "Name",
  dob: "DOB",
  age: "Age",
  sex: "Sex",
  civil_status: "Civil status",
  religion: "Religion",
  religion_text: "Religion (text)",
  death_datetime: "Death date/time",
  place_of_death: "Place of death",
  cause_of_death: "Cause of death",
  cause_of_death_text: "Cause (text)",
  kin_name: "Kin name",
  kin_relation: "Kin relation",
  kin_relation_text: "Kin relation (text)",
  kin_mobile: "Kin mobile",
  kin_email: "Kin email",
  kin_address: "Kin address",
  pickup_datetime: "Pickup date/time",
  remains_location: "Remains location",
  special_handling: "Special handling",
  special_handling_reason: "Handling reason",
  special_handling_reason_text: "Handling reason (text)",
  occupation: "Occupation",
  nationality: "Nationality",
  residence: "Residence",
  death_certificate_url: "Death cert URL",
  claimant_id_url: "Claimant ID URL",
  permit_url: "Permit URL",
  order_tag: "Order tag",
  created_at: "Created at",
};

export default function AdminOrders() {
  const [tab, setTab] = useState("unshipped");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // UI state
  const [expandedId, setExpandedId] = useState(null);
  const [cadaverOpenId, setCadaverOpenId] = useState(null);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const statusFilter = useMemo(() => {
    if (tab === "unshipped") return { kind: "in", values: ["unfulfilled", "processing"] };
    if (tab === "in_transit") return { kind: "eq", value: "in_transit" };
    if (tab === "shipped") return { kind: "in", values: ["shipped", "delivered"] };
    return null;
  }, [tab]);

  async function fetchOrders() {
    try {
      setLoading(true);

      let q = supabase
        .from("orders")
        .select(
          `
          id, created_at, user_id, external_id, total,
          payment_status, fulfillment_status,
          tracking_number, shipping_carrier, xendit_invoice_url,

          order_items:order_items(
            id, quantity, unit_price,
            product:products(id, name, image_url, price)
          ),

          cadavers:cadaver_details!cadaver_details_order_id_fkey(*)
        `,
          { count: "exact" }
        );

      if (statusFilter) {
        if (statusFilter.kind === "eq") q = q.eq("fulfillment_status", statusFilter.value);
        if (statusFilter.kind === "in") q = q.in("fulfillment_status", statusFilter.values);
      }

      if (search?.trim()) {
        const qstr = search.trim();
        q = q.or(`external_id.ilike.%${qstr}%,tracking_number.ilike.%${qstr}%`);
      }

      q = q.order(sortField, { ascending: sortDir === "asc", nullsFirst: true }).range(from, to);

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

  async function handleFulfillmentChange(row, nextStatus) {
    try {
      await updateRow(row.id, { fulfillment_status: nextStatus });
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, fulfillment_status: nextStatus } : r)));
      toast.success(`Fulfillment → ${nextStatus}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update fulfillment");
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

  function Pill({ value }) {
    const v = (value || "pending").toLowerCase();
    return <span className={`pill pill-${v}`}>{v}</span>;
  }

  function Badge({ children }) {
    return <span className="badge">{children}</span>;
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
              onClick={() => { setTab(t.key); setPage(0); setExpandedId(null); }}
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
              <th className="ao-expander-td"></th>
              <th>Date</th>
              <th>Order</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Fulfillment</th>
              <th>Shipping</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 24 }}>No orders</td></tr>
            )}

            {rows.map(row => {
              const isOpen = expandedId === row.id;
              const itemCount = row.order_items?.length || 0;
              const cadCount = row.cadavers?.length || 0;

              return (
                <React.Fragment key={row.id}>
                  <tr className="ao-row">
                    <td className="ao-expander-td">
                      <button
                        className="ao-expander"
                        onClick={() => setExpandedId(isOpen ? null : row.id)}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                      </button>
                    </td>

                    <td>{fmtDate(row.created_at)}</td>

                    <td>
                      <div className="ao-orderid">
                        <div className="ao-orderline">
                          <span className="muted">Ext:</span>{" "}
                          <code title={row.external_id}>{row.external_id}</code>
                        </div>
                        {row.xendit_invoice_url && (
                          <a className="ao-invoice-link" href={row.xendit_invoice_url} target="_blank" rel="noreferrer">
                            Invoice <FaExternalLinkAlt />
                          </a>
                        )}
                        <div className="ao-counts">
                          <Badge>{itemCount} items</Badge>
                          <Badge>{cadCount} cadaver{cadCount === 1 ? "" : "s"}</Badge>
                        </div>
                      </div>
                    </td>

                    <td>{fmtPhp(Number(row.total || 0))}</td>

                    {/* Payment (read-only) */}
                    <td><Pill value={row.payment_status} /></td>

                    {/* Fulfillment (editable) */}
                    <td>
                      <select
                        value={row.fulfillment_status || "unfulfilled"}
                        onChange={(e) => handleFulfillmentChange(row, e.target.value)}
                      >
                        <option value="unfulfilled">unfulfilled</option>
                        <option value="processing">processing</option>
                        <option value="in_transit">in_transit</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                        <option value="canceled">canceled</option>
                      </select>
                    </td>

                    {/* Shipping compact */}
                    <td>
                      <div className="ao-shipcompact">
                        <input
                          className="ao-carrier"
                          value={row.shipping_carrier || ""}
                          onChange={(e) =>
                            setRows(prev => prev.map(p =>
                              p.id === row.id ? { ...p, shipping_carrier: e.target.value } : p
                            ))
                          }
                          placeholder="LBC / J&T / Ninja"
                        />
                        <div className="ao-track">
                          <FaHashtag className="muted" />
                          <input
                            className="ao-tracking"
                            value={row.tracking_number || ""}
                            onChange={(e) =>
                              setRows(prev => prev.map(p =>
                                p.id === row.id ? { ...p, tracking_number: e.target.value } : p
                              ))
                            }
                            placeholder="YYMMDD00001"
                          />
                          <button className="ao-gen" title="Generate tracking"
                            onClick={() => handleGenerateTracking(row)}>
                            <FaTruck />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="ao-actions-td">
                      <button className="ao-save" onClick={() => handleSaveShipping(row)}>
                        <FaSave /> Save
                      </button>
                      {row.fulfillment_status !== "shipped" && (
                        <button
                          className="ao-markshipped"
                          onClick={() => handleFulfillmentChange(row, "shipped")}
                        >
                          <FaCheck /> Mark Shipped
                        </button>
                      )}
                      <button className="ao-cadaver-btn" onClick={() => setCadaverOpenId(row.id)}>
                        <FaFileMedical /> Cadaver Details ({cadCount})
                      </button>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {isOpen && (
                    <tr className="ao-expand-row">
                      <td colSpan={8}>
                        <div className="ao-expand-panels">
                          {/* Items */}
                          <div className="ao-panel">
                            <div className="ao-panel-title">Items</div>
                            {itemCount === 0 ? (
                              <div className="ao-empty">No items</div>
                            ) : (
                              <table className="ao-subtable">
                                <thead>
                                  <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Unit</th>
                                    <th>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.order_items.map(oi => {
                                    const p = oi.product || {};
                                    const qty = Number(oi.quantity || 0);
                                    const unit = Number(oi.unit_price ?? p.price ?? 0);
                                    const line = qty * unit;
                                    return (
                                      <tr key={oi.id}>
                                        <td className="ao-prodcell">
                                          {p.image_url && <img src={p.image_url} alt={p.name || "Product"} />}
                                          <div className="ao-prodmeta">
                                            <div className="ao-prodname" title={p.name || "Product"}>
                                              {p.name || "Product"}
                                            </div>
                                          </div>
                                        </td>
                                        <td>{qty}</td>
                                        <td>{fmtPhp(unit)}</td>
                                        <td><strong>{fmtPhp(line)}</strong></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>

                          {/* Cadaver quick glance */}
                          <div className="ao-panel">
                            <div className="ao-panel-title">Cadaver (preview)</div>
                            {(row.cadavers?.length ?? 0) === 0 ? (
                              <div className="ao-empty">No cadaver details</div>
                            ) : (
                              <div className="ao-cadavers">
                                {/* Show first cadaver compact */}
                                <div className="ao-cadaver-one">
                                  {[
                                    ["full_name", "Name"],
                                    ["dob", "DOB"],
                                    ["kin_name", "Kin name"],
                                    ["kin_relation", "Relation"],
                                    ["pickup_datetime", "Pickup"],
                                    ["remains_location", "Location"],
                                  ].map(([k, label]) => {
                                    const v = row.cadavers[0][k];
                                    return (
                                      <div className="ao-line" key={k}>
                                        <span className="ao-k">{label}</span>
                                        <span className="ao-v">
                                          {v === null || v === undefined || v === "" ? "—" : String(v)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {row.cadavers[0].death_certificate_url && (
                                    <div className="ao-files">
                                      <a
                                        className="ao-filelink"
                                        href={row.cadavers[0].death_certificate_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Death certificate <FaExternalLinkAlt />
                                      </a>
                                    </div>
                                  )}
                                </div>

                                <button className="ao-cadaver-btn" onClick={() => setCadaverOpenId(row.id)}>
                                  <FaFileMedical /> View all ({row.cadavers.length})
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Cadaver modal */}
                  {cadaverOpenId === row.id && (
                    <tr>
                      <td colSpan={8}>
                        <div className="ao-modal-backdrop" onClick={() => setCadaverOpenId(null)} />
                        <div className="ao-modal" role="dialog" aria-modal="true">
                          <div className="ao-modal-head">
                            <h3>Cadaver Details ({row.cadavers?.length || 0})</h3>
                            <button onClick={() => setCadaverOpenId(null)}>Close</button>
                          </div>
                          <div className="ao-modal-body">
                            {(row.cadavers ?? []).map(cd => (
                              <div key={cd.id} className="ao-cadaver-card">
                                <div className="ao-cadaver-grid">
                                  {Object.entries(cd).map(([k, v]) => {
                                    // Hide ids/noise in modal unless useful
                                    if (["id", "user_id", "order_id"].includes(k)) return null;
                                    const nice = CADAVER_LABELS[k] || k;
                                    const val = v === null || v === undefined || v === "" ? "—" : String(v);
                                    return (
                                      <div key={k} className="cadaver-field">
                                        <span className="ao-k">{nice}</span>
                                        <span className="ao-v">{val}</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="ao-files">
                                  {cd.death_certificate_url && (
                                    <a className="ao-filelink" href={cd.death_certificate_url} target="_blank" rel="noreferrer">
                                      Death certificate <FaExternalLinkAlt />
                                    </a>
                                  )}
                                  {cd.claimant_id_url && (
                                    <a className="ao-filelink" href={cd.claimant_id_url} target="_blank" rel="noreferrer">
                                      Claimant ID <FaExternalLinkAlt />
                                    </a>
                                  )}
                                  {cd.permit_url && (
                                    <a className="ao-filelink" href={cd.permit_url} target="_blank" rel="noreferrer">
                                      Permit <FaExternalLinkAlt />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(row.cadavers?.length ?? 0) === 0 && <div className="ao-empty">No cadaver details linked.</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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
