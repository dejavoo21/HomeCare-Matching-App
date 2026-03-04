/**
 * Realtime event publisher helpers
 * Import and use these in your services to broadcast events
 */

import { eventBus } from './eventBus';
import { sseHub } from './sseHub';
import type { RealtimeEvent, RealtimeEventType } from './types';

/**
 * Publish an event to both eventBus and sseHub
 */
export function publishRealtimeEvent(event: Partial<RealtimeEvent> & { type: RealtimeEventType }): void {
  const fullEvent: RealtimeEvent = {
    ...event,
    type: event.type,
    timestamp: event.timestamp || Date.now(),
  };

  // Notify listeners (for future use)
  eventBus.publish(fullEvent);

  // Broadcast to SSE clients
  sseHub.broadcastEvent(fullEvent);

  console.log(`[Realtime] Event published: ${event.type}`, {
    requestId: event.requestId,
    visitId: event.visitId,
    professionalId: event.professionalId,
    clientId: event.clientId,
  });
}
