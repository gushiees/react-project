// src/pages/catalog/Catalog.jsx
import React from "react";
import "./catalog.css";
import Header from "../../components/header/header";
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
  { id: "casket1", name: "ECO (WOODEN)", short: "Affordable solid-wood casket with a natural finish — simple, durable, and respectful.", price: 40000, monthly: 3333.33, image: c1, insuranceIncluded: true },
  { id: "casket2", name: "ABRAM (CLASSIC)", short: "Polished, traditional wooden casket with satin interior for a refined presentation.", price: 74999, monthly: 6249.91, image: c2, insuranceIncluded: true },
  { id: "casket3", name: "BETA (CLASSIC)", short: "Sturdy oak-style casket offering balanced quality and value for traditional services.", price: 70000, monthly: 5833.33, image: c3, insuranceIncluded: true },
  { id: "casket4", name: "SKY (MODERN)", short: "Contemporary metallic casket with sleek design and premium interior comfort.", price: 99999, monthly: 8333.25, image: c4, insuranceIncluded: true },
  { id: "casket5", name: "CLOUD (MODERN)", short: "Elegant white casket with a serene finish, perfect for graceful memorials.", price: 99999, monthly: 8333.25, image: c5, insuranceIncluded: true }
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
