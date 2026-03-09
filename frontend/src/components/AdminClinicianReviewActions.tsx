import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function AdminClinicianReviewActions({
  requestId,
  initialFollowUpScheduled = false,
  initialEscalationAcknowledged = false,
  initialIssueResolved = false,
  initialReviewNotes = '',
  onSaved,
}: {
  requestId: string;
  initialFollowUpScheduled?: boolean;
  initialEscalationAcknowledged?: boolean;
  initialIssueResolved?: boolean;
  initialReviewNotes?: string;
  onSaved?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    adminFollowUpScheduled: initialFollowUpScheduled,
    adminEscalationAcknowledged: initialEscalationAcknowledged,
    adminIssueResolved: initialIssueResolved,
    adminReviewNotes: initialReviewNotes,
  });

  useEffect(() => {
    setForm({
      adminFollowUpScheduled: initialFollowUpScheduled,
      adminEscalationAcknowledged: initialEscalationAcknowledged,
      adminIssueResolved: initialIssueResolved,
      adminReviewNotes: initialReviewNotes,
    });
  }, [
    requestId,
    initialFollowUpScheduled,
    initialEscalationAcknowledged,
    initialIssueResolved,
    initialReviewNotes,
  ]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setBusy(true);
      setMessage('');

      await api.saveClinicianAdminAction({
        requestId,
        adminFollowUpScheduled: form.adminFollowUpScheduled,
        adminEscalationAcknowledged: form.adminEscalationAcknowledged,
        adminIssueResolved: form.adminIssueResolved,
        adminReviewNotes: form.adminReviewNotes || undefined,
      });

      setMessage('Admin action saved.');
      await onSaved?.();
    } catch (err: any) {
      console.error('Failed to save admin action:', err);
      setMessage(err?.message || 'Failed to save admin action');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="adminActionBox" onSubmit={save}>
      <div className="adminActionTitle">Admin Action</div>

      <div className="documentationChecks">
        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.adminFollowUpScheduled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                adminFollowUpScheduled: event.target.checked,
              }))
            }
          />
          <span>Follow-up scheduled</span>
        </label>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.adminEscalationAcknowledged}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                adminEscalationAcknowledged: event.target.checked,
              }))
            }
          />
          <span>Escalation acknowledged</span>
        </label>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.adminIssueResolved}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                adminIssueResolved: event.target.checked,
              }))
            }
          />
          <span>Issue resolved</span>
        </label>
      </div>

      <div className="formGroup">
        <label className="formLabel">Admin Review Notes</label>
        <textarea
          className="input recurringTextarea"
          rows={3}
          value={form.adminReviewNotes}
          onChange={(event) =>
            setForm((current) => ({ ...current, adminReviewNotes: event.target.value }))
          }
          placeholder="Add review notes or next action..."
        />
      </div>

      {message ? (
        <div className="recurringMessage" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      <div className="adminActionFoot">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save Admin Action'}
        </button>
      </div>
    </form>
  );
}
