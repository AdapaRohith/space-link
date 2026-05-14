-- ===== SPACE LINK CRM — DATABASE SCHEMA =====

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'sales', 'receptionist')),
  phone         VARCHAR(20),
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead sources
CREATE TABLE IF NOT EXISTS sources (
  id            VARCHAR(50) PRIMARY KEY,
  source_name   VARCHAR(100) NOT NULL,
  is_custom     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id                 VARCHAR(50) PRIMARY KEY,
  lead_name          VARCHAR(200) NOT NULL,
  phone              VARCHAR(20) NOT NULL,
  alternate_phone    VARCHAR(20),
  email              VARCHAR(100),
  source_id          VARCHAR(50) REFERENCES sources(id),
  custom_source      VARCHAR(100),
  assigned_to        VARCHAR(50) REFERENCES users(id),
  attended_by        VARCHAR(50) REFERENCES users(id),
  budget             VARCHAR(50),
  preferred_location VARCHAR(200),
  property_type      VARCHAR(100),
  bhk                VARCHAR(20),
  notes              TEXT,
  referrer_name      VARCHAR(200),
  referrer_phone     VARCHAR(20),
  status             VARCHAR(30) NOT NULL DEFAULT 'new',
  created_by         VARCHAR(50) REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Visits
CREATE TABLE IF NOT EXISTS visits (
  id             VARCHAR(50) PRIMARY KEY,
  lead_id        VARCHAR(50) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  visit_date     VARCHAR(20),
  visit_time     VARCHAR(10),
  site_location  VARCHAR(200),
  notes          TEXT,
  created_by     VARCHAR(50) REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_lead ON visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);

-- Activity log
CREATE TABLE IF NOT EXISTS activities (
  id             VARCHAR(50) PRIMARY KEY,
  lead_id        VARCHAR(50) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type  VARCHAR(50) NOT NULL,
  description    TEXT,
  performed_by   VARCHAR(50) REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
