/**
 * Real-time event types and payloads
 */

export type RealtimeEventType =
  | 'REQUEST_CREATED'
  | 'REQUEST_STATUS_CHANGED'
  | 'OFFER_CREATED'
  | 'OFFER_EXPIRED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'VISIT_CREATED'
  | 'VISIT_STATUS_CHANGED'
  | 'NOTIFICATION_SENT'
  | 'ADMIN_ASSIGNED'
  | 'PRESENCE_UPDATED'
  | 'HEARTBEAT';

export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: number;
  requestId?: string;
  visitId?: string;
  offerId?: string;
  professionalId?: string;
  clientId?: string;
  oldStatus?: string;
  newStatus?: string;
  offerExpiresAt?: string; // ISO string for consistency
  data?: Record<string, unknown>;
}

export interface SSEClient {
  clientKey: string;
  userId: string;
  role: 'admin' | 'nurse' | 'client' | 'doctor';
  response: any; // Response object for res.write()
  createdAt: number;
}
