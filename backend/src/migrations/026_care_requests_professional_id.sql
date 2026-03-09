ALTER TABLE care_requests
ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES users(id);

UPDATE care_requests cr
SET professional_id = v.professional_id
FROM visits v
WHERE v.request_id = cr.id
  AND cr.professional_id IS NULL;

UPDATE care_requests cr
SET professional_id = va.professional_id
FROM (
  SELECT DISTINCT ON (request_id)
    request_id,
    professional_id
  FROM visit_assignments
  ORDER BY request_id, created_at DESC
) va
WHERE va.request_id = cr.id
  AND cr.professional_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_care_requests_professional_id
  ON care_requests(professional_id);
