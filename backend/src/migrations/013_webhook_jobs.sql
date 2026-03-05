-- ============================================================================
-- MIGRATION: 013_webhook_jobs.sql
-- ============================================================================
-- Webhook delivery queue with retry logic and dead-letter storage

CREATE TABLE IF NOT EXISTS webhook_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(80) NOT NULL,
  target_url text NOT NULL,
  payload jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'dead')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 8,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_jobs_status ON webhook_jobs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_next_attempt 
  ON webhook_jobs(status, next_attempt_at) 
  WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_created_at ON webhook_jobs(created_at DESC);

-- Dead-letter queue for final failures (audit trail)
CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_job_id uuid REFERENCES webhook_jobs(id) ON DELETE SET NULL,
  event_type varchar(80) NOT NULL,
  target_url text NOT NULL,
  payload jsonb NOT NULL,
  attempts int NOT NULL,
  max_attempts int NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_dead_letters_created_at ON webhook_dead_letters(created_at DESC);
