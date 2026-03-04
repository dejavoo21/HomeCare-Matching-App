import type { Pool, PoolClient } from "pg";
import { RealtimeEventsRepo } from "../repositories/realtime-events.repo";

export async function emitRealtimeEventToDb(
  pool: Pool,
  type: string,
  payload: any,
  client?: PoolClient
) {
  const repo = new RealtimeEventsRepo(pool);
  await repo.enqueue(type, payload, client);
}
