// src/pages/catalog/Catalog.jsx
import React from "react";
import "./catalog.css";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/footer";
import { Link } from "react-router-dom";

/* Import the PNGs from src/assets/ (case-sensitive) */
import c1 from "../../assets/casket1.png";
import c2 from "../../assets/casket2.png";
import c3 from "../../assets/casket3.png";
import c4 from "../../assets/casket4.png";
import c5 from "../../assets/casket5.png";

/* Bundles list — ids match the product detail page ids (casket1..casket5) */
const BUNDLES = [
  { id: "casket1", name: "Casket (JOHN)", short: "Lorem ipsum oh yeah", price: 20000, monthly: 1750, image: c1, insuranceIncluded: true },
  { id: "casket2", name: "Casket (CLASSIC)", short: "Lorem ipsum oh yeah", price: 20000, monthly: 1750, image: c2, insuranceIncluded: true },
  { id: "casket3", name: "Casket (PREMIUM)", short: "Lorem ipsum oh yeah", price: 20000, monthly: 1750, image: c3, insuranceIncluded: true },
  { id: "casket4", name: "Casket (MODERN)", short: "Lorem ipsum oh yeah", price: 20000, monthly: 1750, image: c4, insuranceIncluded: true },
  { id: "casket5", name: "Casket (WHITE)", short: "Lorem ipsum oh yeah", price: 20000, monthly: 1750, image: c5, insuranceIncluded: true }
];

function php(amount) {
  return "₱" + amount.toLocaleString("en-PH");
}

export default function Catalog() {
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
            {BUNDLES.map((b) => (
              <article key={b.id} className="catalog-card" role="article" aria-labelledby={`title-${b.id}`}>
                <div className="card-media">
                  {/* lazy loading + object-fit handled in CSS */}
                  <img src={b.image} alt={b.name} loading="lazy" />
                </div>

                <div className="card-body">
                  {b.insuranceIncluded && <div className="pill">Non-Life Insurance Included</div>}

                  <h3 id={`title-${b.id}`} className="card-title">{b.name}</h3>
                  <p className="card-desc">{b.short}</p>

                  <div className="card-footer">
                    <div className="price-group">
                      <div className="price-block">
                        <div className="price-label">Base Price</div>
                        <div className="price-value">{php(b.price)}</div>
                      </div>

                      <div className="price-block">
                        <div className="price-label">Monthly 1yr/Mo</div>
                        <div className="price-value">{php(b.monthly)}</div>
                      </div>
                    </div>

                    {/* Learn More navigates to the product detail route /catalog/:id */}
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
