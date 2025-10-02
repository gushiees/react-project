import { useState } from 'react';
import './addpaymentform.css';

const CARD_TYPES = ['Visa', 'Mastercard', 'AMEX', 'JCB', 'GCash', 'GrabPay', 'Other'];

export default function AddPaymentForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    card_type: '',
    last4: '',
    exp_month: '',
    exp_year: '',
    is_default: false,
  });
  const [err, setErr] = useState(null);

  function onChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErr(null);
  }

  function validate() {
    if (!form.card_type) return 'Select a payment type';
    if (!/^\d{4}$/.test(form.last4)) return 'Last 4 must be 4 digits';
    const mm = Number(form.exp_month);
    const yy = Number(form.exp_year);
    if (!(mm >= 1 && mm <= 12)) return 'Invalid month';
    if (!(yy >= 2024 && yy <= 2100)) return 'Invalid year';
    return null;
    // NOTE: We’re not collecting full PAN — this is just display metadata.
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    await onSave({
      card_type: form.card_type,
      last4: form.last4,
      exp_month: Number(form.exp_month),
      exp_year: Number(form.exp_year),
      is_default: !!form.is_default,
    });
  }

  return (
    <form className="pm-form" onSubmit={handleSubmit}>
      <div className="pm-row two">
        <div className="pm-field">
          <label>Type</label>
          <select name="card_type" value={form.card_type} onChange={onChange} required>
            <option value="">Select…</option>
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="pm-field">
          <label>Last 4</label>
          <input
            name="last4"
            placeholder="1234"
            maxLength={4}
            value={form.last4}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="pm-row two">
        <div className="pm-field">
          <label>Exp. Month</label>
          <input
            name="exp_month"
            type="number"
            placeholder="MM"
            min={1} max={12}
            value={form.exp_month}
            onChange={onChange}
            required
          />
        </div>
        <div className="pm-field">
          <label>Exp. Year</label>
          <input
            name="exp_year"
            type="number"
            placeholder="YYYY"
            min={2024} max={2100}
            value={form.exp_year}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <label className="pm-check">
        <input
          type="checkbox"
          name="is_default"
          checked={form.is_default}
          onChange={onChange}
        />
        <span>Make default</span>
      </label>

      {err && <div className="pay-alert err">{err}</div>}

      <div className="pm-actions">
        <button className="btn ghost" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
