import React, { useEffect, useMemo, useState } from "react";
import "./catalog.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { Link } from "react-router-dom";
import { fetchProducts } from "../../data/products.jsx";
import ChatBot from './components/ChatBot/ChatBot';

// ⬇️ Reusable search bar
import SearchBar, { sortRecords } from "../../components/searchbar/SearchBar.jsx";

// Currency helper
function php(amount) {
  const numericAmount = Number(amount) || 0;
  return "₱" + numericAmount.toLocaleString("en-PH");
}

export default function Catalog() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/filter state coming from SearchBar
  const [filters, setFilters] = useState({
    query: "",
    category: "",
    priceMin: null,
    priceMax: null,
    sort: "relevance",
  });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchProducts();
        setBundles(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Build category list & suggestions for autocomplete
  const categories = useMemo(() => {
    const set = new Set(bundles.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [bundles]);

  const suggestions = useMemo(
    () => bundles.map((p) => p.name).filter(Boolean),
    [bundles]
  );

  // Only in-stock products
  const inStockBundles = useMemo(
    () => bundles.filter((b) => Number(b.stock_quantity) > 0),
    [bundles]
  );

  // Apply filters locally
  const filtered = useMemo(() => {
    let list = [...inStockBundles];

    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q));
    }

    // Category
    if (filters.category) {
      list = list.filter((p) => p.category === filters.category);
    }

    // Price range (inclusive)
    if (filters.priceMin != null) {
      list = list.filter((p) => Number(p.price) >= Number(filters.priceMin));
    }
    if (filters.priceMax != null) {
      list = list.filter((p) => Number(p.price) <= Number(filters.priceMax));
    }

    // Sort (uses helper from SearchBar)
    list = sortRecords(list, filters.sort);
    return list;
  }, [inStockBundles, filters]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="catalog-main">
          <div className="container"><p>Loading products...</p></div>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="catalog-main">
          <div className="container"><p className="error-message">{error}</p></div>
        </main>
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
            <p className="catalog-sub">
              High-quality caskets with bundled non-life insurance included. Flexible payment options available.
            </p>
          </div>

          {/* 🔎 Search + Filters */}
          <div style={{ marginBottom: 16 }}>
            <SearchBar
              placeholder="Search products…"
              suggestions={suggestions}
              categories={categories}
              minPrice={0}
              maxPrice={500000}
              initialState={{ sort: "relevance" }}
              onChange={(s) => setFilters(s)}     // debounced updates as you type
              onSubmit={(s) => setFilters(s)}     // Enter / Search click
            />
          </div>

          <div className="catalog-grid">
            {filtered.length > 0 ? (
              filtered.map((b) => (
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
              <p>No products match your filters.</p>
            )}
          </div>
        </div>
      </main>
      <ChatBot /> 
      <Footer />
    </div>
  );
}
