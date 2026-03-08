CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_url text NOT NULL,
  secret text,
  is_active boolean NOT NULL DEFAULT true,
  event_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active
  ON webhook_subscriptions(is_active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  last_http_status int,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_next
  ON webhook_deliveries(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription
  ON webhook_deliveries(subscription_id);

ALTER TABLE webhook_dead_letters
  ADD COLUMN IF NOT EXISTS delivery_id uuid,
  ADD COLUMN IF NOT EXISTS subscription_id uuid,
  ADD COLUMN IF NOT EXISTS last_http_status int,
  ADD COLUMN IF NOT EXISTS attempt_count int;

ALTER TABLE webhook_dead_letters
  ALTER COLUMN target_url DROP NOT NULL,
  ALTER COLUMN attempts DROP NOT NULL,
  ALTER COLUMN max_attempts DROP NOT NULL;

UPDATE webhook_dead_letters
SET attempt_count = COALESCE(attempt_count, attempts)
WHERE attempt_count IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_dead_letters_created
  ON webhook_dead_letters(created_at DESC);
