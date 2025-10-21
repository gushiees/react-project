// src/pages/product/productdetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/header/header.jsx";
import Footer from "../../components/footer/footer.jsx";
import "./productdetail.css";
import { fetchProductById } from "../../data/products.jsx";
import { useCart } from "../../contexts/cartContext.jsx";
import ChatBot from "../../components/Chatbot/Chatbot.jsx";
import toast from 'react-hot-toast'; // Using react-hot-toast for notifications

function php(amount) {
  const numericAmount = Number(amount) || 0;
  // Format with peso sign and two decimal places
  return "₱" + numericAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductById(id);

        if (data) {
          setProduct(data);
          // Set the main product image as the initially selected one
          setSelectedImage(data.image_url);
          // Set initial quantity based on stock
          setQuantity(data.stock_quantity > 0 ? 1 : 0);
        } else {
          setError("Product not found.");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Consolidate all product images into a single gallery array
  const galleryImages = product
    ? [product.image_url, ...(product.product_images?.map(img => img.url) || [])].filter(Boolean)
    : [];

  const handleQuantityChange = (e) => {
    let value = parseInt(e.target.value, 10);
    // Default to 1 if input is invalid or empty
    if (isNaN(value) || value < 1) {
      value = 1;
    }
    // Cap the quantity at the available stock
    if (product && value > product.stock_quantity) {
      value = product.stock_quantity;
    }
    setQuantity(value);
  };
  
  const incrementQuantity = () => {
    setQuantity(q => Math.min(q + 1, product.stock_quantity));
  };
  
  const decrementQuantity = () => {
    setQuantity(q => Math.max(1, q - 1));
  };

  const handleAddToCart = () => {
    // Attempt to add to cart and show a toast notification on success
    const success = addToCart(product, quantity);
    if (success !== false) {
      toast.success(`${quantity} x ${product.name} added to cart!`);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pd-container pd-loading">
          <p>Loading product details...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="pd-container pd-error">
          <h2 className="error-message">{error}</h2>
          <Link to="/catalog" className="pd-back-link">← Go back to Catalog</Link>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return null; // Or a more specific "Not Found" component
  }
  
  const isOutOfStock = product.stock_quantity === 0;

  return (
    <>
      <Header />
      <main className="pd-container">
        <div className="pd-grid">
          {/* LEFT: Image Gallery */}
          <div className="pd-gallery">
            <div className="pd-main-image">
              <img src={selectedImage} alt={product.name} />
            </div>
            <div className="pd-thumbnails">
              {galleryImages.map((imgUrl, index) => (
                <button
                  key={index}
                  className={`pd-thumb ${imgUrl === selectedImage ? 'active' : ''}`}
                  onClick={() => setSelectedImage(imgUrl)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Product Information */}
          <div className="pd-info">
            <h1 className="pd-title">{product.name}</h1>
            <p className="pd-description">{product.description}</p>
            
            <div className="pd-section">
              <h2 className="pd-section-title">Pricing</h2>
              <div className="pd-price-main">{php(product.price)}</div>
              <div className="pd-price-monthly">
                or <strong>{php(product.price / 12)}</strong> / month (for 1 year)
              </div>
            </div>

            <div className="pd-section">
               <h2 className="pd-section-title">Quantity</h2>
               <div className="pd-quantity-control">
                  <button onClick={decrementQuantity} disabled={isOutOfStock || quantity <= 1}>-</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    min="1"
                    max={product.stock_quantity}
                    disabled={isOutOfStock}
                    aria-label="Quantity"
                  />
                  <button onClick={incrementQuantity} disabled={isOutOfStock || quantity >= product.stock_quantity}>+</button>
               </div>
               {isOutOfStock ? (
                  <p className="pd-stock-status out-of-stock">Out of Stock</p>
               ) : (
                  <p className="pd-stock-status">
                    {product.stock_quantity} available
                  </p>
               )}
            </div>
            
            <div className="pd-actions">
              <button
                className="pd-add-to-cart-btn"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
              <Link to="/catalog" className="pd-back-link">
                ← Back to Catalog
              </Link>
            </div>
          </div>
        </div>
      </main>
      <ChatBot />
      <Footer />
    </>
  );
}

