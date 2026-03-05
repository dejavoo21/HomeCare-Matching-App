-- Seed test user for login testing
-- Email: onboarding@sochristventures.com
-- Password: test123456 (bcrypt hashed with 10 rounds)

INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Onboarding Admin',
  'onboarding@sochristventures.com',
  '$2b$10$ohaOJ97Wfs87sFFKAgSZ7ulyvwrpnDmccIr3JLr/367Q3Mgg6cs8G',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT (email) 
DO UPDATE SET 
  password_hash = '$2b$10$ohaOJ97Wfs87sFFKAgSZ7ulyvwrpnDmccIr3JLr/367Q3Mgg6cs8G',
  name = 'Onboarding Admin',
  updated_at = now()
RETURNING id, email, role, is_active;
