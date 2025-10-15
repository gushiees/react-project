// src/pages/product/productdetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./productdetail.css";
import { fetchProductById } from "../../data/products.jsx";
import { useCart } from "../../contexts/cartContext.jsx";
import ChatBot from "../../components/Chatbot/Chatbot";

function php(amount) {
  const numericAmount = Number(amount) || 0;
  return "₱" + numericAmount.toLocaleString("en-PH");
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [hoverImage, setHoverImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductById(id);

        if (data) {
          setProduct(data);
          setSelectedImage(data.image_url);
          if (data.stock_quantity < 1) {
            setQuantity(0);
          } else {
            setQuantity(1);
          }
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

  const galleryImages = product
    ? [{ id: "main", url: product.image_url }, ...(product.product_images || [])]
    : [];

  const handleQuantityChange = (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) value = 1;

    if (product && value > product.stock_quantity) {
      value = product.stock_quantity;
    }
    if (value < 1) value = 1;

    setQuantity(value);
  };

  const handleAddToCart = () => {
    const success = addToCart(product, quantity);
    if (success !== false) {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="product-detail container">
          <p>Loading product...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="product-detail container">
          <h2 className="error-message">{error}</h2>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="product-detail container">
          <p>Product not found.</p>
        </main>
        <Footer />
      </>
    );
  }

  const isOutOfStock = product.stock_quantity === 0;

  return (
    <>
      <Header />
      <main
        className="product-detail container"
        style={{ paddingTop: "32px", paddingBottom: "48px" }}
      >
        {/* Left: Gallery */}
        <div className="product-detail__image">
          <img src={hoverImage || selectedImage} alt={product.name} />
          <div className="product-detail__thumbs">
            {galleryImages.map((img) => (
              <div
                key={img.id}
                className="thumb"
                onClick={() => {
                  setSelectedImage(img.url);
                  setHoverImage(null);
                }}
                onMouseEnter={() => setHoverImage(img.url)}
                onMouseLeave={() => setHoverImage(null)}
                style={{ backgroundImage: `url(${img.url})` }}
              />
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="product-detail__info">
          {/* Title */}
          <h1 className="product-title">{product.name}</h1>

          {/* Description */}
          <p className="product-desc">{product.description}</p>

          {/* Pricing */}
          <h2 className="section-title">Pricing</h2>
          <div className="price-display">
            <span className="price-label">Total Price:</span>
            <span className="price-value">{php(product.price)}</span>
          </div>
          <div className="price-display monthly">
            <span className="price-label">
              or {php(product.price / 12)} / month (1 year)
            </span>
          </div>

          {/* Quantity + Buttons */}
          <div className="quantity">
            <label htmlFor="qty">Quantity: </label>
            <input
              id="qty"
              type="number"
              value={isOutOfStock ? 0 : quantity}
              onChange={handleQuantityChange}
              min="1"
              max={product.stock_quantity}
              disabled={isOutOfStock}
            />
            {isOutOfStock && <span className="stock-status">Out of Stock</span>}
            {!isOutOfStock && (
              <p className="stock-count">
                Available stocks: {product.stock_quantity}
              </p>
            )}
            {quantity === product.stock_quantity && !isOutOfStock && (
              <span className="stock-status max-stock">(Max)</span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <button
              className="btn-cart"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
            <Link to="/catalog" className="btn-back">
              ← Back to Catalog
            </Link>
          </div>
        </div>
      </main>

      <ChatBot />
      <Footer />

      {/* Toast */}
      {showPopup && (
        <div className="cart-popup">
          <p>Item added to cart! ✅</p>
        </div>
      )}
    </>
  );
}
