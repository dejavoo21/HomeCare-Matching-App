-- ============================================================================
-- MIGRATION: 002_add_otp_table.sql
-- ============================================================================
-- Add OTP and email verification support

-- Add email_verified column to users table
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN email_verified_at TIMESTAMPTZ,
ADD COLUMN last_otp_sent_at TIMESTAMPTZ;

-- Create OTP tokens table
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  attempts_left INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

-- Create indices for efficient lookups
CREATE INDEX idx_otp_tokens_user_id ON otp_tokens(user_id);
CREATE INDEX idx_otp_tokens_email ON otp_tokens(email);
CREATE INDEX idx_otp_tokens_expires_at ON otp_tokens(expires_at);
CREATE INDEX idx_users_email_verified ON users(email_verified);
