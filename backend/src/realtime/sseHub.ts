/**
 * SSE Hub - manages connected clients and broadcasts events
 */
import type { Response } from 'express';
import type { RealtimeEvent, SSEClient } from './types';

type Role = 'admin' | 'nurse' | 'client' | 'doctor';

class SSEHub {
  // clientKey -> client
  private clientsByKey: Map<string, SSEClient> = new Map();

  /**
   * Register a new SSE client. Returns a clientKey for later cleanup.
   */
  registerClient(userId: string, role: Role, response: Response): string {
    const clientKey = `${userId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

    const client: SSEClient = {
      clientKey,
      userId,
      role,
      response,
      createdAt: Date.now(),
    };

    this.clientsByKey.set(clientKey, client);

    console.log(`[SSE] Client connected: ${userId} (${role}). Total: ${this.clientsByKey.size}`);

    // Send initial connection confirmation (named event)
    this.sendToClient(response, {
      type: 'HEARTBEAT',
      timestamp: Date.now(),
    });

    return clientKey;
  }

  /**
   * Unregister a client (call from req.on('close') in the route)
   */
  unregisterClient(clientKey: string): void {
    const client = this.clientsByKey.get(clientKey);
    if (!client) return;

    this.clientsByKey.delete(clientKey);
    try {
      client.response.end();
    } catch {
      // ignore
    }

    console.log(`[SSE] Client disconnected: ${client.userId}. Total: ${this.clientsByKey.size}`);
  }

  /**
   * Broadcast event to all eligible clients
   */
  broadcastEvent(event: RealtimeEvent): void {
    for (const client of this.clientsByKey.values()) {
      if (!this.isEligible(client, event)) continue;
      this.sendToClient(client.response, event);
    }
  }

  /**
   * Role-based filtering
   */
  private isEligible(client: SSEClient, event: RealtimeEvent): boolean {
    // Admin sees all
    if (client.role === 'admin') return true;

    // Client: ONLY events tied to their clientId
    if (client.role === 'client') {
      return !!event.clientId && event.clientId === client.userId;
    }

    // Nurse/Doctor: ONLY events tied to their professionalId
    if (client.role === 'nurse' || client.role === 'doctor') {
      return !!event.professionalId && event.professionalId === client.userId;
    }

    return false;
  }

  /**
   * Send SSE message (with named event)
   */
  private sendToClient(response: Response, event: RealtimeEvent): void {
    try {
      // Named event makes frontend handling clean
      response.write(`event: ${event.type}\n`);
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error('[SSE] Error sending to client:', error);
    }
  }

  /**
   * Send heartbeat to keep connections alive
   */
  sendHeartbeat(): void {
    const heartbeat: RealtimeEvent = {
      type: 'HEARTBEAT',
      timestamp: Date.now(),
    };

    for (const client of this.clientsByKey.values()) {
      this.sendToClient(client.response, heartbeat);
    }
  }

  /**
   * Get connection stats
   */
  getStats(): { totalConnections: number; clientsByUserId: Record<string, number> } {
    const clientsByUserId: Record<string, number> = {};

    for (const c of this.clientsByKey.values()) {
      clientsByUserId[c.userId] = (clientsByUserId[c.userId] || 0) + 1;
    }

    return {
      totalConnections: this.clientsByKey.size,
      clientsByUserId,
    };
  }
}

export const sseHub = new SSEHub();

// Heartbeat every 20 seconds
setInterval(() => sseHub.sendHeartbeat(), 20_000);
