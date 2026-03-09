ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS visit_notes text;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS visit_outcome text;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS follow_up_required boolean DEFAULT false;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS escalation_required boolean DEFAULT false;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS documented_at timestamptz;
