-- 002_feedback_and_sessions
-- Evidence instrumentation tables for teacher feedback and session tracking.

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  panel_id TEXT NOT NULL,
  prompt_class TEXT,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  generation_id TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_classroom ON feedback(classroom_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_panel ON feedback(panel_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  panels_visited TEXT NOT NULL,
  generations_triggered TEXT NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_classroom ON sessions(classroom_id, created_at);
