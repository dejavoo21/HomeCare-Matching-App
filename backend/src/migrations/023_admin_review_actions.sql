ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS admin_follow_up_scheduled boolean DEFAULT false;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS admin_escalation_acknowledged boolean DEFAULT false;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS admin_issue_resolved boolean DEFAULT false;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS admin_review_notes text;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz;

ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES users(id);
