-- ============================================================================
-- MIGRATION: 001_initial_schema.sql
-- ============================================================================
-- Create initial tables for Phase 2 homecare matching system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client', 'nurse', 'doctor')),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- CLIENT PROFILES
-- ============================================================================
CREATE TABLE client_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address_text TEXT NOT NULL,
  lat NUMERIC(10, 8),
  lng NUMERIC(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFESSIONAL PROFILES
-- ============================================================================
CREATE TABLE professional_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT false,
  service_radius_km INTEGER DEFAULT 10,
  base_lat NUMERIC(10, 8),
  base_lng NUMERIC(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFESSIONAL SKILLS
-- ============================================================================
CREATE TABLE professional_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professional_skills_user ON professional_skills(user_id);
CREATE INDEX idx_professional_skills_code ON professional_skills(skill_code);

-- ============================================================================
-- PROFESSIONAL CREDENTIALS
-- ============================================================================
CREATE TABLE professional_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_type VARCHAR(50) NOT NULL,
  file_ref TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professional_credentials_user ON professional_credentials(user_id);

-- ============================================================================
-- AVAILABILITY RULES (RECURRING)
-- ============================================================================
CREATE TABLE availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_availability_rules_user ON availability_rules(user_id);

-- ============================================================================
-- AVAILABILITY EXCEPTIONS
-- ============================================================================
CREATE TABLE availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('unavailable', 'available_override')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_availability_exceptions_user ON availability_exceptions(user_id);
CREATE INDEX idx_availability_exceptions_date ON availability_exceptions(exception_date);

-- ============================================================================
-- CARE REQUESTS
-- ============================================================================
CREATE TABLE care_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id),
  service_type VARCHAR(50) NOT NULL,
  medication TEXT,
  description TEXT NOT NULL,
  address_text TEXT NOT NULL,
  lat NUMERIC(10, 8),
  lng NUMERIC(11, 8),
  preferred_start TIMESTAMPTZ NOT NULL,
  preferred_end TIMESTAMPTZ NOT NULL,
  urgency VARCHAR(50) NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'queued', 'offered', 'assigned', 'accepted', 'enroute', 'completed', 'cancelled')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_care_requests_client ON care_requests(client_id);
CREATE INDEX idx_care_requests_status ON care_requests(status);
CREATE INDEX idx_care_requests_urgency ON care_requests(urgency);
CREATE INDEX idx_care_requests_preferred_start ON care_requests(preferred_start);
CREATE INDEX idx_care_requests_status_urgency_start ON care_requests(status, urgency, preferred_start);

-- ============================================================================
-- VISIT ASSIGNMENTS (OFFER TRACKING)
-- ============================================================================
CREATE TABLE visit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES care_requests(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id),
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  offer_expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visit_assignments_request ON visit_assignments(request_id);
CREATE INDEX idx_visit_assignments_professional ON visit_assignments(professional_id);
CREATE INDEX idx_visit_assignments_expires ON visit_assignments(offer_expires_at);

-- ============================================================================
-- VISITS
-- ============================================================================
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES care_requests(id),
  professional_id UUID NOT NULL REFERENCES users(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'accepted', 'enroute', 'completed', 'cancelled')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_request ON visits(request_id);
CREATE INDEX idx_visits_professional ON visits(professional_id);
CREATE INDEX idx_visits_status ON visits(status);

-- ============================================================================
-- VISIT EVENTS (APPEND-ONLY TIMELINE)
-- ============================================================================
CREATE TABLE visit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visit_events_visit ON visit_events(visit_id);
CREATE INDEX idx_visit_events_created ON visit_events(created_at);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- NOTIFICATION OUTBOX
-- ============================================================================
CREATE TABLE notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  to_address VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  payload_json JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_outbox_status ON notification_outbox(status);
CREATE INDEX idx_notification_outbox_created ON notification_outbox(created_at);
CREATE INDEX idx_notification_outbox_status_created ON notification_outbox(status, created_at);
