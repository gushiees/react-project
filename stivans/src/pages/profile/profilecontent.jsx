import React from 'react';

const ProfileContent = ({ user, orders, loading, error }) => {
  const displayEmail = user?.email || 'Not provided';
  const displayPhone = user?.phone || user?.phoneNumber || 'Not provided';
  const displayDate = user?.registrationDate || user?.createdAt || 'Not available';

  return (
    <>
      <div className="profile-card user-details">
        <p><strong>Email:</strong> {displayEmail}</p>
        <p><strong>Phone:</strong> {displayPhone}</p>
        <p><strong>Registration Date:</strong> {new Date(displayDate).toLocaleDateString()}</p>
      </div>

      <div className="profile-card order-section">
        <h2>Completed Orders</h2>
        {loading ? (
          <p>Loading your orders...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : orders.length > 0 ? (
          <div className="order-grid">
            {orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <span>Order #{order._id.substring(0, 8)}</span>
                  <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="order-footer">
                  <p className="order-status">Status: {order.status}</p>
                  <p className="order-total">Total: ₱{order.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>You don't have any completed orders yet.</p>
        )}
      </div>
    </>
  );
};

export default ProfileContent;