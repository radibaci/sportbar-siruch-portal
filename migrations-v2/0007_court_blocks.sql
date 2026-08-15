PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS court_blocks (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE CASCADE,
  block_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('tournament', 'demo', 'training', 'service', 'maintenance', 'other')),
  title TEXT NOT NULL,
  note TEXT,
  color TEXT NOT NULL DEFAULT '#7c4dff',
  created_by_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS court_block_slots (
  block_id TEXT NOT NULL REFERENCES court_blocks(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE CASCADE,
  slot_at TEXT NOT NULL,
  PRIMARY KEY (court_id, slot_at),
  UNIQUE (block_id, slot_at)
);

CREATE TRIGGER IF NOT EXISTS prevent_reservation_on_blocked_slot
BEFORE INSERT ON reservation_slots
WHEN EXISTS (SELECT 1 FROM court_block_slots WHERE court_id = NEW.court_id AND slot_at = NEW.slot_at)
BEGIN
  SELECT RAISE(ABORT, 'court_slot_blocked');
END;

CREATE TRIGGER IF NOT EXISTS prevent_block_on_reserved_slot
BEFORE INSERT ON court_block_slots
WHEN EXISTS (SELECT 1 FROM reservation_slots WHERE court_id = NEW.court_id AND slot_at = NEW.slot_at)
BEGIN
  SELECT RAISE(ABORT, 'court_slot_reserved');
END;

CREATE INDEX IF NOT EXISTS idx_court_blocks_schedule ON court_blocks(club_id, block_date, court_id, start_time);
