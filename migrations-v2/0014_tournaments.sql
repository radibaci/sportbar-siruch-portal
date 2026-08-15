PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS club_tournaments (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  tournament_type TEXT NOT NULL DEFAULT 'single' CHECK (tournament_type IN ('single','double')),
  tournament_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  registration_deadline TEXT NOT NULL,
  max_participants INTEGER NOT NULL CHECK (max_participants BETWEEN 2 AND 256),
  entry_fee_label TEXT NOT NULL DEFAULT 'Zdarma',
  rules TEXT NOT NULL DEFAULT '',
  court_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration','groups','knockout','completed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  tournament_id TEXT NOT NULL REFERENCES club_tournaments(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','withdrawn')),
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tournament_id, membership_id)
);

CREATE TABLE IF NOT EXISTS tournament_groups (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES club_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, name)
);

CREATE TABLE IF NOT EXISTS tournament_group_entries (
  group_id TEXT NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  seed_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, membership_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES club_tournaments(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES tournament_groups(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('group','round16','quarterfinal','semifinal','final')),
  match_order INTEGER NOT NULL DEFAULT 0,
  player_a_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  player_b_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  winner_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  score TEXT NOT NULL DEFAULT '',
  court_id TEXT REFERENCES club_courts(id) ON DELETE SET NULL,
  start_time TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','walkover')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournaments_club_date ON club_tournaments(club_id, status, tournament_date);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_member ON tournament_participants(membership_id, status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id, stage, match_order);
