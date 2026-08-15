ALTER TABLE reservation_participants ADD COLUMN withdrawn_at TEXT;

CREATE INDEX IF NOT EXISTS idx_participants_withdrawn
  ON reservation_participants(reservation_id, membership_id, withdrawn_at);
