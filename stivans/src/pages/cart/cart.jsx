import React from "react";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { useCart } from "../../contexts/cartContext";
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

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();

  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.12;
  const shipping = subtotal > 2000 ? 0 : 150;
  const total = subtotal + tax + shipping;

  return (
    <>
      <Header />
      <div className="cart-page-container">
        <h1>Your Shopping Cart</h1>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is currently empty.</p>
            <a href="/catalog">
              <button className="continue-btn">Continue Shopping</button>
            </a>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.product.id}>
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="cart-item-image"
                  />
                  <div className="cart-item-details">
                    <h3>{item.product.name}</h3>
                    <p>{php(item.product.price)}</p>
                    <div className="quantity-controls">
                      {/* Decrease button logic */}
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      {/* Increase button logic */}
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.product.stock_quantity}
                      >
                        +
                      </button>
                    </div>
                    {/* Display available stocks */}
                    {item.product.stock_quantity <= 5 &&
                      item.product.stock_quantity > 0 && (
                        <p className="stock-warning">
                          Only {item.product.stock_quantity} left in stock!
                        </p>
                      )}
                    <p className="item-subtotal">
                      Subtotal: {php(item.product.price * item.quantity)}
                    </p>
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

            <div className="cart-summary">
              <h2>Order Summary</h2>
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
                <a href="/catalog">
                  <button className="continue-btn">Continue Shopping</button>
                </a>
                <button className="checkout-btn">Proceed to Checkout</button>
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
};

export default Cart;