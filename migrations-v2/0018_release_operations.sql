PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reservation_charges (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  gross_minor INTEGER NOT NULL CHECK (gross_minor >= 0),
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  final_minor INTEGER NOT NULL CHECK (final_minor >= 0),
  paid_credit_minor INTEGER NOT NULL DEFAULT 0,
  bonus_credit_minor INTEGER NOT NULL DEFAULT 0,
  external_paid_minor INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending','paid','refunded','waived')),
  payment_method TEXT CHECK (payment_method IN ('credit','cash','bank','qr','card','other')),
  settled_at TEXT,
  refunded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, reservation_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES platform_users(id) ON DELETE CASCADE,
  push_enabled INTEGER NOT NULL DEFAULT 1 CHECK (push_enabled IN (0,1)),
  attendance_reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (attendance_reminder_enabled IN (0,1)),
  product_reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (product_reminder_enabled IN (0,1)),
  quiet_from TEXT NOT NULL DEFAULT '22:00',
  quiet_to TEXT NOT NULL DEFAULT '07:00',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT REFERENCES member_notifications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('push','email')),
  status TEXT NOT NULL CHECK (status IN ('queued','sent','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (notification_id, channel)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS privacy_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK (granted IN (0,1)),
  source TEXT NOT NULL DEFAULT 'portal',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export','erase')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS processor_records (
  id TEXT PRIMARY KEY,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  processor_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  region TEXT NOT NULL,
  dpa_url TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS global_notifications (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  read_at TEXT,
  acted_at TEXT,
  created_at TEXT NOT NULL
);

ALTER TABLE stringing_jobs ADD COLUMN handover_media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_charges_club_time ON reservation_charges(club_id, created_at, status);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_media_club_entity ON media_assets(club_id, entity_type, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_global_notifications_user ON global_notifications(recipient_user_id, acted_at, created_at);
