// src/pages/product/ProductDetail.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/footer";
import "./product-detail.css";

// Sample data (replace with your backend or context later)
import casket1 from "../../assets/casket1.png";
import casket2 from "../../assets/casket2.png";
import casket3 from "../../assets/casket3.png";
import casket4 from "../../assets/casket4.png";
import casket5 from "../../assets/casket5.png";

const products = [
  {
    id: "casket1",
    name: "Casket (John)",
    service: "Funeral Service",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    insurance:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    prices: {
      oneYear: "₱1,750.00",
      twoYear: "₱875.00",
      fiveYear: "₱350.00",
    },
    image: casket1,
  },
  {
    id: "casket2",
    name: "Casket (Classic)",
    service: "Funeral Service",
    description:
      "Elegant and classic wooden casket with premium finishing and traditional design.",
    insurance:
      "Insurance covers accidental damage and maintenance during viewing.",
    prices: {
      oneYear: "₱2,200.00",
      twoYear: "₱1,100.00",
      fiveYear: "₱450.00",
    },
    image: casket2,
  },
  {
    id: "casket3",
    name: "Casket (Premium)",
    service: "Funeral Service",
    description:
      "High-end premium casket for families wanting luxurious finish.",
    insurance: "Includes plan coverage with full insurance options.",
    prices: { oneYear: "₱3,500.00", twoYear: "₱1,750.00", fiveYear: "₱700.00" },
    image: casket3,
  },
  {
    id: "casket4",
    name: "Casket (Modern)",
    service: "Funeral Service",
    description: "A modern casket design with sleek metallic finishes.",
    insurance: "Plan insurance includes handling and storage options.",
    prices: { oneYear: "₱2,800.00", twoYear: "₱1,400.00", fiveYear: "₱560.00" },
    image: casket4,
  },
  {
    id: "casket5",
    name: "Casket (White)",
    service: "Funeral Service",
    description:
      "Bright white elegant casket ideal for a clean and graceful presentation.",
    insurance: "Full coverage plan available with installment options.",
    prices: { oneYear: "₱2,000.00", twoYear: "₱1,000.00", fiveYear: "₱400.00" },
    image: casket5,
  },
];

export default function ProductDetail() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  if (!product) return <h2 style={{ padding: "2rem" }}>Product not found.</h2>;

  return (
    <>
      <Header />

      {/* main page wrapper */}
      <main className="product-detail container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
        <div className="product-detail__image">
          <img src={product.image} alt={product.name} />
          <div className="product-detail__thumbs">
            <div className="thumb" />
            <div className="thumb" />
            <div className="thumb" />
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
              <span>{product.prices.oneYear}</span>
            </div>
            <div className="row">
              <span>2 YEAR</span>
              <span>{product.prices.twoYear}</span>
            </div>
            <div className="row">
              <span>5 YEAR</span>
              <span>{product.prices.fiveYear}</span>
            </div>
          </div>

          <div className="quantity">
            <label htmlFor="qty">Quantity: </label>
            <input id="qty" type="number" defaultValue="1" min="1" />
          </div>

          <p className="payment-mode">Mode of Payment: NULL</p>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
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
