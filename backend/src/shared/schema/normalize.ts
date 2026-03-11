import { PRESENCE_STATUS, REQUEST_STATUS } from './contracts';

export function normalizeRequestStatus(value?: string | null) {
  const raw = String(value || '').toLowerCase().trim();

  if (raw === 'enroute' || raw === 'en_route') return REQUEST_STATUS.EN_ROUTE;
  if (raw === 'invisit' || raw === 'in_visit') return REQUEST_STATUS.IN_VISIT;
  if (raw === 'queued') return REQUEST_STATUS.QUEUED;
  if (raw === 'offered') return REQUEST_STATUS.OFFERED;
  if (raw === 'accepted') return REQUEST_STATUS.ACCEPTED;
  if (raw === 'completed') return REQUEST_STATUS.COMPLETED;
  if (raw === 'cancelled') return REQUEST_STATUS.CANCELLED;

  return REQUEST_STATUS.QUEUED;
}

export function normalizePresenceStatus(value?: string | null) {
  const raw = String(value || '').toLowerCase().trim();

  if (raw === 'invisit' || raw === 'in_visit') return PRESENCE_STATUS.IN_VISIT;
  if (raw === 'onshift' || raw === 'on_shift') return PRESENCE_STATUS.ON_SHIFT;
  if (raw === 'available') return PRESENCE_STATUS.AVAILABLE;
  if (raw === 'offline') return PRESENCE_STATUS.OFFLINE;

  return PRESENCE_STATUS.OFFLINE;
}

export function normalizeProfessionalId(record: any) {
  return (
    record?.professional_id ??
    record?.professionalId ??
    record?.assignedProfessionalId ??
    record?.clinician_id ??
    record?.clinicianId ??
    null
  );
}
