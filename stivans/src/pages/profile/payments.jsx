// src/pages/profile/payments.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import Button from '../../components/button/button';
import AddPaymentForm from './addpaymentform.jsx';

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
      const { data, error } = await supabase.from('payment_methods').select('*').eq('user_id', user.id);
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
  
  // --- NEW FUNCTION ---
  // 1. Function to remove a payment method from Supabase
  const handleRemovePaymentMethod = async (methodId) => {
    if (!window.confirm("Are you sure you want to remove this payment method?")) {
        return;
    }
    try {
        setLoading(true);
        setError(null);
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', methodId);

        if (error) throw error;

        // Refresh the list from the database after deleting
        await fetchPaymentMethods();
    } catch (err) {
        console.error("Error removing payment method:", err);
        setError("Failed to remove payment method.");
    } finally {
        setLoading(false);
    }
  };

  if (loading && paymentMethods.length === 0) {
    return <div className="profile-card"><p>Loading payment methods...</p></div>;
  }
  if (error) {
    return <div className="profile-card"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="profile-card">
      <h2>Payment Methods</h2>
      
      {paymentMethods.length > 0 ? (
        <div className="payment-methods-list">
          {paymentMethods.map(method => (
            <div className="payment-method-item" key={method.id}>
              <div className="payment-method-details">
                <p><strong>{method.card_type}</strong> ending in {method.last4}</p>
                <p>Expires: {method.exp_month}/{method.exp_year}</p>
              </div>
              <div className="payment-method-actions">
                {/* 2. Connect the new function to the button's action prop */}
                <Button
                  type="light"
                  label="Remove"
                  action={() => handleRemovePaymentMethod(method.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && !isAdding && <p>You don't have any saved payment methods.</p>
      )}
      
      <div className="add-payment-section">
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
    </div>
  );
};

export default Payments;