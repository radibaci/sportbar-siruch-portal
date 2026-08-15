PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS club_courts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surface TEXT NOT NULL CHECK (surface IN ('clay', 'hard', 'grass', 'carpet', 'other')),
  color TEXT NOT NULL DEFAULT '#5f8f72',
  photo_url TEXT,
  open_time TEXT NOT NULL DEFAULT '08:00',
  close_time TEXT NOT NULL DEFAULT '21:00',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, name)
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE RESTRICT,
  owner_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  reservation_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('single', 'double')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'searching', 'cancelled', 'completed')),
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS reservation_slots (
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE CASCADE,
  slot_at TEXT NOT NULL,
  PRIMARY KEY (court_id, slot_at),
  UNIQUE (reservation_id, slot_at)
);

CREATE TABLE IF NOT EXISTS reservation_participants (
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('owner', 'pending', 'confirmed', 'declined', 'candidate', 'replacement')),
  invited_by_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  responded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (reservation_id, membership_id)
);

CREATE TABLE IF NOT EXISTS member_busy_slots (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  slot_at TEXT NOT NULL,
  PRIMARY KEY (club_id, membership_id, slot_at)
);

CREATE TABLE IF NOT EXISTS member_notifications (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  recipient_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  actor_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  read_at TEXT,
  acted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courts_club ON club_courts(club_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_reservations_club_day ON reservations(club_id, reservation_date, court_id, start_time);
CREATE INDEX IF NOT EXISTS idx_participants_member ON reservation_participants(membership_id, status, reservation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON member_notifications(recipient_membership_id, acted_at, created_at);
