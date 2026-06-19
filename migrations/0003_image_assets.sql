CREATE TABLE IF NOT EXISTS image_assets (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  body BLOB NOT NULL,
  created_at TEXT NOT NULL
);

