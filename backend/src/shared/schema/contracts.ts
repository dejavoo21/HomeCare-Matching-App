export const REQUEST_STATUS = {
  QUEUED: 'queued',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  EN_ROUTE: 'en_route',
  IN_VISIT: 'in_visit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PRESENCE_STATUS = {
  AVAILABLE: 'available',
  ON_SHIFT: 'on_shift',
  IN_VISIT: 'in_visit',
  OFFLINE: 'offline',
} as const;
