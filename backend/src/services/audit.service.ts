// ============================================================================
// AUDIT SERVICE
// ============================================================================
// Centralized audit logging for compliance and debugging

import { Pool, PoolClient } from 'pg';

export interface AuditLogEntry {
  actionType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
  actorId?: string;
}

export async function logAudit(
  pool: Pool | PoolClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.actorId || null,
        entry.actionType,
        entry.entityType,
        entry.entityId,
        JSON.stringify(entry.metadata),
      ]
    );
  } catch (err) {
    console.error('Error logging audit:', err);
    // Don't throw - audit failures shouldn't break main flow
  }
}

export async function getAuditLogs(
  pool: Pool,
  filters: {
    action?: string;
    entityType?: string;
    actor?: string;
    daysBack?: number;
    limit?: number;
  }
): Promise<any[]> {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (filters.action) {
    query += ` AND action = $${params.length + 1}`;
    params.push(filters.action);
  }

  if (filters.entityType) {
    query += ` AND entity_type = $${params.length + 1}`;
    params.push(filters.entityType);
  }

  if (filters.actor) {
    query += ` AND actor_user_id = $${params.length + 1}`;
    params.push(filters.actor);
  }

  if (filters.daysBack) {
    query += ` AND created_at > NOW() - INTERVAL '${filters.daysBack} days'`;
  }

  query += ` ORDER BY created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(filters.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}
