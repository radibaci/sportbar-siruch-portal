PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  public_handle TEXT UNIQUE COLLATE NOCASE,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  discoverability TEXT NOT NULL DEFAULT 'private' CHECK (discoverability IN ('private', 'exact-handle', 'invite-only')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1f6b4f',
  accent_color TEXT NOT NULL DEFAULT '#d7a846',
  public_config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(public_config_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS club_memberships (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'player', 'coach', 'stringer', 'seller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'left')),
  display_name_override TEXT,
  internal_note TEXT,
  joined_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, user_id)
);

CREATE TABLE IF NOT EXISTS club_modules (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
  updated_by_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (club_id, module_key)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  key_hash TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_connections (
  user_low_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  user_high_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  requested_by_user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_low_id, user_high_id),
  CHECK (user_low_id < user_high_id),
  CHECK (requested_by_user_id IN (user_low_id, user_high_id))
);

CREATE TABLE IF NOT EXISTS privacy_preferences (
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  policy_version TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, purpose)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_users_handle
  ON platform_users(public_handle, discoverability, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user
  ON club_memberships(user_id, status, club_id);
CREATE INDEX IF NOT EXISTS idx_memberships_club
  ON club_memberships(club_id, status, role);
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON auth_sessions(user_id, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_audit_club_time
  ON audit_events(club_id, created_at);
