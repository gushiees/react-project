import React, { useState } from "react";
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

  // New state to manage selected items for checkout
  const [selectedItems, setSelectedItems] = useState([]);

  // Handler for the checkbox
  const handleToggleSelect = (productId) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter((id) => id !== productId));
    } else {
      setSelectedItems([...selectedItems, productId]);
    }
  };

  // Filter the cart to get only the selected items
  const selectedCartItems = cart.filter((item) =>
    selectedItems.includes(item.product.id)
  );

  // Calculate cart totals based on selected items
  const subtotal = selectedCartItems.reduce(
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
  
  // Function to handle checkout for selected items
  const handleCheckoutSelected = () => {
    // Implement your checkout logic here using `selectedCartItems`
    if (selectedCartItems.length > 0) {
      console.log("Proceeding to checkout with:", selectedCartItems);
      // Example: call an API or navigate to a checkout page
      // navigate('/checkout', { state: { items: selectedCartItems } });
    }
  };

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

  return (
    <>
      <Header />
      <div className="cart-page-container">
        <h1>Your Shopping Cart</h1>
        {cart.length > 0 && (
          <p className="cart-item-count">
            You have {cart.length} items in your cart.
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
                  <input
                    type="checkbox"
                    className="select-item-checkbox"
                    checked={selectedItems.includes(item.product.id)}
                    onChange={() => handleToggleSelect(item.product.id)}
                  />
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
                        disabled={item.quantity <= 1}
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
                <a href="/catalog">
                  <button className="continue-btn">Continue Shopping</button>
                </a>
                <button
                  className="checkout-btn"
                  onClick={handleCheckoutSelected}
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
};

export default Cart;