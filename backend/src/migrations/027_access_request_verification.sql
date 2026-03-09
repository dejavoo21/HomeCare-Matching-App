ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS additional_info_requested boolean DEFAULT false;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS additional_info_note text;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS license_verified boolean DEFAULT false;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS compliance_verified boolean DEFAULT false;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS background_check_verified boolean DEFAULT false;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS verification_completed boolean DEFAULT false;
