-- 001_initial_schema
-- Extracted from services/memory/db.ts inline CREATE TABLE/INDEX statements.
-- Uses IF NOT EXISTS so this migration is safe to run against databases
-- that were created before the migration framework existed.

CREATE TABLE IF NOT EXISTS generated_plans (
  plan_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  teacher_reflection TEXT,
  plan_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_variants (
  variant_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  variant_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_messages (
  draft_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  student_refs TEXT NOT NULL,
  message_json TEXT NOT NULL,
  teacher_approved INTEGER DEFAULT 0,
  approval_timestamp TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interventions (
  record_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  student_refs TEXT NOT NULL,
  record_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pattern_reports (
  report_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  student_filter TEXT,
  report_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complexity_forecasts (
  forecast_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  forecast_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scaffold_reviews (
  report_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  student_ref TEXT NOT NULL,
  report_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS survival_packets (
  packet_id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  generated_for_date TEXT NOT NULL,
  packet_json TEXT NOT NULL,
  model_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_forecasts_classroom
  ON complexity_forecasts(classroom_id, created_at);

CREATE INDEX IF NOT EXISTS idx_plans_classroom
  ON generated_plans(classroom_id, created_at);
CREATE INDEX IF NOT EXISTS idx_variants_classroom
  ON generated_variants(classroom_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_classroom
  ON family_messages(classroom_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interventions_classroom
  ON interventions(classroom_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patterns_classroom
  ON pattern_reports(classroom_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scaffold_reviews_classroom
  ON scaffold_reviews(classroom_id, student_ref, created_at);
CREATE INDEX IF NOT EXISTS idx_survival_packets_classroom
  ON survival_packets(classroom_id, created_at);
