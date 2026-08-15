PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stringing_jobs (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE REFERENCES club_orders(id) ON DELETE CASCADE,
  player_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  assigned_stringer_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  racket_label TEXT NOT NULL DEFAULT 'Moje raketa',
  string_name TEXT NOT NULL DEFAULT 'Doporuci vypletac',
  tension TEXT NOT NULL DEFAULT 'Doporuci vypletac',
  status TEXT NOT NULL DEFAULT 'waiting_dropoff' CHECK (status IN (
    'waiting_dropoff', 'at_club', 'with_stringer', 'returned_to_club',
    'ready_for_pickup', 'delivered', 'cancelled'
  )),
  player_note TEXT NOT NULL DEFAULT '',
  staff_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stringing_club_queue ON stringing_jobs(club_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_stringing_player ON stringing_jobs(player_membership_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stringing_stringer ON stringing_jobs(assigned_stringer_membership_id, status);
