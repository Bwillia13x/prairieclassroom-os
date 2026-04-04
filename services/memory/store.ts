// services/memory/store.ts
import { getDb } from "./db.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { DifferentiatedVariant } from "../../packages/shared/schemas/artifact.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";

export function savePlan(
  classroomId: string,
  plan: TomorrowPlan,
  teacherReflection: string,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO generated_plans
    (plan_id, classroom_id, teacher_reflection, plan_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    plan.plan_id,
    classroomId,
    teacherReflection,
    JSON.stringify(plan),
    modelId,
    new Date().toISOString(),
  );
}

export function saveVariants(
  classroomId: string,
  variants: DifferentiatedVariant[],
  modelId: string,
): void {
  const db = getDb(classroomId);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO generated_variants
    (variant_id, artifact_id, classroom_id, variant_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const insertAll = db.transaction(() => {
    for (const v of variants) {
      stmt.run(v.variant_id, v.artifact_id, classroomId, JSON.stringify(v), modelId, now);
    }
  });
  insertAll();
}

export function saveFamilyMessage(
  classroomId: string,
  draft: FamilyMessageDraft,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO family_messages
    (draft_id, classroom_id, student_refs, message_json, teacher_approved, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(
    draft.draft_id,
    classroomId,
    JSON.stringify(draft.student_refs),
    JSON.stringify(draft),
    new Date().toISOString(),
  );
}

export function approveFamilyMessage(classroomId: string, draftId: string): void {
  const db = getDb(classroomId);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE family_messages
    SET teacher_approved = 1, approval_timestamp = ?
    WHERE draft_id = ?
  `).run(now, draftId);
}

export function saveIntervention(
  classroomId: string,
  record: InterventionRecord,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO interventions
    (record_id, classroom_id, student_refs, record_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    record.record_id,
    classroomId,
    JSON.stringify(record.student_refs),
    JSON.stringify(record),
    modelId,
    new Date().toISOString(),
  );
}

export function savePatternReport(
  classroomId: string,
  report: SupportPatternReport,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO pattern_reports
    (report_id, classroom_id, student_filter, report_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    report.report_id,
    classroomId,
    report.student_filter,
    JSON.stringify(report),
    modelId,
    new Date().toISOString(),
  );
}
