import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./profilecontent.css";

function php(n) {
  const v = Number(n) || 0;
  return "₱" + v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProfileContent() {
  // profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profileErr, setProfileErr] = useState("");

  // view state
  const [activeTab, setActiveTab] = useState("overview"); // overview | orders | activity

  // orders state (lazy)
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoadedOnce, setOrdersLoadedOnce] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState("paid"); // paid | all

  // activity state (lazy)
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityErr, setActivityErr] = useState("");
  const [activity, setActivity] = useState([]);
  const [activityLoadedOnce, setActivityLoadedOnce] = useState(false);

  // ---- Load profile ----
  useEffect(() => {
    (async () => {
      try {
        setProfileErr("");
        setProfileLoading(true);
        const { data: sessionData, error: sErr } = await supabase.auth.getUser();
        if (sErr) throw sErr;
        const authUser = sessionData?.user;
        if (!authUser) {
          setProfileErr("You are not signed in.");
          return;
        }
        const { data: profileRow, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (pErr && pErr.code !== "PGRST116") throw pErr;

        setUser({
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          full_name: profileRow?.full_name || "",
          phone_number: profileRow?.phone_number || "",
          role: profileRow?.role || "user",
        });
      } catch (e) {
        console.error(e);
        setProfileErr(e.message || "Failed to load profile.");
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  const paidOrdersCount = useMemo(
    () => orders.filter(o => o.status === "paid").length,
    [orders]
  );

  // ---- Load orders ----
  const fetchOrders = async (mode = ordersFilter) => {
    if (!user) return;
    try {
      setOrdersErr("");
      setOrdersLoading(true);

      let query = supabase
        .from("orders")
        .select(
          `
            id, created_at, status, subtotal, tax, shipping, total, total_price, xendit_invoice_id,
            order_items (
              id, quantity, unit_price, price, image_url,
              product:products ( name, image_url )
            )
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (mode === "paid") query = query.eq("status", "paid");

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
      setOrdersLoadedOnce(true);
    } catch (e) {
      console.error(e);
      setOrdersErr(e.message || "Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  // ---- Load activity (payments + order status history-lite) ----
  const fetchActivity = async () => {
    if (!user) return;
    try {
      setActivityErr("");
      setActivityLoading(true);

      // 1) Get this user's order IDs
      const { data: myOrders, error: oErr } = await supabase
        .from("orders")
        .select("id, created_at, status, total, total_price")
        .eq("user_id", user.id);

      if (oErr) throw oErr;
      const orderIds = (myOrders || []).map(o => o.id);
      if (orderIds.length === 0) {
        setActivity([]);
        setActivityLoadedOnce(true);
        return;
      }

      // 2) Get payments for those orders
      const { data: pays, error: pErr } = await supabase
        .from("payments")
        .select("id, order_id, provider, provider_event, amount, currency, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      // 3) Flatten into a timeline: combine payments + pseudo "order.created/updated" milestones
      const items = [];

      // add payment events
      for (const p of pays || []) {
        items.push({
          type: "payment",
          ts: p.created_at,
          order_id: p.order_id,
          title: p.provider_event?.toUpperCase?.() || "PAYMENT_EVENT",
          detail: `${p.provider?.toUpperCase?.() || "XENDIT"} • ${php(p.amount)} ${p.currency || "PHP"}`
        });
      }

      // add order milestones (created + if status paid/cancelled/failed, a status marker)
      for (const o of myOrders || []) {
        items.push({
          type: "order",
          ts: o.created_at,
          order_id: o.id,
          title: "ORDER_PLACED",
          detail: `Order submitted • Total ${php(o.total ?? o.total_price ?? 0)}`
        });
        if (o.status && o.status !== "pending") {
          items.push({
            type: "order",
            ts: o.created_at, // we don't have per-status timestamps; use created_at as coarse signal
            order_id: o.id,
            title: `STATUS_${o.status.toUpperCase()}`,
            detail: `Order marked ${o.status}`
          });
        }
      }

      // sort newest first
      items.sort((a, b) => new Date(b.ts) - new Date(a.ts));

      setActivity(items);
      setActivityLoadedOnce(true);
    } catch (e) {
      console.error(e);
      setActivityErr(e.message || "Failed to load activity.");
    } finally {
      setActivityLoading(false);
    }
  };

  // lazy-load the tab data once
  useEffect(() => {
    if (!user) return;
    if (activeTab === "orders" && !ordersLoadedOnce) {
      fetchOrders();
    } else if (activeTab === "activity" && !activityLoadedOnce) {
      fetchActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  // UI bits
  const OrdersList = () => (
    <div className="pf-orders">
      <div className="pf-toolbar">
        <div className="pf-tabs small">
          <button
            className={ordersFilter === "paid" ? "tab active" : "tab"}
            onClick={() => {
              setOrdersFilter("paid");
              fetchOrders("paid");
            }}
          >
            Paid Only
          </button>
        </div>
        <div className="pf-sep" />
        <button
          className={ordersFilter === "all" ? "btn ghost active" : "btn ghost"}
          onClick={() => {
            setOrdersFilter("all");
            fetchOrders("all");
          }}
        >
          Show All
        </button>
      </div>

      {ordersLoading && <div className="spinner">Loading orders…</div>}
      {ordersErr && <div className="pf-alert pf-err">{ordersErr}</div>}

      {!ordersLoading && !ordersErr && orders.length === 0 && (
        <div className="pf-blank">
          <div className="pf-blank-ill">🧾</div>
          <div className="pf-blank-title">No orders to show</div>
          <div className="pf-blank-sub">
            You’ll see your receipts and products here once you’ve completed a checkout.
          </div>
        </div>
      )}

      {!ordersLoading && orders.length > 0 && (
        <div className="order-grid">
          {orders.map((o) => {
            const orderTotal = o.total ?? o.total_price ?? 0;
            return (
              <article className="order-card" key={o.id}>
                <header className="order-head">
                  <div>
                    <div className="order-id">Order #{o.id.slice(0, 8)}</div>
                    <div className="order-date">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`badge ${o.status}`}>{o.status}</span>
                </header>

                <div className="order-items">
                  {o.order_items?.slice(0, 3).map((it) => {
                    const name = it.product?.name ?? "Product";
                    const img = it.product?.image_url ?? it.image_url ?? "";
                    const unit = it.unit_price ?? it.price ?? 0;
                    return (
                      <div className="oi" key={it.id} title={name}>
                        {img ? <img src={img} alt={name} /> : <div className="oi-ph" />}
                        <div className="oi-meta">
                          <div className="oi-name">{name}</div>
                          <div className="oi-sub">Qty {it.quantity} • {php(unit)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {o.order_items?.length > 3 && (
                    <div className="more">+{o.order_items.length - 3} more</div>
                  )}
                </div>

                <footer className="order-foot">
                  <div className="tally">
                    <div><span>Subtotal</span><strong>{php(o.subtotal)}</strong></div>
                    <div><span>Tax</span><strong>{php(o.tax)}</strong></div>
                    <div><span>Shipping</span><strong>{php(o.shipping)}</strong></div>
                    <div className="total"><span>Total</span><strong>{php(orderTotal)}</strong></div>
                  </div>

                  {o.xendit_invoice_id && (
                    <a
                      className="btn ghost"
                      href={`https://dashboard.xendit.co/invoices/${o.xendit_invoice_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Invoice
                    </a>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const ActivityTimeline = () => (
    <div className="pf-activity">
      {activityLoading && <div className="spinner">Loading activity…</div>}
      {activityErr && <div className="pf-alert pf-err">{activityErr}</div>}

      {!activityLoading && !activityErr && activity.length === 0 && (
        <div className="pf-blank">
          <div className="pf-blank-ill">📜</div>
          <div className="pf-blank-title">No activity (yet)</div>
          <div className="pf-blank-sub">Your payment and order timeline will appear here.</div>
        </div>
      )}

      {!activityLoading && activity.length > 0 && (
        <ul className="timeline">
          {activity.map((a, i) => (
            <li key={i} className={`tl-item ${a.type}`}>
              <div className="tl-dot" />
              <div className="tl-content">
                <div className="tl-top">
                  <span className="tl-title">{a.title.replaceAll("_", " ")}</span>
                  <span className="tl-time">{new Date(a.ts).toLocaleString()}</span>
                </div>
                <div className="tl-sub">{a.detail}</div>
                <div className="tl-meta">Order #{String(a.order_id).slice(0, 8)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="pf-shell">
      {/* Header bar */}
      <div className="pf-hero">
        <div className="pf-hero-inner">
          <h1>My Profile</h1>
          <p>Manage your details and browse your history.</p>
        </div>
      </div>

      <div className="pf-grid">
        {/* Left column: Profile card */}
        <aside className="pf-left">
          {profileLoading ? (
            <div className="pf-card skel" />
          ) : (
            <div className="pf-card">
              {profileErr && <div className="pf-alert pf-err">{profileErr}</div>}

              {user && (
                <>
                  <div className="pf-avatar">
                    {(user.full_name || user.email || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="pf-name">{user.full_name || "Unnamed User"}</div>
                  <div className="pf-email">{user.email}</div>

                  <div className="pf-chips">
                    <span className="chip blue">{user.role}</span>
                    <span className="chip">Member since {new Date(user.created_at).toLocaleDateString()}</span>
                    {user.phone_number && <span className="chip">☎ {user.phone_number}</span>}
                  </div>

                  <div className="pf-stats">
                    <div className="stat">
                      <div className="stat-num">
                        {ordersLoadedOnce ? paidOrdersCount : "—"}
                      </div>
                      <div className="stat-label">Paid orders</div>
                    </div>
                    <div className="stat">
                      <div className="stat-num">₱</div>
                      <div className="stat-label">Secure Payments</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </aside>

        {/* Right column: Tabs + contents */}
        <main className="pf-right">
          <div className="pf-section">
            <div className="pf-tabs">
              <button
                className={activeTab === "overview" ? "tab active" : "tab"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={activeTab === "orders" ? "tab active" : "tab"}
                onClick={() => setActiveTab("orders")}
              >
                Past Orders
              </button>
              <button
                className={activeTab === "activity" ? "tab active" : "tab"}
                onClick={() => setActiveTab("activity")}
              >
                Activity
              </button>
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="pf-overview">
                <div className="pf-card soft">
                  <h3>Welcome back{user?.full_name ? `, ${user.full_name}` : ""}.</h3>
                  <p className="pf-sub">
                    Use the tabs above to view receipts, payment activity, and more.
                  </p>
                </div>
              </div>
            )}

            {/* Orders */}
            {activeTab === "orders" && <OrdersList />}

            {/* Activity */}
            {activeTab === "activity" && <ActivityTimeline />}
          </div>
        </main>
      </div>
    </div>
  );
}
