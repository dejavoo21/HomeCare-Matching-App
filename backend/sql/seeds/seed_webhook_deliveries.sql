WITH subs AS (
  SELECT id, name
  FROM webhook_subscriptions
),
seed_rows AS (
  SELECT
    s.id AS subscription_id,
    'REQUEST_STATUS_CHANGED'::text AS event_type,
    jsonb_build_object(
      'requestId', 'demo-request-001',
      'oldStatus', 'queued',
      'newStatus', 'offered',
      'timestamp', now()
    ) AS payload,
    CASE
      WHEN s.name = 'CRM Partner Events' THEN 'delivered'
      ELSE 'failed'
    END AS status,
    CASE
      WHEN s.name = 'CRM Partner Events' THEN 1
      ELSE 2
    END AS attempt_count,
    6 AS max_attempts,
    now() + interval '5 minutes' AS next_attempt_at,
    CASE
      WHEN s.name = 'CRM Partner Events' THEN null
      ELSE 'HTTP 401: Unauthorized'
    END AS last_error,
    CASE
      WHEN s.name = 'CRM Partner Events' THEN 200
      ELSE 401
    END AS last_http_status,
    CASE
      WHEN s.name = 'CRM Partner Events' THEN now() - interval '20 minutes'
      ELSE null
    END AS delivered_at,
    now() - interval '20 minutes' AS created_at,
    now() AS updated_at
  FROM subs s
)
INSERT INTO webhook_deliveries
  (subscription_id, event_type, payload, status, attempt_count, max_attempts, next_attempt_at, last_error, last_http_status, delivered_at, created_at, updated_at)
SELECT
  sr.subscription_id,
  sr.event_type,
  sr.payload,
  sr.status,
  sr.attempt_count,
  sr.max_attempts,
  sr.next_attempt_at,
  sr.last_error,
  sr.last_http_status,
  sr.delivered_at,
  sr.created_at,
  sr.updated_at
FROM seed_rows sr
WHERE NOT EXISTS (
  SELECT 1
  FROM webhook_deliveries d
  WHERE d.subscription_id = sr.subscription_id
    AND d.event_type = sr.event_type
    AND d.payload->>'requestId' = 'demo-request-001'
);
