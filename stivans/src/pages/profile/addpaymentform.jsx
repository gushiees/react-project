import { useState } from 'react';

// This component will receive functions to handle save and cancel actions
export default function AddPaymentForm({ onSave, onCancel, loading }) {
  const [cardType, setCardType] = useState('Visa');
  const [last4, setLast4] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      card_type: cardType,
      last4,
      exp_month: parseInt(expMonth, 10),
      exp_year: parseInt(expYear, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="add-payment-form">
      <h3>Add New Payment Method</h3>
      <div className="form-group">
        <label htmlFor="cardType">Card Type</label>
        <select id="cardType" value={cardType} onChange={(e) => setCardType(e.target.value)}>
          <option>Visa</option>
          <option>Mastercard</option>
          <option>Amex</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="last4">Last 4 Digits</label>
        <input
          id="last4"
          type="text"
          maxLength="4"
          value={last4}
          onChange={(e) => setLast4(e.target.value)}
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="expMonth">Expiry Month (MM)</label>
          <input id="expMonth" type="text" maxLength="2" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="expYear">Expiry Year (YYYY)</label>
          <input id="expYear" type="text" maxLength="4" value={expYear} onChange={(e) => setExpYear(e.target.value)} required />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="button-light">Cancel</button>
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Card'}</button>
      </div>
    </form>
  );
}