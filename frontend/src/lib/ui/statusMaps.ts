export const verificationBadgeVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending_review: 'warning',
  info_requested: 'info',
  verified: 'success',
  rejected: 'danger',
  pending: 'warning',
  approved: 'success',
};

export const checkBadgeVariant: Record<string, 'neutral' | 'success' | 'danger'> = {
  pending: 'neutral',
  verified: 'success',
  failed: 'danger',
};

export const dispatchBadgeVariant: Record<
  string,
  'warning' | 'danger' | 'success' | 'violet' | 'neutral' | 'info'
> = {
  queued: 'warning',
  offered: 'info',
  unassigned: 'warning',
  at_risk: 'danger',
  in_progress: 'success',
  accepted: 'success',
  late_checkin: 'violet',
  en_route: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

export const presenceBadgeVariant: Record<string, 'success' | 'warning' | 'neutral' | 'info' | 'violet'> = {
  available: 'success',
  online: 'success',
  on_shift: 'warning',
  in_visit: 'info',
  busy: 'warning',
  away: 'neutral',
  offline: 'neutral',
};
