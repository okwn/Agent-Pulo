-- PULO Development Database Initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'creator', 'community', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'dead');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE error_status AS ENUM ('pending', 'retrying', 'resolved', 'dead_lettered');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  fid INTEGER UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  plan plan_tier DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_fid ON users(fid);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  voice_language VARCHAR(10) DEFAULT 'en',
  voice_tone VARCHAR(20) DEFAULT 'balanced',
  reply_style VARCHAR(20) DEFAULT 'helpful',
  humor_level INTEGER DEFAULT 50,
  technical_depth INTEGER DEFAULT 50,
  concise_vs_detailed INTEGER DEFAULT 50,
  example_casts TEXT[] DEFAULT '{}',
  allowed_topics TEXT[] DEFAULT '{}',
  blocked_topics TEXT[] DEFAULT '{}',
  risk_tolerance VARCHAR(10) DEFAULT 'medium',
  alert_frequency VARCHAR(20) DEFAULT 'realtime',
  allow_mini_app BOOLEAN DEFAULT true,
  allow_direct_casts BOOLEAN DEFAULT true,
  daily_alert_limit INTEGER DEFAULT 50,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  auto_reply_mode VARCHAR(10) DEFAULT 'off',
  mention_only_mode BOOLEAN DEFAULT false,
  preferred_channels TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Audit events table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  actor_fid INTEGER NOT NULL,
  actor_type VARCHAR(20) DEFAULT 'admin',
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  metadata JSONB,
  correlation_id VARCHAR(255),
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_fid ON audit_events(actor_fid);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);

-- Error records table
CREATE TABLE IF NOT EXISTS error_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL,
  category VARCHAR(30) NOT NULL,
  message TEXT,
  retryable BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  correlation_id VARCHAR(255),
  job_id UUID,
  metadata JSONB,
  cause TEXT,
  status error_status DEFAULT 'pending',
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_records_code ON error_records(code);
CREATE INDEX IF NOT EXISTS idx_error_records_status ON error_records(status);
CREATE INDEX IF NOT EXISTS idx_error_records_category ON error_records(category);
CREATE INDEX IF NOT EXISTS idx_error_records_created_at ON error_records(created_at DESC);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status job_status DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_id UUID REFERENCES error_records(id),
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);

-- Truth checks table
CREATE TABLE IF NOT EXISTS truth_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cast_hash VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  verdict BOOLEAN,
  confidence INTEGER,
  model VARCHAR(50),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truth_checks_cast_hash ON truth_checks(cast_hash);
CREATE INDEX IF NOT EXISTS idx_truth_checks_verdict ON truth_checks(verdict);
CREATE INDEX IF NOT EXISTS idx_truth_checks_checked_at ON truth_checks(checked_at DESC);

-- Radar trends table
CREATE TABLE IF NOT EXISTS radar_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  detected_count INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radar_trends_keyword ON radar_trends(keyword);
CREATE INDEX IF NOT EXISTS idx_radar_trends_approved ON radar_trends(approved);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_at ON alerts(sent_at DESC);

-- Safety flags table
CREATE TABLE IF NOT EXISTS safety_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cast_hash VARCHAR(255),
  author_fid INTEGER,
  flag_type VARCHAR(50) NOT NULL,
  reason TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_flags_resolved ON safety_flags(resolved);
CREATE INDEX IF NOT EXISTS idx_safety_flags_cast_hash ON safety_flags(cast_hash);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  score INTEGER,
  reason TEXT,
  source_cast_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);

-- Insert default admin user for development
INSERT INTO users (fid, username, display_name, plan)
VALUES (1, 'admin', 'Admin User', 'admin')
ON CONFLICT (fid) DO NOTHING;