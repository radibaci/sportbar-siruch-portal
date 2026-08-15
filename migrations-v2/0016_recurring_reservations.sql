PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reservation_series (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE RESTRICT,
  owner_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  created_by_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  game_type TEXT NOT NULL CHECK (game_type IN ('single','double')),
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_date <= end_date),
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS reservation_series_participants (
  series_id TEXT NOT NULL REFERENCES reservation_series(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('owner','confirmed','pending')),
  PRIMARY KEY (series_id, membership_id)
);

ALTER TABLE reservations ADD COLUMN series_id TEXT REFERENCES reservation_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_series_club ON reservation_series(club_id, status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_series ON reservations(series_id, reservation_date);
