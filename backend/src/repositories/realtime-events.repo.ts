import type { Pool, PoolClient } from "pg";

export type RealtimeDbEventRow = {
  id: string;
  type: string;
  payload: any;
  created_at: string;
};

export class RealtimeEventsRepo {
  constructor(private pool: Pool) {}

  async enqueue(type: string, payload: any, client?: PoolClient): Promise<void> {
    const db = client ?? this.pool;
    await db.query(
      `INSERT INTO realtime_events (type, payload) VALUES ($1, $2)`,
      [type, JSON.stringify(payload)]
    );
  }

  // NOTE: fetching undelivered must be done within a transaction using a client
  async fetchUndeliveredTx(client: PoolClient, limit = 100): Promise<RealtimeDbEventRow[]> {
    const res = await client.query(
      `SELECT id, type, payload, created_at
       FROM realtime_events
       WHERE delivered_at IS NULL
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );
    return res.rows;
  }

  async markDeliveredTx(client: PoolClient, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await client.query(
      `UPDATE realtime_events
       SET delivered_at = now()
       WHERE id = ANY($1::uuid[])`,
      [ids]
    );
  }

  // helper to get a client
  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }
}
