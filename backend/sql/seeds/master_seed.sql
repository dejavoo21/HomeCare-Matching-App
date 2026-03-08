-- =========================================================
-- MASTER SEED - HomeCare Matching App
-- =========================================================

BEGIN;

-- =========================================================
-- USERS
-- =========================================================
INSERT INTO users
  (id, name, email, password_hash, role, phone, is_active, created_at, updated_at, email_verified, otp_enabled)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'admin', '+1-555-0001', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000002', 'Sarah Nurse', 'sarah@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'nurse', '+1-555-0002', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000003', 'David Doctor', 'david@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'doctor', '+1-555-0003', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000004', 'Mary Client', 'mary@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'client', '+1-555-0004', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000005', 'James Client', 'james@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'client', '+1-555-0005', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000006', 'Lerato Nurse', 'lerato@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'nurse', '+1-555-0006', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000007', 'Michael Doctor', 'michael@homecare.local', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'doctor', '+1-555-0007', true, now(), now(), true, false)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- CARE REQUESTS
-- =========================================================
INSERT INTO care_requests
  (id, client_id, service_type, address_text, preferred_start, preferred_end, urgency, status, description, medication, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'MEDICATION_ADMIN', '123 Main St, Boston MA', now() + interval '2 hours', now() + interval '3 hours', 'high', 'queued', 'Morning medication support', null, now() - interval '50 minutes', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'WOUND_CARE', '45 Oak Ave, Boston MA', now() + interval '1 hour', now() + interval '2 hours', 'critical', 'offered', 'Urgent wound dressing visit', null, now() - interval '35 minutes', now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'POST_OP_CHECK', '22 Pine Rd, Boston MA', now() - interval '20 minutes', now() + interval '40 minutes', 'medium', 'accepted', 'Post-operative home check', null, now() - interval '2 hours', now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'VITALS_MONITORING', '78 Lake Dr, Boston MA', now() - interval '45 minutes', now() + interval '15 minutes', 'medium', 'enroute', 'Routine vitals monitoring', null, now() - interval '3 hours', now()),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'PHYSICIAN_VISIT', '9 Cedar Ln, Boston MA', now() - interval '1 day', now() - interval '23 hours', 'low', 'completed', 'Scheduled physician follow-up', null, now() - interval '2 days', now()),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'MEDICATION_ADMIN', '17 Rose St, Boston MA', now() + interval '5 hours', now() + interval '6 hours', 'low', 'cancelled', 'Cancelled medication request', null, now() - interval '5 hours', now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- VISIT ASSIGNMENTS / OFFERS
-- =========================================================
INSERT INTO visit_assignments
  (id, request_id, professional_id, offer_expires_at, accepted_at, declined_at, created_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', now() + interval '2 minutes', NULL, NULL, now() - interval '2 minutes'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', now() - interval '1 hour', now() - interval '90 minutes', NULL, now() - interval '2 hours'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006', now() - interval '2 hours', now() - interval '150 minutes', NULL, now() - interval '3 hours')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- ACCESS REQUESTS
-- =========================================================
INSERT INTO access_requests
  (id, requester_name, requester_email, requested_role, reason, status, reviewed_by, reviewed_at, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'Anna Clinician', 'anna@partner.org', 'nurse', 'Need access for home visit coordination', 'pending', NULL, NULL, now() - interval '3 hours', now()),
  ('30000000-0000-0000-0000-000000000002', 'Brian Ops', 'brian@agency.org', 'admin', 'Operational oversight for regional dispatch', 'approved', '00000000-0000-0000-0000-000000000001', now() - interval '1 day', now() - interval '2 days', now()),
  ('30000000-0000-0000-0000-000000000003', 'Chloe Doctor', 'chloe@hospital.org', 'doctor', 'Need access for referral follow-up', 'rejected', '00000000-0000-0000-0000-000000000001', now() - interval '8 hours', now() - interval '12 hours', now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- AUDIT EVENTS
-- =========================================================
INSERT INTO audit_events
  (id, actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'AUTH_LOGIN', 'user', '00000000-0000-0000-0000-000000000001', '{"email":"admin@homecare.local"}'::jsonb, 'info', now() - interval '3 hours'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ACCESS_REQUEST_APPROVED', 'access_request', '30000000-0000-0000-0000-000000000002', '{"requesterEmail":"brian@agency.org"}'::jsonb, 'info', now() - interval '1 day'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'REQUEST_STATUS_CHANGED', 'care_request', '10000000-0000-0000-0000-000000000002', '{"oldStatus":"queued","newStatus":"offered"}'::jsonb, 'info', now() - interval '35 minutes'),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'CONNECTED_SYSTEM_TEST_FAILED', 'connected_system', '50000000-0000-0000-0000-000000000002', '{"message":"Failed (HTTP 503)"}'::jsonb, 'warning', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- CONNECTED SYSTEMS
-- =========================================================
INSERT INTO connected_systems
  (id, name, system_type, base_url, auth_type, auth_config, is_active, status, last_tested_at, last_test_result, notes, created_at, updated_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'Netcare Hospital API', 'hospital', 'https://netcare-hospital.example.com/fhir', 'bearer', '{"token":"demo-netcare-token"}'::jsonb, true, 'connected', now() - interval '2 hours', 'Connected (HTTP 200)', 'Primary hospital FHIR endpoint for referrals and patient sync.', now(), now()),
  ('50000000-0000-0000-0000-000000000002', 'City General FHIR', 'hospital', 'https://city-general.example.com/fhir', 'api_key', '{"apiKey":"demo-city-general-key"}'::jsonb, true, 'failed', now() - interval '1 day', 'Failed (HTTP 503)', 'Secondary hospital integration pending infrastructure fix.', now(), now()),
  ('50000000-0000-0000-0000-000000000003', 'Johannesburg Dispatch Agency', 'dispatch_agency', 'https://dispatch-jhb.example.com/api/jobs', 'api_key', '{"apiKey":"demo-jhb-dispatch-key"}'::jsonb, true, 'connected', now() - interval '30 minutes', 'Connected (HTTP 200)', 'External staffing partner for overflow nurse dispatch.', now(), now()),
  ('50000000-0000-0000-0000-000000000004', 'Emergency Staffing Partner', 'dispatch_agency', 'https://emergency-staffing.example.com/dispatch', 'bearer', '{"token":"demo-emergency-staffing-token"}'::jsonb, false, 'not_tested', NULL, NULL, 'Reserved partner connection, not enabled yet.', now(), now()),
  ('50000000-0000-0000-0000-000000000005', 'CRM Partner Webhook', 'webhook_partner', 'https://crm-partner.example.com/webhooks/homecare', 'none', '{}'::jsonb, true, 'connected', now() - interval '15 minutes', 'Connected (HTTP 200)', 'Receives request lifecycle updates for CRM visibility.', now(), now()),
  ('50000000-0000-0000-0000-000000000006', 'Notification Hub', 'webhook_partner', 'https://notify-hub.example.com/hooks/events', 'bearer', '{"token":"demo-notification-hub-token"}'::jsonb, true, 'failed', now() - interval '3 hours', 'Failed (HTTP 401)', 'Outbound event delivery for messaging and notifications.', now(), now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- WEBHOOK SUBSCRIPTIONS
-- =========================================================
INSERT INTO webhook_subscriptions
  (id, name, target_url, secret, is_active, event_types, created_at, updated_at)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'CRM Partner Events', 'https://crm-partner.example.com/webhooks/homecare', 'crm-demo-secret', true, '["REQUEST_CREATED","REQUEST_STATUS_CHANGED","OFFER_CREATED","OFFER_ACCEPTED"]'::jsonb, now(), now()),
  ('60000000-0000-0000-0000-000000000002', 'Notification Hub Events', 'https://notify-hub.example.com/hooks/events', 'notify-demo-secret', true, '["VISIT_STATUS_CHANGED","ACCESS_REQUEST_APPROVED","ACCESS_REQUEST_REJECTED"]'::jsonb, now(), now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- WEBHOOK DELIVERIES
-- =========================================================
INSERT INTO webhook_deliveries
  (id, subscription_id, event_type, payload, status, attempt_count, max_attempts, next_attempt_at, last_error, last_http_status, delivered_at, created_at, updated_at)
VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'REQUEST_STATUS_CHANGED',
    '{"requestId":"10000000-0000-0000-0000-000000000002","oldStatus":"queued","newStatus":"offered","timestamp":"2026-03-07T10:00:00Z"}'::jsonb,
    'delivered',
    1,
    6,
    now() + interval '5 minutes',
    NULL,
    200,
    now() - interval '20 minutes',
    now() - interval '20 minutes',
    now()
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'VISIT_STATUS_CHANGED',
    '{"visitId":"demo-visit-001","status":"enroute","timestamp":"2026-03-07T10:10:00Z"}'::jsonb,
    'failed',
    2,
    6,
    now() + interval '5 minutes',
    'HTTP 401: Unauthorized',
    401,
    NULL,
    now() - interval '30 minutes',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- WEBHOOK DEAD LETTERS
-- =========================================================
INSERT INTO webhook_dead_letters
  (id, delivery_id, subscription_id, event_type, payload, last_error, last_http_status, attempt_count, created_at)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'VISIT_STATUS_CHANGED',
    '{"visitId":"demo-visit-001","status":"enroute","timestamp":"2026-03-07T10:10:00Z"}'::jsonb,
    'HTTP 401: Unauthorized',
    401,
    6,
    now() - interval '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
