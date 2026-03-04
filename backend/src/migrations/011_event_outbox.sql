-- ============================================================================
-- Migration: 011_event_outbox.sql
-- Purpose: Implement outbox pattern for transaction-safe events
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    failed_at timestamptz,
    retry_count integer DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT processed_or_failed CHECK (processed_at IS NULL OR failed_at IS NULL)
);

-- Index for finding unprocessed events (most important)
CREATE INDEX IF NOT EXISTS idx_event_outbox_unprocessed
ON event_outbox(created_at ASC)
WHERE processed_at IS NULL AND failed_at IS NULL;

-- Index for finding failed events
CREATE INDEX IF NOT EXISTS idx_event_outbox_failed
ON event_outbox(created_at ASC)
WHERE failed_at IS NOT NULL;

-- Index for aggregate tracking
CREATE INDEX IF NOT EXISTS idx_event_outbox_aggregate
ON event_outbox(aggregate_type, aggregate_id);

-- Index for event type
CREATE INDEX IF NOT EXISTS idx_event_outbox_type
ON event_outbox(event_type);

COMMENT ON TABLE event_outbox IS 'Outbox pattern: transaction-safe event storage. Events inserted in same transaction as domain changes guarantee consistency.';
COMMENT ON COLUMN event_outbox.processed_at IS 'Set when event successfully delivered to all subscribers';
COMMENT ON COLUMN event_outbox.failed_at IS 'Set when event delivery fails after max retries (dead-letter)';
COMMENT ON COLUMN event_outbox.retry_count IS 'Number of delivery attempts (increments on each failure)';
