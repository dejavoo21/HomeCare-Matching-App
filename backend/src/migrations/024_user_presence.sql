CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  presence_status text NOT NULL DEFAULT 'offline',
  custom_status text,
  current_request_id uuid NULL REFERENCES care_requests(id) ON DELETE SET NULL,
  current_visit_id uuid NULL REFERENCES care_requests(id) ON DELETE SET NULL,
  region text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_status
  ON user_presence(presence_status);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON user_presence(last_seen_at DESC);
