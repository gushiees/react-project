// src/pages/checkout/checkout.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useSearchParams, useNavigate, Link } from "react-router-dom";
import Header from "../../components/header/header.jsx";
import Footer from "../../components/footer/footer.jsx";
import { useCart } from "../../contexts/cartContext.jsx";
import { supabase } from "../../supabaseClient.js";
import "./checkout.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE) ||
  "";

// Helpers
function php(amount) {
  const n = Number(amount) || 0;
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayYMD() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function computeAge(dobStr, asOf = new Date()) {
  if (!dobStr) return "";
  const dob = new Date(dobStr + "T00:00:00");
  if (Number.isNaN(dob.getTime())) return "";
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

// Dropdown options
const COMMON_CAUSES = [
  "Cardiac arrest",
  "Myocardial infarction (heart attack)",
  "Stroke (CVA)",
  "Cancer",
  "Sepsis",
  "Pneumonia",
  "Chronic kidney disease / renal failure",
  "COPD / respiratory failure",
  "Diabetes complications",
  "Accident / Trauma",
  "COVID-19",
  "Old age / Natural causes",
  "Other",
];
const KIN_RELATION_OPTIONS = [
  "Mother",
  "Father",
  "Spouse / Partner (Significant Other)",
  "Son",
  "Daughter",
  "Sibling",
  "Relative",
  "Friend",
  "Neighbor",
  "Caregiver",
  "Other",
];
const SPECIAL_HANDLING_REASONS = [
  "Contagious disease",
  "VIP / Protocol",
  "Religious or cultural requirements",
  "Autopsy required",
  "Legal hold",
  "Other",
];

// Required fields for at-need checkout
const cadaverRequiredFields = [
  "full_name",
  "sex",
  "civil_status",
  "religion",
  "death_datetime",
  "place_of_death",
  "cause_of_death",
  "kin_name",
  "kin_relation",
  "kin_mobile",
  "kin_email",
  "kin_address",
  "remains_location",
  "pickup_datetime",
];

// Storage upload helper
async function uploadDocToStorage(file, userId, orderTag, docType) {
  if (!file) return null;
  const safeName = file.name?.replace(/\s+/g, "_") || `${docType}-${Date.now()}`;
  const path = `${userId}/${orderTag}/${docType}-${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage
    .from("cadaver-docs")
    .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  if (error) throw new Error(`${docType} upload failed: ${error.message}`);
  return data?.path || path;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();

  // Payment status
  const [paymentStatus, setPaymentStatus] = useState(null);
  useEffect(() => {
    const paidParam = searchParams.get("paid");
    if (paidParam === "1") setPaymentStatus("success");
    else if (paidParam === "0") setPaymentStatus("failure");
    if (paidParam) sessionStorage.removeItem("checkout.items");
  }, [searchParams]);

  // Items
  const stateItems = Array.isArray(location.state?.items) ? location.state.items : null;
  const storedItems =
    !stateItems && !paymentStatus ? JSON.parse(sessionStorage.getItem("checkout.items") || "[]") : null;
  const items = stateItems ?? storedItems ?? [];
  useEffect(() => {
    if (items.length === 0 && !paymentStatus && location.pathname === "/checkout") {
      navigate("/cart", { replace: true });
    }
  }, [items, paymentStatus, navigate, location.pathname]);

  // Purchase type
  const [purchaseType, setPurchaseType] = useState("self");
  const isForDeceased = purchaseType === "someone";

  // Chapel booking
  const [chapels, setChapels] = useState([]);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [selectedChapelId, setSelectedChapelId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [numDays, setNumDays] = useState(1);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityErr, setAvailabilityErr] = useState("");
  const [isAvailable, setIsAvailable] = useState(null);

  const selectedChapel = useMemo(
    () => chapels.find((c) => c.id === selectedChapelId) || null,
    [chapels, selectedChapelId]
  );
  const chapelDays = bookingEnabled ? Math.max(1, Number(numDays) || 1) : 0;
  const chapelDailyRate = Number(selectedChapel?.daily_rate || 0);
  const chapelBookingTotal = chapelDays * chapelDailyRate;

  // Cold storage
  const COLD_STORAGE_PER_DAY = 5000;
  const [coldEnabled, setColdEnabled] = useState(false);
  const [coldStartDate, setColdStartDate] = useState("");
  const [coldDays, setColdDays] = useState(1);
  const coldValidDays = coldEnabled ? Math.max(1, Number(coldDays) || 1) : 0;
  const coldStorageTotal = coldValidDays * COLD_STORAGE_PER_DAY;

  // Totals
  const baseSubtotal = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 1), 0),
    [items]
  );
  const extraLineItems = useMemo(() => {
    const rows = [];
    if (bookingEnabled && selectedChapel && chapelDays > 0 && chapelDailyRate > 0) {
      rows.push({
        id: "chapel-addon",
        name: `Chapel Booking: ${selectedChapel.name} (${chapelDays}d)`,
        price: chapelDailyRate,
        quantity: chapelDays,
        image_url: null,
      });
    }
    if (coldEnabled && coldValidDays > 0) {
      rows.push({
        id: "cold-storage-addon",
        name: `Cold Storage (${coldValidDays}d)`,
        price: COLD_STORAGE_PER_DAY,
        quantity: coldValidDays,
        image_url: null,
      });
    }
    return rows;
  }, [bookingEnabled, selectedChapel, chapelDays, chapelDailyRate, coldEnabled, coldValidDays]);

  const subtotal = useMemo(
    () => baseSubtotal + extraLineItems.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0),
    [baseSubtotal, extraLineItems]
  );
  const tax = useMemo(() => subtotal * 0.12, [subtotal]);
  const shipping = useMemo(() => (subtotal > 2000 ? 0 : 150), [subtotal]);
  const total = useMemo(() => subtotal + tax + shipping, [subtotal, tax, shipping]);

  // Cadaver state
  const [showCadaverModal, setShowCadaverModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalErrorMsg, setModalErrorMsg] = useState("");
  const [cadaverDetailsComplete, setCadaverDetailsComplete] = useState(false);

  const [cadaver, setCadaver] = useState({
    // Identity
    full_name: "",
    dob: "",
    age: "",
    sex: "",
    civil_status: "",
    religion: "",
    // Death
    death_datetime: "",
    place_of_death: "",
    cause_of_death: "",
    cause_of_death_other: "",
    // Kin
    kin_name: "",
    kin_relation: "",
    kin_relation_other: "",
    kin_mobile: "",
    kin_email: "",
    kin_address: "",
    // Logistics
    remains_location: "",
    pickup_datetime: "",
    special_handling: false,
    special_handling_reason: "",
    special_handling_other: "",
    special_instructions: "",
    // Optional info
    occupation: "",
    nationality: "",
    residence: "",
  });

  const [deathCertFile, setDeathCertFile] = useState(null);
  const [claimantIdFile, setClaimantIdFile] = useState(null);
  const [permitFile, setPermitFile] = useState(null);

  useEffect(() => {
    if (purchaseType === "self") setCadaverDetailsComplete(false);
  }, [purchaseType]);

  // Field handlers + smart logic
  const onChangeField = (e) => {
    const { name, value, type, checked } = e.target;
    const v = type === "checkbox" ? checked : value;

    // DOB rules: prevent future date, recompute age
    if (name === "dob") {
      const max = todayYMD();
      let nextDob = v;
      if (nextDob && nextDob > max) {
        setModalErrorMsg("Date of birth cannot be in the future.");
        nextDob = max;
      } else {
        setModalErrorMsg("");
      }
      const newAge = computeAge(nextDob);
      setCadaver((prev) => ({ ...prev, dob: nextDob, age: newAge }));
      setCadaverDetailsComplete(false);
      return;
    }

    // If death date set and dob exists, block death < dob
    if (name === "death_datetime" && cadaver.dob) {
      const death = new Date(v);
      const dob = new Date(cadaver.dob + "T00:00:00");
      if (!Number.isNaN(death) && death < dob) {
        setModalErrorMsg("Date & time of death cannot be before the date of birth.");
        // keep but show error; user can change
      } else {
        setModalErrorMsg("");
      }
    }

    setCadaver((prev) => ({ ...prev, [name]: v }));
    setCadaverDetailsComplete(false);
  };

  const onFileChange = (setter) => (e) => {
    setter(e.target.files?.[0] || null);
    setModalErrorMsg("");
    setCadaverDetailsComplete(false);
  };

  // Fetch chapels
  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("chapels")
        .select("id,name,daily_rate")
        .order("name");
      if (!fetchError && Array.isArray(data)) setChapels(data);
    })();
  }, []);

  // Derived dates
  const endDate = useMemo(() => {
    if (!startDate || chapelDays < 1) return "";
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + (chapelDays - 1));
    return d.toISOString().slice(0, 10);
  }, [startDate, chapelDays]);

  const coldEndDate = useMemo(() => {
    if (!coldStartDate || coldValidDays < 1) return "";
    const d = new Date(coldStartDate + "T00:00:00");
    d.setDate(d.getDate() + (coldValidDays - 1));
    return d.toISOString().slice(0, 10);
  }, [coldStartDate, coldValidDays]);

  // Availability (stubbed)
  const checkAvailability = useCallback(async () => {
    if (!bookingEnabled || !selectedChapelId || !startDate || chapelDays < 1 || !endDate) {
      setIsAvailable(null);
      setAvailabilityErr("");
      return;
    }
    try {
      setCheckingAvailability(true);
      setAvailabilityErr("");
      // TODO: call availability endpoint
      setIsAvailable(true);
    } catch {
      setAvailabilityErr("Unable to check availability.");
      setIsAvailable(null);
    } finally {
      setCheckingAvailability(false);
    }
  }, [bookingEnabled, selectedChapelId, startDate, chapelDays, endDate]);

  useEffect(() => {
    const t = setTimeout(() => checkAvailability(), 500);
    return () => clearTimeout(t);
  }, [checkAvailability]);

  // Validation
  const validateCadaver = useCallback(
    (showErrorInModal = false) => {
      if (showErrorInModal) setModalErrorMsg("");

      if (!isForDeceased) return { isValid: true, message: "" };

      // Standard required fields
      for (const k of cadaverRequiredFields) {
        if (!String(cadaver[k] || "").trim()) {
          const message = `Missing: ${k.replace(/_/g, " ")}`;
          if (showErrorInModal) setModalErrorMsg(message);
          return { isValid: false, message };
        }
      }

      // Cause of death "Other" requires text
      if (cadaver.cause_of_death === "Other" && !String(cadaver.cause_of_death_other || "").trim()) {
        const message = "Missing: specify 'Other' cause of death";
        if (showErrorInModal) setModalErrorMsg(message);
        return { isValid: false, message };
      }

      // Kin relation "Other" requires text
      if (cadaver.kin_relation === "Other" && !String(cadaver.kin_relation_other || "").trim()) {
        const message = "Missing: specify 'Other' relationship";
        if (showErrorInModal) setModalErrorMsg(message);
        return { isValid: false, message };
      }

      // Special handling reason if checked
      if (cadaver.special_handling && !String(cadaver.special_handling_reason || "").trim()) {
        const message = "Missing: special handling reason";
        if (showErrorInModal) setModalErrorMsg(message);
        return { isValid: false, message };
      }
      if (
        cadaver.special_handling &&
        cadaver.special_handling_reason === "Other" &&
        !String(cadaver.special_handling_other || "").trim()
      ) {
        const message = "Missing: specify 'Other' special handling reason";
        if (showErrorInModal) setModalErrorMsg(message);
        return { isValid: false, message };
      }

      // DOB rules: cannot be in the future
      if (cadaver.dob) {
        const dob = new Date(cadaver.dob + "T00:00:00");
        const now = new Date(todayYMD() + "T00:00:00");
        if (dob > now) {
          const message = "Date of birth cannot be in the future.";
          if (showErrorInModal) setModalErrorMsg(message);
          return { isValid: false, message };
        }
      }

      // Death vs DOB: must be >= DOB (equal allowed)
      if (cadaver.dob && cadaver.death_datetime) {
        const dob = new Date(cadaver.dob + "T00:00:00");
        const death = new Date(cadaver.death_datetime);
        if (death < dob) {
          const message = "Date & time of death cannot be before the date of birth.";
          if (showErrorInModal) setModalErrorMsg(message);
          return { isValid: false, message };
        }
      }

      // Death certificate required
      if (!deathCertFile) {
        const message = "Death certificate file required.";
        if (showErrorInModal) setModalErrorMsg(message);
        return { isValid: false, message };
      }

      return { isValid: true, message: "" };
    },
    [isForDeceased, cadaver, deathCertFile]
  );

  const handleModalDone = () => {
    const validation = validateCadaver(true);
    if (validation.isValid) {
      setCadaverDetailsComplete(true);
      setShowCadaverModal(false);
      setErrorMsg("");
    }
  };

  // Place order
  const handlePlaceOrder = async () => {
    setErrorMsg("");

    let validationResult = { isValid: true, message: "" };
    if (isForDeceased && !cadaverDetailsComplete) {
      validationResult = validateCadaver(false);
    }
    if (!validationResult.isValid) {
      setTimeout(() => {
        setErrorMsg(
          (validationResult.message || "Cadaver details incomplete.") +
            " Click 'Add Details', fill form, then click 'Done'."
        );
        setShowCadaverModal(true);
      }, 0);
      return;
    }

    try {
      if (paymentStatus) throw new Error("Payment status already determined.");
      if (items.length === 0) throw new Error("Checkout cart is empty.");
      if (bookingEnabled && isAvailable === false) throw new Error("Selected chapel dates are unavailable.");

      setSaving(true);

      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();
      if (sessErr || !session) throw new Error("Authentication required.");
      const user = session.user;

      const orderTag = `order_pending_${Date.now()}`;
      let death_certificate_url = null;
      let claimant_id_url = null;
      let permit_url = null;

      if (isForDeceased && deathCertFile) {
        death_certificate_url = await uploadDocToStorage(deathCertFile, user.id, orderTag, "death-certificate");
      } else if (isForDeceased && !deathCertFile) {
        throw new Error("Death certificate required.");
      }
      if (claimantIdFile) {
        claimant_id_url = await uploadDocToStorage(claimantIdFile, user.id, orderTag, "claimant-id");
      }
      if (permitFile) {
        permit_url = await uploadDocToStorage(permitFile, user.id, orderTag, "permit");
      }

      const lineItems = items.map((it) => ({
        product_id: it.id ?? it.product_id ?? null,
        name: it.name,
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 1),
        image_url: it.image_url || null,
      }));

      const payload = {
        items: [
          ...lineItems,
          ...extraLineItems.map((it) => ({
            product_id: null,
            name: it.name,
            price: Number(it.price || 0),
            quantity: Number(it.quantity || 1),
            image_url: null,
          })),
        ],
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        total: Number(total.toFixed(2)),
        payment_method: null,
        purchase_type: purchaseType,
        cadaver: isForDeceased
          ? {
              ...cadaver,
              age: cadaver.age ? Number(cadaver.age) : null,
              death_datetime: cadaver.death_datetime,
              pickup_datetime: cadaver.pickup_datetime,
              death_certificate_url,
              claimant_id_url,
              permit_url,
            }
          : null,
        chapel_booking:
          bookingEnabled && selectedChapel
            ? {
                chapel_id: selectedChapel.id,
                start_date: startDate,
                end_date: endDate,
                days: chapelDays,
                chapel_amount: chapelBookingTotal,
              }
            : null,
        cold_storage_booking: coldEnabled
          ? { start_date: coldStartDate, end_date: coldEndDate, days: coldValidDays, amount: coldStorageTotal }
          : null,
      };

      const res = await fetch(`${API_BASE}/api/xendit/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Invoice API error: ${res.status} ${txt}`);
      }
      const data = await res.json();
      if (!data || !data.invoice_url) throw new Error("Invalid response from invoice API.");

      clearCart();
      sessionStorage.removeItem("checkout.items");
      window.location.href = data.invoice_url;
    } catch (err) {
      console.error("Order placement failed:", err);
      setErrorMsg(`Error: ${err.message || "Checkout failed."}`);
      setSaving(false);
    }
  };

  // Payment pages
  if (paymentStatus === "success") {
    return (
      <>
        <Header />
        <div className="checkout-page payment-status-page success">
          <h1>Payment Successful!</h1>
          <p>Thank you for your order.</p>
          <Link to="/profile" className="place-order">View Profile & Orders</Link>
          <Link to="/catalog" className="back-cart">Continue Shopping</Link>
        </div>
        <Footer />
      </>
    );
  }
  if (paymentStatus === "failure") {
    return (
      <>
        <Header />
        <div className="checkout-page payment-status-page failure">
          <h1>Payment Failed</h1>
          <p>Please return to cart and try again.</p>
          <Link to="/cart" className="place-order">Return to Cart</Link>
          <Link to="/catalog" className="back-cart">Continue Shopping</Link>
        </div>
        <Footer />
      </>
    );
  }
  if (items.length === 0 && !paymentStatus) {
    return (
      <>
        <Header />
        <div className="checkout-page empty-checkout"><p>Loading cart or redirecting...</p></div>
        <Footer />
      </>
    );
  }

  // View
  const maxDob = todayYMD();
  const deathMin = cadaver.dob ? `${cadaver.dob}T00:00` : undefined;

  return (
    <>
      <Header />
      <div className="checkout-page">
        <h1>Checkout</h1>
        <div className="checkout-grid">
          {/* LEFT: Items */}
          <div className="co-items">
            {items.map((it) => (
              <div className="co-item" key={it.id || `item-${Math.random()}`}>
                <img
                  src={it.image_url || "https://placehold.co/92x92/eee/ccc?text=N/A"}
                  alt={it.name || "Item"}
                  onError={(e) => (e.currentTarget.src = "https://placehold.co/92x92/eee/ccc?text=Error")}
                />
                <div className="co-item-info">
                  <h3>{it.name || "Unknown Item"}</h3>
                  <p className="price">{php(it.price)}</p>
                  <p className="qty">Qty: {it.quantity || 1}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: Summary */}
          <div className="co-summary">
            <h2>Order Summary</h2>

            {/* Who is this for? */}
            <div className="card-block">
              <div className="block-title">Who is this for?</div>
              <div className="who-options">
                <label className="radio">
                  <input
                    type="radio"
                    name="purchaseType"
                    value="self"
                    checked={purchaseType === "self"}
                    onChange={() => setPurchaseType("self")}
                  />
                  <span>Myself (pre-need)</span>
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="purchaseType"
                    value="someone"
                    checked={purchaseType === "someone"}
                    onChange={() => setPurchaseType("someone")}
                  />
                  <span>Someone passed (at-need)</span>
                </label>
              </div>
              {isForDeceased ? (
                <p className="hint">Cadaver details & death certificate required.</p>
              ) : (
                <p className="hint">Pre-need plan.</p>
              )}
              {isForDeceased && (
                <button
                  type="button"
                  className={`cadaver-btn inline ${cadaverDetailsComplete ? "success" : ""}`}
                  onClick={() => {
                    setModalErrorMsg("");
                    setShowCadaverModal(true);
                  }}
                >
                  {cadaverDetailsComplete ? "View/Edit Cadaver Details" : "Add Cadaver Details"}
                </button>
              )}
            </div>

            {/* Chapel Booking */}
            <div className="card-block">
              <div className="block-title">Chapel Booking (optional)</div>
              <label className="switch-row">
                <input type="checkbox" checked={bookingEnabled} onChange={(e) => setBookingEnabled(e.target.checked)} />
                <span>Include chapel booking</span>
              </label>

              {bookingEnabled && (
                <>
                  <div className="mini-grid">
                    <div className="field">
                      <label>Chapel</label>
                      <select value={selectedChapelId} onChange={(e) => setSelectedChapelId(e.target.value)}>
                        <option value="">Select chapel</option>
                        {chapels.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.daily_rate ? `(${php(c.daily_rate)}/day)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Start Date</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Days</label>
                      <input type="number" min={1} value={numDays} onChange={(e) => setNumDays(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>End Date</label>
                      <input type="date" value={endDate} readOnly />
                    </div>
                  </div>

                  {checkingAvailability && <p className="info">Checking availability…</p>}
                  {availabilityErr && <p className="error">{availabilityErr}</p>}
                  {isAvailable === true && <p className="ok">Dates available.</p>}
                  {isAvailable === false && <p className="error">Dates unavailable.</p>}
                </>
              )}
            </div>

            {/* Cold Storage */}
            <div className="card-block">
              <div className="block-title">Cold Storage (optional)</div>
              <label className="switch-row">
                <input type="checkbox" checked={coldEnabled} onChange={(e) => setColdEnabled(e.target.checked)} />
                <span>Reserve cold storage</span>
              </label>
              {coldEnabled && (
                <div className="mini-grid">
                  <div className="field">
                    <label>Start Date</label>
                    <input type="date" value={coldStartDate} onChange={(e) => setColdStartDate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Days</label>
                    <input type="number" min={1} value={coldDays} onChange={(e) => setColdDays(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>End Date</label>
                    <input type="date" value={coldEndDate} readOnly />
                  </div>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="row"><span>Subtotal</span><span>{php(subtotal)}</span></div>
            <div className="row"><span>Tax (12%)</span><span>{php(tax)}</span></div>
            <div className="row"><span>Shipping</span><span>{shipping === 0 ? "Free" : php(shipping)}</span></div>
            {extraLineItems.length > 0 && (
              <div className="row addon-wrap">
                {extraLineItems.map((li) => (
                  <div key={li.id} className="addon-row">
                    <span>{li.name}</span>
                    <span>{li.quantity} × {php(li.price)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="total"><strong>Total</strong><strong>{php(total)}</strong></div>

            {errorMsg && <p className="error">{errorMsg}</p>}

            <button className="place-order" onClick={handlePlaceOrder} disabled={saving}>
              {saving ? "Processing..." : "Proceed to Payment"}
            </button>
            <Link to="/cart" className="back-cart">Back to Cart</Link>
          </div>
        </div>
      </div>

      {/* Cadaver Modal */}
      {showCadaverModal && isForDeceased && (
        <div className="modal-overlay" onClick={() => setShowCadaverModal(false)}>
          <div className="modal compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cadaver Details</h3>
              <button className="close" onClick={() => setShowCadaverModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {modalErrorMsg && <p className="error" style={{ marginBottom: "0.75rem" }}>{modalErrorMsg}</p>}

              {/* Identity */}
              <div className="section-divider">Identity</div>
              <div className="row-grid two">
                <div className="field required">
                  <label>Full Name</label>
                  <input name="full_name" value={cadaver.full_name} onChange={onChangeField} />
                </div>
                <div className="field">
                  <label>Date of Birth</label>
                  <input type="date" name="dob" max={maxDob} value={cadaver.dob} onChange={onChangeField} />
                </div>
                <div className="field">
                  <label>Age</label>
                  <input type="number" min={0} name="age" value={cadaver.age} onChange={onChangeField} />
                </div>
                <div className="field required">
                  <label>Sex</label>
                  <select name="sex" value={cadaver.sex} onChange={onChangeField}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Intersex / Other">Intersex / Other</option>
                  </select>
                </div>
                <div className="field required">
                  <label>Civil Status</label>
                  <select name="civil_status" value={cadaver.civil_status} onChange={onChangeField}>
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Separated">Separated</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="field required">
                  <label>Religion</label>
                  <input name="religion" value={cadaver.religion} onChange={onChangeField} />
                </div>
              </div>

              {/* Death details */}
              <div className="section-divider">Death Details</div>
              <div className="row-grid two">
                <div className="field required">
                  <label>Date & Time of Death</label>
                  <input
                    type="datetime-local"
                    name="death_datetime"
                    value={cadaver.death_datetime}
                    min={deathMin}
                    onChange={onChangeField}
                  />
                </div>
                <div className="field required">
                  <label>Place of Death</label>
                  <input name="place_of_death" value={cadaver.place_of_death} onChange={onChangeField} />
                </div>
                <div className="field required">
                  <label>Cause of Death</label>
                  <select name="cause_of_death" value={cadaver.cause_of_death} onChange={onChangeField}>
                    <option value="">Select cause</option>
                    {COMMON_CAUSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {cadaver.cause_of_death === "Other" && (
                  <div className="field required">
                    <label>Please specify cause</label>
                    <input name="cause_of_death_other" value={cadaver.cause_of_death_other} onChange={onChangeField} />
                  </div>
                )}
              </div>

              {/* Next of kin */}
              <div className="section-divider">Next of Kin</div>
              <div className="row-grid two">
                <div className="field required">
                  <label>Full Name</label>
                  <input name="kin_name" value={cadaver.kin_name} onChange={onChangeField} />
                </div>
                <div className="field required">
                  <label>Relationship</label>
                  <select name="kin_relation" value={cadaver.kin_relation} onChange={onChangeField}>
                    <option value="">Select relationship</option>
                    {KIN_RELATION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {cadaver.kin_relation === "Other" && (
                  <div className="field required" style={{ gridColumn: "1 / -1" }}>
                    <label>Please specify relationship</label>
                    <input name="kin_relation_other" value={cadaver.kin_relation_other} onChange={onChangeField} />
                  </div>
                )}
                <div className="field required">
                  <label>Mobile</label>
                  <input name="kin_mobile" value={cadaver.kin_mobile} onChange={onChangeField} />
                </div>
                <div className="field required">
                  <label>Email</label>
                  <input type="email" name="kin_email" value={cadaver.kin_email} onChange={onChangeField} />
                </div>
                <div className="field required" style={{ gridColumn: "1 / -1" }}>
                  <label>Address</label>
                  <input name="kin_address" value={cadaver.kin_address} onChange={onChangeField} />
                </div>
              </div>

              {/* Logistics */}
              <div className="section-divider">Logistics</div>
              <div className="row-grid two">
                <div className="field required">
                  <label>Current Location of Remains</label>
                  <input name="remains_location" value={cadaver.remains_location} onChange={onChangeField} />
                </div>
                <div className="field required">
                  <label>Pickup Date & Time</label>
                  <input
                    type="datetime-local"
                    name="pickup_datetime"
                    value={cadaver.pickup_datetime}
                    onChange={onChangeField}
                  />
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      name="special_handling"
                      checked={cadaver.special_handling}
                      onChange={onChangeField}
                    />
                    <span>Special handling required</span>
                  </label>
                </div>

                {cadaver.special_handling && (
                  <>
                    <div className="field required">
                      <label>Reason</label>
                      <select
                        name="special_handling_reason"
                        value={cadaver.special_handling_reason}
                        onChange={onChangeField}
                      >
                        <option value="">Select reason</option>
                        {SPECIAL_HANDLING_REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    {cadaver.special_handling_reason === "Other" && (
                      <div className="field required">
                        <label>Please specify reason</label>
                        <input
                          name="special_handling_other"
                          value={cadaver.special_handling_other}
                          onChange={onChangeField}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Special Instructions (optional)</label>
                  <textarea
                    name="special_instructions"
                    value={cadaver.special_instructions}
                    onChange={onChangeField}
                    rows={2}
                    placeholder="Any sensitivities, faith/cultural preferences, etc."
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="section-divider">Documents</div>
              <div className="docs three">
                <div className="field required">
                  <label>Death Certificate *</label>
                  <input type="file" accept="image/*,.pdf" onChange={onFileChange(setDeathCertFile)} />
                  {deathCertFile && <small className="file-note">{deathCertFile.name}</small>}
                </div>
                <div className="field">
                  <label>Claimant ID (front/back)</label>
                  <input type="file" accept="image/*,.pdf" onChange={onFileChange(setClaimantIdFile)} />
                  {claimantIdFile && <small className="file-note">{claimantIdFile.name}</small>}
                </div>
                <div className="field">
                  <label>Transfer / Burial Permit</label>
                  <input type="file" accept="image/*,.pdf" onChange={onFileChange(setPermitFile)} />
                  {permitFile && <small className="file-note">{permitFile.name}</small>}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={handleModalDone} className="secondary">Done</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
