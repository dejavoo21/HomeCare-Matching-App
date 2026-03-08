CREATE TABLE IF NOT EXISTS evv_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES care_requests(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  source text NOT NULL DEFAULT 'web',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_events_request
  ON evv_events(request_id);

CREATE INDEX IF NOT EXISTS idx_evv_events_professional
  ON evv_events(professional_id);

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS evv_status text DEFAULT 'not_started';

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;
