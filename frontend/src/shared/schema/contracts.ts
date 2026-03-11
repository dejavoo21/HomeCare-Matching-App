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

export const REVIEW_STATUS = {
  PENDING: 'pending',
  ESCALATED: 'escalated',
  CLOSED: 'closed',
} as const;

export const ACCESS_VERIFICATION_STATUS = {
  PENDING_REVIEW: 'pending_review',
  INFO_REQUESTED: 'info_requested',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];
export type PresenceStatus = (typeof PRESENCE_STATUS)[keyof typeof PRESENCE_STATUS];
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];
export type AccessVerificationStatus =
  (typeof ACCESS_VERIFICATION_STATUS)[keyof typeof ACCESS_VERIFICATION_STATUS];
