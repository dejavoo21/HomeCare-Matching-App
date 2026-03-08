CREATE TABLE IF NOT EXISTS connected_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  system_type text NOT NULL, -- hospital | dispatch_agency | webhook_partner
  base_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'none', -- none | api_key | bearer
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_tested', -- not_tested | connected | failed
  last_tested_at timestamptz,
  last_test_result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connected_systems_type
  ON connected_systems(system_type);

CREATE INDEX IF NOT EXISTS idx_connected_systems_active
  ON connected_systems(is_active);
