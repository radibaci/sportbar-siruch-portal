PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS game_counterproposals (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  proposer_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES club_courts(id) ON DELETE RESTRICT,
  proposed_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at TEXT NOT NULL,
  responded_at TEXT,
  CHECK (start_time < end_time)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_counter_pending_proposer ON game_counterproposals(reservation_id, proposer_membership_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS replacement_candidates (
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  candidate_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  invited_by_membership_id TEXT REFERENCES club_memberships(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined','selected','rejected','cancelled')),
  created_at TEXT NOT NULL,
  responded_at TEXT,
  PRIMARY KEY (reservation_id, candidate_membership_id)
);

CREATE TABLE IF NOT EXISTS replacement_votes (
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  candidate_membership_id TEXT NOT NULL,
  voter_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (reservation_id, voter_membership_id),
  FOREIGN KEY (reservation_id, candidate_membership_id) REFERENCES replacement_candidates(reservation_id, candidate_membership_id) ON DELETE CASCADE
);
