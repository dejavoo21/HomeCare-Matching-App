import type { Pool } from "pg";
import { RealtimeEventsRepo } from "../repositories/realtime-events.repo";
import { sseHub } from "./sseHub";
import type { RealtimeEvent } from "./types";

export function startRealtimeRelay(pool: Pool) {
  const repo = new RealtimeEventsRepo(pool);
  const interval = parseInt(process.env.REALTIME_RELAY_INTERVAL || "1000", 10);
  const batchSize = parseInt(process.env.REALTIME_RELAY_BATCH || "100", 10);

  console.log(`[RealtimeRelay] Started. interval=${interval}ms batch=${batchSize}`);

  const tick = async () => {
    try {
      await repo.withClient(async (client) => {
        await client.query("BEGIN");

        const rows = await repo.fetchUndeliveredTx(client, batchSize);
        if (rows.length === 0) {
          await client.query("COMMIT");
          return;
        }

        // Broadcast while still in tx is fine; but don't block too long
        for (const row of rows) {
          const payload = row.payload ?? {};
          const event: RealtimeEvent = {
            ...payload,
            type: row.type as any,
            timestamp: payload.timestamp ?? Date.now(),
          };
          sseHub.broadcastEvent(event);
        }

        await repo.markDeliveredTx(client, rows.map((r) => r.id));
        await client.query("COMMIT");
      });
    } catch (err) {
      console.error("[RealtimeRelay] Error:", err);
      // If BEGIN happened, Postgres will auto-rollback on connection error,
      // but if you want extra safety you can catch inside withClient.
    }
  };

  tick();
  setInterval(tick, interval);
}
