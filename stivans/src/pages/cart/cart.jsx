import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { useCart } from "../../contexts/cartContext";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";
import "./cart.css";

function php(amount) {
  const n = Number(amount) || 0;
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, isLoading } = useCart();
  const navigate = useNavigate();

  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // prevent double clicks

  const handleToggleSelect = (productId) => {
    setSelectedItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const selectedCartItems = cart.filter((item) => selectedItems.includes(item.product.id));

  const subtotal = selectedCartItems.reduce(
    (acc, item) => acc + Number(item.product.price) * Number(item.quantity),
    0
  );
  const tax = subtotal * 0.12;
  const shipping = subtotal > 2000 ? 0 : 150;
  const total = subtotal + tax + shipping;

  const handleGoToProductDetails = (productId) => navigate(`/catalog/${productId}`);

  // fallback payload (old flow) if needed
  const serializeForCheckout = (items) =>
    items.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      quantity,
    }));

  // session-scoped idempotency key so one click = one order
  function getIdempotencyKey() {
    let key = sessionStorage.getItem("pending.idem");
    if (!key) {
      key = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("pending.idem", key);
    }
    return key;
  }

  // >>> ONLY CHANGED THIS FUNCTION <<<
  const handleCheckoutSelected = async () => {
    if (isSubmitting) return;
    try {
      if (selectedCartItems.length === 0) {
        toast.error("Select at least one item.");
        return;
      }
      setIsSubmitting(true);

      // Build exactly what /checkout expects
      const payload = serializeForCheckout(selectedCartItems);

      // Persist so refresh/back still works
      sessionStorage.setItem("checkout.items", JSON.stringify(payload));

      // Clear any previous temp key (optional safety)
      sessionStorage.removeItem("pending.idem");

      // Redirect to the dedicated checkout page with only the selected items
      navigate("/checkout", { state: { items: payload } });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to go to checkout");
    } finally {
      setTimeout(() => setIsSubmitting(false), 400);
    }
  };
  // >>> END OF CHANGE <<<

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="cart-page-container"><p>Loading your cart...</p></div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="cart-page-container">
        <h1>Your Shopping Cart</h1>

        {cart.length > 0 && <p className="cart-item-count">You have {cart.length} items in your cart.</p>}

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is currently empty.</p>
            <Link to="/catalog"><button className="continue-btn">Continue Shopping</button></Link>
          </div>
        ) : (
          <div className="cart-content">
            {/* Items */}
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.product.id}>
                  <input
                    type="checkbox"
                    className="select-item-checkbox"
                    checked={selectedItems.includes(item.product.id)}
                    onChange={() => handleToggleSelect(item.product.id)}
                    title="Select item"
                  />

                  <div
                    className="product-link"
                    onClick={() => handleGoToProductDetails(item.product.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleGoToProductDetails(item.product.id)}
                  >
                    <img src={item.product.image_url} alt={item.product.name} className="cart-item-image" />
                    <div className="cart-item-details">
                      <h3>{item.product.name}</h3>
                      <p>{php(item.product.price)}</p>
                    </div>
                  </div>

                  <div className="quantity-and-actions">
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock_quantity}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {item.product.stock_quantity <= 5 && item.product.stock_quantity > 0 && (
                      <p className="stock-warning">Only {item.product.stock_quantity} left in stock!</p>
                    )}
                    {item.product.stock_quantity === 0 && (
                      <p className="stock-warning out-of-stock-text">Out of Stock!</p>
                    )}

                    <button className="remove-btn" onClick={() => removeFromCart(item.product.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row"><span>Items Selected</span><span>{selectedCartItems.length}</span></div>
              <div className="summary-row"><span>Subtotal</span><span>{php(subtotal)}</span></div>
              <div className="summary-row"><span>Tax (12%)</span><span>{php(tax)}</span></div>
              <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? "Free" : php(shipping)}</span></div>
              <div className="summary-total"><strong>Total</strong><strong>{php(total)}</strong></div>

              <div className="cart-actions">
                <Link to="/catalog"><button className="continue-btn">Continue Shopping</button></Link>
                <button
                  className="checkout-btn"
                  onClick={handleCheckoutSelected}
                  disabled={selectedItems.length === 0 || isSubmitting}
                >
                  {isSubmitting ? "Processing…" : "Proceed to Checkout"}
                </button>
                <button className="clear-btn" onClick={clearCart}>Clear Cart</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
