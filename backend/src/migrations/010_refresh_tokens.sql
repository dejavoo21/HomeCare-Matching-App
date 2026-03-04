-- ============================================================================
-- Migration: 010_refresh_tokens.sql
-- Purpose: Add refresh token table for JWT rotation
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
ON refresh_tokens(user_id);

-- Index for finding non-revoked, non-expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
ON refresh_tokens(user_id) WHERE revoked_at IS NULL AND expires_at > now();

-- Add column to track token rotation (optional: for security)
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS
    rotated_from_id uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL;

COMMENT ON TABLE refresh_tokens IS 'Stores hashed refresh tokens for JWT rotation and revocation';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the actual JWT token (never store raw JWTs)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp when token was explicitly revoked (logout/password change)';
COMMENT ON COLUMN refresh_tokens.rotated_from_id IS 'References previous refresh token if this is a rotation';
