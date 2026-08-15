PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS supplier_event_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL UNIQUE REFERENCES club_events(id) ON DELETE CASCADE,
  poll_id TEXT REFERENCES club_polls(id) ON DELETE SET NULL,
  winner_option_id TEXT REFERENCES club_poll_options(id) ON DELETE SET NULL,
  created_by_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  seller_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  requested_items TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','published','cancelled')),
  seller_items TEXT NOT NULL DEFAULT '',
  seller_note TEXT NOT NULL DEFAULT '',
  responded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supplier_requests_club_status ON supplier_event_requests(club_id, status, created_at);
