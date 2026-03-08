import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Client = {
  id: string;
  name: string;
  email: string;
};

type Professional = {
  id: string;
  name: string;
  role: string;
  isActive?: boolean;
};

type RecurrenceType = 'daily' | 'every_x_days' | 'weekly';

export function RecurringScheduleForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    clientId: '',
    professionalId: '',
    serviceType: 'MEDICATION_ADMIN',
    addressText: '',
    description: '',
    urgency: 'medium',
    startDateTime: '',
    recurrenceType: 'weekly' as RecurrenceType,
    intervalValue: 2,
    occurrences: 4,
  });

  useEffect(() => {
    async function load() {
      try {
        const [clientsResponse, professionalsResponse] = await Promise.all([
          api.getClients() as Promise<{ data?: Client[] }>,
          api.getProfessionals() as Promise<{ data?: Professional[] }>,
        ]);

        setClients(clientsResponse?.data || []);
        setProfessionals(
          (professionalsResponse?.data || []).filter((professional) => professional.isActive !== false)
        );
      } catch (err) {
        console.error('Failed to load recurring schedule form data:', err);
      }
    }

    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setBusy(true);
      setMessage('');

      await api.createRecurringSchedule({
        clientId: form.clientId,
        professionalId: form.professionalId || undefined,
        serviceType: form.serviceType,
        addressText: form.addressText,
        description: form.description || undefined,
        urgency: form.urgency,
        startDateTime: form.startDateTime,
        recurrenceType: form.recurrenceType,
        intervalValue:
          form.recurrenceType === 'every_x_days' ? Number(form.intervalValue || 1) : undefined,
        occurrences: Number(form.occurrences || 1),
      });

      setMessage('Recurring schedule created successfully.');
      setForm({
        clientId: '',
        professionalId: '',
        serviceType: 'MEDICATION_ADMIN',
        addressText: '',
        description: '',
        urgency: 'medium',
        startDateTime: '',
        recurrenceType: 'weekly',
        intervalValue: 2,
        occurrences: 4,
      });
      onCreated?.();
    } catch (err: any) {
      console.error('Recurring schedule create failed:', err);
      setMessage(err?.message || 'Failed to create recurring schedule');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pageCard">
      <div className="recurringHeader">
        <div>
          <h3 className="settingsCardTitle">Recurring Schedule</h3>
          <p className="settingsCardText">
            Create repeated home care visits quickly for recurring service needs.
          </p>
        </div>
      </div>

      <form className="recurringGrid" onSubmit={submit}>
        <div className="formGroup">
          <label className="formLabel">Client</label>
          <select
            className="select"
            value={form.clientId}
            onChange={(event) => setForm((value) => ({ ...value, clientId: event.target.value }))}
            required
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.email})
              </option>
            ))}
          </select>
        </div>

        <div className="formGroup">
          <label className="formLabel">Professional</label>
          <select
            className="select"
            value={form.professionalId}
            onChange={(event) =>
              setForm((value) => ({ ...value, professionalId: event.target.value }))
            }
          >
            <option value="">Unassigned</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name} ({professional.role})
              </option>
            ))}
          </select>
        </div>

        <div className="formGroup">
          <label className="formLabel">Service Type</label>
          <input
            className="input"
            value={form.serviceType}
            onChange={(event) => setForm((value) => ({ ...value, serviceType: event.target.value }))}
            required
          />
        </div>

        <div className="formGroup">
          <label className="formLabel">Urgency</label>
          <select
            className="select"
            value={form.urgency}
            onChange={(event) => setForm((value) => ({ ...value, urgency: event.target.value }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="formGroup recurringGrid-full">
          <label className="formLabel">Address</label>
          <input
            className="input"
            value={form.addressText}
            onChange={(event) => setForm((value) => ({ ...value, addressText: event.target.value }))}
            required
          />
        </div>

        <div className="formGroup recurringGrid-full">
          <label className="formLabel">Description</label>
          <textarea
            className="input recurringTextarea"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
          />
        </div>

        <div className="formGroup">
          <label className="formLabel">Start Date &amp; Time</label>
          <input
            className="input"
            type="datetime-local"
            value={form.startDateTime}
            onChange={(event) =>
              setForm((value) => ({ ...value, startDateTime: event.target.value }))
            }
            required
          />
        </div>

        <div className="formGroup">
          <label className="formLabel">Recurrence</label>
          <select
            className="select"
            value={form.recurrenceType}
            onChange={(event) =>
              setForm((value) => ({
                ...value,
                recurrenceType: event.target.value as RecurrenceType,
              }))
            }
          >
            <option value="daily">Daily</option>
            <option value="every_x_days">Every X days</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        {form.recurrenceType === 'every_x_days' ? (
          <div className="formGroup">
            <label className="formLabel">Interval (days)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={30}
              value={form.intervalValue}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  intervalValue: Number(event.target.value),
                }))
              }
            />
          </div>
        ) : (
          <div className="formGroup">
            <label className="formLabel">Occurrences</label>
            <input
              className="input"
              type="number"
              min={1}
              max={30}
              value={form.occurrences}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  occurrences: Number(event.target.value),
                }))
              }
            />
          </div>
        )}

        {form.recurrenceType === 'every_x_days' ? (
          <div className="formGroup">
            <label className="formLabel">Occurrences</label>
            <input
              className="input"
              type="number"
              min={1}
              max={30}
              value={form.occurrences}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  occurrences: Number(event.target.value),
                }))
              }
            />
          </div>
        ) : (
          <div />
        )}

        {message ? (
          <div className="recurringMessage recurringGrid-full" role="status" aria-live="polite">
            {message}
          </div>
        ) : null}

        <div className="recurringActions recurringGrid-full">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating...' : 'Create Recurring Schedule'}
          </button>
        </div>
      </form>
    </section>
  );
}
