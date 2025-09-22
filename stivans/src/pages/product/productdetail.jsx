// src/pages/product/ProductDetail.jsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./product-detail.css";

// Sample data (replace with your backend or context later)
import casket1 from "../../assets/casket1.png";
import casket2 from "../../assets/casket2.png";
import casket3 from "../../assets/casket3.png";
import casket4 from "../../assets/casket4.png";
import casket5 from "../../assets/casket5.png";
import casket52 from "../../assets/casket52.png";
import casket53 from "../../assets/casket53.png";

const products = [
  {
    id: "casket1",
    name: "ECO (WOODEN)",
    service: "Funeral Service",
    description:
      "The Eco Wooden casket is built from solid pine with a smooth, natural finish. Designed for families seeking a simple yet dignified farewell, it emphasizes durability and respectful presentation. The interior includes a soft cotton lining and supportive pillow, creating a warm, natural look.",
    insurance:
      "Includes a Basic Funeral Assistance Plan, covering administrative and immediate arrangement costs with simplified claims processing. It provides modest financial support for short-term needs but is not a substitute for full life insurance coverage.",
    prices: {
      oneYear: "₱3,333.33",
      twoYear: "₱1,750.00",
      fiveYear: "₱766.67",
    },
    images: [casket1, casket2, casket3], // example thumbs
  },
  {
    id: "casket2",
    name: "Casket (Classic)",
    service: "Funeral Service",
    description:
      "The Abram Classic casket features polished wood craftsmanship with detailed trim and a satin-lined interior. It offers a timeless, elegant look suitable for formal services, blending traditional style with dependable build quality.",
    insurance:
      "Includes a Standard Funeral Priority Plan, which provides reimbursement assistance for selected funeral expenses, expedited claims, and access to support for paperwork and coordination. A small accidental death benefit is also included.",
    prices: {
      oneYear: "₱6,249.91",
      twoYear: "₱3,281.21",
      fiveYear: "₱1,437.48",
    },
    images: [casket2, casket1, casket3], // example thumbs
  },
  {
    id: "casket3",
    name: "BETA (CLASSIC)",
    service: "Funeral Service",
    description:
      "Comes with a Funeral Support Plan, offering guided assistance in filing insurance claims, partial reimbursement of eligible costs, and coverage for standard administrative expenses.",
    insurance:
      "Comes with a Funeral Support Plan, offering guided assistance in filing insurance claims, partial reimbursement of eligible costs, and coverage for standard administrative expenses.",
    prices: { oneYear: "₱5,833.33", twoYear: "₱3,062.50", fiveYear: "₱1,341.67" },
    images: [casket3, casket1, casket5],
  },
  {
    id: "casket4",
    name: "SKY (MODERN)",
    service: "Funeral Service",
    description:
      "The Sky Modern casket offers a sleek, contemporary design with a metallic exterior and plush interior fabric. Its clean lines and premium construction make it a standout choice for families who prefer modern elegance in memorial services.",
    insurance:
      "Protected under the Premium Funeral Coverage Plan, which provides higher reimbursement limits, priority claims handling, and a dedicated coordinator for smoother processing and support during difficult times.",
    prices: { oneYear: "₱8,333.25", twoYear: "₱4,374.96", fiveYear: "₱1,916.65" },
    images: [casket4, casket2, casket5],
  },
  {
    id: "casket5",
    name: "CLOUD (MODERN)",
    service: "Funeral Service",
    description:
      "The Cloud Modern casket is finished in elegant white, offering a serene and graceful presentation. Its high-quality build and plush interior reflect dignity and peace, making it well-suited for refined memorials.",
    insurance:
      "Includes a Comprehensive Funeral Plan with extensive coverage for funeral-related expenses, higher payout limits, and fast-tracked claim processing with priority customer support.",
    prices: { oneYear: "₱8,333.25", twoYear: "₱4,374.96", fiveYear: "₱1,916.65" },
    images: [casket5, casket52, casket53],
  },
];

export default function ProductDetail() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  const [mainImage, setMainImage] = useState(product ? product.images[0] : null);

  if (!product) return <h2 style={{ padding: "2rem" }}>Product not found.</h2>;

  return (
    <>
      <Header />

      {/* main page wrapper */}
      <main
        className="product-detail container"
        style={{ paddingTop: "32px", paddingBottom: "48px" }}
      >
        <div className="product-detail__image">
          <img src={mainImage} alt={product.name} />
          <div className="product-detail__thumbs">
            {product.images.map((img, i) => (
              <div
                key={i}
                className="thumb"
                onClick={() => setMainImage(img)}
                style={{
                  backgroundImage: `url(${img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <div className="product-detail__info">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-service">{product.service}</p>
          <p className="product-desc">{product.description}</p>

          <h3 className="section-title">Plan Insurance</h3>
          <p className="product-insurance">{product.insurance}</p>

          <h2 className="section-title">Installment</h2>
          <div className="installment-table" aria-hidden>
            <div className="row">
              <span>1 YEAR</span>
              <span>{product.prices.oneYear} /Monthly</span>
            </div>
            <div className="row">
              <span>2 YEAR</span>
              <span>{product.prices.twoYear} /Monthly</span>
            </div>
            <div className="row">
              <span>5 YEAR</span>
              <span>{product.prices.fiveYear} /Monthly</span>
            </div>
          </div>

          <div className="quantity">
            <label htmlFor="qty">Quantity: </label>
            <input id="qty" type="number" defaultValue="1" min="1" />
          </div>

          <p className="payment-mode">Mode of Payment: NULL</p>

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
