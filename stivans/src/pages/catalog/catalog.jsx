// src/pages/catalog/Catalog.jsx
import React, { useState, useEffect } from "react";
import "./catalog.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { Link } from "react-router-dom";
import { fetchProducts } from "../../data/products.jsx";

// Helper function for currency formatting
function php(amount) {
  const numericAmount = Number(amount) || 0;
  return "₱" + numericAmount.toLocaleString("en-PH");
}

export default function Catalog() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchProducts();
        setBundles(data);
      } catch (err) {
        setError("Failed to load products. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main className="catalog-main"><div className="container"><p>Loading products...</p></div></main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="catalog-main"><div className="container"><p className="error-message">{error}</p></div></main>
        <Footer />
      </>
    );
  }

  // Create a new array that only contains in-stock products
  const inStockBundles = bundles.filter(b => b.stock_quantity > 0);

  return (
    <div className="catalog-page">
      <Header />

      <main className="catalog-main">
        <div className="container">
          <div className="catalog-header">
            <h1>Funeral Bundles</h1>
            <p className="catalog-sub">High-quality caskets with bundled non-life insurance included. Flexible payment options available.</p>
          </div>

          <div className="catalog-grid">
            {/* Map over the new filtered array instead of the original one */}
            {inStockBundles.length > 0 ? (
              inStockBundles.map((b) => (
                <article key={b.id} className="catalog-card" role="article" aria-labelledby={`title-${b.id}`}>
                  <div className="card-media">
                    <img src={b.image_url} alt={b.name} loading="lazy" />
                  </div>
                  <div className="card-body">
                    <div className="pill">Non-Life Insurance Included</div>
                    <h3 id={`title-${b.id}`} className="card-title">{b.name}</h3>
                    <p className="card-desc">{b.short_description}</p>
                    <div className="card-footer">
                      <div className="price-group">
                        <div className="price-block">
                          <div className="price-label">Base Price</div>
                          <div className="price-value">{php(b.price)}</div>
                        </div>
                        <div className="price-block">
                          <div className="price-label">Monthly 1yr/Mo</div>
                          <div className="price-value">{php(b.price / 12)}</div>
                        </div>
                      </div>
                      <div className="action-block">
                        <Link to={`/catalog/${b.id}`} className="btn-learn">Learn More</Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              // Show a message if all products are out of stock
              <p>All products are currently out of stock. Please check back later.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}