PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tournament_teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES club_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','withdrawn')),
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_team_members (
  team_id TEXT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position IN (1,2)),
  PRIMARY KEY (team_id, membership_id),
  UNIQUE (team_id, position)
);

CREATE TABLE IF NOT EXISTS tournament_group_teams (
  group_id TEXT NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  seed_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, team_id)
);

ALTER TABLE tournament_matches ADD COLUMN team_a_id TEXT REFERENCES tournament_teams(id) ON DELETE SET NULL;
ALTER TABLE tournament_matches ADD COLUMN team_b_id TEXT REFERENCES tournament_teams(id) ON DELETE SET NULL;
ALTER TABLE tournament_matches ADD COLUMN winner_team_id TEXT REFERENCES tournament_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id, status, registered_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_team_member_active
  ON tournament_team_members(membership_id, team_id);
