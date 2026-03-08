ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL;

COMMENT ON COLUMN refresh_tokens.replaced_by IS 'References the replacement refresh token created during token rotation';
