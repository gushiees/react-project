import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./receipt.css";

function php(n) {
  const v = Number(n) || 0;
  return "₱" + v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderReceipt() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in.");

        const { data, error } = await supabase
          .from("orders")
          .select(`
            id, created_at, status, subtotal, tax, shipping, total, total_price, xendit_invoice_id,
            order_items (
              id, quantity, unit_price, price, image_url,
              product:products ( name, image_url )
            )
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Unable to load receipt");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="rc-wrap"><p>Loading…</p></main>
        <Footer />
      </>
    );
  }

  if (err || !order) {
    return (
      <>
        <Header />
        <main className="rc-wrap">
          <div className="rc-card">
            <h1>Receipt</h1>
            <p className="rc-err">{err || "Order not found."}</p>
            <Link to="/profile" className="rc-link">Back to Profile</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const total = order.total ?? order.total_price ?? 0;

  return (
    <>
      <Header />
      <main className="rc-wrap">
        <div className="rc-card">
          <div className="rc-head">
            <div>
              <h1>Receipt</h1>
              <div className="rc-sub">
                Order #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
            <span className={`badge ${order.status}`}>{order.status}</span>
          </div>

          <div className="rc-items">
            {order.order_items?.map((it) => {
              const name = it.product?.name ?? "Product";
              const img = it.product?.image_url ?? it.image_url ?? "";
              const unit = it.unit_price ?? it.price ?? 0;
              return (
                <div className="rc-item" key={it.id}>
                  {img ? <img src={img} alt={name} /> : <div className="rc-ph" />}
                  <div className="rc-meta">
                    <div className="rc-name">{name}</div>
                    <div className="rc-subt">Qty {it.quantity} • {php(unit)}</div>
                  </div>
                  <div className="rc-line-total">{php(unit * it.quantity)}</div>
                </div>
              );
            })}
          </div>

          <div className="rc-totals">
            <div><span>Subtotal</span><strong>{php(order.subtotal)}</strong></div>
            <div><span>Tax</span><strong>{php(order.tax)}</strong></div>
            <div><span>Shipping</span><strong>{php(order.shipping)}</strong></div>
            <div className="rc-total"><span>Total</span><strong>{php(total)}</strong></div>
          </div>

          <div className="rc-actions">
            <Link to="/profile" className="btn ghost">Back to Profile</Link>
            {order.xendit_invoice_id && (
              <a
                className="btn ghost"
                href={`https://dashboard.xendit.co/invoices/${order.xendit_invoice_id}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Xendit
              </a>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
