CREATE TABLE IF NOT EXISTS diagrams (
  id               UUID        PRIMARY KEY,
  yjs_state        BYTEA,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagrams_last_accessed
  ON diagrams (last_accessed_at);
