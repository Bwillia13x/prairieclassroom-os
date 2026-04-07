# Schedule Data Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the schedule data model with EA student assignments, date-aware events, and a sub-ready authorization flag — the shared infrastructure that makes the Substitute Survival Packet and EA Load Balancer possible.

**Architecture:** Extend existing Zod schemas (`ScheduleBlockInputSchema`, `UpcomingEventSchema`, `ClassroomProfileSchema`) with three targeted additions. Add CRUD endpoints so schedules are editable through the API (currently read-only from JSON). No new SQLite tables — schedules remain part of the classroom profile, which is the simplest persistence model for classroom-scoped data.

**Tech Stack:** Zod 4, TypeScript, Express, better-sqlite3, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/shared/schemas/forecast.ts` | Modify | Add `ea_student_refs` to `ScheduleBlockInputSchema`, add `event_date` to `UpcomingEventSchema` |
| `packages/shared/schemas/classroom.ts` | Modify | Add `sub_ready` flag to `ClassroomProfileSchema` |
| `services/orchestrator/validate.ts` | Modify | Add `ScheduleUpdateRequestSchema` |
| `services/orchestrator/server.ts` | Modify | Add GET/PUT `/api/classrooms/:id/schedule` endpoints |
| `data/synthetic_classrooms/classroom_demo.json` | Modify | Enrich with `ea_student_refs` and `event_date` |
| `evals/cases/sched-001-schema.json` | Create | Schema reliability eval for schedule endpoint |
| `evals/cases/sched-002-update.json` | Create | Schedule update round-trip eval |
| `docs/decision-log.md` | Modify | ADR for schedule data model enrichment |

---

### Task 1: Enrich ScheduleBlockInputSchema with EA student assignments

**Files:**
- Modify: `packages/shared/schemas/forecast.ts:8-18`

- [ ] **Step 1: Add `ea_student_refs` to ScheduleBlockInputSchema**

In `packages/shared/schemas/forecast.ts`, add the optional `ea_student_refs` field to `ScheduleBlockInputSchema`:

```typescript
export const ScheduleBlockInputSchema = z.object({
  time_slot: z.string(),
  activity: z.string(),
  ea_available: z.boolean(),
  ea_student_refs: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
```

This is a backward-compatible change — existing data without `ea_student_refs` still validates.

- [ ] **Step 2: Add `event_date` to UpcomingEventSchema**

In the same file, add the optional `event_date` field:

```typescript
export const UpcomingEventSchema = z.object({
  description: z.string(),
  event_date: z.string().optional(),
  time_slot: z.string().optional(),
  impacts: z.string().optional(),
});
```

- [ ] **Step 3: Run typecheck to verify no breakage**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npx tsc --noEmit`
Expected: 0 errors (fields are optional, fully backward-compatible)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/schemas/forecast.ts
git commit -m "feat(schema): add ea_student_refs and event_date to schedule schemas

EA student assignments per block enable the Survival Packet and Load
Balancer to know which students the EA supports during each time slot.
Date-aware events let downstream consumers filter by temporal relevance."
```

---

### Task 2: Add sub_ready flag to ClassroomProfile

**Files:**
- Modify: `packages/shared/schemas/classroom.ts:19-32`

- [ ] **Step 1: Add `sub_ready` field to ClassroomProfileSchema**

In `packages/shared/schemas/classroom.ts`, add the flag:

```typescript
export const ClassroomProfileSchema = z.object({
  classroom_id: z.string(),
  grade_band: z.string(),
  subject_focus: z.string(),
  classroom_notes: z.array(z.string()),
  routines: z.record(z.string(), z.string()),
  support_constraints: z.array(z.string()).optional(),
  students: z.array(StudentSupportSummarySchema),
  access_code: z.string().optional(),
  sub_ready: z.boolean().optional(),
  schedule: z.array(ScheduleBlockInputSchema).optional(),
  upcoming_events: z.array(UpcomingEventSchema).optional(),
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add packages/shared/schemas/classroom.ts
git commit -m "feat(schema): add sub_ready flag to ClassroomProfile

Teachers must set sub_ready = true before a Substitute Survival Packet
can be generated. This is the pre-authorization gate required by the
safety governance model."
```

---

### Task 3: Update demo classroom data

**Files:**
- Modify: `data/synthetic_classrooms/classroom_demo.json`

- [ ] **Step 1: Add `ea_student_refs` to schedule blocks where EA is available**

In `classroom_demo.json`, update each schedule block that has `"ea_available": true` with specific student assignments based on the student profiles:

```json
{
  "time_slot": "8:30-9:15",
  "activity": "Bell work journal + calendar math",
  "ea_available": true,
  "ea_student_refs": ["Amira", "Daniyal"]
}
```

```json
{
  "time_slot": "9:15-9:30",
  "activity": "Recess transition",
  "ea_available": true,
  "ea_student_refs": ["Brody"],
  "notes": "Historically difficult - sensory needs peak"
}
```

```json
{
  "time_slot": "9:30-10:30",
  "activity": "Literacy block",
  "ea_available": true,
  "ea_student_refs": ["Amira", "Daniyal", "Farid"]
}
```

```json
{
  "time_slot": "10:30-10:45",
  "activity": "Snack break",
  "ea_available": true,
  "ea_student_refs": []
}
```

```json
{
  "time_slot": "10:45-11:45",
  "activity": "Science / Social Studies",
  "ea_available": true,
  "ea_student_refs": ["Amira", "Brody"],
  "notes": "EA departs at noon - last full-support block"
}
```

All afternoon blocks (ea_available: false) retain no `ea_student_refs`.

- [ ] **Step 2: Add `event_date` to upcoming_events**

```json
"upcoming_events": [
  {
    "description": "New EAL student (Somali-speaking) starting",
    "event_date": "2026-04-07",
    "time_slot": "All day",
    "impacts": "Will need buddy assignment and visual schedule"
  }
]
```

- [ ] **Step 3: Add `sub_ready` flag**

Add `"sub_ready": true` to the demo classroom JSON (top-level, after `access_code`).

- [ ] **Step 4: Run eval suite to confirm no regressions**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npx tsx evals/runner.ts 2>&1 | tail -5`
Expected: All existing evals still pass (schema additions are optional fields)

- [ ] **Step 5: Commit**

```bash
git add data/synthetic_classrooms/classroom_demo.json
git commit -m "data: enrich demo classroom with EA assignments and event dates

Ms. Fehr (EA) now has explicit student assignments per block:
Amira + Daniyal in morning, Brody during transitions, Farid during
literacy. New EAL student arrival dated to 2026-04-07. sub_ready
flag enabled for Survival Packet testing."
```

---

### Task 4: Schedule validation schema

**Files:**
- Modify: `services/orchestrator/validate.ts`

- [ ] **Step 1: Add ScheduleUpdateRequestSchema**

At the end of the request schema section in `validate.ts`, add:

```typescript
export const ScheduleUpdateRequestSchema = z.object({
  schedule: z.array(
    z.object({
      time_slot: z.string().min(1),
      activity: z.string().min(1),
      ea_available: z.boolean(),
      ea_student_refs: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
  ).min(1),
  upcoming_events: z.array(
    z.object({
      description: z.string().min(1),
      event_date: z.string().optional(),
      time_slot: z.string().optional(),
      impacts: z.string().optional(),
    })
  ).optional(),
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add services/orchestrator/validate.ts
git commit -m "feat(validate): add ScheduleUpdateRequestSchema for PUT endpoint"
```

---

### Task 5: Schedule GET/PUT API endpoints

**Files:**
- Modify: `services/orchestrator/server.ts`

- [ ] **Step 1: Add GET `/api/classrooms/:id/schedule`**

After the existing `app.get("/api/classrooms", ...)` block (around line 122), add:

```typescript
app.get("/api/classrooms/:id/schedule", (req, res) => {
  const classroom = loadClassroom(req.params.id);
  if (!classroom) {
    res.status(404).json({ error: `Classroom '${req.params.id}' not found` });
    return;
  }
  res.json({
    classroom_id: classroom.classroom_id,
    schedule: classroom.schedule ?? [],
    upcoming_events: classroom.upcoming_events ?? [],
    sub_ready: classroom.sub_ready ?? false,
  });
});
```

- [ ] **Step 2: Add PUT `/api/classrooms/:id/schedule`**

Import `ScheduleUpdateRequestSchema` from validate.ts, then add the PUT route:

```typescript
import { writeFileSync } from "node:fs";
```

(Add to existing `node:fs` import at the top of the file.)

```typescript
app.put(
  "/api/classrooms/:id/schedule",
  authMiddleware,
  validateBody(ScheduleUpdateRequestSchema),
  (req, res) => {
    const classroomId = req.params.id;
    const classroom = loadClassroom(classroomId);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroomId}' not found` });
      return;
    }

    // Update in-memory and persist to JSON file
    classroom.schedule = req.body.schedule;
    if (req.body.upcoming_events !== undefined) {
      classroom.upcoming_events = req.body.upcoming_events;
    }

    const filePath = join(DATA_DIR, `classroom_${classroomId.split("-")[0]}.json`);
    try {
      writeFileSync(filePath, JSON.stringify(classroom, null, 2), "utf-8");
    } catch {
      // If filename convention doesn't match, try exact id
      const altPath = join(DATA_DIR, `classroom_${classroomId}.json`);
      writeFileSync(altPath, JSON.stringify(classroom, null, 2), "utf-8");
    }

    res.json({
      classroom_id: classroomId,
      schedule: classroom.schedule,
      upcoming_events: classroom.upcoming_events ?? [],
      updated: true,
    });
  }
);
```

Note: The PUT approach writes back to the JSON file. This is consistent with the local-first architecture — no separate SQLite table for schedules. For multi-user deployments, this would need a different persistence strategy, but that's a future concern noted in the decision log.

- [ ] **Step 3: Register auth on the schedule PUT route**

Add before the routes section (near line 103):

```typescript
app.use("/api/classrooms/:id/schedule", authMiddleware);
```

Wait — the GET endpoint should be open (like `/api/classrooms`), but PUT needs auth. Use the auth middleware directly on the PUT route handler instead (already done in Step 2 with the middleware parameter). Remove any blanket auth on the path to avoid blocking GET.

- [ ] **Step 4: Add ScheduleUpdateRequestSchema to imports**

Update the import block at the top of server.ts to include:

```typescript
import {
  validateBody,
  DifferentiateRequestSchema,
  TomorrowPlanRequestSchema,
  FamilyMessageRequestSchema,
  ApproveMessageRequestSchema,
  InterventionRequestSchema,
  SimplifyRequestSchema,
  VocabCardsRequestSchema,
  SupportPatternsRequestSchema,
  EABriefingRequestSchema,
  ComplexityForecastRequestSchema,
  ScaffoldDecayRequestSchema,
  ScheduleUpdateRequestSchema,
} from "./validate.js";
```

Also add `writeFileSync` to the `node:fs` import:

```typescript
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
```

- [ ] **Step 5: Run typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add services/orchestrator/server.ts services/orchestrator/validate.ts
git commit -m "feat(api): add GET/PUT schedule endpoints

GET /api/classrooms/:id/schedule returns schedule blocks, events, and
sub_ready flag. PUT updates the classroom JSON file (local-first
persistence). Auth required on PUT only."
```

---

### Task 6: Eval cases for schedule endpoints

**Files:**
- Create: `evals/cases/sched-001-schema.json`
- Create: `evals/cases/sched-002-update.json`

- [ ] **Step 1: Create schema reliability eval**

```json
{
  "id": "sched-001-schema",
  "category": "schema_reliability",
  "description": "Schedule GET endpoint returns valid structure with ea_student_refs and sub_ready flag",
  "prompt_class": null,
  "endpoint": "GET /api/classrooms/demo-okafor-grade34/schedule",
  "input": {
    "classroom_id": "demo-okafor-grade34"
  },
  "expected": {
    "required_keys": ["classroom_id", "schedule", "upcoming_events", "sub_ready"],
    "schedule_min_blocks": 5,
    "schedule_block_required_keys": ["time_slot", "activity", "ea_available"],
    "sub_ready_type": "boolean"
  }
}
```

- [ ] **Step 2: Create schedule update eval**

```json
{
  "id": "sched-002-update",
  "category": "schema_reliability",
  "description": "Schedule PUT endpoint accepts valid schedule and returns updated structure",
  "prompt_class": null,
  "endpoint": "PUT /api/classrooms/demo-okafor-grade34/schedule",
  "input": {
    "classroom_id": "demo-okafor-grade34",
    "body": {
      "schedule": [
        { "time_slot": "8:30-9:15", "activity": "Bell work", "ea_available": true, "ea_student_refs": ["Amira"] },
        { "time_slot": "9:15-10:15", "activity": "Literacy", "ea_available": true, "ea_student_refs": ["Amira", "Daniyal"] },
        { "time_slot": "10:15-10:30", "activity": "Recess", "ea_available": false }
      ]
    }
  },
  "expected": {
    "status": 200,
    "required_keys": ["classroom_id", "schedule", "updated"],
    "updated": true
  }
}
```

Note: The eval runner will need a small extension to handle non-inference endpoints (GET/PUT without prompt_class). If the runner doesn't support this yet, these evals serve as manual test specifications and can be automated in a follow-up.

- [ ] **Step 3: Commit**

```bash
git add evals/cases/sched-001-schema.json evals/cases/sched-002-update.json
git commit -m "eval: add schedule endpoint schema and update evals"
```

---

### Task 7: Decision log entry

**Files:**
- Modify: `docs/decision-log.md`

- [ ] **Step 1: Add ADR at the top of the decision log**

Add after the `---` separator following the template section:

```markdown
### 2026-04-04 — Schedule data model enrichment

- **Decision:** Extend ScheduleBlockInputSchema with optional `ea_student_refs` (which students the EA supports per block) and UpcomingEventSchema with optional `event_date`. Add `sub_ready` boolean flag to ClassroomProfile. Add GET/PUT `/api/classrooms/:id/schedule` endpoints. Persist schedule updates to the classroom JSON file.
- **Why:** The Substitute Survival Packet and EA Cognitive Load Balancer both need richer schedule data than the current boolean `ea_available`. Explicit EA-student assignments per block enable load calculation and substitution handoff. The `sub_ready` flag is the pre-authorization gate for survival packet generation. Date-aware events allow temporal filtering.
- **Alternatives considered:** (1) Separate SQLite table for schedules — adds complexity without clear benefit since schedules are classroom-scoped and change infrequently. (2) Day-of-week schedule variants — deferred; a single default schedule covers most use cases for now. (3) No persistence (in-memory only) — breaks local-first promise.
- **Consequences:** All existing data validates without changes (new fields are optional). Demo classroom enriched with EA assignments from Ms. Fehr's actual support pattern. Schedule PUT writes directly to JSON — fine for single-user local deployments but would need a different strategy for multi-user.
- **What would change this:** Multi-user deployment requiring concurrent schedule edits, or evidence that day-of-week schedule variants are needed for the EA Load Balancer.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: ADR for schedule data model enrichment"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npx tsx evals/runner.ts` — all 57 existing evals still pass
- [ ] Manual: `curl http://localhost:3100/api/classrooms/demo-okafor-grade34/schedule` returns schedule with `ea_student_refs` and `sub_ready`
- [ ] Manual: PUT to schedule endpoint updates the JSON file on disk
- [ ] Demo classroom has EA student assignments on morning blocks
- [ ] Decision log updated
