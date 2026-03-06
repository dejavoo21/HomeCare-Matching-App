import React, { useState } from 'react';
import { api } from '../services/api';

export function RequestAccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [requestedRole, setRequestedRole] = useState('client');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      await api.requestAccess(name, email, requestedRole, reason);
      setMessage('Access request submitted successfully.');
      setName('');
      setEmail('');
      setRequestedRole('client');
      setReason('');
    } catch (err: any) {
      setMessage(err?.message || 'Failed to submit access request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalPanel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="requestAccessTitle"
      >
        <div className="modalHead">
          <h3 id="requestAccessTitle" className="modalTitle">Request Access</h3>
        </div>

        <form onSubmit={submit} className="modalBody">
          <div className="formGroup">
            <label htmlFor="ra-name">Name</label>
            <input
              id="ra-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="formGroup">
            <label htmlFor="ra-email">Email</label>
            <input
              id="ra-email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="formGroup">
            <label htmlFor="ra-role">Requested Role</label>
            <select
              id="ra-role"
              className="select"
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value)}
            >
              <option value="client">Client</option>
              <option value="nurse">Nurse</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="formGroup">
            <label htmlFor="ra-reason">Reason</label>
            <textarea
              id="ra-reason"
              className="input"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need access?"
            />
          </div>

          {message && <div className="note">{message}</div>}

          <div className="modalFoot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
