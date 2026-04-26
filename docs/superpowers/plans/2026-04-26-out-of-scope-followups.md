# Out-of-Scope Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 4 minor follow-ups (plus 1 polish bundle) recorded in `qa/final-app-review-2026-04-25.md` after the main 9-finding sprint landed on 2026-04-26.

**Architecture:** Each task is independent and surgical (1 file or 2). Total estimated effort ~1.5 h. No worktree strictly required given the small footprint, but the executor may create one for isolation if preferred.

**Tech Stack:** React 19, TypeScript, vitest, Node `node:test`, plain markdown.

**Source spec:** `qa/final-app-review-2026-04-25.md` "Out-of-scope follow-ups" section + the four code-quality reviewer reports filed during the original sprint.

**Cross-cutting reminders (from CLAUDE.md + saved feedback):**
- `npm run typecheck` for TS changes
- `npm run lint` for lint-sensitive changes
- `npm run test` for orchestrator/UI logic
- Default to NO comments — only when WHY is non-obvious

---

## Task ordering & risk

| # | Follow-up | Source | Risk | Est |
|---|-----------|--------|------|-----|
| T1 | TodayPanel watching count uses `countActionableThreads` | T5 reviewer M5 | low | 20m |
| T2 | InterventionPanel toast prefix accuracy | T9 reviewer minor | low | 5m |
| T3 | docs/spec.md badge table notes Today/Classroom absence | T6 reviewer M1 | none | 5m |
| T4 | pilot-start.mjs derives orchestrator URL from `HEALTH_CHECKS` constant | T8 reviewer M4 | low | 10m |
| T5 | T8 polish bundle (day-rounding comment + 2 extra tests) | T8 reviewer M1, M3 | low | 30m |

After every task: `git status` clean, single focused commit, then move on.

---

## Task 1: TodayPanel watching count uses `countActionableThreads`

**Why:** The same THREADS-vs-roster bug class that p2 fixed in `ClassroomPanel.tsx` still ships in `TodayPanel.tsx` for the "X watching" label. The helper from p2 (`countActionableThreads`) is reusable — one-line change.

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx` (~lines 223-224 per QA report; verify before editing)
- Modify: existing test for TodayPanel (find via grep) OR add a new focused unit test

- [ ] **Step 1: Locate the current usage**

```bash
grep -n "student_threads.length\|watching" apps/web/src/panels/TodayPanel.tsx | head -10
```
Expected: a `student_threads.length` usage near a "watching" label string. Note exact line.

- [ ] **Step 2: Confirm the helper is exportable**

```bash
grep -n "export.*countActionableThreads\|export.*isActionableThread" apps/web/src/panels/ClassroomPanel.helpers.ts
```
Expected: both helpers already exported as named functions.

- [ ] **Step 3: Apply the helper**

Replace the raw `.length` derivation with `countActionableThreads`. Concrete pattern (adjust the variable name to match the panel's convention):

```tsx
import { countActionableThreads } from "./ClassroomPanel.helpers";
// ... inside the panel body:
const watchingCount = countActionableThreads(snapshot?.student_threads) ?? 0;
```

Then replace any `student_threads.length` reference inside the "watching" label render with `watchingCount`.

If the existing variable was already a derived count (not inline), update its declaration only — no need to touch the JSX.

- [ ] **Step 4: Find or create a TodayPanel test that locks the new behavior**

```bash
ls apps/web/src/panels/__tests__/TodayPanel*
```
If a test exists that asserts on the watching label, edit it. Otherwise add a focused test in the smallest existing TodayPanel test file (or create `apps/web/src/panels/__tests__/TodayPanel.watching.test.tsx`):

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TodayPanel from "../TodayPanel";

describe("TodayPanel watching count", () => {
  it("counts only actionable threads, not strength-only roster entries", () => {
    const snapshot = {
      // ... minimal shape that satisfies TodayPanel's prop contract
      student_threads: [
        { alias: "S1", thread_count: 2, pending_action_count: 0, pending_message_count: 0, active_pattern_count: 0, actions: [] },
        { alias: "S2", thread_count: 0, pending_action_count: 0, pending_message_count: 0, active_pattern_count: 0, actions: [] },
        { alias: "S3", thread_count: 0, pending_action_count: 1, pending_message_count: 0, active_pattern_count: 0, actions: [] },
      ],
      // ... other required snapshot fields
    };
    const { container } = render(<TodayPanel snapshot={snapshot} /* ...other required props */ />);
    expect(container.textContent).toMatch(/\b2\b\s*watching/i);
  });
});
```

(Adapt prop shape to match the actual `TodayPanel` signature — read the existing tests for the harness pattern.)

- [ ] **Step 5: Run tests + typecheck**

```bash
npm run typecheck && npx vitest run apps/web/src/panels/
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git commit -am "fix(web): apply countActionableThreads to TodayPanel watching count

Closes the T5 followup recorded in qa/final-app-review-2026-04-25.md.
The Today panel's 'X watching' label was still using raw
student_threads.length, which equals the full roster (26) and not the
actionable subset (23). Reuses the helper introduced in 7a0c07c.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: InterventionPanel toast prefix accuracy

**Why:** The current toast says "Couldn't log intervention — ..." but the verb "log" implies a successful side effect (the user expected it to be logged), which is exactly what didn't happen. "Save" matches the action's actual mechanic.

**Files:**
- Modify: `apps/web/src/panels/InterventionPanel.tsx` (the `useAsyncAction` opts.onError prefix string)

- [ ] **Step 1: Find the current prefix**

```bash
grep -n "Couldn't log intervention" apps/web/src/panels/InterventionPanel.tsx
```
Expected: one match.

- [ ] **Step 2: Replace with the corrected wording**

Change the matched string from:

```ts
onError: (msg) => showError(`Couldn't log intervention — ${msg}`),
```

to:

```ts
onError: (msg) => showError(`Couldn't save intervention — ${msg}`),
```

- [ ] **Step 3: Update any test that asserts on the prefix**

```bash
grep -rn "Couldn't log intervention" apps/web/src/
```
If a test asserts on the literal string, update its expectation to "Couldn't save intervention". If no test asserts on this, no further change.

- [ ] **Step 4: Run tests + typecheck**

```bash
npm run typecheck && npx vitest run apps/web/src/panels/__tests__/InterventionPanel*
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "fix(web): reword InterventionPanel failure toast (\"log\" → \"save\")

Closes the T9 followup. 'Couldn't log intervention' implied a
successful side effect (the user expected the log to land); 'Couldn't
save intervention' more honestly describes what didn't happen.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: docs/spec.md badge table notes Today/Classroom absence

**Why:** The current badge table lists Tomorrow/Ops/Review and is silent on Today and Classroom. Future contributors may read the omission as "we forgot" rather than "intentional — they show their own debt gauges on-page". A one-sentence note prevents that misread.

**Files:**
- Modify: `docs/spec.md` (the `### Top-nav badge counts` subsection added in commit `6c1ddc9`)

- [ ] **Step 1: Locate the badge table**

```bash
grep -n "Top-nav badge counts" docs/spec.md
```
Expected: one heading match.

- [ ] **Step 2: Add a sentence below the table explaining the absence**

Below the `| Tab | Counted |` table, add:

```markdown
**Today** and **Classroom** intentionally have no badge — both surfaces
render their own debt gauges on-page (the Today complexity-debt block
and the Classroom Pulse stat card respectively), so a nav badge would
double-count.
```

- [ ] **Step 3: Verify the doc still parses cleanly**

```bash
grep -nE "^#" docs/spec.md | head -20
```
Expected: heading hierarchy unchanged.

- [ ] **Step 4: Commit**

```bash
git commit -am "docs(spec): note why Today/Classroom omit nav badges

Closes the T6 followup. Without this sentence the table can read as if
those two tabs were forgotten, when in fact the omission is deliberate
(both surfaces render their own debt gauges).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: pilot-start.mjs derives orchestrator URL from `HEALTH_CHECKS`

**Why:** Most of `pilot-start.mjs` already uses `HEALTH_CHECKS.orchestrator.port` (line 40); the new T8 preflight call hardcodes `http://localhost:3100` instead. Minor consistency drift — easy to fix.

**Files:**
- Modify: `scripts/pilot-start.mjs` (the line that calls `fetchDemoLatestIntervention("http://localhost:3100")`, around line 212)

- [ ] **Step 1: Locate the hardcoded URL**

```bash
grep -n "fetchDemoLatestIntervention" scripts/pilot-start.mjs
```
Expected: one match calling the helper with a hardcoded URL.

- [ ] **Step 2: Replace with the constant-derived URL**

Change:

```js
const latestInterventionAt = await fetchDemoLatestIntervention("http://localhost:3100");
```

to:

```js
const orchestratorBase = `http://localhost:${HEALTH_CHECKS.orchestrator.port}`;
const latestInterventionAt = await fetchDemoLatestIntervention(orchestratorBase);
```

(`HEALTH_CHECKS` is already in scope from line 36.)

- [ ] **Step 3: Smoke-check the change parses**

```bash
node --check scripts/pilot-start.mjs
```
Expected: no output (clean syntax).

- [ ] **Step 4: Commit**

```bash
git commit -am "chore(scripts): build orchestrator URL from HEALTH_CHECKS port

Closes the T8 followup. Aligns with the pre-existing pattern in
pilot-start.mjs that uses HEALTH_CHECKS.orchestrator.port everywhere
else; removes one hardcoded URL string.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: T8 polish bundle — day-rounding comment + extra tests

**Why:** Two non-blocking observations from the T8 code review:
- (M1) The 7-day threshold is effectively ~8 days because `last_intervention_days` is a whole-day integer. Worth a one-line comment so future readers don't think it's a precision bug.
- (M3) The 3 plan-minimum tests don't exercise (a) invalid-date strings or (b) the `fetchDemoLatestIntervention` day-derivation logic. Both are worth adding.

**Files:**
- Modify: `scripts/lib/demo-freshness.mjs`
- Modify: `scripts/lib/__tests__/demo-freshness.test.mjs`

- [ ] **Step 1: Add the day-rounding comment**

Open `scripts/lib/demo-freshness.mjs` and locate the `STALE_THRESHOLD_DAYS = 7` constant. Above (or next to) it, add:

```js
// Note: the orchestrator emits last_intervention_days as a whole-day
// integer (services/memory/student-summary.ts), so the effective
// threshold is ~8 days, not 7. Acceptable for a non-blocking advisory.
const STALE_THRESHOLD_DAYS = 7;
```

- [ ] **Step 2: Add the invalid-date test**

In `scripts/lib/__tests__/demo-freshness.test.mjs`, append inside the existing `describe` block:

```js
  it("returns true when latestInterventionAt is an invalid date string", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    assert.equal(isDemoStale({ latestInterventionAt: "not-a-date", now }), true);
  });
```

- [ ] **Step 3: Add a `fetchDemoLatestIntervention` test that mocks `globalThis.fetch`**

Append:

```js
import { fetchDemoLatestIntervention } from "../demo-freshness.mjs";

describe("fetchDemoLatestIntervention", () => {
  it("derives ISO timestamp from min last_intervention_days across threads", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        student_threads: [
          { last_intervention_days: 12 },
          { last_intervention_days: 3 },
          { last_intervention_days: null },
          { last_intervention_days: 45 },
        ],
      }),
    });
    try {
      const iso = await fetchDemoLatestIntervention("http://test");
      assert.ok(iso, "expected an ISO timestamp");
      const ageMs = Date.now() - new Date(iso).getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      // smallest non-null is 3 → derived ISO should be ~3 days old
      assert.ok(ageDays > 2.9 && ageDays < 3.1, `expected ~3 days, got ${ageDays}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null when fetch throws", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("network down"); };
    try {
      const result = await fetchDemoLatestIntervention("http://test");
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null when no thread has a usable day count", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        student_threads: [
          { last_intervention_days: null },
          { last_intervention_days: -1 },
          { last_intervention_days: "bogus" },
        ],
      }),
    });
    try {
      const result = await fetchDemoLatestIntervention("http://test");
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
```

(Adjust the day-derivation guard's expected null cases if `fetchDemoLatestIntervention` accepts negative or non-numeric `last_intervention_days` differently than this test assumes — verify by reading the implementation first.)

- [ ] **Step 4: Run the tests**

```bash
node --test scripts/lib/__tests__/demo-freshness.test.mjs
```
Expected: all pass (3 original + 1 invalid-date + 3 fetch).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/demo-freshness.mjs scripts/lib/__tests__/demo-freshness.test.mjs
git commit -m "test(scripts): add invalid-date + fetch-helper tests for demo-freshness

Closes the T8 followups (M1 + M3): adds an inline comment explaining
the ~8-day effective threshold (last_intervention_days is a whole-day
integer), plus four new tests covering invalid date strings, the
fetchDemoLatestIntervention day-derivation min-scan, the network-error
null path, and the no-usable-data null path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Final integration checks

- [ ] **Run typecheck + lint + tests**:

```bash
npm run typecheck && npm run lint && npm run test 2>&1 | tail -10
```
Expected: PASS, no new failures.

- [ ] **Push** (if working directly on main; if on a branch, create PR):

```bash
git push origin main
```

---

## Self-review

**Spec coverage:** Each of the 4 follow-ups in `qa/final-app-review-2026-04-25.md` Outcomes section has a dedicated task (T1-T4). T5 bundles the 2 minor T8 observations from the code-quality review.

**Placeholder scan:** No "TBD" / "implement later" patterns. Test code in T1 explicitly notes the prop shape will need adapting to the actual `TodayPanel` signature — the snippet is a template, not a copy-paste-ready test, and the executor is told to read existing tests first. T5's negative-case test makes an assumption about how `fetchDemoLatestIntervention` handles `-1` / `"bogus"` and instructs the executor to verify before submitting.

**Type consistency:** `countActionableThreads` is referenced in T1 with the same signature as defined in commit `7a0c07c`. `HEALTH_CHECKS.orchestrator.port` in T4 matches the existing module. `STALE_THRESHOLD_DAYS` and `isDemoStale` / `fetchDemoLatestIntervention` in T5 match commit `1dbb33a`.

**Dependency check:** All 5 tasks are independent. T5 builds on T8's existing files but doesn't depend on any other task in this plan. T1 builds on commit `7a0c07c` (already on main).
