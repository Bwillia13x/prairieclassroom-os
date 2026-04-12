// services/orchestrator/__tests__/access-audit.test.ts
//
// Tests the access-audit filter/summary helpers that ship as part of the
// request-logs library. The source of truth is the JSONL records produced by
// services/orchestrator/request-context.ts — this test wires a synthetic set
// of records directly into the filter API to verify the governance queries
// pilot operators actually need.
import { describe, it, expect } from "vitest";
// @ts-expect-error - .mjs import without types; the module is plain JS
import { filterAccessAuditRecords, summarizeAccessAudit } from "../../../scripts/lib/request-logs.mjs";

type AuditRecord = {
  timestamp: string;
  request_id: string;
  route: string;
  classroom_id: string | null;
  classroom_role: string | null;
  demo_bypass: boolean | null;
  auth_outcome: string;
  status_code: number;
  detail_code: string | null;
};

function makeRecord(overrides: Partial<AuditRecord>): AuditRecord {
  return {
    timestamp: "2026-04-12T10:00:00.000Z",
    request_id: "req-1",
    route: "GET /api/today/:classroomId",
    classroom_id: "cls-alpha",
    classroom_role: "teacher",
    demo_bypass: false,
    auth_outcome: "allowed",
    status_code: 200,
    detail_code: null,
    ...overrides,
  };
}

const FIXTURE: AuditRecord[] = [
  makeRecord({
    request_id: "r-1",
    timestamp: "2026-04-11T08:00:00.000Z",
    classroom_id: "cls-alpha",
    classroom_role: "teacher",
    auth_outcome: "allowed",
  }),
  makeRecord({
    request_id: "r-2",
    timestamp: "2026-04-11T09:00:00.000Z",
    classroom_id: "cls-alpha",
    classroom_role: "ea",
    auth_outcome: "allowed",
  }),
  makeRecord({
    request_id: "r-3",
    timestamp: "2026-04-11T10:00:00.000Z",
    classroom_id: "cls-alpha",
    classroom_role: null,
    auth_outcome: "classroom_code_missing",
    status_code: 401,
    detail_code: "classroom_code_missing",
  }),
  makeRecord({
    request_id: "r-4",
    timestamp: "2026-04-12T08:00:00.000Z",
    classroom_id: "cls-bravo",
    classroom_role: "teacher",
    auth_outcome: "allowed",
  }),
  makeRecord({
    request_id: "r-5",
    timestamp: "2026-04-12T09:00:00.000Z",
    classroom_id: "demo-okafor-grade34",
    classroom_role: "teacher",
    demo_bypass: true,
    auth_outcome: "demo_bypass",
  }),
  makeRecord({
    request_id: "r-6",
    timestamp: "2026-04-12T10:00:00.000Z",
    classroom_id: "cls-alpha",
    classroom_role: "ea",
    auth_outcome: "classroom_role_forbidden",
    status_code: 403,
    detail_code: "classroom_role_forbidden",
  }),
  makeRecord({
    request_id: "r-7",
    timestamp: "2026-04-12T11:00:00.000Z",
    classroom_id: null,
    classroom_role: null,
    auth_outcome: "none",
    route: "GET /health",
  }),
];

describe("filterAccessAuditRecords", () => {
  it("returns every record when no filters are set", () => {
    expect(filterAccessAuditRecords(FIXTURE, {})).toHaveLength(FIXTURE.length);
  });

  it("filters by classroom_id", () => {
    const result = filterAccessAuditRecords(FIXTURE, { classroomId: "cls-alpha" });
    expect(result.map((r: AuditRecord) => r.request_id)).toEqual([
      "r-1",
      "r-2",
      "r-3",
      "r-6",
    ]);
  });

  it("filters by classroom role", () => {
    const result = filterAccessAuditRecords(FIXTURE, { role: "ea" });
    expect(result.map((r: AuditRecord) => r.request_id)).toEqual(["r-2", "r-6"]);
  });

  it("filters by auth_outcome vocabulary", () => {
    const result = filterAccessAuditRecords(FIXTURE, { outcome: "denied" });
    expect(result.map((r: AuditRecord) => r.request_id)).toEqual(["r-3", "r-6"]);
  });

  it("filters by explicit auth_outcome code", () => {
    const result = filterAccessAuditRecords(FIXTURE, {
      outcome: "classroom_role_forbidden",
    });
    expect(result.map((r: AuditRecord) => r.request_id)).toEqual(["r-6"]);
  });

  it("filters out audit_outcome=none when onlyClassroomContext is true", () => {
    const result = filterAccessAuditRecords(FIXTURE, { onlyClassroomContext: true });
    expect(result.map((r: AuditRecord) => r.request_id)).not.toContain("r-7");
  });

  it("filters by from/to date range", () => {
    const result = filterAccessAuditRecords(FIXTURE, {
      from: "2026-04-12",
      to: "2026-04-12",
    });
    expect(result.map((r: AuditRecord) => r.request_id)).toEqual([
      "r-4",
      "r-5",
      "r-6",
      "r-7",
    ]);
  });

  it("combines filters (classroom + outcome=denied)", () => {
    const result = filterAccessAuditRecords(FIXTURE, {
      classroomId: "cls-alpha",
      outcome: "denied",
    });
    expect(result.map((r: AuditRecord) => r.request_id)).toEqual(["r-3", "r-6"]);
  });
});

describe("summarizeAccessAudit", () => {
  it("groups records by classroom_id + auth_outcome and reports a denial ratio", () => {
    const summary = summarizeAccessAudit(FIXTURE);
    expect(summary.total_records).toBe(FIXTURE.length);
    expect(summary.by_classroom["cls-alpha"]).toBeDefined();
    expect(summary.by_classroom["cls-alpha"].total).toBe(4);
    expect(summary.by_classroom["cls-alpha"].by_outcome.allowed).toBe(2);
    expect(summary.by_classroom["cls-alpha"].by_outcome.classroom_code_missing).toBe(1);
    expect(summary.by_classroom["cls-alpha"].by_outcome.classroom_role_forbidden).toBe(1);
    expect(summary.by_role.teacher).toBeGreaterThan(0);
    expect(summary.by_role.ea).toBe(2);
    expect(summary.denial_count).toBe(2);
    expect(summary.demo_bypass_count).toBe(1);
  });

  it("reports zero when there are no records", () => {
    const summary = summarizeAccessAudit([]);
    expect(summary.total_records).toBe(0);
    expect(summary.denial_count).toBe(0);
    expect(summary.demo_bypass_count).toBe(0);
  });
});
