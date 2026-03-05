-- Update test user password
UPDATE users 
SET password_hash = '$2b$10$IoqbrNA0RP9V9XMXPI0ypuRo3/Es46LI8QIF9nOFN4jmhk0Jfx36m'
WHERE email = 'onboarding@sochristventures.com';

SELECT id, email, name FROM users WHERE email = 'onboarding@sochristventures.com';
