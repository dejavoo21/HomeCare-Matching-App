-- ============================================================================
-- MIGRATION: 005_otp.sql
-- ============================================================================
-- Email OTP verification for 2FA

ALTER TABLE users
ADD COLUMN IF NOT EXISTS otp_enabled boolean NOT NULL DEFAULT true;

-- Store active OTP challenges
CREATE TABLE IF NOT EXISTS otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash text NOT NULL,  -- format: salt:hash for secure storage
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_otp_challenges_user ON otp_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires ON otp_challenges(expires_at);

-- Cleanup expired OTPs (optional: run periodically)
-- DELETE FROM otp_challenges WHERE expires_at < NOW();
