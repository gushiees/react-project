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

  // orders state (lazy)
  const [showOrders, setShowOrders] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoadedOnce, setOrdersLoadedOnce] = useState(false);

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

  const ordersCount = useMemo(() => orders.length, [orders]);

  const fetchPastOrders = async () => {
    try {
      setOrdersErr("");
      setOrdersLoading(true);
      const { data: sessionData, error: sErr } = await supabase.auth.getUser();
      if (sErr || !sessionData?.user) throw new Error("You must be signed in to view orders.");

      const { data, error } = await supabase
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
        .eq("user_id", sessionData.user.id)
        .eq("status", "paid")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      setOrdersLoadedOnce(true);
    } catch (e) {
      console.error(e);
      setOrdersErr(e.message || "Failed to load past orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleToggleOrders = () => {
    setShowOrders((s) => !s);
    if (!ordersLoadedOnce) fetchPastOrders();
  };

  return (
    <div className="pf-shell">
      {/* Header bar */}
      <div className="pf-hero">
        <div className="pf-hero-inner">
          <h1>My Profile</h1>
          <p>Manage your details and browse your past orders.</p>
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

                  <div className="pf-cta">
                    <button className="btn primary" onClick={handleToggleOrders}>
                      {showOrders ? "Hide Past Orders" : "View Past Orders"}
                    </button>
                  </div>

                  <div className="pf-stats">
                    <div className="stat">
                      <div className="stat-num">{ordersLoadedOnce ? ordersCount : "—"}</div>
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

        {/* Right column: Orders */}
        <main className="pf-right">
          <div className="pf-section">
            <h2>Activity</h2>
            <div className="pf-sub">Track your purchase history and invoices.</div>

            {showOrders && (
              <div className="pf-orders">
                {ordersLoading && <div className="spinner">Loading past orders…</div>}
                {ordersErr && <div className="pf-alert pf-err">{ordersErr}</div>}

                {!ordersLoading && !ordersErr && orders.length === 0 && (
                  <div className="pf-blank">
                    <div className="pf-blank-ill">🧾</div>
                    <div className="pf-blank-title">No paid orders (yet)</div>
                    <div className="pf-blank-sub">
                      Once you complete a checkout, receipts and order items will show up here.
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
