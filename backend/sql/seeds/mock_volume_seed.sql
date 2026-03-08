BEGIN;

-- =========================================================
-- EXTRA USERS
-- =========================================================
INSERT INTO users
  (id, name, email, password_hash, role, phone, is_active, created_at, updated_at, email_verified, otp_enabled)
VALUES
  ('00000000-0000-0000-0000-000000000008', 'Amy Nurse', '$$amy@homecare.local$$', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'nurse', '+1-555-0008', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000009', 'Peter Nurse', '$$peter@homecare.local$$', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'nurse', '+1-555-0009', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000010', 'Grace Doctor', '$$grace@homecare.local$$', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'doctor', '+1-555-0010', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000011', 'Helen Client', '$$helen@homecare.local$$', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'client', '+1-555-0011', true, now(), now(), true, false),
  ('00000000-0000-0000-0000-000000000012', 'Robert Client', '$$robert@homecare.local$$', '$2b$10$QhQxv3X9rR7x5mX0m8g2EuC2QfD0A9N0uW6dQ4r4v5b8G2QxkVh1W', 'client', '+1-555-0012', true, now(), now(), true, false)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- EXTRA CARE REQUESTS
-- live schema has no professional_id on care_requests
-- =========================================================
INSERT INTO care_requests
  (id, client_id, service_type, address_text, preferred_start, preferred_end, urgency, status, description, medication, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000011', 'MEDICATION_ADMIN', '10 Baker St, Boston MA', now() + interval '1 hour', now() + interval '2 hours', 'critical', 'queued', 'Critical insulin administration', null, now() - interval '15 minutes', now()),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000012', 'VITALS_MONITORING', '88 West Rd, Boston MA', now() + interval '3 hours', now() + interval '4 hours', 'medium', 'queued', 'Blood pressure and vitals check', null, now() - interval '40 minutes', now()),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004', 'WOUND_CARE', '54 Green St, Boston MA', now() + interval '30 minutes', now() + interval '90 minutes', 'high', 'offered', 'Post-surgery wound care', null, now() - interval '25 minutes', now()),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000005', 'POST_OP_CHECK', '91 Hill Ave, Boston MA', now() - interval '10 minutes', now() + interval '50 minutes', 'medium', 'accepted', 'Routine post-op review', null, now() - interval '90 minutes', now()),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'PHYSICIAN_VISIT', '77 River Dr, Boston MA', now() - interval '20 minutes', now() + interval '40 minutes', 'high', 'enroute', 'Doctor home consultation', null, now() - interval '2 hours', now()),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'MEDICATION_ADMIN', '13 Maple St, Boston MA', now() - interval '1 day', now() - interval '23 hours', 'low', 'completed', 'Evening medication support', null, now() - interval '2 days', now()),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', 'VITALS_MONITORING', '19 Queen St, Boston MA', now() + interval '6 hours', now() + interval '7 hours', 'low', 'cancelled', 'Client cancelled vitals check', null, now() - interval '4 hours', now()),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000004', 'MEDICATION_ADMIN', '200 Lakeview Rd, Boston MA', now() - interval '2 days', now() - interval '47 hours', 'medium', 'completed', 'Medication refill support', null, now() - interval '3 days', now()),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000005', 'PHYSICIAN_VISIT', '15 Cedar Hill, Boston MA', now() - interval '3 days', now() - interval '71 hours', 'high', 'completed', 'Urgent physician review', null, now() - interval '4 days', now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- EXTRA VISIT ASSIGNMENTS
-- =========================================================
INSERT INTO visit_assignments
  (id, request_id, professional_id, offer_expires_at, accepted_at, declined_at, created_at)
VALUES
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000008', now() + interval '90 seconds', NULL, NULL, now() - interval '90 seconds'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000009', now() - interval '1 hour', now() - interval '45 minutes', NULL, now() - interval '90 minutes'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', now() - interval '90 minutes', now() - interval '80 minutes', NULL, now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- EXTRA ACCESS REQUESTS
-- =========================================================
INSERT INTO access_requests
  (id, requester_name, requester_email, requested_role, reason, status, reviewed_by, reviewed_at, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000004', 'Tina Nurse', '$$tina@carepartner.org$$', 'nurse', 'Need access to receive assigned visits.', 'pending', NULL, NULL, now() - interval '30 minutes', now()),
  ('30000000-0000-0000-0000-000000000005', 'Mark Agency Ops', '$$mark@dispatch.org$$', 'admin', 'Agency operations oversight.', 'pending', NULL, NULL, now() - interval '2 hours', now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- EXTRA AUDIT EVENTS
-- =========================================================
INSERT INTO audit_events
  (id, actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
VALUES
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'AUTH_REFRESH', 'user', '00000000-0000-0000-0000-000000000001', '{"detail":"refresh token rotated"}'::jsonb, 'info', now() - interval '20 minutes'),
  ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'WEBHOOK_DELIVERY_REPLAYED', 'webhook_delivery', '70000000-0000-0000-0000-000000000002', '{"detail":"manual replay"}'::jsonb, 'warning', now() - interval '10 minutes'),
  ('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'CONNECTED_SYSTEM_TEST_SUCCESS', 'connected_system', '50000000-0000-0000-0000-000000000003', '{"message":"Connected (HTTP 200)"}'::jsonb, 'info', now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;

COMMIT;
