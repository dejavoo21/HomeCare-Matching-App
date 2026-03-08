INSERT INTO webhook_dead_letters
  (delivery_id, subscription_id, event_type, payload, last_error, last_http_status, attempt_count, created_at)
SELECT
  d.id,
  d.subscription_id,
  d.event_type,
  d.payload,
  'HTTP 401: Unauthorized',
  401,
  6,
  now() - interval '1 hour'
FROM webhook_deliveries d
JOIN webhook_subscriptions s ON s.id = d.subscription_id
WHERE s.name = 'Notification Hub Events'
  AND NOT EXISTS (
    SELECT 1
    FROM webhook_dead_letters dl
    WHERE dl.delivery_id = d.id
  )
LIMIT 1;
