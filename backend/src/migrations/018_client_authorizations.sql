CREATE TABLE IF NOT EXISTS client_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  authorized_from timestamptz NOT NULL,
  authorized_to timestamptz NOT NULL,
  remaining_visits integer,
  status text NOT NULL DEFAULT 'active',
  payer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_authorizations_client
  ON client_authorizations(client_id);

CREATE INDEX IF NOT EXISTS idx_client_authorizations_status
  ON client_authorizations(status);
