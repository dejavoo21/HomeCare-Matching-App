import { useEffect } from 'react';

interface ToastProps {
  message: string;
  tone?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, tone = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <span>{message}</span>
      <button
        className="toastClose"
        onClick={onClose}
        aria-label="Close toast"
      >
        ✕
      </button>
    </div>
  );
}
