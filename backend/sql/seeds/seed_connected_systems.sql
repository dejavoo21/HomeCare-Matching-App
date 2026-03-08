INSERT INTO connected_systems
  (name, system_type, base_url, auth_type, auth_config, is_active, status, last_tested_at, last_test_result, notes, created_at, updated_at)
SELECT
  v.name,
  v.system_type,
  v.base_url,
  v.auth_type,
  v.auth_config,
  v.is_active,
  v.status,
  v.last_tested_at,
  v.last_test_result,
  v.notes,
  now(),
  now()
FROM (
  VALUES
    (
      'Netcare Hospital API'::text,
      'hospital'::text,
      'https://netcare-hospital.example.com/fhir'::text,
      'bearer'::text,
      '{"token":"demo-netcare-token"}'::jsonb,
      true,
      'connected'::text,
      now() - interval '2 hours',
      'Connected (HTTP 200)'::text,
      'Primary hospital FHIR endpoint for referrals and patient sync.'::text
    ),
    (
      'City General FHIR',
      'hospital',
      'https://city-general.example.com/fhir',
      'api_key',
      '{"apiKey":"demo-city-general-key"}'::jsonb,
      true,
      'failed',
      now() - interval '1 day',
      'Failed (HTTP 503)',
      'Secondary hospital integration pending infrastructure fix.'
    ),
    (
      'Johannesburg Dispatch Agency',
      'dispatch_agency',
      'https://dispatch-jhb.example.com/api/jobs',
      'api_key',
      '{"apiKey":"demo-jhb-dispatch-key"}'::jsonb,
      true,
      'connected',
      now() - interval '30 minutes',
      'Connected (HTTP 200)',
      'External staffing partner for overflow nurse dispatch.'
    ),
    (
      'Emergency Staffing Partner',
      'dispatch_agency',
      'https://emergency-staffing.example.com/dispatch',
      'bearer',
      '{"token":"demo-emergency-staffing-token"}'::jsonb,
      false,
      'not_tested',
      null,
      null,
      'Reserved partner connection, not enabled yet.'
    ),
    (
      'CRM Partner Webhook',
      'webhook_partner',
      'https://crm-partner.example.com/webhooks/homecare',
      'none',
      '{}'::jsonb,
      true,
      'connected',
      now() - interval '15 minutes',
      'Connected (HTTP 200)',
      'Receives request lifecycle updates for CRM visibility.'
    ),
    (
      'Notification Hub',
      'webhook_partner',
      'https://notify-hub.example.com/hooks/events',
      'bearer',
      '{"token":"demo-notification-hub-token"}'::jsonb,
      true,
      'failed',
      now() - interval '3 hours',
      'Failed (HTTP 401)',
      'Outbound event delivery for messaging and notifications.'
    )
) AS v(name, system_type, base_url, auth_type, auth_config, is_active, status, last_tested_at, last_test_result, notes)
WHERE NOT EXISTS (
  SELECT 1
  FROM connected_systems cs
  WHERE cs.name = v.name
    AND cs.system_type = v.system_type
);
