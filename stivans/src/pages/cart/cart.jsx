import React from "react";
import { useNavigate } from "react-router-dom";
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
  const { cart, updateQuantity, removeFromCart, clearCart, isLoading } = useCart();
  const navigate = useNavigate();

  // Show a loading state while the cart is being fetched
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

  // Calculate cart totals
  const totalProducts = cart.length;
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.12;
  const shipping = subtotal > 2000 ? 0 : 150;
  const total = subtotal + tax + shipping;
  
  // Function to navigate to product details using the /catalog route
  const handleGoToProductDetails = (productId) => {
    navigate(`/catalog/${productId}`);
  };

  return (
    <>
      <Header />
      <div className="cart-page-container">
        <h1>Your Shopping Cart</h1>
        {cart.length > 0 && (
          <p className="cart-item-count">
            You have {totalProducts} items in your cart.
          </p>
        )}

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
                  {/* Make the image and details clickable */}
                  <div
                    className="product-link"
                    onClick={() => handleGoToProductDetails(item.product.id)}
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
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1} // Disable when quantity is 1
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.product.stock_quantity}
                      >
                        +
                      </button>
                    </div>
                    {item.product.stock_quantity <= 5 &&
                      item.product.stock_quantity > 0 && (
                        <p className="stock-warning">
                          Only {item.product.stock_quantity} left in stock!
                        </p>
                      )}
                    {item.product.stock_quantity === 0 && (
                      <p className="stock-warning out-of-stock-text">
                        Out of Stock!
                      </p>
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
                <button className="checkout-btn" onClick={null}>
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
};

export default Cart;