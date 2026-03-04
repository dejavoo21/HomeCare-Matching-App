-- ============================================================================
-- MIGRATION: 003_add_2fa_tables.sql
-- ============================================================================
-- Add Two-Factor Authentication support with passphrase and biometric

-- Create 2FA Settings table
CREATE TABLE two_fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  primary_method VARCHAR(50) NOT NULL DEFAULT 'otp', -- 'otp', 'passphrase', 'webauthn'
  is_passphrase_enabled BOOLEAN DEFAULT false,
  is_webauthn_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create Passphrase Answers table (for security questions)
CREATE TABLE passphrase_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question VARCHAR(255) NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create WebAuthn Credentials table (for biometric/hardware keys)
CREATE TABLE webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL,
  public_key BYTEA NOT NULL,
  device_name VARCHAR(255),
  counter INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, credential_id)
);

-- Create WebAuthn Challenge table (for temporary challenges during registration/login)
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  challenge BYTEA NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- Create indices
CREATE INDEX idx_2fa_settings_user ON two_fa_settings(user_id);
CREATE INDEX idx_passphrase_answers_user ON passphrase_answers(user_id);
CREATE INDEX idx_webauthn_credentials_user ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_challenges_user ON webauthn_challenges(user_id);
CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);
