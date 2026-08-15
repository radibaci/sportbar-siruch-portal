PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS club_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'club' CHECK (event_type IN ('club', 'demo', 'tournament', 'social', 'training', 'other')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  fee_label TEXT NOT NULL DEFAULT 'Zdarma',
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  cancellation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS event_registrations (
  event_id TEXT NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_club_events_date ON club_events(club_id, status, event_date, start_time);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member ON event_registrations(membership_id, status, event_id);
