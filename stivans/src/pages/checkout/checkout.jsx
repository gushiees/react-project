// src/pages/checkout/checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { useCart } from "../../contexts/cartContext";
import { supabase } from "../../supabaseClient";
import "./checkout.css";
import { uploadDeathCertificate } from "../../data/orders";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function php(amount) {
  const n = Number(amount) || 0;
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- Phone helpers
function digitsOnly(raw) {
  return String(raw || "").replace(/[^\d]/g, "");
}
function isValidPhone(raw) {
  const d = digitsOnly(raw);
  return d.length >= 8 && d.length <= 15;
}

// ---- Date helpers
function isoDateOnly(dt) {
  return (dt || "").slice(0, 10);
}
function isFuture(dateTimeLocal) {
  const now = new Date();
  const d = new Date(dateTimeLocal);
  return d.getTime() > now.getTime();
}
function computeAgeFromDates(dobISO, deathDTLocal) {
  if (!dobISO || !deathDTLocal) return "";
  const birth = new Date(dobISO + "T00:00:00");
  const death = new Date(deathDTLocal);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(death.getTime())) return "";
  if (death < birth) return "";
  let age = death.getFullYear() - birth.getFullYear();
  const m = death.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;
  return String(age);
}
function computeDobFromAge(ageStr, deathDTLocal) {
  const age = Number(ageStr);
  if (!deathDTLocal || !Number.isFinite(age) || age < 0 || age > 150) return "";
  const death = new Date(deathDTLocal);
  // Approximate DOB = same month/day, year - age (keeps it simple)
  const approx = new Date(death);
  approx.setFullYear(death.getFullYear() - age);
  return approx.toISOString().slice(0, 10);
}

export default function Checkout() {
  const location = useLocation();
  const { clearCart } = useCart();

  // Items from cart (router state OR sessionStorage fallback)
  const stateItems = Array.isArray(location.state?.items) ? location.state.items : null;
  const storedItems = !stateItems ? JSON.parse(sessionStorage.getItem("checkout.items") || "[]") : null;
  const items = stateItems ?? storedItems ?? [];

  // Who is this for?
  const [purchaseType, setPurchaseType] = useState("self"); // 'self' | 'someone'
  const isForDeceased = purchaseType === "someone";

  // -------- Chapel booking (optional) --------
  const [chapels, setChapels] = useState([]);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [selectedChapelId, setSelectedChapelId] = useState("");
  const [startDate, setStartDate] = useState(""); // yyyy-mm-dd
  const [numDays, setNumDays] = useState(1);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityErr, setAvailabilityErr] = useState("");
  const [isAvailable, setIsAvailable] = useState(null); // null | true | false

  // Derived chapel info
  const selectedChapel = useMemo(
    () => chapels.find((c) => c.id === selectedChapelId) || null,
    [chapels, selectedChapelId]
  );
  const chapelDays = bookingEnabled ? Math.max(1, Number(numDays) || 1) : 0;
  const chapelDailyRate = Number(selectedChapel?.daily_rate || 0);
  const chapelBookingTotal = chapelDays * chapelDailyRate;

  // -------- Cold storage (optional, fully separate) --------
  const COLD_STORAGE_PER_DAY = 5000;
  const [coldEnabled, setColdEnabled] = useState(false);
  const [coldStartDate, setColdStartDate] = useState("");
  const [coldDays, setColdDays] = useState(1);

  const coldValidDays = coldEnabled ? Math.max(1, Number(coldDays) || 1) : 0;
  const coldStorageTotal = coldValidDays * COLD_STORAGE_PER_DAY;

  // Base totals (from cart)
  const baseSubtotal = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.price) * Number(it.quantity), 0),
    [items]
  );

  // Add-on line items (for invoice clarity)
  const extraLineItems = useMemo(() => {
    const rows = [];
    if (bookingEnabled && selectedChapel && chapelDays > 0) {
      rows.push({
        id: "chapel-addon",
        name: `Chapel Booking — ${selectedChapel.name} (${chapelDays} day${chapelDays > 1 ? "s" : ""})`,
        price: chapelDailyRate,
        quantity: chapelDays,
        image_url: null,
      });
    }
    if (coldEnabled && coldValidDays > 0) {
      rows.push({
        id: "cold-storage-addon",
        name: `Cold Storage (${coldValidDays} day${coldValidDays > 1 ? "s" : ""})`,
        price: COLD_STORAGE_PER_DAY,
        quantity: coldValidDays,
        image_url: null,
      });
    }
    return rows;
  }, [
    bookingEnabled,
    selectedChapel,
    chapelDays,
    chapelDailyRate,
    coldEnabled,
    coldValidDays,
  ]);

  const subtotal = useMemo(() => {
    const addOns = extraLineItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    return baseSubtotal + addOns;
  }, [baseSubtotal, extraLineItems]);

  const tax = useMemo(() => subtotal * 0.12, [subtotal]);
  const shipping = useMemo(() => (subtotal > 2000 ? 0 : 150), [subtotal]);
  const total = useMemo(() => subtotal + tax + shipping, [subtotal, tax, shipping]);

  // --- Cadaver modal & form state ---
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
    cause_of_death: "Natural Causes",
    cause_of_death_other: "",
    kin_name: "",
    kin_relation: "",
    kin_mobile: "",
    kin_email: "",
    kin_address: "",
    remains_location: "",
    special_handling: false,
    occupation: "",
    nationality: "",
    residence: "",
  });

  const [fieldErrors, setFieldErrors] = useState({}); // { fieldName: 'message' }

  const [deathCertFile, setDeathCertFile] = useState(null);
  const [claimantIdFile, setClaimantIdFile] = useState(null);
  const [permitFile, setPermitFile] = useState(null);

  // ---- Cadaver field changes, with smart behavior ----
  const onChangeField = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? !!checked : value;

    setCadaver((prev) => {
      const next = { ...prev, [name]: val };

      // Auto-calc AGE when dob + death are known
      if ((name === "dob" && next.death_datetime) || (name === "death_datetime" && next.dob)) {
        const autoAge = computeAgeFromDates(next.dob, next.death_datetime);
        next.age = autoAge || next.age; // only overwrite if valid
      }

      // Backfill DOB when user types AGE and we have death_datetime; only if dob is empty.
      if (name === "age" && next.death_datetime && !next.dob) {
        const backfill = computeDobFromAge(val, next.death_datetime);
        if (backfill) next.dob = backfill;
      }

      return next;
    });

    // clear field-level error as they type
    setFieldErrors((fe) => ({ ...fe, [name]: "" }));
  };

  // Phone: enforce digits only & length during typing
  const onPhoneChange = (e) => {
    const cleaned = digitsOnly(e.target.value).slice(0, 15);
    setCadaver((prev) => ({ ...prev, kin_mobile: cleaned }));
    if (cleaned && !isValidPhone(cleaned)) {
      setFieldErrors((fe) => ({ ...fe, kin_mobile: "8–15 digits required" }));
    } else {
      setFieldErrors((fe) => ({ ...fe, kin_mobile: "" }));
    }
  };
  const onPhoneKeyDown = (e) => {
    const allowed = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab",
    ];
    const isCtrlCombo = e.ctrlKey || e.metaKey;
    if (allowed.includes(e.key) || isCtrlCombo) return;
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Fetch chapels
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("chapels").select("id,name,daily_rate").order("name");
      if (!error && Array.isArray(data)) setChapels(data);
    })();
  }, []);

  // Helpers: end dates
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

  // Availability (chapel only)
  const checkAvailability = async () => {
    try {
      setAvailabilityErr("");
      setIsAvailable(null);
      if (!bookingEnabled || !selectedChapelId || !startDate || chapelDays < 1) return;

      setCheckingAvailability(true);
      const { data, error } = await supabase
        .from("chapel_bookings")
        .select("id,start_date,end_date,status,chapel_id")
        .eq("chapel_id", selectedChapelId)
        .neq("status", "cancelled")
        .lte("start_date", endDate)   // existing.start_date <= new.endDate
        .gte("end_date", startDate);  // existing.end_date   >= new.startDate

      if (error) throw error;
      const conflict = Array.isArray(data) && data.length > 0;
      setIsAvailable(!conflict);
      if (conflict) setAvailabilityErr("Selected dates are unavailable for this chapel. Please adjust.");
    } catch (e) {
      console.error(e);
      setAvailabilityErr("Unable to check availability right now.");
      setIsAvailable(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (bookingEnabled && selectedChapelId && startDate && chapelDays > 0) {
      checkAvailability();
    } else {
      setIsAvailable(null);
      setAvailabilityErr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingEnabled, selectedChapelId, startDate, chapelDays]);

  // ----- Validation for cadaver (at-need) -----
  const validateCadaver = () => {
    setFieldErrors({});
    if (!isForDeceased) return true;

    const req = [
      "full_name", "sex", "civil_status", "religion",
      "death_datetime", "place_of_death",
      "kin_name", "kin_relation", "kin_mobile", "kin_email", "kin_address",
      "remains_location",
    ];

    const fe = {};
    for (const k of req) {
      if (!String(cadaver[k] || "").trim()) {
        fe[k] = "Required";
      }
    }

    // phone number validation
    if (cadaver.kin_mobile && !isValidPhone(cadaver.kin_mobile)) {
      fe.kin_mobile = "8–15 digits required";
    }

    // death date constraints
    if (cadaver.death_datetime && isFuture(cadaver.death_datetime)) {
      fe.death_datetime = "Cannot be in the future";
    }
    if (cadaver.dob) {
      const birth = new Date(isoDateOnly(cadaver.dob) + "T00:00:00");
      const death = new Date(cadaver.death_datetime);
      if (death.getTime() < birth.getTime()) {
        fe.death_datetime = "Death cannot be earlier than birth";
      }
    }

    // cause of death "Other" requires detail
    if (cadaver.cause_of_death === "Other" && !String(cadaver.cause_of_death_other || "").trim()) {
      fe.cause_of_death_other = "Please specify";
    }

    // death certificate required
    if (!deathCertFile) {
      fe.death_certificate_url = "Death certificate is required";
    }

    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) {
      setErrorMsg("Please fix the highlighted fields.");
      return false;
    }

    setErrorMsg("");
    return true;
  };

  // ---- Submit
  const handlePlaceOrder = async () => {
    try {
      setErrorMsg("");

      if (items.length === 0) {
        setErrorMsg("No items selected for checkout.");
        return;
      }
      if (!validateCadaver()) return;

      // Validate chapel details if enabled
      if (bookingEnabled) {
        if (!selectedChapelId || !startDate || chapelDays < 1) {
          setErrorMsg("Please complete chapel booking details.");
          return;
        }
        if (isAvailable === false) {
          setErrorMsg("Selected chapel/dates are not available. Please adjust.");
          return;
        }
      }

      // Validate cold storage if enabled
      if (coldEnabled) {
        if (!coldStartDate || coldValidDays < 1) {
          setErrorMsg("Please complete cold storage dates.");
          return;
        }
      }

      setSaving(true);

      // Get session
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session) {
        setSaving(false);
        setErrorMsg("You must be signed in to place an order.");
        return;
      }
      const user = session.user;

      // Upload docs only when buying for someone deceased
      let death_certificate_url = null;
      let claimant_id_url = null;
      let permit_url = null;

      if (isForDeceased) {
        death_certificate_url = await uploadDeathCertificate(deathCertFile, user.id, "pending");
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
      }

      // Build payload (cart + add-ons)
      const lineItems = [
        ...items.map((it) => ({
          product_id: it.id,
          name: it.name,
          price: Number(it.price),
          quantity: Number(it.quantity),
          image_url: it.image_url || null,
        })),
        ...extraLineItems.map((it) => ({
          product_id: null, // add-on only
          name: it.name,
          price: Number(it.price),
          quantity: Number(it.quantity),
          image_url: null,
        })),
      ];

      const payload = {
        items: lineItems,
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        total: Number(total.toFixed(2)),
        payment_method: null,
        purchase_type: purchaseType, // 'self' | 'someone'
        cadaver: isForDeceased
          ? {
              ...cadaver,
              age: cadaver.age ? Number(cadaver.age) : null,
              cause_of_death:
                cadaver.cause_of_death === "Other"
                  ? cadaver.cause_of_death_other
                  : cadaver.cause_of_death,
              pickup_datetime: null, // legacy compat — not used
              death_certificate_url,
              claimant_id_url,
              permit_url,
            }
          : null,
        chapel_booking: bookingEnabled && selectedChapel
          ? {
              chapel_id: selectedChapel.id,
              start_date: startDate,
              end_date: endDate,
              days: chapelDays,
              chapel_amount: chapelBookingTotal,
            }
          : null,
        cold_storage_booking: coldEnabled
          ? {
              start_date: coldStartDate,
              end_date: coldEndDate,
              days: coldValidDays,
              amount: coldStorageTotal,
            }
          : null,
      };

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

      // Success → clear cart + redirect to Xendit
      clearCart();
      sessionStorage.removeItem("checkout.items");
      window.location.href = data.invoice_url;
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while placing your order.");
      setSaving(false);
    }
  };

  // For max attribute on death_datetime
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

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
            {/* LEFT: Items only */}
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
            </div>

            {/* RIGHT: Summary + choices + totals + CTA */}
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
                    <span>Someone who has passed (at-need)</span>
                  </label>
                </div>

                {isForDeceased ? (
                  <p className="hint">You’ll need to provide cadaver details and a death certificate before payment.</p>
                ) : (
                  <p className="hint">No cadaver details needed now. Your plan will be recorded under your account.</p>
                )}

                {isForDeceased && (
                  <button
                    type="button"
                    className="cadaver-btn inline"
                    onClick={() => setShowCadaverModal(true)}
                  >
                    Add Cadaver Details
                  </button>
                )}
              </div>

              {/* Chapel booking (optional) */}
              <div className="card-block">
                <div className="block-title">Chapel Booking (optional)</div>

                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={bookingEnabled}
                    onChange={(e) => setBookingEnabled(e.target.checked)}
                  />
                  <span>Include chapel booking for the wake</span>
                </label>

                {bookingEnabled && (
                  <>
                    <div className="row-grid tight">
                      <div className="field">
                        <label>Chapel</label>
                        <select
                          value={selectedChapelId}
                          onChange={(e) => setSelectedChapelId(e.target.value)}
                          required
                          className={fieldErrors.selectedChapelId ? "err" : ""}
                        >
                          <option value="">Select a chapel…</option>
                          {chapels.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.daily_rate ? `— ${php(c.daily_rate)}/day` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                          className={fieldErrors.startDate ? "err" : ""}
                        />
                      </div>

                      <div className="field">
                        <label>Number of Days</label>
                        <input
                          type="number"
                          min={1}
                          value={numDays}
                          onChange={(e) => setNumDays(e.target.value)}
                          required
                          className={fieldErrors.numDays ? "err" : ""}
                        />
                      </div>
                    </div>

                    {startDate && chapelDays > 0 && (
                      <p className="hint">
                        End date: <strong>{endDate || "—"}</strong>
                      </p>
                    )}

                    <div className="availability">
                      {checkingAvailability && <span>Checking availability…</span>}
                      {!checkingAvailability && availabilityErr && (
                        <span className="error">{availabilityErr}</span>
                      )}
                      {!checkingAvailability && isAvailable === true && (
                        <span className="ok">Dates are available ✅</span>
                      )}
                    </div>

                    <div className="addon-totals">
                      <div className="row">
                        <span>Chapel ({chapelDays}d × {php(chapelDailyRate)})</span>
                        <span>{php(chapelBookingTotal)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cold storage (optional, separate dates) */}
              <div className="card-block">
                <div className="block-title">Cold Storage (optional)</div>

                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={coldEnabled}
                    onChange={(e) => setColdEnabled(e.target.checked)}
                  />
                  <span>Reserve cold storage</span>
                </label>

                {coldEnabled && (
                  <>
                    <div className="row-grid tight">
                      <div className="field">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={coldStartDate}
                          onChange={(e) => setColdStartDate(e.target.value)}
                          required
                          className={fieldErrors.coldStartDate ? "err" : ""}
                        />
                      </div>

                      <div className="field">
                        <label>Number of Days</label>
                        <input
                          type="number"
                          min={1}
                          value={coldDays}
                          onChange={(e) => setColdDays(e.target.value)}
                          required
                          className={fieldErrors.coldDays ? "err" : ""}
                        />
                      </div>

                      <div className="field">
                        <label>Rate (per day)</label>
                        <input value={php(COLD_STORAGE_PER_DAY)} readOnly />
                      </div>
                    </div>

                    {coldStartDate && coldValidDays > 0 && (
                      <p className="hint">
                        End date: <strong>{coldEndDate || "—"}</strong>
                      </p>
                    )}

                    <div className="addon-totals">
                      <div className="row">
                        <span>Cold Storage ({coldValidDays}d × {php(COLD_STORAGE_PER_DAY)})</span>
                        <span>{php(coldStorageTotal)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Totals */}
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

      {/* Cadaver Modal */}
      {showCadaverModal && isForDeceased && (
        <div className="modal-overlay" onClick={() => setShowCadaverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cadaver Details</h3>
              <button className="close" onClick={() => setShowCadaverModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {/* Identity Section */}
              <div className="section-divider">Identity Information</div>
              <div className="row-grid">
                <div className="field">
                  <label data-required="*">Full Legal Name</label>
                  <input
                    name="full_name"
                    value={cadaver.full_name}
                    onChange={onChangeField}
                    className={fieldErrors.full_name ? "err" : ""}
                    required
                  />
                  {fieldErrors.full_name && <small className="ferr">{fieldErrors.full_name}</small>}
                </div>
                <div className="field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={cadaver.dob}
                    onChange={onChangeField}
                    max={new Date().toISOString().slice(0,10)}
                    className={fieldErrors.dob ? "err" : ""}
                  />
                  {fieldErrors.dob && <small className="ferr">{fieldErrors.dob}</small>}
                </div>
                <div className="field">
                  <label>Age (auto if DOB set)</label>
                  <input
                    type="number"
                    name="age"
                    value={cadaver.age}
                    onChange={onChangeField}
                    min={0}
                    max={150}
                    className={fieldErrors.age ? "err" : ""}
                  />
                  {fieldErrors.age && <small className="ferr">{fieldErrors.age}</small>}
                </div>
              </div>

              <div className="row-grid">
                <div className="field">
                  <label data-required="*">Sex</label>
                  <select
                    name="sex"
                    value={cadaver.sex}
                    onChange={onChangeField}
                    className={fieldErrors.sex ? "err" : ""}
                    required
                  >
                    <option value="">Select…</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  {fieldErrors.sex && <small className="ferr">{fieldErrors.sex}</small>}
                </div>
                <div className="field">
                  <label data-required="*">Civil Status</label>
                  <select
                    name="civil_status"
                    value={cadaver.civil_status}
                    onChange={onChangeField}
                    className={fieldErrors.civil_status ? "err" : ""}
                    required
                  >
                    <option value="">Select…</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Widowed</option>
                    <option>Separated</option>
                  </select>
                  {fieldErrors.civil_status && <small className="ferr">{fieldErrors.civil_status}</small>}
                </div>
                <div className="field">
                  <label data-required="*">Religion</label>
                  <input
                    name="religion"
                    value={cadaver.religion}
                    onChange={onChangeField}
                    className={fieldErrors.religion ? "err" : ""}
                    required
                  />
                  {fieldErrors.religion && <small className="ferr">{fieldErrors.religion}</small>}
                </div>
              </div>

              {/* Death Details Section */}
              <div className="section-divider">Death Details</div>
              <div className="row-grid">
                <div className="field">
                  <label data-required="*">Date & Time of Death</label>
                  <input
                    type="datetime-local"
                    name="death_datetime"
                    value={cadaver.death_datetime}
                    onChange={onChangeField}
                    max={nowLocal}
                    className={fieldErrors.death_datetime ? "err" : ""}
                    required
                  />
                  {fieldErrors.death_datetime && <small className="ferr">{fieldErrors.death_datetime}</small>}
                </div>
                <div className="field">
                  <label data-required="*">Place of Death</label>
                  <input
                    name="place_of_death"
                    value={cadaver.place_of_death}
                    onChange={onChangeField}
                    className={fieldErrors.place_of_death ? "err" : ""}
                    required
                  />
                  {fieldErrors.place_of_death && <small className="ferr">{fieldErrors.place_of_death}</small>}
                </div>
                <div className="field">
                  <label data-required="*">Cause of Death</label>
                  <select
                    name="cause_of_death"
                    value={cadaver.cause_of_death}
                    onChange={onChangeField}
                    className={fieldErrors.cause_of_death ? "err" : ""}
                    required
                  >
                    <option>Natural Causes</option>
                    <option>Illness</option>
                    <option>Accident</option>
                    <option>Cardiac Arrest</option>
                    <option>Respiratory Failure</option>
                    <option>COVID-19</option>
                    <option>Unknown</option>
                    <option>Other</option>
                  </select>
                  {fieldErrors.cause_of_death && <small className="ferr">{fieldErrors.cause_of_death}</small>}
                </div>
              </div>

              {cadaver.cause_of_death === "Other" && (
                <div className="row-grid">
                  <div className="field col-2">
                    <label data-required="*">Please specify</label>
                    <input
                      name="cause_of_death_other"
                      value={cadaver.cause_of_death_other}
                      onChange={onChangeField}
                      className={fieldErrors.cause_of_death_other ? "err" : ""}
                      required
                    />
                    {fieldErrors.cause_of_death_other && <small className="ferr">{fieldErrors.cause_of_death_other}</small>}
                  </div>
                </div>
              )}

              {/* Next of Kin Section */}
              <div className="section-divider">Next of Kin Information</div>
              <div className="row-grid">
                <div className="field">
                  <label data-required="*">Primary Contact Name</label>
                  <input
                    name="kin_name"
                    value={cadaver.kin_name}
                    onChange={onChangeField}
                    className={fieldErrors.kin_name ? "err" : ""}
                    required
                  />
                  {fieldErrors.kin_name && <small className="ferr">{fieldErrors.kin_name}</small>}
                </div>
                <div className="field">
                  <label data-required="*">Relationship</label>
                  <input
                    name="kin_relation"
                    value={cadaver.kin_relation}
                    onChange={onChangeField}
                    className={fieldErrors.kin_relation ? "err" : ""}
                    required
                  />
                  {fieldErrors.kin_relation && <small className="ferr">{fieldErrors.kin_relation}</small>}
                </div>
                <div className="field">
                  <label data-required="*">Mobile</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="kin_mobile"
                    value={cadaver.kin_mobile}
                    onChange={onPhoneChange}
                    onKeyDown={onPhoneKeyDown}
                    placeholder="e.g., 09171234567"
                    className={fieldErrors.kin_mobile ? "err" : ""}
                    required
                  />
                  {fieldErrors.kin_mobile && <small className="ferr">{fieldErrors.kin_mobile}</small>}
                </div>
              </div>
              <div className="row-grid">
                <div className="field">
                  <label data-required="*">Email</label>
                  <input
                    type="email"
                    name="kin_email"
                    value={cadaver.kin_email}
                    onChange={onChangeField}
                    className={fieldErrors.kin_email ? "err" : ""}
                    required
                  />
                  {fieldErrors.kin_email && <small className="ferr">{fieldErrors.kin_email}</small>}
                </div>
                <div className="field col-2">
                  <label data-required="*">Address</label>
                  <input
                    name="kin_address"
                    value={cadaver.kin_address}
                    onChange={onChangeField}
                    className={fieldErrors.kin_address ? "err" : ""}
                    required
                  />
                  {fieldErrors.kin_address && <small className="ferr">{fieldErrors.kin_address}</small>}
                </div>
              </div>

              {/* Logistics Section */}
              <div className="section-divider">Logistics</div>
              <div className="row-grid">
                <div className="field">
                  <label data-required="*">Current Location of Remains</label>
                  <input
                    name="remains_location"
                    value={cadaver.remains_location}
                    onChange={onChangeField}
                    className={fieldErrors.remains_location ? "err" : ""}
                    required
                  />
                  {fieldErrors.remains_location && <small className="ferr">{fieldErrors.remains_location}</small>}
                </div>
                <div className="field">
                  <label>Special Handling</label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      name="special_handling"
                      checked={!!cadaver.special_handling}
                      onChange={onChangeField}
                    />
                    <span>Special handling required</span>
                  </label>
                </div>
              </div>

              {/* Documents Section */}
              <div className="section-divider">Documents</div>
              <div className="docs">
                <div className="field">
                  <label data-required="*">Death Certificate (required)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setDeathCertFile(e.target.files?.[0] || null)}
                    className={fieldErrors.death_certificate_url ? "err" : ""}
                    required
                  />
                  {deathCertFile && (
                    <small className="file-hint">
                      Selected: {deathCertFile.name}{" "}
                      <button type="button" className="linklike" onClick={() => setDeathCertFile(null)}>
                        remove
                      </button>
                    </small>
                  )}
                  {fieldErrors.death_certificate_url && <small className="ferr">{fieldErrors.death_certificate_url}</small>}
                </div>
                <div className="field">
                  <label>Claimant / Next of Kin ID (optional)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setClaimantIdFile(e.target.files?.[0] || null)}
                  />
                  {claimantIdFile && <small className="file-hint">Selected: {claimantIdFile.name}</small>}
                </div>
                <div className="field">
                  <label>Burial / Cremation Permit (optional)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPermitFile(e.target.files?.[0] || null)}
                  />
                  {permitFile && <small className="file-hint">Selected: {permitFile.name}</small>}
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
