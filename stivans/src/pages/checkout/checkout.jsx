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

  const validateCadaver = () => {
    if (!isForDeceased) return true;
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
              death_datetime: cadaver.death_datetime,
              pickup_datetime: cadaver.pickup_datetime,
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
