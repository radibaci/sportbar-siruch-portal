PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS court_price_rules (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  created_by_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_court_price_rules_lookup
  ON court_price_rules(club_id, court_id, day_key, start_time, end_time);
