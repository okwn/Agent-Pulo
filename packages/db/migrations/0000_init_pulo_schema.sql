-- Migration: 0000_init_pulo_schema.sql
-- Description: Initial PULO database schema

-- ─── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE plan AS ENUM ('free', 'pro', 'team');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deactivated');
CREATE TYPE event_source AS ENUM ('webhook', 'worker', 'api', 'scheduler');
CREATE TYPE event_type AS ENUM ('mention', 'reply', 'dm', 'trend_detected', 'truth_check_request', 'alert_triggered', 'auto_reply');
CREATE TYPE event_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'deduplicated');
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE draft_status AS ENUM ('pending', 'approved', 'published', 'rejected');
CREATE TYPE verdict AS ENUM ('verified', 'likely_true', 'uncertain', 'likely_false', 'debunked');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE trend_category AS ENUM ('airdrop', 'grant', 'reward', 'token', 'program', 'governance', 'social');
CREATE TYPE trend_status AS ENUM ('active', 'fading', 'confirmed', 'debunked');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'failed');
CREATE TYPE delivery_channel AS ENUM ('dm', 'cast_reply', 'miniapp', 'email', 'webhook');
CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE subscription_provider AS ENUM ('manual', 'stripe', 'paddle', 'lemon_squeezy');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'expired');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'team', 'enterprise');

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  fid INTEGER NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT,
  custody_address TEXT,
  verified_addresses JSONB DEFAULT '[]'::jsonb,
  plan plan DEFAULT 'free',
  status user_status DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_fid_idx ON users (fid);
CREATE INDEX users_username_idx ON users (username);
CREATE INDEX users_status_idx ON users (status);

CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  tone TEXT DEFAULT 'balanced',
  reply_style TEXT DEFAULT 'helpful',
  risk_tolerance TEXT DEFAULT 'medium',
  notification_frequency TEXT DEFAULT 'realtime',
  allow_mini_app_notifications BOOLEAN DEFAULT true,
  allow_direct_casts BOOLEAN DEFAULT false,
  allowed_topics JSONB DEFAULT '[]'::jsonb,
  blocked_topics JSONB DEFAULT '[]'::jsonb,
  preferred_channels JSONB DEFAULT '[]'::jsonb,
  auto_reply_mode TEXT DEFAULT 'off',
  daily_alert_limit INTEGER DEFAULT 50,
  daily_reply_limit INTEGER DEFAULT 10,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX user_preferences_user_id_idx ON user_preferences (user_id);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider subscription_provider DEFAULT 'manual',
  external_subscription_id TEXT,
  tier subscription_tier DEFAULT 'free',
  status subscription_status DEFAULT 'active',
  expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX subscriptions_status_idx ON subscriptions (status);

CREATE TABLE casts (
  id SERIAL PRIMARY KEY,
  cast_hash TEXT NOT NULL UNIQUE,
  author_fid INTEGER NOT NULL,
  author_username TEXT NOT NULL,
  text TEXT NOT NULL,
  channel_id TEXT,
  parent_hash TEXT,
  root_parent_hash TEXT,
  raw_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  indexed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX casts_cast_hash_idx ON casts (cast_hash);
CREATE INDEX casts_author_fid_idx ON casts (author_fid);
CREATE INDEX casts_parent_hash_idx ON casts (parent_hash);
CREATE INDEX casts_root_parent_hash_idx ON casts (root_parent_hash);
CREATE INDEX casts_created_at_idx ON casts (created_at);

CREATE TABLE cast_threads (
  id SERIAL PRIMARY KEY,
  root_hash TEXT NOT NULL UNIQUE,
  summary TEXT,
  cast_hashes JSONB DEFAULT '[]'::jsonb,
  participants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX cast_threads_root_hash_idx ON cast_threads (root_hash);

CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source event_source NOT NULL,
  type event_type NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fid INTEGER,
  cast_hash TEXT REFERENCES casts(cast_hash) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status event_status DEFAULT 'pending',
  dedupe_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX agent_events_dedupe_key_idx ON agent_events (dedupe_key);
CREATE INDEX agent_events_status_idx ON agent_events (status);
CREATE INDEX agent_events_type_idx ON agent_events (type);
CREATE INDEX agent_events_created_at_idx ON agent_events (created_at);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES agent_events(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_estimate TEXT,
  status run_status DEFAULT 'pending',
  decision TEXT,
  output JSONB DEFAULT '{}'::jsonb,
  error_code TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX agent_runs_event_id_idx ON agent_runs (event_id);
CREATE INDEX agent_runs_user_id_idx ON agent_runs (user_id);
CREATE INDEX agent_runs_status_idx ON agent_runs (status);
CREATE INDEX agent_runs_created_at_idx ON agent_runs (created_at);

CREATE TABLE reply_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cast_hash TEXT NOT NULL REFERENCES casts(cast_hash) ON DELETE CASCADE,
  text TEXT NOT NULL,
  score INTEGER,
  status draft_status DEFAULT 'pending',
  published_cast_hash TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX reply_drafts_user_id_idx ON reply_drafts (user_id);
CREATE INDEX reply_drafts_cast_hash_idx ON reply_drafts (cast_hash);
CREATE INDEX reply_drafts_status_idx ON reply_drafts (status);

CREATE TABLE truth_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_cast_hash TEXT REFERENCES casts(cast_hash) ON DELETE SET NULL,
  claim_text TEXT NOT NULL,
  verdict verdict,
  confidence INTEGER,
  evidence_summary TEXT,
  counter_evidence_summary TEXT,
  source_cast_hashes JSONB DEFAULT '[]'::jsonb,
  risk_level risk_level,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX truth_checks_user_id_idx ON truth_checks (user_id);
CREATE INDEX truth_checks_target_cast_hash_idx ON truth_checks (target_cast_hash);
CREATE INDEX truth_checks_status_idx ON truth_checks (status);
CREATE INDEX truth_checks_created_at_idx ON truth_checks (created_at);

CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category trend_category NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  score INTEGER DEFAULT 0,
  velocity INTEGER DEFAULT 0,
  risk_level risk_level DEFAULT 'low',
  confidence INTEGER DEFAULT 0,
  status trend_status DEFAULT 'active',
  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source_count INTEGER DEFAULT 0,
  cast_count INTEGER DEFAULT 0,
  trusted_author_count INTEGER DEFAULT 0,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX trends_category_idx ON trends (category);
CREATE INDEX trends_status_idx ON trends (status);
CREATE INDEX trends_score_idx ON trends (score);
CREATE INDEX trends_velocity_idx ON trends (velocity);
CREATE INDEX trends_first_seen_at_idx ON trends (first_seen_at);

CREATE TABLE trend_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  cast_hash TEXT NOT NULL REFERENCES casts(cast_hash) ON DELETE CASCADE,
  author_fid INTEGER NOT NULL,
  channel_id TEXT,
  text TEXT NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  trust_score INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX trend_sources_trend_id_idx ON trend_sources (trend_id);
CREATE INDEX trend_sources_cast_hash_idx ON trend_sources (cast_hash);
CREATE INDEX trend_sources_author_fid_idx ON trend_sources (author_fid);

CREATE TABLE alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES trends(id) ON DELETE SET NULL,
  truth_check_id UUID REFERENCES truth_checks(id) ON DELETE SET NULL,
  channel delivery_channel DEFAULT 'dm',
  status delivery_status DEFAULT 'pending',
  idempotency_key TEXT NOT NULL,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  error_code TEXT
);

CREATE INDEX alert_deliveries_user_id_idx ON alert_deliveries (user_id);
CREATE INDEX alert_deliveries_trend_id_idx ON alert_deliveries (trend_id);
CREATE INDEX alert_deliveries_idempotency_key_idx ON alert_deliveries (idempotency_key);
CREATE INDEX alert_deliveries_status_idx ON alert_deliveries (status);

CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before JSONB,
  after JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX admin_audit_logs_actor_user_id_idx ON admin_audit_logs (actor_user_id);
CREATE INDEX admin_audit_logs_entity_type_idx ON admin_audit_logs (entity_type);
CREATE INDEX admin_audit_logs_created_at_idx ON admin_audit_logs (created_at);

CREATE TABLE rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fid INTEGER,
  key TEXT NOT NULL,
  window TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  decision TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX rate_limit_events_user_id_idx ON rate_limit_events (user_id);
CREATE INDEX rate_limit_events_key_idx ON rate_limit_events (key);
CREATE INDEX rate_limit_events_created_at_idx ON rate_limit_events (created_at);

CREATE TABLE safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cast_hash TEXT REFERENCES casts(cast_hash) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity severity DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX safety_flags_user_id_idx ON safety_flags (user_id);
CREATE INDEX safety_flags_cast_hash_idx ON safety_flags (cast_hash);
CREATE INDEX safety_flags_entity_type_idx ON safety_flags (entity_type);
CREATE INDEX safety_flags_status_idx ON safety_flags (status);
CREATE INDEX safety_flags_severity_idx ON safety_flags (severity);

-- ─── Updated At Trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cast_threads_updated_at
  BEFORE UPDATE ON cast_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reply_drafts_updated_at
  BEFORE UPDATE ON reply_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();