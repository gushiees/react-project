// src/pages/profile/payments.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import Button from '../../components/button/button';
import AddPaymentForm from './addpaymentform.jsx';
import './payments.css'; // make sure it imports this file

const Payments = () => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchPaymentMethods = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      if (data) setPaymentMethods(data);
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      setError("Could not load your payment methods.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [user]);

  const handleSavePaymentMethod = async (newMethod) => {
    if (!user) {
      setError("You must be logged in to add a payment method.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.from('payment_methods').insert({
        ...newMethod,
        user_id: user.id,
      });
      if (error) throw error;
      await fetchPaymentMethods();
      setIsAdding(false);
    } catch (err) {
      console.error("Error saving payment method:", err);
      setError("Failed to save payment method.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId) => {
    if (!window.confirm("Remove this payment method?")) return;
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);
      if (error) throw error;
      await fetchPaymentMethods();
    } catch (err) {
      console.error("Error removing payment method:", err);
      setError("Failed to remove payment method.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payments-page">
      <div className="payments-card">
        <h2>Payment Methods</h2>

        {error && <div className="payments-alert error">{error}</div>}

        {paymentMethods.length > 0 ? (
          <div className="payment-list">
            {paymentMethods.map((m) => (
              <div className="payment-item" key={m.id}>
                <div className="payment-item__meta">
                  <div className="payment-item__title">
                    <span className="badge">{m.card_type || 'Card'}</span>
                    <span>•••• {m.last4 || '____'}</span>
                  </div>
                  <div className="payment-item__sub">
                    Expires {m.exp_month || 'MM'}/{m.exp_year || 'YYYY'}
                    {m.is_default ? <span className="pill">Default</span> : null}
                  </div>
                </div>
                <div className="payment-item__actions">
                  <Button
                    type="light"
                    label="Remove"
                    action={() => handleRemovePaymentMethod(m.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && !isAdding && <p>No saved payment methods.</p>
        )}

        <div className="payments-add">
          {isAdding ? (
            <AddPaymentForm
              onSave={handleSavePaymentMethod}
              onCancel={() => setIsAdding(false)}
              loading={loading}
            />
          ) : (
            <Button
              type="primary"
              label="Add Payment Method"
              action={() => setIsAdding(true)}
            />
          )}
        </div>

        <div className="payments-note">
          <strong>Note:</strong> These entries are for display only (e.g. receipts, preferences).
          Actual payments are created securely through Xendit invoices during checkout.
        </div>
      </div>
    </div>
  );
};

export default Payments;
