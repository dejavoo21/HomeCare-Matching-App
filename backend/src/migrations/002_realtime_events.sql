-- ============================================================================
-- MIGRATION: 002_realtime_events.sql
-- ============================================================================
-- Create realtime events table for cross-process event relay
-- Worker writes events, API reads and broadcasts to SSE clients

CREATE TABLE IF NOT EXISTS realtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_undelivered
  ON realtime_events (created_at)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_realtime_events_created
  ON realtime_events (created_at DESC);
