-- 003_runs
-- Lightweight per-classroom run history for the Prep chip row.
-- Metadata only (label + tool + timestamp + optional JSON context). Full
-- payloads live in the teacher's sessionStorage; this table exists so the
-- chip row survives a reload or a cross-device resume within retention.

CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  tool TEXT NOT NULL CHECK(tool IN ('differentiate', 'simplify', 'vocab')),
  label TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_runs_classroom_tool
  ON runs(classroom_id, tool, created_at DESC);
