// src/pages/checkout/checkout.jsx
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { useCart } from "../../contexts/cartContext";
import { supabase } from "../../supabaseClient";
import "./checkout.css";
import { uploadDeathCertificate } from "../../data/orders";

const API_BASE = import.meta.env.VITE_API_BASE || ""; // set to your Vercel URL in .env.local for local dev

function php(amount) {
  const n = Number(amount) || 0;
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Checkout() {
  const location = useLocation();
  const { clearCart } = useCart();

  // ✅ Read items from router state OR fallback to sessionStorage after refresh
  const stateItems = Array.isArray(location.state?.items) ? location.state.items : null;
  const storedItems = !stateItems
    ? JSON.parse(sessionStorage.getItem("checkout.items") || "[]")
    : null;

  // This is the list we’ll use everywhere:
  // [{ id, name, price, image_url, stock_quantity, quantity }]
  const items = stateItems ?? storedItems ?? [];

  // Totals (client-side preview)
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.price) * Number(it.quantity), 0),
    [items]
  );
  const tax = useMemo(() => subtotal * 0.12, [subtotal]);
  const shipping = useMemo(() => (subtotal > 2000 ? 0 : 150), [subtotal]);
  const total = useMemo(() => subtotal + tax + shipping, [subtotal, tax, shipping]);

  // Cadaver modal/form state (unchanged)
  const [showCadaverModal, setShowCadaverModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [cadaver, setCadaver] = useState({
    full_name: "",
    dob: "",
    age: "",
    sex: "",
    civil_status: "",
    religion: "",
    death_datetime: "",
    place_of_death: "",
    cause_of_death: "",
    kin_name: "",
    kin_relation: "",
    kin_mobile: "",
    kin_email: "",
    kin_address: "",
    remains_location: "",
    pickup_datetime: "",
    special_instructions: "",
    occupation: "",
    nationality: "",
    residence: "",
  });

  const [deathCertFile, setDeathCertFile] = useState(null);
  const [claimantIdFile, setClaimantIdFile] = useState(null);
  const [permitFile, setPermitFile] = useState(null);

  const onChangeField = (e) => {
    const { name, value } = e.target;
    setCadaver((prev) => ({ ...prev, [name]: value }));
  };

  const validateCadaver = () => {
    const required = [
      "full_name", "sex", "civil_status", "religion",
      "death_datetime", "place_of_death",
      "kin_name", "kin_relation", "kin_mobile", "kin_email", "kin_address",
      "remains_location", "pickup_datetime",
    ];
    for (const k of required) {
      if (!String(cadaver[k] || "").trim()) {
        setErrorMsg(`Please fill in: ${k.replace(/_/g, " ")}`);
        return false;
      }
    }
    if (!deathCertFile) {
      setErrorMsg("Death certificate is required.");
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    try {
      setErrorMsg("");

      if (items.length === 0) {
        setErrorMsg("No items selected for checkout.");
        return;
      }
      if (!validateCadaver()) return;

      setSaving(true);

      // Get logged-in session (required)
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session) {
        setSaving(false);
        setErrorMsg("You must be signed in to place an order.");
        return;
      }
      const user = session.user;

      // Upload required/optional documents
      const death_certificate_url = await uploadDeathCertificate(deathCertFile, user.id, "pending");

      let claimant_id_url = null;
      if (claimantIdFile) {
        const { data, error } = await supabase.storage
          .from("docs")
          .upload(`claimant/${user.id}/${Date.now()}_${claimantIdFile.name}`, claimantIdFile, {
            cacheControl: "3600", upsert: false,
          });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("docs").getPublicUrl(data.path);
        claimant_id_url = pub.publicUrl;
      }

      let permit_url = null;
      if (permitFile) {
        const { data, error } = await supabase.storage
          .from("docs")
          .upload(`permits/${user.id}/${Date.now()}_${permitFile.name}`, permitFile, {
            cacheControl: "3600", upsert: false,
          });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("docs").getPublicUrl(data.path);
        permit_url = pub.publicUrl;
      }

      // Build payload for API from our flattened items
      const payload = {
        items: items.map((it) => ({
          product_id: it.id,
          name: it.name,
          price: Number(it.price),
          quantity: Number(it.quantity),
          image_url: it.image_url || null,
        })),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        total: Number(total.toFixed(2)),
        payment_method: null,
        cadaver: {
          ...cadaver,
          age: cadaver.age ? Number(cadaver.age) : null,
          death_datetime: cadaver.death_datetime,
          pickup_datetime: cadaver.pickup_datetime,
          death_certificate_url,
          claimant_id_url,
          permit_url,
        },
      };

      // Create order + xendit invoice via your serverless function
      const res = await fetch(`${API_BASE}/api/xendit/create-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create Xendit invoice");
      }

      const data = await res.json();

      // Clear cart (and stash) and redirect to Xendit
      clearCart();
      sessionStorage.removeItem("checkout.items");
      window.location.href = data.invoice_url;
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while placing your order.");
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <div className="checkout-page">
        <h1>Checkout</h1>

        {items.length === 0 ? (
          <div className="empty-checkout">
            <p>No items selected for checkout.</p>
            <a href="/cart"><button>Back to Cart</button></a>
          </div>
        ) : (
          <div className="checkout-grid">
            {/* Left: Items */}
            <div className="co-items">
              {items.map((it) => (
                <div className="co-item" key={it.id}>
                  <img src={it.image_url} alt={it.name} />
                  <div className="co-item-info">
                    <h3>{it.name}</h3>
                    <p className="price">{php(it.price)}</p>
                    <p className="qty">Qty: {it.quantity}</p>
                  </div>
                </div>
              ))}

              <button type="button" className="cadaver-btn" onClick={() => setShowCadaverModal(true)}>
                Add Cadaver Details
              </button>
              <p className="cadaver-note">
                * Cadaver details and Death Certificate are required before payment.
              </p>
            </div>

            {/* Right: Summary */}
            <div className="co-summary">
              <h2>Order Summary</h2>
              <div className="row"><span>Subtotal</span><span>{php(subtotal)}</span></div>
              <div className="row"><span>Tax (12%)</span><span>{php(tax)}</span></div>
              <div className="row"><span>Shipping</span><span>{shipping === 0 ? "Free" : php(shipping)}</span></div>
              <div className="total"><strong>Total</strong><strong>{php(total)}</strong></div>

              {errorMsg && <p className="error">{errorMsg}</p>}

              <button className="place-order" onClick={handlePlaceOrder} disabled={saving}>
                {saving ? "Creating Invoice..." : "Proceed to Payment"}
              </button>
              <a href="/cart" className="back-cart">Back to Cart</a>
            </div>
          </div>
        )}
      </div>

      {/* Cadaver Modal (unchanged UI) */}
      {showCadaverModal && (
        <div className="modal-overlay" onClick={() => setShowCadaverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cadaver Details</h3>
              <button className="close" onClick={() => setShowCadaverModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {/* Identity */}
              <div className="row-grid">
                <div className="field">
                  <label>Full Legal Name *</label>
                  <input name="full_name" value={cadaver.full_name} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Date of Birth</label>
                  <input type="date" name="dob" value={cadaver.dob} onChange={onChangeField} />
                </div>
                <div className="field">
                  <label>Age</label>
                  <input type="number" name="age" value={cadaver.age} onChange={onChangeField} />
                </div>
              </div>

              <div className="row-grid">
                <div className="field">
                  <label>Sex *</label>
                  <select name="sex" value={cadaver.sex} onChange={onChangeField} required>
                    <option value="">Select…</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Civil Status *</label>
                  <select name="civil_status" value={cadaver.civil_status} onChange={onChangeField} required>
                    <option value="">Select…</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Widowed</option>
                    <option>Separated</option>
                  </select>
                </div>
                <div className="field">
                  <label>Religion *</label>
                  <input name="religion" value={cadaver.religion} onChange={onChangeField} required />
                </div>
              </div>

              {/* Death Details */}
              <div className="row-grid">
                <div className="field">
                  <label>Date & Time of Death *</label>
                  <input type="datetime-local" name="death_datetime" value={cadaver.death_datetime} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Place of Death *</label>
                  <input name="place_of_death" value={cadaver.place_of_death} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Cause of Death (optional)</label>
                  <input name="cause_of_death" value={cadaver.cause_of_death} onChange={onChangeField} />
                </div>
              </div>

              {/* Next of Kin */}
              <div className="row-grid">
                <div className="field">
                  <label>Primary Contact Name *</label>
                  <input name="kin_name" value={cadaver.kin_name} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Relationship *</label>
                  <input name="kin_relation" value={cadaver.kin_relation} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Mobile *</label>
                  <input name="kin_mobile" value={cadaver.kin_mobile} onChange={onChangeField} required />
                </div>
              </div>
              <div className="row-grid">
                <div className="field">
                  <label>Email *</label>
                  <input type="email" name="kin_email" value={cadaver.kin_email} onChange={onChangeField} required />
                </div>
                <div className="field col-2">
                  <label>Address *</label>
                  <input name="kin_address" value={cadaver.kin_address} onChange={onChangeField} required />
                </div>
              </div>

              {/* Logistics */}
              <div className="row-grid">
                <div className="field">
                  <label>Current Location of Remains *</label>
                  <input name="remains_location" value={cadaver.remains_location} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Requested Pick-Up (Date & Time) *</label>
                  <input type="datetime-local" name="pickup_datetime" value={cadaver.pickup_datetime} onChange={onChangeField} required />
                </div>
                <div className="field">
                  <label>Special Handling (optional)</label>
                  <input name="special_instructions" value={cadaver.special_instructions} onChange={onChangeField} />
                </div>
              </div>

              {/* Documents */}
              <div className="docs">
                <div className="field">
                  <label>Death Certificate (required)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setDeathCertFile(e.target.files?.[0] || null)} required />
                </div>
                <div className="field">
                  <label>Claimant / Next of Kin ID (optional)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setClaimantIdFile(e.target.files?.[0] || null)} />
                </div>
                <div className="field">
                  <label>Burial / Cremation Permit (optional)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setPermitFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCadaverModal(false)} className="secondary">Done</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
