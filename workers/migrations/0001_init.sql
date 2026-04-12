-- Diagramer D1 Schema
CREATE TABLE IF NOT EXISTS diagrams (
  id               TEXT PRIMARY KEY,
  yjs_state        BLOB,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_diagrams_last_accessed
  ON diagrams (last_accessed_at);
