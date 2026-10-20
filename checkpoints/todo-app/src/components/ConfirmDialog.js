import React, { useEffect } from 'react';

/**
 * ConfirmDialog is a pop-up that asks the user to confirm an action,
 * used here before deleting a task.
 * Pressing Escape or clicking outside the box cancels it.
 */
function ConfirmDialog({ message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  // Close the dialog when the Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-message"
        // Stop clicks inside the box from reaching the backdrop and closing it
        onClick={(event) => event.stopPropagation()}
      >
        <p id="dialog-message">{message}</p>
        <div className="form-buttons">
          <button type="button" className="danger-button" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
