import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./productdetail.css";
import { fetchProductById } from "../../data/products.jsx";

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

  const galleryImages = product ? [
    { id: 'main', url: product.image_url }, 
    ...(product.product_images || [])
  ] : [];

  const handleQuantityChange = (e) => {
    let value = parseInt(e.target.value, 10);
    
    if (isNaN(value)) {
      value = 1; 
    }
    
    if (product && value > product.stock_quantity) {
      value = product.stock_quantity;
    }

    if (value < 1) {
      value = 1;
    }

    setQuantity(value);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="product-detail container"><p>Loading product...</p></main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="product-detail container"><h2 className="error-message">{error}</h2></main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="product-detail container"><p>Product not found.</p></main>
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
                style={{ backgroundImage: `url(${img.url})`}}
              />
            ))}
          </div>
        </div>

        <div className="product-detail__info">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-service">{product.category}</p>
          <p className="product-desc">{product.description}</p>
          <h3 className="section-title">Plan Insurance</h3>
          <p className="product-insurance">Includes a Comprehensive Funeral Plan with extensive coverage and support.</p>
          <h2 className="section-title">Pricing</h2>
          <div className="price-display">
            <span className="price-label">Total Price:</span>
            <span className="price-value">{php(product.price)}</span>
          </div>
          <div className="price-display monthly">
            <span className="price-label">or {php(product.price / 12)} / month (1 year)</span>
          </div>
          
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
            
            {/* --- FIX: Show a "(Max)" warning when quantity equals stock --- */}
            {quantity === product.stock_quantity && !isOutOfStock && (
              <span className="stock-status max-stock">(Max)</span>
            )}
          </div>

          <div
            style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}
          >
            <button className="btn-cart" disabled={isOutOfStock}>
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <Link to="/catalog" className="btn-back">
              ← Back to Catalog
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}