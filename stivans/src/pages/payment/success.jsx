import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { supabase } from "../../supabaseClient";
import "./payment.css";

function php(n) {
  const v = Number(n) || 0;
  return "₱" + v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [status, setStatus] = useState("pending"); // pending | paid | cancelled | unknown
  const [order, setOrder] = useState(null);

  // Poll order status for a few seconds (in case webhook is a bit delayed)
  useEffect(() => {
    let tries = 0;
    let stop = false;

    async function tick() {
      tries++;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (!error && data) {
        setOrder(data);
        setStatus(data.status || "unknown");
        if (data.status === "paid" || data.status === "cancelled") return; // stop
      }
      if (!stop && tries < 10) setTimeout(tick, 2000);
    }

    if (orderId) tick();
    return () => { stop = true; };
  }, [orderId]);

  return (
    <>
      <Header />
      <main className="pay-shell">
        <div className="pay-card">
          {status === "paid" ? (
            <>
              <h1>Payment Successful 🎉</h1>
              <p>Your order has been paid. Thank you!</p>
              {order && (
                <div className="pay-summary">
                  <div><span>Order</span><strong>#{String(order.id).slice(0,8)}</strong></div>
                  <div><span>Total</span><strong>{php(order.total ?? order.total_price ?? 0)}</strong></div>
                  <div><span>Status</span><strong>{order.status}</strong></div>
                </div>
              )}
              <div className="pay-actions">
                <Link to="/profile" className="btn primary">View Orders</Link>
                <Link to="/" className="btn ghost">Back to Home</Link>
              </div>
            </>
          ) : status === "cancelled" ? (
            <>
              <h1>Payment Cancelled</h1>
              <p>Your order was marked cancelled. You can place a new order anytime.</p>
              <div className="pay-actions">
                <Link to="/catalog" className="btn ghost">Shop Again</Link>
                <Link to="/" className="btn">Home</Link>
              </div>
            </>
          ) : (
            <>
              <h1>Processing Payment…</h1>
              <p>We’re confirming your payment. This may take a few seconds.</p>
              <div className="spinner" style={{ marginTop: 10 }} />
              <div className="pay-actions" style={{ marginTop: 16 }}>
                <Link to="/profile" className="btn">Go to Profile</Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
