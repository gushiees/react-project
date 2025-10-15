import { Link, useSearchParams } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./payment.css";

export default function PaymentFailed() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");

  return (
    <>
      <Header />
      <main className="pay-shell">
        <div className="pay-card">
          <h1>Payment Failed</h1>
          <p>Something went wrong. Your order may still be pending or cancelled.</p>
          {orderId && <p>Order: <strong>#{String(orderId).slice(0,8)}</strong></p>}
          <div className="pay-actions">
            <Link to="/profile" className="btn primary">View Orders</Link>
            <Link to="/catalog" className="btn ghost">Back to Catalog</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
