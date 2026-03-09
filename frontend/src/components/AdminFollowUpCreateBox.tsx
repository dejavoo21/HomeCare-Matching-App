import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Professional = {
  id: string;
  name: string;
  role: string;
  isActive?: boolean;
};

export function AdminFollowUpCreateBox({
  sourceRequestId,
  defaultProfessionalId = '',
  defaultUrgency = 'medium',
  defaultDescription = '',
  onCreated,
}: {
  sourceRequestId: string;
  defaultProfessionalId?: string;
  defaultUrgency?: string;
  defaultDescription?: string;
  onCreated?: () => void | Promise<void>;
}) {
  const [pros, setPros] = useState<Professional[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    preferredStart: '',
    professionalId: defaultProfessionalId,
    urgency: defaultUrgency,
    description: defaultDescription ? `Follow-up: ${defaultDescription}` : 'Follow-up visit',
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      professionalId: defaultProfessionalId,
      urgency: defaultUrgency,
      description: defaultDescription ? `Follow-up: ${defaultDescription}` : 'Follow-up visit',
    }));
  }, [defaultDescription, defaultProfessionalId, defaultUrgency, sourceRequestId]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = (await api.getProfessionals()) as { data?: Professional[] };
        setPros((response?.data || []).filter((item) => item.isActive !== false));
      } catch (err) {
        console.error('Failed to load professionals:', err);
        setPros([]);
      }
    };

    load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setBusy(true);
      setMessage('');

      await api.createFollowUpFromReview({
        sourceRequestId,
        preferredStart: form.preferredStart,
        professionalId: form.professionalId || undefined,
        urgency: form.urgency || undefined,
        description: form.description || undefined,
      });

      setMessage('Follow-up created successfully.');
      await onCreated?.();
    } catch (err: any) {
      console.error('Failed to create follow-up:', err);
      setMessage(err?.message || 'Failed to create follow-up');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="followUpBox" onSubmit={save}>
      <div className="adminActionTitle">Create Follow-up</div>

      <div className="followUpGrid">
        <div className="formGroup">
          <label className="formLabel">Next Visit Date & Time</label>
          <input
            className="input"
            type="datetime-local"
            value={form.preferredStart}
            onChange={(event) =>
              setForm((current) => ({ ...current, preferredStart: event.target.value }))
            }
            required
          />
        </div>

        <div className="formGroup">
          <label className="formLabel">Professional</label>
          <select
            className="select"
            value={form.professionalId}
            onChange={(event) =>
              setForm((current) => ({ ...current, professionalId: event.target.value }))
            }
          >
            <option value="">Unassigned</option>
            {pros.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.role})
              </option>
            ))}
          </select>
        </div>

        <div className="formGroup">
          <label className="formLabel">Urgency</label>
          <select
            className="select"
            value={form.urgency}
            onChange={(event) =>
              setForm((current) => ({ ...current, urgency: event.target.value }))
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="formGroup followUpGrid-full">
          <label className="formLabel">Description</label>
          <textarea
            className="input recurringTextarea"
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
      </div>

      {message ? (
        <div className="recurringMessage" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      <div className="adminActionFoot">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Creating...' : 'Create Follow-up'}
        </button>
      </div>
    </form>
  );
}
