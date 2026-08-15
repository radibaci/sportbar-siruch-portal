PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  requester_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  recipient_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TEXT NOT NULL,
  responded_at TEXT,
  CHECK (requester_membership_id != recipient_membership_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pending_pair
  ON friend_requests(club_id, pair_key) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS club_friendships (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL,
  first_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  second_membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (club_id, pair_key),
  CHECK (first_membership_id != second_membership_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_first ON club_friendships(club_id, first_membership_id);
CREATE INDEX IF NOT EXISTS idx_friendships_second ON club_friendships(club_id, second_membership_id);
