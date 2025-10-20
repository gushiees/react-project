// src/components/ConfirmDeleteModal/ConfirmDeleteModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import './ConfirmDeleteModal.css';

const COUNTDOWN_SECONDS = 5;

/**
 * Props:
 * isOpen: boolean - Controls modal visibility
 * itemName: string - Name/ID of the item being deleted (for display)
 * itemType: string - Type of item (e.g., 'product', 'user') for context
 * onConfirm: () => void - Function to call when confirmed
 * onCancel: () => void - Function to call when cancelled or closed
 * isDeleting: boolean - Flag to show deleting state
 */
export default function ConfirmDeleteModal({
  isOpen,
  itemName,
  itemType = 'item',
  onConfirm,
  onCancel,
  isDeleting = false,
}) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef(null);

  // Start/Reset countdown when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(COUNTDOWN_SECONDS); // Reset countdown
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0; // Stop at 0
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Clear interval if modal is closed prematurely
      clearInterval(timerRef.current);
    }

    // Cleanup interval on unmount or when isOpen changes
    return () => clearInterval(timerRef.current);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const canConfirm = countdown === 0 && !isDeleting;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>Confirm Deletion</h3>
          <button onClick={onCancel} className="confirm-modal-close" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="confirm-modal-body">
          <p>
            Are you sure you want to permanently delete this {itemType}:{' '}
            <strong>{itemName || 'this item'}</strong>?
          </p>
          <p className="confirm-warning">This action cannot be undone.</p>
          {countdown > 0 && (
            <p className="confirm-countdown">
              Please wait {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          )}
          {isDeleting && <p className="confirm-deleting">Deleting...</p>}
        </div>
        <div className="confirm-modal-footer">
          <button onClick={onCancel} className="confirm-btn cancel" disabled={isDeleting}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`confirm-btn confirm ${!canConfirm ? 'disabled' : ''}`}
            disabled={!canConfirm}
          >
            {countdown > 0 ? `Confirm (${countdown})` : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}