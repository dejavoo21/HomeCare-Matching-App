INSERT INTO webhook_subscriptions
  (name, target_url, secret, is_active, event_types, created_at, updated_at)
SELECT
  v.name,
  v.target_url,
  v.secret,
  v.is_active,
  v.event_types,
  now(),
  now()
FROM (
  VALUES
    (
      'CRM Partner Events'::text,
      'https://crm-partner.example.com/webhooks/homecare'::text,
      'crm-demo-secret'::text,
      true,
      '["REQUEST_CREATED","REQUEST_STATUS_CHANGED","OFFER_CREATED","OFFER_ACCEPTED"]'::jsonb
    ),
    (
      'Notification Hub Events'::text,
      'https://notify-hub.example.com/hooks/events'::text,
      'notify-demo-secret'::text,
      true,
      '["VISIT_STATUS_CHANGED","ACCESS_REQUEST_APPROVED","ACCESS_REQUEST_REJECTED"]'::jsonb
    )
) AS v(name, target_url, secret, is_active, event_types)
WHERE NOT EXISTS (
  SELECT 1
  FROM webhook_subscriptions s
  WHERE s.name = v.name
    AND s.target_url = v.target_url
);
