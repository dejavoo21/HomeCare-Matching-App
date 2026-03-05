// ============================================================================
// AUDIT LOGGER - Write security + admin action events to audit_events table
// ============================================================================

import { Pool } from 'pg';

export type AuditEvent = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;         // e.g. "REQUEST_OFFERED", "REQUEST_CANCELLED", "USER_DELETED"
  entityType: string;     // e.g. "care_request", "user", "visit"
  entityId?: string | null;
  severity?: 'info' | 'warning' | 'critical';
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Write an audit event to the audit_events table
 * @param pool PostgreSQL pool
 * @param ev Audit event details
 */
export async function writeAudit(pool: Pool, ev: AuditEvent): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_events
       (actor_user_id, actor_role, action, entity_type, entity_id, severity, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        ev.actorUserId || null,
        ev.actorRole || null,
        ev.action,
        ev.entityType,
        ev.entityId || null,
        ev.severity || 'info',
        ev.ip || null,
        ev.userAgent || null,
        ev.metadata || {},
      ]
    );
  } catch (err) {
    console.error('Failed to write audit event:', err);
    // Don't throw - audit logging should not break the main request
  }
}
