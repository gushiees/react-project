import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { useCart } from "../../contexts/cartContext";
import { supabase } from "../../supabaseClient";            // ⬅️ NEW
import toast from "react-hot-toast";                        // ⬅️ NEW
import "./cart.css";

function php(amount) {
  const numericAmount = Number(amount) || 0;
  return (
    "₱" +
    numericAmount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, isLoading } = useCart();
  const navigate = useNavigate();

  // Track which product IDs are selected
  const [selectedItems, setSelectedItems] = useState([]);

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

  const handleGoToProductDetails = (productId) => {
    navigate(`/catalog/${productId}`);
  };

  // Keep only the fields Checkout needs
  const serializeForCheckout = (items) =>
    items.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      quantity,
    }));

  // ⬇️ UPDATED: Instead of navigating to /checkout, create the invoice directly
  const handleCheckoutSelected = async () => {
    try {
      if (selectedCartItems.length === 0) {
        toast.error("Select at least one item.");
        return;
      }

      // 1) Build robust items payload (matches Edge Function expectations)
      const itemsPayload = selectedCartItems.map((it) => ({
        product_id: it.product.id,                              // product_id
        quantity: Number(it.quantity ?? 1),                     // quantity
        unit_price: Number(it.product.price ?? 0),              // unit_price
      }));

      // 2) Build totals payload
      const body = {
        items: itemsPayload,
        subtotal: Number(subtotal),
        tax: Number(tax),
        shipping: Number(shipping),
        total: Number(total),
        order_tag: `order_pending_${Date.now()}`,               // optional tag
        cadaver_details_id: null,                               // set to your ID if you capture it earlier
      };

      // 3) Call the Supabase Edge Function (auto-sends the user JWT)
      const { data, error } = await supabase.functions.invoke("create-invoice", { body });
      if (error) {
        // Fallback to old flow so you’re never blocked
        console.error("create-invoice error:", error);
        toast.error("Invoice error, redirecting to checkout…");
        const payload = serializeForCheckout(selectedCartItems);
        sessionStorage.setItem("checkout.items", JSON.stringify(payload));
        navigate("/checkout", { state: { items: payload } });
        return;
      }

      // 4) Go to Xendit hosted invoice
      if (data?.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        // Safety fallback
        const payload = serializeForCheckout(selectedCartItems);
        sessionStorage.setItem("checkout.items", JSON.stringify(payload));
        navigate("/checkout", { state: { items: payload } });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create invoice");
      // Safety fallback to old flow
      const payload = serializeForCheckout(selectedCartItems);
      sessionStorage.setItem("checkout.items", JSON.stringify(payload));
      navigate("/checkout", { state: { items: payload } });
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="cart-page-container">
          <p>Loading your cart...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="cart-page-container">
        <h1>Your Shopping Cart</h1>

        {cart.length > 0 && (
          <p className="cart-item-count">You have {cart.length} items in your cart.</p>
        )}

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is currently empty.</p>
            <Link to="/catalog">
              <button className="continue-btn">Continue Shopping</button>
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            {/* Left: Items */}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGoToProductDetails(item.product.id);
                    }}
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="cart-item-image"
                    />
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
                      <p className="stock-warning">
                        Only {item.product.stock_quantity} left in stock!
                      </p>
                    )}
                    {item.product.stock_quantity === 0 && (
                      <p className="stock-warning out-of-stock-text">Out of Stock!</p>
                    )}

                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Summary */}
            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Items Selected</span>
                <span>{selectedCartItems.length}</span>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{php(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (12%)</span>
                <span>{php(tax)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : php(shipping)}</span>
              </div>
              <div className="summary-total">
                <strong>Total</strong>
                <strong>{php(total)}</strong>
              </div>

              <div className="cart-actions">
                <Link to="/catalog">
                  <button className="continue-btn">Continue Shopping</button>
                </Link>

                <button
                  className="checkout-btn"
                  onClick={handleCheckoutSelected}        // ⬅️ calls the function above
                  disabled={selectedItems.length === 0}
                >
                  Proceed to Checkout
                </button>

                <button className="clear-btn" onClick={clearCart}>
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
