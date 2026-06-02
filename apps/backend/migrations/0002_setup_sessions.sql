-- Migration: Recreate D1 schema using a single-row sessions table for RTR and system configurations

DROP TABLE IF EXISTS refresh_tokens;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, -- Session UUID (sid)
  user_cpf TEXT NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  current_token_jti TEXT UNIQUE NOT NULL,
  last_token_jti TEXT UNIQUE,
  penultimate_token_jti TEXT UNIQUE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_cpf);

CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed configuration defaults
INSERT INTO system_configs (key, value) VALUES ('single_session_enabled', 'false') ON CONFLICT(key) DO NOTHING;
INSERT INTO system_configs (key, value) VALUES ('jwt_ttl_seconds', '900') ON CONFLICT(key) DO NOTHING; -- 15 mins
INSERT INTO system_configs (key, value) VALUES ('cookie_ttl_seconds', '604800') ON CONFLICT(key) DO NOTHING; -- 7 days
