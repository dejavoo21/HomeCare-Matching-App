-- ============================================================================
-- MIGRATION: 004_rbac.sql
-- ============================================================================
-- Role-based access control with permissions

-- Permissions master list
CREATE TABLE IF NOT EXISTS permissions (
  code text PRIMARY KEY,
  description text NOT NULL
);

-- Roles (admin/dispatcher/auditor/nurse/doctor/client)
CREATE TABLE IF NOT EXISTS roles (
  code text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Role → Permissions mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_code text NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

-- User → Roles mapping (supports multi-role for future expansion)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_code)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_code);

-- ============================================================================
-- SEED: Base roles
-- ============================================================================

INSERT INTO roles (code, description) VALUES
  ('admin', 'Administrator with full access'),
  ('dispatcher', 'Dispatch operations and offer management'),
  ('auditor', 'Read-only audit access'),
  ('nurse', 'Healthcare professional (nurse)'),
  ('doctor', 'Healthcare professional (doctor)'),
  ('client', 'Client/patient user')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED: Permissions
-- ============================================================================

INSERT INTO permissions (code, description) VALUES
  -- Request management
  ('requests:view_all', 'View all requests'),
  ('requests:view_own', 'View own requests'),
  ('requests:create', 'Create care requests'),
  ('requests:manage', 'Manage requests (edit/cancel)'),
  
  -- Offer management
  ('offers:create', 'Create offers to professionals'),
  ('offers:override', 'Override/replace active offers'),
  ('offers:manage', 'Manage offer state transitions'),
  
  -- User management
  ('users:view', 'View users'),
  ('users:manage', 'Manage user accounts'),
  ('users:deactivate', 'Deactivate/reactivate users'),
  
  -- Audit and logs
  ('audit:view', 'View audit logs'),
  
  -- Integrations
  ('integrations:manage', 'Manage integrations and api keys')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED: Role → Permission mappings
-- ============================================================================

-- Admin gets all permissions
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'admin', code FROM permissions
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Dispatcher gets dispatch-specific permissions
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('dispatcher', 'requests:view_all'),
  ('dispatcher', 'requests:manage'),
  ('dispatcher', 'offers:create'),
  ('dispatcher', 'offers:override'),
  ('dispatcher', 'offers:manage'),
  ('dispatcher', 'users:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Auditor gets read-only permissions
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('auditor', 'requests:view_all'),
  ('auditor', 'users:view'),
  ('auditor', 'audit:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Nurse gets professional permissions
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('nurse', 'requests:view_own'),
  ('nurse', 'offers:manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Doctor gets professional permissions
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('doctor', 'requests:view_own'),
  ('doctor', 'offers:manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Client gets basic permissions
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('client', 'requests:view_own'),
  ('client', 'requests:create')
ON CONFLICT (role_code, permission_code) DO NOTHING;
