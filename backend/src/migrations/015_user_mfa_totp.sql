-- User MFA TOTP (Time-based One-Time Password) Support
-- Enables authenticator app-based 2FA per user

CREATE TABLE IF NOT EXISTS user_mfa_totp (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  issuer text NOT NULL DEFAULT 'HomeCare',
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_mfa_totp_enabled
  ON user_mfa_totp(enabled);

-- Audit trail for MFA events
INSERT INTO audit_events (actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
VALUES (NULL, 'MIGRATION_015_USER_MFA_TOTP_CREATED', 'migration', '015', NULL, 'info', now())
ON CONFLICT DO NOTHING;
