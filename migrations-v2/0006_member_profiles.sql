PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS member_club_profiles (
  membership_id TEXT PRIMARY KEY REFERENCES club_memberships(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'club' CHECK (account_type IN ('club', 'credit', 'guest')),
  base_discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (base_discount_pct BETWEEN 0 AND 60),
  loyalty_discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_discount_pct BETWEEN 0 AND 40),
  discount_reason TEXT,
  admin_note TEXT,
  updated_by_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_profiles_club ON member_club_profiles(club_id, account_type);
