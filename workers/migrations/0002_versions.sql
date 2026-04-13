-- Version history for diagrams
CREATE TABLE IF NOT EXISTS diagram_versions (
  id            TEXT PRIMARY KEY,
  diagram_id    TEXT NOT NULL,
  yjs_state     BLOB NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  author_name   TEXT,
  label         TEXT,
  is_auto       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_versions_diagram
  ON diagram_versions (diagram_id, created_at DESC);
