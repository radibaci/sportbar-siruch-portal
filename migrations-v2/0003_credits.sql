PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS club_credit_rules (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  threshold_minor INTEGER NOT NULL CHECK (threshold_minor > 0),
  bonus_minor INTEGER NOT NULL DEFAULT 0 CHECK (bonus_minor >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, threshold_minor)
);

CREATE TABLE IF NOT EXISTS member_credit_accounts (
  membership_id TEXT PRIMARY KEY REFERENCES club_memberships(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  paid_balance_minor INTEGER NOT NULL DEFAULT 0,
  bonus_balance_minor INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'charge', 'adjustment', 'refund')),
  paid_delta_minor INTEGER NOT NULL DEFAULT 0,
  bonus_delta_minor INTEGER NOT NULL DEFAULT 0,
  paid_balance_after_minor INTEGER NOT NULL,
  bonus_balance_after_minor INTEGER NOT NULL,
  rule_id TEXT REFERENCES club_credit_rules(id) ON DELETE SET NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'qr', 'card', 'other')),
  note TEXT,
  idempotency_key TEXT NOT NULL,
  actor_user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE (club_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_credit_rules_club ON club_credit_rules(club_id, active, threshold_minor);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_member ON credit_transactions(membership_id, created_at);
