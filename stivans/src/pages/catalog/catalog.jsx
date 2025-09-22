// src/pages/catalog/Catalog.jsx
import React, { useState, useEffect } from "react";
import "./catalog.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { Link } from "react-router-dom";
// 1. Import the FUNCTION to fetch products, not the static data
import { fetchProducts } from "../../data/products.jsx";

// Helper function for currency formatting
function php(amount) {
  // Ensure amount is a number before formatting
  const numericAmount = Number(amount) || 0;
  return "₱" + numericAmount.toLocaleString("en-PH");
}

export default function Catalog() {
  // 2. Add state for products, loading, and errors
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 3. Use useEffect to fetch data from Supabase when the component loads
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchProducts(); // Call the function that gets data from Supabase
        setBundles(data); // Store the fetched data in state
      } catch (err) {
        setError("Failed to load products. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  // 4. Handle loading and error states
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
            {bundles.map((b) => (
              <article key={b.id} className="catalog-card" role="article" aria-labelledby={`title-${b.id}`}>
                <div className="card-media">
                  {/* 5. Use the image_url directly from your database */}
                  <img src={b.image_url} alt={b.name} loading="lazy" />
                </div>

                <div className="card-body">
                  {/* You might need a column in your DB for this, or just show it */}
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
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}