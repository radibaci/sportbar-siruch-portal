PRAGMA foreign_keys = ON;

ALTER TABLE reservations ADD COLUMN external_participants_json TEXT NOT NULL DEFAULT '[]';

