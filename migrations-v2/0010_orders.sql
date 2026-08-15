PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS club_orders (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_memberships(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'product' CHECK (product_type IN ('product', 'service', 'demo')),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('pickup', 'reservation', 'event')),
  pickup_date TEXT,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES club_events(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'unassigned' CHECK (source IN ('unassigned', 'stock', 'supplier', 'check')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'checking', 'ordered', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_orders_queue ON club_orders(club_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_club_orders_member ON club_orders(membership_id, created_at);
CREATE INDEX IF NOT EXISTS idx_club_orders_reservation ON club_orders(reservation_id, status);
