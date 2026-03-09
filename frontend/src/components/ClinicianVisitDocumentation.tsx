import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function ClinicianVisitDocumentation({
  requestId,
  initialNotes = '',
  initialOutcome = '',
  initialFollowUpRequired = false,
  initialEscalationRequired = false,
  onSaved,
}: {
  requestId: string;
  initialNotes?: string;
  initialOutcome?: string;
  initialFollowUpRequired?: boolean;
  initialEscalationRequired?: boolean;
  onSaved?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    visitNotes: initialNotes,
    visitOutcome: initialOutcome,
    followUpRequired: initialFollowUpRequired,
    escalationRequired: initialEscalationRequired,
  });

  useEffect(() => {
    setForm({
      visitNotes: initialNotes,
      visitOutcome: initialOutcome,
      followUpRequired: initialFollowUpRequired,
      escalationRequired: initialEscalationRequired,
    });
  }, [
    initialNotes,
    initialOutcome,
    initialFollowUpRequired,
    initialEscalationRequired,
    requestId,
  ]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setBusy(true);
      setMessage('');

      await api.saveClinicianVisitNote({
        requestId,
        visitNotes: form.visitNotes || undefined,
        visitOutcome: form.visitOutcome || undefined,
        followUpRequired: form.followUpRequired,
        escalationRequired: form.escalationRequired,
      });

      setMessage('Visit documentation saved.');
      await onSaved?.();
    } catch (err: any) {
      console.error('Failed to save visit documentation:', err);
      setMessage(err?.message || 'Failed to save documentation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pageCard">
      <div className="pageHeaderRow">
        <div>
          <h3 className="settingsCardTitle">Visit Documentation</h3>
          <p className="settingsCardText">
            Record visit notes, outcome, and any required follow-up actions.
          </p>
        </div>
      </div>

      <form className="recurringGrid" onSubmit={save}>
        <div className="formGroup recurringGrid-full">
          <label className="formLabel">Visit Notes</label>
          <textarea
            className="input recurringTextarea"
            rows={5}
            value={form.visitNotes}
            onChange={(event) => setForm((current) => ({ ...current, visitNotes: event.target.value }))}
            placeholder="Enter clinician notes..."
          />
        </div>

        <div className="formGroup">
          <label className="formLabel">Visit Outcome</label>
          <select
            className="select"
            value={form.visitOutcome}
            onChange={(event) => setForm((current) => ({ ...current, visitOutcome: event.target.value }))}
          >
            <option value="">Select outcome</option>
            <option value="completed_successfully">Completed successfully</option>
            <option value="partial">Partially completed</option>
            <option value="no_access">No access / not available</option>
            <option value="escalated">Escalated</option>
            <option value="follow_up_required">Follow-up required</option>
          </select>
        </div>

        <div className="formGroup">
          <label className="formLabel">Actions</label>
          <div className="documentationChecks">
            <label className="checkRow">
              <input
                type="checkbox"
                checked={form.followUpRequired}
                onChange={(event) =>
                  setForm((current) => ({ ...current, followUpRequired: event.target.checked }))
                }
              />
              <span>Follow-up required</span>
            </label>

            <label className="checkRow">
              <input
                type="checkbox"
                checked={form.escalationRequired}
                onChange={(event) =>
                  setForm((current) => ({ ...current, escalationRequired: event.target.checked }))
                }
              />
              <span>Escalation required</span>
            </label>
          </div>
        </div>

        {message ? (
          <div className="recurringMessage recurringGrid-full" role="status" aria-live="polite">
            {message}
          </div>
        ) : null}

        <div className="recurringActions recurringGrid-full">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save Documentation'}
          </button>
        </div>
      </form>
    </div>
  );
}
