PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS club_polls (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS club_poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES club_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  logistics_note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS club_poll_votes (
  poll_id TEXT NOT NULL REFERENCES club_polls(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES club_poll_options(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 3),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (poll_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_club_status ON club_polls(club_id, status, ends_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON club_poll_votes(poll_id, option_id);
