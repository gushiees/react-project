// src/pages/product/productdetail.jsx
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

  // --- FIX #1: Replaced 'mainImage' with two new states for hover functionality ---
  const [selectedImage, setSelectedImage] = useState(null); // For the clicked/"static" image
  const [hoverImage, setHoverImage] = useState(null);       // For the temporary preview image

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductById(id);
        
        if (data) {
          setProduct(data);
          // --- FIX #2: Set the initial SELECTED image when data loads ---
          setSelectedImage(data.image_url);
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

  // This second useEffect is no longer needed as its logic is combined above
  // useEffect(() => { ... });

  // --- FIX #3: Create a single, unified array for the entire image gallery ---
  const galleryImages = product ? [
    { id: 'main', url: product.image_url }, 
    ...(product.product_images || [])
  ] : [];


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

  return (
    <>
      <Header />
      <main
        className="product-detail container"
        style={{ paddingTop: "32px", paddingBottom: "48px" }}
      >
        <div className="product-detail__image">
          {/* --- FIX #4: Display hover image if it exists, otherwise show the selected image --- */}
          <img src={hoverImage || selectedImage} alt={product.name} />

          <div className="product-detail__thumbs">
            {/* --- FIX #5: Map over the unified gallery and add hover events --- */}
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
            <input id="qty" type="number" defaultValue="1" min="1" />
          </div>

          <div
            style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}
          >
            <button className="btn-cart">Add to Cart</button>
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