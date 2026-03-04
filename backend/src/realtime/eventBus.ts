/**
 * In-memory event bus (pub/sub)
 * Broadcasts events to all connected SSE clients
 */

import type { RealtimeEvent, RealtimeEventType } from './types';

export interface EventListener {
  (event: RealtimeEvent): void;
}

class EventBus {
  private listeners: Map<RealtimeEventType | 'ALL', Set<EventListener>> = new Map();

  subscribe(eventType: RealtimeEventType | 'ALL', listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  publish(event: RealtimeEvent): void {
    // Notify specific event type listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // Notify 'ALL' listeners
    const allListeners = this.listeners.get('ALL');
    if (allListeners) {
      allListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in ALL listener:`, error);
        }
      });
    }
  }

  getListenerCount(): number {
    let total = 0;
    this.listeners.forEach((set) => {
      total += set.size;
    });
    return total;
  }
}

// Export singleton
export const eventBus = new EventBus();
