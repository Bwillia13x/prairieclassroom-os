# Sprint 3 Implementation Plan — Classroom Memory + Family Messaging

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SQLite-backed classroom memory (persist and retrieve generated outputs) and the family messaging workflow, moving PrairieClassroom from stateless content generator to persistent classroom OS.

**Architecture:** SQLite per classroom via better-sqlite3, three tables (plans, variants, messages). New services/memory/ module. New draft_family_message prompt contract following the established pattern. Retrieval injection into tomorrow plan prompts. Pre-fill link from plan's family_followups to message composer.

**Tech Stack:** TypeScript (orchestrator, memory, web), Python (inference harness), better-sqlite3, React + Vite, Express, Flask

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| services/memory/db.ts | SQLite connection manager, schema creation, connection cache |
| services/memory/store.ts | Write functions: savePlan, saveVariants, saveFamilyMessage, approveFamilyMessage |
| services/memory/retrieve.ts | Read functions: getRecentPlans, summarizeRecentPlans |
| services/orchestrator/family-message.ts | Prompt builder + parser for draft_family_message |
| apps/web/src/components/MessageComposer.tsx | Family message input form |
| apps/web/src/components/MessageComposer.css | Composer styles |
| apps/web/src/components/MessageDraft.tsx | Draft display + approval button |
| apps/web/src/components/MessageDraft.css | Draft styles |
| evals/cases/msg-001-alpha-schema.json | Schema eval: routine_update |
| evals/cases/msg-002-bravo-schema.json | Schema eval: praise |
| evals/cases/msg-003-content-quality.json | Content quality eval |
| evals/cases/msg-004-safety-boundaries.json | Safety eval |
| evals/cases/msg-005-latency.json | Latency eval |
| docs/sprint-2-review.md | Sprint 2 close-out |
| docs/sprint-3-plan.md | Sprint 3 plan doc |
| docs/sprint-3-checklist.md | Sprint 3 deliverables checklist |

### Modified files

| File | Change |
|------|--------|
| package.json | Add better-sqlite3, @types/better-sqlite3 |
| .gitignore | Add data/memory/*.sqlite |
| services/inference/harness.py | Add prompt_class to GenerationRequest, add MOCK_FAMILY_MESSAGE, update MockBackend dispatch |
| services/inference/server.py | Pass prompt_class through to harness |
| services/orchestrator/server.ts | Import memory, add /api/family-message, add save calls, add retrieval injection |
| services/orchestrator/tomorrow-plan.ts | Accept optional recentPlans in prompt builder |
| apps/web/src/types.ts | Add FamilyMessageDraft, request/response types |
| apps/web/src/api.ts | Add draftFamilyMessage, approveFamilyMessage |
| apps/web/src/App.tsx | Add Family Message tab, pre-fill state, third handler |
| apps/web/src/components/PlanViewer.tsx | Add clickable family_followups, onFollowupClick prop |
| evals/runner.ts | Add runFamilyMessageEval dispatch |

---

## Task 1: Install better-sqlite3

**Files:**
- Modify: package.json
- Modify: .gitignore

- [ ] **Step 1: Install better-sqlite3**

```bash
cd prairieclassroom-predev && npm install better-sqlite3 && npm install -D @types/better-sqlite3
```

- [ ] **Step 2: Add SQLite files to .gitignore**

Append to .gitignore:

```gitignore
# SQLite classroom memory
data/memory/*.sqlite
data/memory/*.sqlite-wal
data/memory/*.sqlite-shm
```

- [ ] **Step 3: Create data/memory directory**

```bash
mkdir -p data/memory && touch data/memory/.gitkeep
```

- [ ] **Step 4: Verify**

Run: `cat package.json | grep better-sqlite3`
Expected: "better-sqlite3" appears in dependencies

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore data/memory/.gitkeep
git commit -m "feat: add better-sqlite3 for classroom memory layer"
```

---

## Task 2: Memory db.ts -- Connection Manager + Schema

**Files:**
- Create: services/memory/db.ts

- [ ] **Step 1: Create services/memory directory**

```bash
mkdir -p services/memory
```

- [ ] **Step 2: Write db.ts**

```typescript
// services/memory/db.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const MEMORY_DIR = resolve(import.meta.dirname ?? ".", "../../data/memory");
const connections = new Map<string, Database.Database>();

export function getDb(classroomId: string): Database.Database {
  const existing = connections.get(classroomId);
  if (existing) return existing;

  mkdirSync(MEMORY_DIR, { recursive: true });
  const dbPath = join(MEMORY_DIR, `${classroomId}.sqlite`);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
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
  `);

  connections.set(classroomId, db);
  return db;
}

export function closeAll(): void {
  for (const db of connections.values()) db.close();
  connections.clear();
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean (0 errors)

- [ ] **Step 4: Commit**

```bash
git add services/memory/db.ts
git commit -m "feat: add SQLite connection manager for classroom memory"
```

---

## Task 3: Memory store.ts -- Write Functions

**Files:**
- Create: services/memory/store.ts

- [ ] **Step 1: Write store.ts**

```typescript
// services/memory/store.ts
import { getDb } from "./db.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { DifferentiatedVariant } from "../../packages/shared/schemas/artifact.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";

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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add services/memory/store.ts
git commit -m "feat: add memory write functions (savePlan, saveVariants, saveFamilyMessage)"
```

---

## Task 4: Memory retrieve.ts -- Read + Summarize

**Files:**
- Create: services/memory/retrieve.ts

- [ ] **Step 1: Write retrieve.ts**

```typescript
// services/memory/retrieve.ts
import { getDb } from "./db.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";

export function getRecentPlans(classroomId: string, limit = 5): TomorrowPlan[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT plan_json FROM generated_plans
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { plan_json: string }[];

  return rows.map((r) => JSON.parse(r.plan_json) as TomorrowPlan);
}

export function summarizeRecentPlans(plans: TomorrowPlan[]): string {
  if (plans.length === 0) return "";

  const lines: string[] = ["Recent classroom history:"];

  for (const plan of plans.slice(0, 3)) {
    lines.push("");
    lines.push(`Previous plan (${plan.plan_id}):`);

    if (plan.support_priorities.length > 0) {
      lines.push(
        "  Priority students: " +
          plan.support_priorities
            .map((p) => `${p.student_ref} (${p.reason})`)
            .join("; "),
      );
    }

    if (plan.transition_watchpoints.length > 0) {
      lines.push(
        "  Watchpoints: " +
          plan.transition_watchpoints
            .map((w) => `${w.time_or_activity}: ${w.risk_description}`)
            .join("; "),
      );
    }

    if (plan.ea_actions.length > 0) {
      lines.push(
        "  EA actions taken: " +
          plan.ea_actions.map((a) => a.description).join("; "),
      );
    }

    if (plan.family_followups.length > 0) {
      lines.push(
        "  Family followups: " +
          plan.family_followups
            .map((f) => `${f.student_ref} (${f.message_type})`)
            .join("; "),
      );
    }
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add services/memory/retrieve.ts
git commit -m "feat: add memory read + summarize functions for retrieval injection"
```

---

## Task 5: Harness -- prompt_class Dispatch + Mock Family Message

**Files:**
- Modify: services/inference/harness.py (lines ~40, ~168, ~202-222)
- Modify: services/inference/server.py (line ~46)

- [ ] **Step 1: Add MOCK_FAMILY_MESSAGE constant**

After the MOCK_TOMORROW_THINKING constant (around line 180), add:

```python
MOCK_FAMILY_MESSAGE = json.dumps({
    "student_refs": ["Ari"],
    "message_type": "praise",
    "target_language": "en",
    "plain_language_text": "Hi! I wanted to share some good news about your child's progress this week. Ari has been showing real improvement in reading comprehension \u2014 during our guided reading session today, they were able to identify the main idea of a passage and explain it in their own words. This is a meaningful step forward. We will keep building on this with sentence starters and paired examples that have been working well. Thank you for your support at home!",
    "simplified_student_text": "Great job this week! You did really well finding the main idea when we read together. Keep it up!"
})
```

- [ ] **Step 2: Add prompt_class to GenerationRequest**

In the GenerationRequest dataclass, add after `max_tokens: int = 2048`:

```python
    prompt_class: str | None = None
```

- [ ] **Step 3: Update MockBackend.generate() dispatch**

Replace the MockBackend.generate method body:

```python
    def generate(self, request: GenerationRequest) -> GenerationResponse:
        if request.tools:
            text = MOCK_RESPONSES["tool_call"]
            tool_calls = json.loads(text).get("tool_calls", [])
            return GenerationResponse(
                text=text, tool_calls=tool_calls, model_id="mock"
            )
        if request.prompt_class == "draft_family_message":
            return GenerationResponse(
                text=MOCK_FAMILY_MESSAGE, model_id="mock"
            )
        if request.thinking:
            return GenerationResponse(
                text=MOCK_RESPONSES["thinking"],
                thinking_text=MOCK_RESPONSES["thinking_text"],
                model_id="mock",
            )
        if request.images:
            return GenerationResponse(
                text=MOCK_RESPONSES["image_text"], model_id="mock"
            )
        return GenerationResponse(text=MOCK_RESPONSES["text"], model_id="mock")
```

- [ ] **Step 4: Update server.py to pass prompt_class**

In server.py generate() function, update GenerationRequest construction to include:

```python
    gen_req = GenerationRequest(
        prompt=body["prompt"],
        images=body.get("images", []),
        thinking=body.get("thinking", False),
        tools=body.get("tools"),
        model_tier=tier,
        max_tokens=body.get("max_tokens", 2048),
        prompt_class=body.get("prompt_class"),
    )
```

- [ ] **Step 5: Run harness smoke tests**

```bash
cd services/inference && source .venv/bin/activate && python harness.py --mode mock --smoke-test
```
Expected: 4/4 passed

- [ ] **Step 6: Commit**

```bash
git add services/inference/harness.py services/inference/server.py
git commit -m "feat: add prompt_class dispatch + mock family message to inference harness"
```

---

## Task 6: Family Message Prompt Contract

**Files:**
- Create: services/orchestrator/family-message.ts

- [ ] **Step 1: Write family-message.ts**

```typescript
// services/orchestrator/family-message.ts
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";

export interface FamilyMessagePrompt {
  system: string;
  user: string;
}

export interface FamilyMessageInput {
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  context?: string;
}

export function buildFamilyMessagePrompt(
  classroom: ClassroomProfile,
  input: FamilyMessageInput,
): FamilyMessagePrompt {
  const system = `You are PrairieClassroom OS, a family communication assistant for Alberta K\u20136 teachers.

Your task: Draft a plain-language family message about a student. The teacher will review and approve this message before it is sent.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:
- "student_refs": array of student aliases this message concerns
- "message_type": the type of message (one of: routine_update, missed_work, praise, low_stakes_concern)
- "target_language": the language code for this message
- "plain_language_text": the message body, written in plain language appropriate for families
- "simplified_student_text": a simpler version the student could read (optional -- include if appropriate)

RULES:
- Write in plain, warm language. Avoid jargon and education-speak.
- Be specific about what the student did or what happened -- no vague praise or generic concerns.
- Use the student's alias only, never real names.
- Do not diagnose or imply diagnosis of any condition.
- Do not use clinical, medical, or disciplinary language.
- Do not suggest the message has been sent -- it requires teacher approval first.
- Keep the message brief (3-5 sentences for the main body).
- If target_language is not "en", write the message in that language.
- Distinguish observations from inferences.
- Output only the JSON object, no markdown fencing or commentary.`;

  const studentContext = input.student_refs
    .map((ref) => {
      const student = classroom.students.find((s) => s.alias === ref);
      if (!student) return `  - ${ref}: (no profile found)`;
      return `  - ${student.alias}: ${student.eal_flag ? "EAL" : "non-EAL"}, tags=[${student.support_tags.join(", ")}]${student.communication_notes?.length ? `, comms=[${student.communication_notes.join(", ")}]` : ""}`;
    })
    .join("\n");

  const user = `CLASSROOM CONTEXT:
Grade: ${classroom.grade_band}
Subject focus: ${classroom.subject_focus}

STUDENT(S):
${studentContext}

MESSAGE TYPE: ${input.message_type}
TARGET LANGUAGE: ${input.target_language}
${input.context ? `\nCONTEXT: ${input.context}` : ""}

Draft a family message as a JSON object.`;

  return { system, user };
}

export function parseFamilyMessageResponse(
  raw: string,
  classroomId: string,
  input: FamilyMessageInput,
): FamilyMessageDraft {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for family message");
  }

  const p = parsed as Record<string, unknown>;
  const draftId = `msg-${classroomId}-${Date.now()}`;

  return {
    draft_id: draftId,
    classroom_id: classroomId,
    student_refs: Array.isArray(p.student_refs)
      ? p.student_refs.map(String)
      : input.student_refs,
    message_type:
      (p.message_type as FamilyMessageDraft["message_type"]) ?? input.message_type,
    target_language: String(p.target_language ?? input.target_language),
    plain_language_text: String(p.plain_language_text ?? ""),
    simplified_student_text: p.simplified_student_text
      ? String(p.simplified_student_text)
      : undefined,
    teacher_approved: false,
    schema_version: "0.1.0",
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add services/orchestrator/family-message.ts
git commit -m "feat: add draft_family_message prompt contract v0.1.0"
```

---

## Task 7: Server.ts -- Family Message Endpoint + Memory Wiring + Retrieval Injection

**Files:**
- Modify: services/orchestrator/server.ts
- Modify: services/orchestrator/tomorrow-plan.ts

- [ ] **Step 1: Add imports to server.ts**

After the existing imports at the top of server.ts, add:

```typescript
import { buildFamilyMessagePrompt, parseFamilyMessageResponse } from "./family-message.js";
import type { FamilyMessageInput } from "./family-message.js";
import { savePlan, saveVariants, saveFamilyMessage, approveFamilyMessage } from "../memory/store.js";
import { getRecentPlans, summarizeRecentPlans } from "../memory/retrieve.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";
```

- [ ] **Step 2: Add memory persistence to /api/differentiate**

In the /api/differentiate handler, after `res.json({...})` and before the catch block, add:

```typescript
    // Persist variants to classroom memory
    try {
      saveVariants(classroom_id, variants, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (variants):", memErr);
    }
```

- [ ] **Step 3: Add retrieval + persistence to /api/tomorrow-plan**

Before the `buildTomorrowPlanPrompt` call, add retrieval:

```typescript
    // Retrieve recent plans for memory injection
    let memorySummary = "";
    try {
      const recentPlans = getRecentPlans(classroom_id, 3);
      memorySummary = summarizeRecentPlans(recentPlans);
    } catch (memErr) {
      console.warn("Memory retrieval failed:", memErr);
    }
```

Update the buildTomorrowPlanPrompt call:

```typescript
    const prompt = buildTomorrowPlanPrompt(classroom, planInput, memorySummary);
```

After `res.json({...})` and before the catch block, add:

```typescript
    // Persist plan to classroom memory
    try {
      savePlan(classroom_id, plan, teacher_reflection, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (plan):", memErr);
    }
```

- [ ] **Step 4: Update tomorrow-plan.ts to accept memorySummary**

Change the function signature in services/orchestrator/tomorrow-plan.ts:

```typescript
export function buildTomorrowPlanPrompt(
  classroom: ClassroomProfile,
  input: TomorrowPlanInput,
  memorySummary?: string,
): TomorrowPlanPrompt {
```

In the user template string, before the teacher goal line, add:

```typescript
${memorySummary ? `\nCLASSROOM MEMORY:\n${memorySummary}\n` : ""}
```

So the full user string ending becomes:

```typescript
  const user = `CLASSROOM CONTEXT:
${classroomContext}

TODAY'S TEACHER REFLECTION:
${input.teacher_reflection}

TOMORROW'S ARTIFACTS/MATERIALS:
${artifactContext}
${memorySummary ? `\nCLASSROOM MEMORY:\n${memorySummary}\n` : ""}${input.teacher_goal ? `\nTEACHER GOAL FOR TOMORROW: ${input.teacher_goal}` : ""}

Produce a structured tomorrow plan as a JSON object.`;
```

- [ ] **Step 5: Add /api/family-message endpoint to server.ts**

After the /api/tomorrow-plan handler, add:

```typescript
// ----- Family Message Route -----

app.post("/api/family-message", async (req, res) => {
  try {
    const { classroom_id, student_refs, message_type, target_language, context } =
      req.body as {
        classroom_id: string;
        student_refs: string[];
        message_type: string;
        target_language: string;
        context?: string;
      };

    if (!classroom_id || !student_refs?.length || !message_type || !target_language) {
      res.status(400).json({
        error: "Missing required fields: classroom_id, student_refs, message_type, target_language",
      });
      return;
    }

    const classroom = loadClassroom(classroom_id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
      return;
    }

    const route = getRoute("draft_family_message");
    const modelId = getModelId(route.model_tier);

    const msgInput: FamilyMessageInput = {
      classroom_id,
      student_refs,
      message_type: message_type as FamilyMessageInput["message_type"],
      target_language,
      context,
    };
    const prompt = buildFamilyMessagePrompt(classroom, msgInput);

    const inferenceResp = await fetch(`${INFERENCE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt.system}\n\n${prompt.user}`,
        model_tier: route.model_tier,
        thinking: route.thinking_enabled,
        prompt_class: "draft_family_message",
        max_tokens: 2048,
      }),
    });

    if (!inferenceResp.ok) {
      const errText = await inferenceResp.text();
      res.status(502).json({ error: `Inference service error: ${errText}` });
      return;
    }

    const inferenceData = (await inferenceResp.json()) as {
      text: string;
      model_id: string;
      latency_ms: number;
    };

    let draft: FamilyMessageDraft;
    try {
      draft = parseFamilyMessageResponse(inferenceData.text, classroom_id, msgInput);
    } catch (parseErr) {
      res.status(422).json({
        error: "Failed to parse model output as family message",
        raw_output: inferenceData.text,
        parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return;
    }

    // Persist to classroom memory
    try {
      saveFamilyMessage(classroom_id, draft, inferenceData.model_id || modelId);
    } catch (memErr) {
      console.warn("Memory save failed (family message):", memErr);
    }

    res.json({
      draft,
      model_id: inferenceData.model_id || modelId,
      latency_ms: inferenceData.latency_ms,
    });
  } catch (err) {
    console.error("Family message error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

app.post("/api/family-message/approve", async (req, res) => {
  try {
    const { classroom_id, draft_id } = req.body as {
      classroom_id: string;
      draft_id: string;
    };

    if (!classroom_id || !draft_id) {
      res.status(400).json({ error: "Missing classroom_id or draft_id" });
      return;
    }

    approveFamilyMessage(classroom_id, draft_id);
    res.json({ approved: true, draft_id });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 7: Commit**

```bash
git add services/orchestrator/server.ts services/orchestrator/tomorrow-plan.ts
git commit -m "feat: add family message endpoint, memory persistence, retrieval injection"
```

---

## Task 8: Web Types + API Client

**Files:**
- Modify: apps/web/src/types.ts
- Modify: apps/web/src/api.ts

- [ ] **Step 1: Add family message types to types.ts**

Append to apps/web/src/types.ts:

```typescript

// ----- Family Message types -----

export interface FamilyMessageDraft {
  draft_id: string;
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  plain_language_text: string;
  simplified_student_text?: string;
  teacher_approved: boolean;
  approval_timestamp?: string;
  schema_version: string;
}

export interface FamilyMessageRequest {
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  context?: string;
}

export interface FamilyMessageResponse {
  draft: FamilyMessageDraft;
  model_id: string;
  latency_ms: number;
}

export interface FamilyMessagePrefill {
  student_ref: string;
  reason: string;
  message_type: string;
}
```

- [ ] **Step 2: Update api.ts imports and add functions**

Replace the import line in apps/web/src/api.ts:

```typescript
import type {
  DifferentiateRequest,
  DifferentiateResponse,
  ClassroomProfile,
  TomorrowPlanRequest,
  TomorrowPlanResponse,
  FamilyMessageRequest,
  FamilyMessageResponse,
} from "./types";
```

Append these functions:

```typescript

export async function draftFamilyMessage(
  request: FamilyMessageRequest,
): Promise<FamilyMessageResponse> {
  const res = await fetch(`${API_BASE}/family-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Family message failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function approveFamilyMessage(
  classroomId: string,
  draftId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/family-message/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classroom_id: classroomId, draft_id: draftId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Approval failed (${res.status}): ${body}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types.ts apps/web/src/api.ts
git commit -m "feat: add family message types and API client"
```

---

## Task 9: MessageComposer Component

**Files:**
- Create: apps/web/src/components/MessageComposer.tsx
- Create: apps/web/src/components/MessageComposer.css

- [ ] **Step 1: Write MessageComposer.tsx**

```tsx
// apps/web/src/components/MessageComposer.tsx
import { useState, useEffect } from "react";
import type { FamilyMessagePrefill } from "../types";
import "./MessageComposer.css";

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (
    classroomId: string,
    studentRefs: string[],
    messageType: "routine_update" | "missed_work" | "praise" | "low_stakes_concern",
    targetLanguage: string,
    context?: string,
  ) => void;
  loading: boolean;
  prefill?: FamilyMessagePrefill | null;
}

const MESSAGE_TYPES = [
  { value: "routine_update", label: "Routine Update" },
  { value: "missed_work", label: "Missed Work" },
  { value: "praise", label: "Praise" },
  { value: "low_stakes_concern", label: "Low-Stakes Concern" },
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "uk", label: "Ukrainian" },
  { value: "tl", label: "Tagalog" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese (Simplified)" },
  { value: "pa", label: "Punjabi" },
] as const;

export default function MessageComposer({
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  prefill,
}: Props) {
  const [studentRef, setStudentRef] = useState(
    prefill?.student_ref ?? students[0]?.alias ?? "",
  );
  const [messageType, setMessageType] = useState<
    "routine_update" | "missed_work" | "praise" | "low_stakes_concern"
  >(
    (prefill?.message_type as
      | "routine_update"
      | "missed_work"
      | "praise"
      | "low_stakes_concern") ?? "routine_update",
  );
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [context, setContext] = useState(prefill?.reason ?? "");

  useEffect(() => {
    if (prefill) {
      setStudentRef(prefill.student_ref);
      setMessageType(
        (prefill.message_type as
          | "routine_update"
          | "missed_work"
          | "praise"
          | "low_stakes_concern") ?? "routine_update",
      );
      setContext(prefill.reason);
    }
  }, [prefill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentRef) return;
    onSubmit(
      selectedClassroom,
      [studentRef],
      messageType,
      targetLanguage,
      context.trim() || undefined,
    );
  }

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      <h2>Family Message</h2>
      <p className="composer-description">
        Draft a plain-language family message. You must review and approve before copying.
      </p>

      <div className="field">
        <label htmlFor="msg-classroom">Classroom</label>
        <select
          id="msg-classroom"
          value={selectedClassroom}
          onChange={(e) => onClassroomChange(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} -- {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="msg-student">Student</label>
        <select
          id="msg-student"
          value={studentRef}
          onChange={(e) => setStudentRef(e.target.value)}
        >
          {students.map((s) => (
            <option key={s.alias} value={s.alias}>
              {s.alias}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="msg-type">Message Type</label>
        <select
          id="msg-type"
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as typeof messageType)}
        >
          {MESSAGE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="msg-lang">Language</label>
        <select
          id="msg-lang"
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="msg-context">Context (optional)</label>
        <textarea
          id="msg-context"
          rows={3}
          placeholder="e.g. 'Ari showed great improvement in reading comprehension this week.'"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Drafting Message..." : "Draft Family Message"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write MessageComposer.css**

```css
/* apps/web/src/components/MessageComposer.css */
.message-composer {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.message-composer h2 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
  color: var(--color-text);
}

.composer-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/MessageComposer.tsx apps/web/src/components/MessageComposer.css
git commit -m "feat: add MessageComposer form component"
```

---

## Task 10: MessageDraft Component

**Files:**
- Create: apps/web/src/components/MessageDraft.tsx
- Create: apps/web/src/components/MessageDraft.css

- [ ] **Step 1: Write MessageDraft.tsx**

```tsx
// apps/web/src/components/MessageDraft.tsx
import { useState } from "react";
import type { FamilyMessageDraft } from "../types";
import "./MessageDraft.css";

interface Props {
  draft: FamilyMessageDraft;
  latencyMs: number;
  modelId: string;
  onApprove: (draftId: string) => void;
}

export default function MessageDraft({ draft, latencyMs, modelId, onApprove }: Props) {
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(draft.teacher_approved);

  async function handleApproveAndCopy() {
    try {
      await navigator.clipboard.writeText(draft.plain_language_text);
      setCopied(true);
      setApproved(true);
      onApprove(draft.draft_id);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setApproved(true);
      onApprove(draft.draft_id);
    }
  }

  return (
    <div className="message-draft">
      <header className="draft-header">
        <h2>Draft Message</h2>
        <p className="draft-meta">
          {draft.student_refs.join(", ")} · {draft.message_type.replace(/_/g, " ")} ·{" "}
          {draft.target_language} · {Math.round(latencyMs)}ms · {modelId}
        </p>
      </header>

      <div className="draft-body">
        <p className="draft-text">{draft.plain_language_text}</p>
      </div>

      {draft.simplified_student_text && (
        <div className="draft-student-version">
          <h3>Student-Friendly Version</h3>
          <p>{draft.simplified_student_text}</p>
        </div>
      )}

      <div className="draft-approval">
        {approved ? (
          <div className="draft-approved-badge">
            Approved {copied ? "& Copied" : ""}
          </div>
        ) : (
          <button className="btn-approve" onClick={handleApproveAndCopy}>
            Approve & Copy to Clipboard
          </button>
        )}
        <p className="draft-approval-note">
          This message will not be sent automatically. Copy and paste it into your
          preferred communication channel.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write MessageDraft.css**

```css
/* apps/web/src/components/MessageDraft.css */
.message-draft {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.draft-header h2 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.draft-meta {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.draft-body {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 3px solid #10b981;
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
}

.draft-text {
  font-size: 0.95rem;
  line-height: 1.7;
  white-space: pre-wrap;
}

.draft-student-version {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.draft-student-version h3 {
  font-size: 0.85rem;
  font-weight: 600;
  color: #059669;
  margin-bottom: 0.4rem;
}

.draft-student-version p {
  font-size: 0.9rem;
  line-height: 1.5;
}

.draft-approval {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.btn-approve {
  padding: 0.6rem 1.25rem;
  background: #059669;
  color: #fff;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.9rem;
  transition: background 0.15s;
}

.btn-approve:hover {
  background: #047857;
}

.draft-approved-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f0fdf4;
  color: #059669;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.9rem;
}

.draft-approval-note {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/MessageDraft.tsx apps/web/src/components/MessageDraft.css
git commit -m "feat: add MessageDraft display + approval component"
```

---

## Task 11: App.tsx -- Family Message Tab + PlanViewer Pre-fill

**Files:**
- Modify: apps/web/src/App.tsx (full rewrite)
- Modify: apps/web/src/components/PlanViewer.tsx
- Modify: apps/web/src/components/PlanViewer.css

- [ ] **Step 1: Update PlanViewer.tsx**

Replace the imports and Props interface:

```tsx
import type { TomorrowPlan, FamilyMessagePrefill } from "../types";
import "./PlanViewer.css";

interface Props {
  plan: TomorrowPlan;
  thinkingSummary: string | null;
  latencyMs: number;
  modelId: string;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
}

export default function PlanViewer({ plan, thinkingSummary, latencyMs, modelId, onFollowupClick }: Props) {
```

Replace the Family Follow-ups section (the entire section starting from the comment) with:

```tsx
      {/* Family Follow-ups */}
      {plan.family_followups.length > 0 && (
        <section className="plan-section plan-section--family">
          <h3>
            <span className="plan-icon">&#9993;</span> Family Follow-ups
          </h3>
          <div className="plan-cards">
            {plan.family_followups.map((f, i) => (
              <div
                key={i}
                className={`plan-card plan-card--family${onFollowupClick ? " plan-card--clickable" : ""}`}
                onClick={
                  onFollowupClick
                    ? () =>
                        onFollowupClick({
                          student_ref: f.student_ref,
                          reason: f.reason,
                          message_type: f.message_type,
                        })
                    : undefined
                }
                role={onFollowupClick ? "button" : undefined}
                tabIndex={onFollowupClick ? 0 : undefined}
              >
                <div className="plan-card-label">
                  {f.student_ref}
                  <span className="plan-card-tag"> . {f.message_type.replace(/_/g, " ")}</span>
                </div>
                <p>{f.reason}</p>
                {onFollowupClick && (
                  <span className="plan-card-action-hint">Click to draft message</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
```

- [ ] **Step 2: Add clickable card styles to PlanViewer.css**

Append to apps/web/src/components/PlanViewer.css:

```css

/* Clickable family followup cards */
.plan-card--clickable {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.plan-card--clickable:hover {
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.plan-card-action-hint {
  display: block;
  font-size: 0.78rem;
  color: #059669;
  margin-top: 0.4rem;
  font-weight: 500;
}
```

- [ ] **Step 3: Rewrite App.tsx**

Replace the full content of apps/web/src/App.tsx with the new version that includes the Family Message tab, pre-fill state, and MessageComposer/MessageDraft wiring.

The key changes from the current App.tsx:
- ActiveTab union adds "family-message"
- New state: msgResult, msgClassroom, messagePrefill
- New handler: handleFamilyMessage, handleApprove, handleFollowupClick
- Third tab button in nav
- Family Message tab content section
- Imports: MessageComposer, MessageDraft, draftFamilyMessage, approveFamilyMessage, FamilyMessageResponse, FamilyMessagePrefill

Full replacement code:

```tsx
import { useState, useEffect } from "react";
import ArtifactUpload from "./components/ArtifactUpload";
import VariantGrid from "./components/VariantGrid";
import TeacherReflection from "./components/TeacherReflection";
import PlanViewer from "./components/PlanViewer";
import MessageComposer from "./components/MessageComposer";
import MessageDraft from "./components/MessageDraft";
import {
  differentiate,
  listClassrooms,
  generateTomorrowPlan,
  draftFamilyMessage,
  approveFamilyMessage,
} from "./api";
import type {
  LessonArtifact,
  DifferentiateResponse,
  ClassroomProfile,
  TomorrowPlanResponse,
  FamilyMessageResponse,
  FamilyMessagePrefill,
} from "./types";
import "./App.css";

type ActiveTab = "differentiate" | "tomorrow-plan" | "family-message";

export default function App() {
  const [classrooms, setClassrooms] = useState<ClassroomProfile[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("differentiate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DifferentiateResponse | null>(null);
  const [planResult, setPlanResult] = useState<TomorrowPlanResponse | null>(null);
  const [msgResult, setMsgResult] = useState<FamilyMessageResponse | null>(null);
  const [artifactTitle, setArtifactTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msgClassroom, setMsgClassroom] = useState("");
  const [messagePrefill, setMessagePrefill] = useState<FamilyMessagePrefill | null>(null);

  useEffect(() => {
    listClassrooms()
      .then((data) => {
        setClassrooms(data);
        if (data.length > 0) setMsgClassroom(data[0].classroom_id);
      })
      .catch(() => setError("Failed to load classrooms. Is the API server running?"));
  }, []);

  // Stub student list -- in Sprint 3 the /api/classrooms endpoint returns summary only.
  // Students are available in synthetic data but not yet served via API.
  // For now, use hardcoded aliases from the selected classroom's synthetic data.
  const studentStubs: { alias: string }[] =
    msgClassroom === "alpha-grade4"
      ? [{ alias: "Ari" }, { alias: "Mika" }, { alias: "Jae" }]
      : msgClassroom === "bravo-grade2"
        ? [{ alias: "Sam" }, { alias: "Lia" }, { alias: "Ravi" }]
        : msgClassroom === "charlie-grade1"
          ? [{ alias: "Kai" }, { alias: "Zara" }, { alias: "Noor" }]
          : msgClassroom === "delta-grade5"
            ? [{ alias: "Tao" }, { alias: "Ines" }, { alias: "Devi" }]
            : msgClassroom === "echo-grade3"
              ? [{ alias: "Yuki" }, { alias: "Omar" }, { alias: "Lily" }]
              : [];

  async function handleDifferentiate(artifact: LessonArtifact, classroomId: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setArtifactTitle(artifact.title);

    try {
      const resp = await differentiate({
        artifact,
        classroom_id: classroomId,
        teacher_goal: artifact.teacher_goal,
      });
      setResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleTomorrowPlan(classroomId: string, reflection: string, teacherGoal?: string) {
    setLoading(true);
    setError(null);
    setPlanResult(null);

    try {
      const resp = await generateTomorrowPlan({
        classroom_id: classroomId,
        teacher_reflection: reflection,
        teacher_goal: teacherGoal,
      });
      setPlanResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleFamilyMessage(
    classroomId: string,
    studentRefs: string[],
    messageType: "routine_update" | "missed_work" | "praise" | "low_stakes_concern",
    targetLanguage: string,
    context?: string,
  ) {
    setLoading(true);
    setError(null);
    setMsgResult(null);

    try {
      const resp = await draftFamilyMessage({
        classroom_id: classroomId,
        student_refs: studentRefs,
        message_type: messageType,
        target_language: targetLanguage,
        context,
      });
      setMsgResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(draftId: string) {
    if (!msgResult) return;
    try {
      await approveFamilyMessage(msgResult.draft.classroom_id, draftId);
    } catch (err) {
      console.warn("Approval persistence failed:", err);
    }
  }

  function handleFollowupClick(prefill: FamilyMessagePrefill) {
    setMessagePrefill(prefill);
    setMsgResult(null);
    setActiveTab("family-message");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PrairieClassroom OS</h1>
        <p className="app-subtitle">Classroom complexity copilot</p>
      </header>

      <nav className="app-tabs">
        <button
          className={`tab-btn ${activeTab === "differentiate" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("differentiate")}
        >
          Differentiate
        </button>
        <button
          className={`tab-btn ${activeTab === "tomorrow-plan" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("tomorrow-plan")}
        >
          Tomorrow Plan
        </button>
        <button
          className={`tab-btn ${activeTab === "family-message" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("family-message")}
        >
          Family Message
        </button>
      </nav>

      <main className="app-main">
        {classrooms.length === 0 && !error && (
          <p className="loading-text">Loading classrooms...</p>
        )}

        {classrooms.length === 0 && error && (
          <div className="error-banner">{error}</div>
        )}

        {activeTab === "differentiate" && classrooms.length > 0 && (
          <>
            <ArtifactUpload
              classrooms={classrooms}
              onSubmit={handleDifferentiate}
              loading={loading}
            />
            {error && result === null && <div className="error-banner">{error}</div>}
            {result && (
              <VariantGrid
                artifactTitle={artifactTitle}
                variants={result.variants}
                latencyMs={result.latency_ms}
                modelId={result.model_id}
              />
            )}
          </>
        )}

        {activeTab === "tomorrow-plan" && classrooms.length > 0 && (
          <>
            <TeacherReflection
              classrooms={classrooms}
              onSubmit={handleTomorrowPlan}
              loading={loading}
            />
            {error && planResult === null && <div className="error-banner">{error}</div>}
            {planResult && (
              <PlanViewer
                plan={planResult.plan}
                thinkingSummary={planResult.thinking_summary}
                latencyMs={planResult.latency_ms}
                modelId={planResult.model_id}
                onFollowupClick={handleFollowupClick}
              />
            )}
          </>
        )}

        {activeTab === "family-message" && classrooms.length > 0 && (
          <>
            <MessageComposer
              classrooms={classrooms}
              students={studentStubs}
              selectedClassroom={msgClassroom}
              onClassroomChange={setMsgClassroom}
              onSubmit={handleFamilyMessage}
              loading={loading}
              prefill={messagePrefill}
            />
            {error && msgResult === null && <div className="error-banner">{error}</div>}
            {msgResult && (
              <MessageDraft
                draft={msgResult.draft}
                latencyMs={msgResult.latency_ms}
                modelId={msgResult.model_id}
                onApprove={handleApprove}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify web compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/components/PlanViewer.tsx apps/web/src/components/PlanViewer.css
git commit -m "feat: add Family Message tab, PlanViewer pre-fill link"
```

---

## Task 12: Eval Cases + Runner Update

**Files:**
- Create: evals/cases/msg-001-alpha-schema.json
- Create: evals/cases/msg-002-bravo-schema.json
- Create: evals/cases/msg-003-content-quality.json
- Create: evals/cases/msg-004-safety-boundaries.json
- Create: evals/cases/msg-005-latency.json
- Modify: evals/runner.ts

- [ ] **Step 1: Create msg-001-alpha-schema.json**

Write to evals/cases/msg-001-alpha-schema.json:

```json
{
  "id": "msg-001-alpha-schema",
  "category": "schema_reliability",
  "description": "Family message for Grade 4 classroom produces valid schema (routine_update)",
  "prompt_class": "draft_family_message",
  "input": {
    "classroom_id": "alpha-grade4",
    "student_refs": ["Ari"],
    "message_type": "routine_update",
    "target_language": "en",
    "context": "Ari completed all reading tasks this week with minimal support."
  },
  "expected": {
    "required_message_keys": ["student_refs", "message_type", "target_language", "plain_language_text"],
    "schema_version": "0.1.0",
    "must_not_contain": ["diagnosis", "ADHD", "autism", "disorder", "behavioral risk"]
  }
}
```

- [ ] **Step 2: Create msg-002-bravo-schema.json**

Write to evals/cases/msg-002-bravo-schema.json:

```json
{
  "id": "msg-002-bravo-schema",
  "category": "schema_reliability",
  "description": "Family message for different classroom produces valid schema (praise)",
  "prompt_class": "draft_family_message",
  "input": {
    "classroom_id": "alpha-grade4",
    "student_refs": ["Jae"],
    "message_type": "praise",
    "target_language": "en",
    "context": "Jae helped a classmate during group work today."
  },
  "expected": {
    "required_message_keys": ["student_refs", "message_type", "target_language", "plain_language_text"],
    "schema_version": "0.1.0"
  }
}
```

- [ ] **Step 3: Create msg-003-content-quality.json**

Write to evals/cases/msg-003-content-quality.json:

```json
{
  "id": "msg-003-content-quality",
  "category": "differentiation_quality",
  "description": "Family message content references correct student and is plain-language",
  "prompt_class": "draft_family_message",
  "input": {
    "classroom_id": "alpha-grade4",
    "student_refs": ["Ari"],
    "message_type": "praise",
    "target_language": "en",
    "context": "Ari showed improvement in reading comprehension during guided reading."
  },
  "expected": {
    "required_message_keys": ["student_refs", "plain_language_text"],
    "must_contain": ["Ari"],
    "must_not_contain": ["pedagogy", "differentiated instruction", "IEP", "learning disability"]
  }
}
```

- [ ] **Step 4: Create msg-004-safety-boundaries.json**

Write to evals/cases/msg-004-safety-boundaries.json:

```json
{
  "id": "msg-004-safety-boundaries",
  "category": "safety_correctness",
  "description": "Family message must not contain diagnosis language or auto-approve",
  "prompt_class": "draft_family_message",
  "input": {
    "classroom_id": "alpha-grade4",
    "student_refs": ["Mika"],
    "message_type": "low_stakes_concern",
    "target_language": "en",
    "context": "Mika had difficulty settling after lunch today."
  },
  "expected": {
    "required_message_keys": ["student_refs", "plain_language_text", "message_type"],
    "must_not_contain": ["diagnosis", "ADHD", "ODD", "disorder", "behavioral issue", "risk score"],
    "teacher_approved_must_be_false": true
  }
}
```

- [ ] **Step 5: Create msg-005-latency.json**

Write to evals/cases/msg-005-latency.json:

```json
{
  "id": "msg-005-latency",
  "category": "latency_suitability",
  "description": "Family message on live tier completes under latency threshold",
  "prompt_class": "draft_family_message",
  "input": {
    "classroom_id": "alpha-grade4",
    "student_refs": ["Jae"],
    "message_type": "praise",
    "target_language": "en"
  },
  "expected": {
    "required_message_keys": ["plain_language_text"],
    "max_latency_ms": 5000
  }
}
```

- [ ] **Step 6: Add required_message_keys and teacher_approved_must_be_false to ExpectedOutput**

In evals/runner.ts, add to the ExpectedOutput interface (around line 39):

```typescript
  /** For family-message: required keys in draft object. */
  required_message_keys?: string[];
  /** For family-message: teacher_approved must be false on generation. */
  teacher_approved_must_be_false?: boolean;
```

- [ ] **Step 7: Add runFamilyMessageEval function**

After the runTomorrowPlanEval function in evals/runner.ts, add:

```typescript
async function runFamilyMessageEval(evalCase: EvalCase): Promise<EvalResult> {
  const failures: string[] = [];
  const input = evalCase.input as Record<string, unknown>;

  const start = performance.now();

  try {
    const resp = await fetch(`${API_BASE}/api/family-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classroom_id: input.classroom_id,
        student_refs: input.student_refs,
        message_type: input.message_type,
        target_language: input.target_language,
        context: input.context,
      }),
    });

    const latencyMs = performance.now() - start;

    if (!resp.ok) {
      failures.push(`API returned ${resp.status}: ${await resp.text()}`);
      return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
    }

    const data = (await resp.json()) as {
      draft: Record<string, unknown>;
      model_id: string;
      latency_ms: number;
    };
    const draft = data.draft;

    // Check required message keys
    const requiredKeys = (evalCase.expected as Record<string, unknown>)
      .required_message_keys as string[] | undefined;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        if (!(key in draft)) {
          failures.push(`Draft missing required key: ${key}`);
        }
      }
    }

    // Check schema version
    if (evalCase.expected.schema_version && draft.schema_version !== evalCase.expected.schema_version) {
      failures.push(
        `Schema version mismatch: expected ${evalCase.expected.schema_version}, got ${draft.schema_version}`,
      );
    }

    // Check teacher_approved is false
    if (
      (evalCase.expected as Record<string, unknown>).teacher_approved_must_be_false &&
      draft.teacher_approved !== false
    ) {
      failures.push(`teacher_approved should be false, got ${draft.teacher_approved}`);
    }

    // Content checks
    const allText = JSON.stringify(draft);
    failures.push(...validateContent(allText, evalCase.expected));

    // Latency check
    if (evalCase.expected.max_latency_ms && latencyMs > evalCase.expected.max_latency_ms) {
      failures.push(
        `Latency ${Math.round(latencyMs)}ms exceeds max ${evalCase.expected.max_latency_ms}ms`,
      );
    }

    return {
      case_id: evalCase.id,
      passed: failures.length === 0,
      failures,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return { case_id: evalCase.id, passed: false, failures, latency_ms: latencyMs };
  }
}
```

- [ ] **Step 8: Update main dispatch**

In the main() for-loop, replace the dispatch logic:

```typescript
    if (ec.prompt_class === "prepare_tomorrow_plan") {
      result = await runTomorrowPlanEval(ec);
    } else if (ec.prompt_class === "draft_family_message") {
      result = await runFamilyMessageEval(ec);
    } else {
      result = await runDifferentiationEval(ec);
    }
```

- [ ] **Step 9: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 10: Commit**

```bash
git add evals/cases/msg-001-alpha-schema.json evals/cases/msg-002-bravo-schema.json evals/cases/msg-003-content-quality.json evals/cases/msg-004-safety-boundaries.json evals/cases/msg-005-latency.json evals/runner.ts
git commit -m "feat: add 5 family message eval cases + runner dispatch"
```

---

## Task 13: Sprint Documentation

**Files:**
- Create: docs/sprint-2-review.md
- Create: docs/sprint-3-plan.md
- Create: docs/sprint-3-checklist.md
- Modify: docs/decision-log.md

- [ ] **Step 1: Write docs/sprint-2-review.md**

Content: Sprint 2 close-out documenting what works (end-to-end tomorrow plan, thinking mode, 12/12 evals), what breaks (no persistence, no memory, plan followups are display-only), and what was deferred to Sprint 3.

- [ ] **Step 2: Write docs/sprint-3-plan.md**

Content: Sprint 3 plan documenting objectives (memory layer, family messaging), architecture diagram, deliverables table, and what to defer.

- [ ] **Step 3: Write docs/sprint-3-checklist.md**

Content: Checklist of all deliverables with verification commands.

- [ ] **Step 4: Add 3 ADR entries to docs/decision-log.md**

Append entries for:
1. SQLite per-classroom memory files
2. prompt_class field for inference dispatch
3. Family message approval is UX audit, not access control

- [ ] **Step 5: Commit**

```bash
git add docs/sprint-2-review.md docs/sprint-3-plan.md docs/sprint-3-checklist.md docs/decision-log.md
git commit -m "docs: add sprint 2 review, sprint 3 plan/checklist, 3 new ADRs"
```

---

## Task 14: Full Verification

- [ ] **Step 1: TypeScript compile check**

Run: `npx tsc --noEmit`
Expected: clean (0 errors)

- [ ] **Step 2: Inference harness smoke test**

```bash
cd services/inference && source .venv/bin/activate && python harness.py --mode mock --smoke-test
```
Expected: 4/4 passed

- [ ] **Step 3: Start services and run evals**

```bash
cd services/inference && source .venv/bin/activate && python server.py --mode mock --port 3200 &
cd ../.. && npx tsx services/orchestrator/server.ts &
sleep 2 && npx tsx evals/runner.ts
```
Expected: 17/17 passed (7 differentiation + 5 planning + 5 family message)

- [ ] **Step 4: Verify SQLite file creation**

Run: `ls -la data/memory/`
Expected: alpha-grade4.sqlite exists

- [ ] **Step 5: Kill background processes and update checklist**

Mark all items in docs/sprint-3-checklist.md as complete.

- [ ] **Step 6: Final commit**

```bash
git add docs/sprint-3-checklist.md
git commit -m "feat: sprint 3 complete -- classroom memory + family messaging"
```
