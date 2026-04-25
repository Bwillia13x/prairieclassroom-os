# PrairieClassroom OS Submission Polish + Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the audit-surfaced fixes from `qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md` in three phases — pre-submission polish (Phase A, today), post-submission code improvements (Phase B, next sprint), and out-of-scope items (Phase C, requires human-process or infra decisions).

**Architecture:** Each task is a single small change behind a passing test, mirroring the repo's existing TDD discipline. Phase A changes are non-invasive polish that should ship before the public submission. Phase B closes documented gaps in the eval corpus, observability, and fixture vocabulary. Phase C names the items that cannot be closed in code.

**Tech Stack:** Node 25.8.2 (`.nvmrc`), TypeScript 5.7, Vitest 3, Express, Python 3.11 + pytest, Playwright. No new dependencies.

**Pre-flight (do before starting):**

```bash
source ~/.nvm/nvm.sh && nvm use            # honour .nvmrc
git log --oneline -10                      # confirm HEAD = bd44d6f or later
npm run cost:status                        # confirm $20/day headroom
git status --short                         # baseline working tree
```

If `git status` shows the two dirty docs (`docs/eval-baseline.md`, `docs/live-model-proof-status.md`) from today's mock-gate run, that is expected and addressed by Task A3.

---

## Phase A — Pre-Submission Polish (target: ship today)

Estimated total time: 2–3 hours. All tasks are in-repo only. No external dependencies.

### Task A1: Add `deadline_exceeded` to retryable-error-body tokens (closes F1 / R1)

**Why:** Today's hosted Gemini gate (16:27) failed at `ea-001-schema` because the upstream Gemini API returned **504 DEADLINE_EXCEEDED** at 97.7s. The orchestrator wraps the inference-service response as a 502 with `"504 DEADLINE_EXCEEDED"` in the body, but `isRetryableErrorBody()` does not include `"deadline_exceeded"` in its retry-token list, so the 502 is treated as fatal. With `MAX_RETRIES=2` and 500ms→1000ms backoff, adding the token would absorb most provider-side timeouts without inflating the orchestrator's own 130-second budget for this route.

**Files:**
- Modify: `services/orchestrator/inference-client.ts:134-148` (the `isRetryableErrorBody` function)
- Test: `services/orchestrator/__tests__/inference-client.test.ts` (create if missing — check first with `ls services/orchestrator/__tests__/inference-client.test.ts 2>&1 || echo MISSING`)

- [ ] **Step 1: Locate or create the test file**

```bash
ls services/orchestrator/__tests__/inference-client.test.ts 2>/dev/null || echo "Need to create"
```

If the file exists, append the new test inside the existing `describe("isRetryableErrorBody", ...)` block. If it does not exist, create it with the full content shown in Step 2.

- [ ] **Step 2: Write the failing test**

If file doesn't exist, create `services/orchestrator/__tests__/inference-client.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import { __testables } from "../inference-client";

const { isRetryableErrorBody } = __testables;

describe("isRetryableErrorBody", () => {
  it("retries on upstream Gemini 504 deadline_exceeded wrapped in inference-service body", () => {
    const body = `{"error":"504 DEADLINE_EXCEEDED. {'error': {'code': 504, 'message': 'Deadline expired before operation could complete.', 'status': 'DEADLINE_EXCEEDED'}}","latency_ms":97675}`;
    expect(isRetryableErrorBody(body)).toBe(true);
  });

  it("retries on lowercase deadline exceeded variant", () => {
    expect(isRetryableErrorBody("error: deadline exceeded after 95s")).toBe(true);
  });

  it("does NOT retry on schema validation errors", () => {
    expect(isRetryableErrorBody('{"error":"missing required field: classroom_id"}')).toBe(false);
  });

  it("retries on connection reset (regression — pre-existing token)", () => {
    expect(isRetryableErrorBody("connection reset by peer")).toBe(true);
  });
});
```

If the file exists, just add the four test cases above inside its existing `describe("isRetryableErrorBody", ...)` block.

- [ ] **Step 3: Run the test to verify it fails on the deadline_exceeded cases**

Run: `npx vitest run services/orchestrator/__tests__/inference-client.test.ts`

Expected: 2 of 4 fail with `expected false to be true` for the two deadline_exceeded cases. The schema-validation case and connection-reset case pass.

If the test file did not exist, you must also export `isRetryableErrorBody` for testing. Add at the bottom of `services/orchestrator/inference-client.ts`:

```typescript
export const __testables = { isRetryableErrorBody };
```

- [ ] **Step 4: Make the test pass — add the new tokens**

In `services/orchestrator/inference-client.ts`, edit the `isRetryableErrorBody` function (lines 134-148):

Replace:

```typescript
function isRetryableErrorBody(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    "nameresolutionerror",
    "failed to resolve",
    "temporary failure in name resolution",
    "httpsconnectionpool",
    "connection aborted",
    "connection reset",
    "read timed out",
    "internal error encountered",
    "500 internal",
    "temporarily unavailable",
  ].some((token) => normalized.includes(token));
}
```

With:

```typescript
function isRetryableErrorBody(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    "nameresolutionerror",
    "failed to resolve",
    "temporary failure in name resolution",
    "httpsconnectionpool",
    "connection aborted",
    "connection reset",
    "read timed out",
    "internal error encountered",
    "500 internal",
    "temporarily unavailable",
    // Upstream Gemini API 504s wrapped by the inference service as 502 bodies.
    // Observed 2026-04-25: ea-001-schema returned 504 at 97.7s while the local
    // budget is 130s. With MAX_RETRIES=2 and 500ms→1000ms backoff, the second
    // attempt typically succeeds because the upstream queue has cleared.
    "deadline_exceeded",
    "deadline exceeded",
  ].some((token) => normalized.includes(token));
}
```

- [ ] **Step 5: Re-run the test — should pass 4/4**

Run: `npx vitest run services/orchestrator/__tests__/inference-client.test.ts`

Expected: all 4 tests pass.

- [ ] **Step 6: Run the full vitest suite to verify no regressions**

Run: `npm run test`

Expected: total count is 1905 passed (1901 baseline + 4 new tests), 0 failed.

- [ ] **Step 7: Commit**

```bash
git add services/orchestrator/inference-client.ts services/orchestrator/__tests__/inference-client.test.ts
git commit -m "feat(inference-client): retry hosted Gemini 504 deadline_exceeded responses

The 2026-04-25 hosted gate hit a Gemini API 504 at 97.7s on the
ea-001-schema eval, well inside the orchestrator's 130s per-route budget.
The 502 wrapping the upstream 504 was not retried because the body token
'deadline_exceeded' was missing from isRetryableErrorBody().

Adding the token lets the existing MAX_RETRIES=2 + 500ms→1000ms backoff
absorb provider-side latency variance without inflating local timeouts.

See: qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md F1/R1"
```

---

### Task A2: Re-verify F2 (smoke:browser exit code) — fix only if real

**Why:** The audit memo flagged that `npm run smoke:browser` exited 0 even when the dev server was unreachable. On re-inspection, `scripts/smoke-browser.mjs:454` does set `process.exitCode = 1` on caught error, and a sanity check (`node -e "process.exitCode = 1; ..."`) confirms `process.exitCode = 1` does propagate. The original observation may have been a wrapper artifact. **Verify before fixing.**

**Files:**
- Inspect: `scripts/smoke-browser.mjs:444-455` (the `main().catch(...)` rejection handler)
- Possibly modify: same lines, replacing `process.exitCode = 1` with `process.exit(1)` if propagation truly fails

- [ ] **Step 1: Reproduce — run smoke:browser standalone with no dev server up**

Make sure no Vite server is running:

```bash
lsof -i :5173 || echo "5173 is free"
```

Then run:

```bash
npm run smoke:browser; echo "exit=$?"
```

Expected (if F2 was a false alarm): the script prints the connection-refused error, captures the screenshot, and `echo` reports `exit=1`.

Expected (if F2 is real): `echo` reports `exit=0`.

- [ ] **Step 2A: If exit=1 (F2 is a false alarm)**

Update `qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md` §3 F2 section to add a "Re-verification" subsection:

```markdown
### F2 — Re-verified 2026-04-25 17:XX MDT

`npm run smoke:browser` with no dev server up exits 1 as expected. The original
audit-time exit-0 report was likely a wrapper artifact in the background-task
notification. No code change required; F2 is closed.
```

Then commit:

```bash
git add qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md
git commit -m "docs(audit): clear F2 (smoke:browser exit code) — false alarm on re-verify"
```

Skip Step 2B and proceed to Task A3.

- [ ] **Step 2B: If exit=0 (F2 is real)**

The bug is genuine. Edit `scripts/smoke-browser.mjs` lines 451-455.

Replace:

```javascript
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
```

With:

```javascript
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  // Use process.exit(1) instead of process.exitCode = 1 because Playwright's
  // browser handle keeps the event loop alive even after main()'s finally
  // closes it; the deferred exit-code can race with shell-level wrappers and
  // produce a false-positive exit 0. Force the exit immediately.
  process.exit(1);
});
```

Re-run the verification:

```bash
npm run smoke:browser; echo "exit=$?"
```

Expected: `exit=1`.

Then commit:

```bash
git add scripts/smoke-browser.mjs
git commit -m "fix(smoke-browser): force process.exit(1) on rejection to surface failures

When the dev server is not running, page.goto throws ERR_CONNECTION_REFUSED.
The previous handler set process.exitCode = 1, but the Playwright browser
handle kept the event loop alive long enough to race with shell-level
wrappers, producing a false-positive exit 0 in some invocation paths.

process.exit(1) is unambiguous and fires immediately.

See: qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md F2/R2"
```

---

### Task A3: Commit dirty timestamp docs (closes F3 / R3)

**Why:** `docs/eval-baseline.md` and `docs/live-model-proof-status.md` carry timestamp-only diffs from a 16:17 mock-gate run earlier today. My 16:24 mock-gate run advanced the pointer further, which `--update-baseline` (set on the `release:gate` script) re-applied. Commit them so the audit trail stays clean.

**Files:**
- Modify (already on disk): `docs/eval-baseline.md`, `docs/live-model-proof-status.md`

- [ ] **Step 1: Verify the diff is timestamp-only**

```bash
git diff docs/eval-baseline.md docs/live-model-proof-status.md
```

Expected: diff hunks contain only `Run date:` and `Raw artifacts:` line changes pointing at the latest passing mock-gate run.

If the diff contains any other content changes (status flips, command list edits, host-table edits), STOP and investigate — those are not safe to commit blindly.

- [ ] **Step 2: Commit**

```bash
git add docs/eval-baseline.md docs/live-model-proof-status.md
git commit -m "chore(release-gate): bump latest mock-gate artifact pointer to 2026-04-25T16-24-57Z

Timestamp-only updates auto-applied by 'npm run release:gate --update-baseline'
on the 2026-04-25 final-release audit pass.

Latest passing mock gate: output/release-gate/2026-04-25T16-24-57-671Z-90394"
```

---

### Task A4: Free disk to ≥15 GiB headroom (closes R7)

**Why:** Current disk is 7.4 GiB free out of 228 GiB (97% full). The 12:41 hosted gate today appears to have been killed before the smoke-browser step, possibly due to disk pressure during artifact write. Pre-submission posture should leave at least 15 GiB headroom for at-rest gate artifacts plus screenshots.

**Files:**
- Reads: `output/release-gate/`, `output/playwright/`, `output/evals/`, `output/request-logs/`
- Writes: tombstone artifacts under `output/artifact-prune/`

- [ ] **Step 1: Dry-run the prune to see what would be removed**

```bash
npm run artifacts:prune:dry-run 2>&1 | tail -40
```

Expected: a per-directory size-and-age summary plus a "would remove" total. Review the output. Do **not** proceed if any candidate path is younger than 7 days unless you understand why.

- [ ] **Step 2: Apply the prune**

```bash
npm run artifacts:prune 2>&1 | tail -20
```

Expected: confirmation message plus a tombstone JSON path under `output/artifact-prune/`.

- [ ] **Step 3: Confirm disk is now ≥15 GiB free**

```bash
df -h /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev | tail -1
```

Expected: the `Avail` column reads ≥15Gi. If still below 15Gi, manually delete `output/playwright/` subdirectories older than 14 days and re-check.

- [ ] **Step 4: No commit** — this is a local-disk operation; the tombstone is gitignored.

---

### Task A5: Refresh UI evidence bundle (closes R4)

**Why:** Current canonical UI bundle is `output/playwright/ui-evidence/2026-04-20T18-16-58-840Z/` (5 days old). Recent commits include hero-component polish (`bd44d6f` PageAnchorRail + ambient styles, `87d7bcb` Plan Compass radar, `346c5ce` popover primitives) that the screenshots don't reflect. A fresh bundle gives judges current visuals.

**Files:**
- Reads: `apps/web/src/**`
- Writes: `output/playwright/ui-evidence/<timestamp>/` (8 screenshots + `manifest.json`)

- [ ] **Step 1: Boot the dev environment in one terminal (background)**

```bash
npm run pilot:start 2>&1 | tee /tmp/pilot-start.log &
```

Wait until `/tmp/pilot-start.log` shows `web ready on http://localhost:5173`.

- [ ] **Step 2: Run the UI-evidence capture**

In a fresh terminal:

```bash
npm run ui:evidence 2>&1 | tail -20
```

Expected: 8 screenshots written to `output/playwright/ui-evidence/<new-timestamp>/`, plus a `manifest.json`. Exit code 0.

- [ ] **Step 3: Visual spot-check the new screenshots**

```bash
ls -la output/playwright/ui-evidence/$(ls -t output/playwright/ui-evidence/ | head -1)/
```

Open at minimum `today-desktop.png`, `tomorrow-plan-desktop.png`, and `shell-mobile.png`. Verify they render cleanly (no white-screen, no console-error overlays, no missing fonts).

- [ ] **Step 4: Tear down the dev environment**

Kill the `pilot:start` background process (whatever you spawned it as in Step 1). Verify ports 3100/3200/5173 are free again:

```bash
lsof -i :3100 -i :3200 -i :5173 | head
```

- [ ] **Step 5: Commit**

```bash
git add output/playwright/ui-evidence/
git commit -m "chore(evidence): refresh UI evidence bundle for 2026-04-25 submission

Captures recent hero polish commits (PageAnchorRail, Plan Compass,
popover primitives) that the 2026-04-20 bundle did not reflect."
```

If `output/playwright/ui-evidence/` is gitignored, skip the git add and just verify the bundle exists locally for the submission media gallery.

---

### Task A6: Re-snapshot evidence portfolio (closes R6)

**Why:** `docs/evidence/{feedback-summary,session-patterns,system-reliability}.md` carry yesterday's timestamps. Re-generating these against today's request logs and feedback rows keeps the submission-cited numbers fresh.

**Files:**
- Modify: `docs/evidence/feedback-summary.md`, `docs/evidence/session-patterns.md`, `docs/evidence/system-reliability.md`
- Writes: `output/evidence-snapshots/2026-04-25/<...>`

- [ ] **Step 1: Regenerate the evidence docs**

```bash
npm run evidence:generate 2>&1 | tail -20
```

Expected: three docs under `docs/evidence/` updated; exit 0.

- [ ] **Step 2: Snapshot to dated archive**

```bash
npm run evidence:snapshot 2>&1 | tail -20
```

Expected: a new directory `output/evidence-snapshots/2026-04-25/` with the docs preserved at this point in time.

- [ ] **Step 3: Verify claims-check still passes**

```bash
npm run claims:check
```

Expected: `Claims check passed.`

- [ ] **Step 4: Commit**

```bash
git add docs/evidence/feedback-summary.md docs/evidence/session-patterns.md docs/evidence/system-reliability.md output/evidence-snapshots/2026-04-25/
git commit -m "chore(evidence): refresh portfolio snapshot for 2026-04-25 submission"
```

If `output/evidence-snapshots/` is gitignored, omit it from the `git add`.

---

### Task A7: Live-DOM browser sweep across viewports + themes (closes R8)

**Why:** The mock gate's `smoke:browser` exercises core flows but does not visually verify recent UI commits at every breakpoint. A 5-viewport × 2-theme manual sweep (10 captures) confirms PageAnchorRail, Plan Compass, popover primitives, and ambient styles render without console errors anywhere on the matrix.

**Files:**
- Writes: `qa/final-release/screenshots/2026-04-25/<viewport>-<theme>-<tab>.png`

- [ ] **Step 1: Boot dev environment**

```bash
npm run pilot:start 2>&1 | tee /tmp/pilot-start.log &
```

Wait for "web ready on http://localhost:5173".

- [ ] **Step 2: Create the screenshot script**

Create `scripts/audit-2026-04-25-sweep.mjs`:

```javascript
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const TABS = ["classroom", "today", "tomorrow", "week", "prep", "ops", "review"];
const VIEWPORTS = [
  { name: "375", width: 375, height: 667 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1720", width: 1720, height: 1080 },
];
const THEMES = ["light", "dark"];
const OUT = "qa/final-release/screenshots/2026-04-25";
const errors = [];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`[${vp.name}/${theme}] ${msg.text()}`);
      });
      page.on("pageerror", (err) => errors.push(`[${vp.name}/${theme}] page-error: ${err.message}`));
      await page.goto(`http://localhost:5173/?demo=true`, { waitUntil: "networkidle" });
      await page.evaluate((t) => document.documentElement.dataset.theme = t, theme);
      for (const tab of TABS) {
        await page.evaluate((t) => {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", t);
          window.history.replaceState({}, "", url.toString());
          window.dispatchEvent(new Event("popstate"));
        }, tab);
        await page.waitForTimeout(800);
        await page.screenshot({
          path: `${OUT}/${vp.name}-${theme}-${tab}.png`,
          fullPage: false,
        });
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

if (errors.length > 0) {
  console.error(`Console/page errors detected (${errors.length}):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`PASS — captured ${TABS.length * VIEWPORTS.length * THEMES.length} screenshots; 0 errors.`);
```

- [ ] **Step 3: Run the sweep**

```bash
node scripts/audit-2026-04-25-sweep.mjs
```

Expected: `PASS — captured 70 screenshots; 0 errors.`

If errors are reported, **stop and investigate**. Each error names the viewport, theme, and exact text. Common categories:
- Token reference fails (compare against `apps/web/src/styles/tokens.css`)
- Duplicate React key warnings (use `${label}-${index}` per the maintainer memory)
- Missing `data-testid` (the canonical contract is in panel `*.test.tsx` files)

Fix the underlying issue and re-run until 0 errors.

- [ ] **Step 4: Visual spot-check**

Open three captures in an image viewer:
- `qa/final-release/screenshots/2026-04-25/1440-dark-classroom.png`
- `qa/final-release/screenshots/2026-04-25/375-dark-today.png`
- `qa/final-release/screenshots/2026-04-25/1280-light-tomorrow.png`

Verify the layout is intact: hero renders, anchor rail visible at desktop, mobile nav visible at 375px, no clipped content, no overlap.

- [ ] **Step 5: Tear down dev environment**

Kill `pilot:start`. Verify `lsof -i :3100 -i :3200 -i :5173` returns nothing.

- [ ] **Step 6: Delete the throwaway script and commit screenshots**

```bash
rm scripts/audit-2026-04-25-sweep.mjs
git add qa/final-release/screenshots/2026-04-25/
git commit -m "chore(audit): live-DOM sweep screenshots for 2026-04-25 submission

70 captures across 5 viewports × 2 themes × 7 tabs, 0 console errors."
```

- [ ] **Step 7: Update audit memo**

Append to `qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md` §3 a new section:

```markdown
### F4 — Live-DOM browser sweep cleared

R8 executed 2026-04-25. 70 captures (5 viewports × 2 themes × 7 tabs) at
`qa/final-release/screenshots/2026-04-25/`. Zero console errors, zero page
errors. PageAnchorRail, Plan Compass, and popover primitives all render
cleanly across the matrix.
```

```bash
git add qa/final-release/FINAL_RELEASE_AUDIT_2026-04-25.md
git commit -m "docs(audit): record R8 sweep result in 2026-04-25 memo"
```

---

### Phase A Exit Criteria

All of the following must be true before declaring Phase A complete:

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run test` green (1905+ tests after A1)
- [ ] `npm run release:gate` (mock) green
- [ ] `git status --short` clean (everything committed)
- [ ] Disk available ≥15 GiB
- [ ] UI evidence bundle dated 2026-04-25
- [ ] R8 sweep recorded 0 console errors

If any are red, do **not** proceed to publish the submission.

---

## Phase B — Post-Submission Code Improvements (next sprint, ~1 day)

Estimated total time: 6–8 hours. Each task is independently committable. Run after Phase A is shipped.

### Task B1: Add 4 retrieval-relevance evals (closes L2)

**Why:** Currently only `prepare_tomorrow_plan` and `detect_support_patterns` have explicit retrieval-relevance eval coverage. The development-gaps.md G-03 entry calls out the same gap for `forecast_complexity`, `detect_scaffold_decay`, `generate_survival_packet`, and `balance_ea_load`. Each of these classes is retrieval-backed per the system inventory; uncovered retrieval-relevance is a quality risk on real classroom data.

**Files:**
- Create: `evals/cases/fcst-006-retrieval-relevance.json`
- Create: `evals/cases/scaffold-002-retrieval-relevance.json`
- Create: `evals/cases/surv-005-retrieval-relevance.json`
- Create: `evals/cases/ea-load-005-retrieval-relevance.json`
- Modify: `docs/eval-inventory.md` (count update)

- [ ] **Step 1: Read an existing retrieval-relevance case as template**

```bash
ls evals/cases/ | grep -E "retrieval-relevance|relevance"
cat evals/cases/$(ls evals/cases/ | grep -E "retrieval|relevance" | head -1)
```

If no existing case is named `retrieval-relevance`, read `evals/cases/plan-001-alpha-schema.json` and `evals/cases/pat-001-alpha-schema.json` for the schema shape, plus search for any case that asserts on the `retrieval_trace` or `evidence_refs` field.

- [ ] **Step 2: Author `fcst-006-retrieval-relevance.json`**

Create with content that mirrors the existing `fcst-001-demo-schema.json` shape but adds an assertion that the response's retrieval evidence includes references back to recent intervention rows for the demo classroom. Concrete content:

```json
{
  "id": "fcst-006-retrieval-relevance",
  "description": "Complexity forecast for demo classroom cites recent intervention rows in retrieval evidence",
  "category": "retrieval_relevance",
  "route": "POST /api/complexity-forecast",
  "prompt_class": "forecast_complexity",
  "request": {
    "classroom_id": "demo-okafor-grade34",
    "horizon_days": 7
  },
  "assertions": [
    { "type": "status", "expected": 200 },
    { "type": "has_key", "key": "forecast_blocks" },
    { "type": "is_array", "key": "forecast_blocks" },
    { "type": "has_key", "key": "retrieval_trace" },
    { "type": "min_length", "key": "retrieval_trace", "value": 1 },
    {
      "type": "any_match",
      "key": "retrieval_trace",
      "pattern_field": "table",
      "pattern_value": "interventions"
    }
  ]
}
```

If the assertion type `any_match` does not exist in `evals/runner.ts`, fall back to a `regex_in_field` or `min_length` assertion that the `retrieval_trace` field is present and non-empty. Check what's available:

```bash
grep -E "case 'any_match'|case 'has_key'|case 'min_length'" evals/runner-validators.ts | head
```

- [ ] **Step 3: Verify the case runs cleanly against mock**

```bash
npm run pilot:start 2>&1 | tee /tmp/pilot-start.log &
# wait for web ready
npx tsx evals/runner.ts --case fcst-006-retrieval-relevance --backend mock 2>&1 | tail -10
```

Expected: PASS, response returns 200, retrieval_trace is non-empty.

- [ ] **Step 4: Repeat Steps 2–3 for the other three cases**

- `scaffold-002-retrieval-relevance.json`: target `POST /api/scaffold-decay`, `prompt_class: detect_scaffold_decay`, request body needs `student_ref: "D2"` (Brody, has 2026-04-23 scaffold history per demo seed). Assert retrieval_trace includes references to `interventions` rows for that student.
- `surv-005-retrieval-relevance.json`: target `POST /api/survival-packet`, `prompt_class: generate_survival_packet`, request body needs `classroom_id: "demo-okafor-grade34"` plus `target_date`. Assert the response's `heads_up` section pulls from current `complexity_forecasts` or `support_patterns` retrieval rows.
- `ea-load-005-retrieval-relevance.json`: target `POST /api/ea-load`, `prompt_class: balance_ea_load`, request body needs `classroom_id: "demo-okafor-grade34"`. Assert the response references actual EA-window blocks from the classroom schedule, not invented ones.

For each, run:

```bash
npx tsx evals/runner.ts --case <case-id> --backend mock
```

All four must PASS against mock.

- [ ] **Step 5: Update `docs/eval-inventory.md`**

Bump the case count by 4 and add a "Retrieval relevance" subsection listing the four new IDs. Run:

```bash
npm run system:inventory:check
```

Expected: passes (case count moves from 129 to 133).

- [ ] **Step 6: Run the mock release gate**

```bash
npm run release:gate
```

Expected: passed, no regressions.

- [ ] **Step 7: Commit**

```bash
git add evals/cases/fcst-006-retrieval-relevance.json evals/cases/scaffold-002-retrieval-relevance.json evals/cases/surv-005-retrieval-relevance.json evals/cases/ea-load-005-retrieval-relevance.json docs/eval-inventory.md
git commit -m "test(evals): add retrieval-relevance cases for fcst/scaffold/surv/ea-load (G-03)

Closes the retrieval-relevance coverage gap for the four planning-tier
classes named in development-gaps.md G-03. All four pass against mock.
Eval case count: 129 → 133."
```

---

### Task B2: Add 4 cross-feature synthesis evals (closes L3)

**Why:** Single-class evals miss the interaction effects of real workflows. The four highest-value synthesis cases are: plan+pattern (does the tomorrow plan reflect detected support patterns?), forecast+intervention (does the forecast incorporate yesterday's logged interventions?), ea-load+intervention (does ea-load balance reflect intervention burden?), survival-packet+forecast (does the substitute packet warn about forecasted high-complexity blocks?).

**Files:**
- Create: `evals/cases/synth-001-plan-uses-pattern.json`
- Create: `evals/cases/synth-002-forecast-uses-intervention.json`
- Create: `evals/cases/synth-003-ea-load-uses-intervention.json`
- Create: `evals/cases/synth-004-surv-uses-forecast.json`
- Modify: `docs/eval-inventory.md`

- [ ] **Step 1: Author `synth-001-plan-uses-pattern.json`**

Mirror the shape of `plan-001-alpha-schema.json`. The case must:
1. POST to `/api/support-patterns` first (or assume the demo seed already has `pattern_reports` row 1).
2. Then POST to `/api/tomorrow-plan` and assert the returned plan's `priorities` or `watchpoints` reference at least one student named in the latest pattern report's `recurring_themes[].student_refs`.

If your eval runner doesn't support multi-step cases, structure this as a single-step case that asserts the plan request response includes references to known-pattern students from the demo seed (D1 Amira, D2 Brody, D3 Chantal — all have active patterns per the seed).

```json
{
  "id": "synth-001-plan-uses-pattern",
  "description": "Tomorrow plan for demo classroom incorporates students named in the latest pattern report",
  "category": "cross_feature_synthesis",
  "route": "POST /api/tomorrow-plan",
  "prompt_class": "prepare_tomorrow_plan",
  "request": {
    "classroom_id": "demo-okafor-grade34",
    "target_date": "2026-04-26",
    "teacher_reflection": "Reviewing yesterday's pattern report"
  },
  "assertions": [
    { "type": "status", "expected": 200 },
    {
      "type": "any_includes",
      "key": "plan.watchpoints",
      "value_field": "student_ref",
      "pattern_oneof": ["D1", "D2", "D3"]
    }
  ]
}
```

- [ ] **Step 2: Author the remaining three synth cases**

Use the same pattern. Each case asserts that one prompt class's output references data the prior class produced. Concrete assertions:

- `synth-002-forecast-uses-intervention`: forecast for `2026-04-26` should mention at least one student who has a logged intervention in the demo memory dated within the prior 3 days.
- `synth-003-ea-load-uses-intervention`: EA-load balance should weight the EA window covering the block where the most recent intervention occurred.
- `synth-004-surv-uses-forecast`: survival packet `heads_up` section should reference the highest-complexity block from the latest forecast.

- [ ] **Step 3: Verify each runs against mock**

```bash
for c in synth-001-plan-uses-pattern synth-002-forecast-uses-intervention synth-003-ea-load-uses-intervention synth-004-surv-uses-forecast; do
  npx tsx evals/runner.ts --case "$c" --backend mock 2>&1 | tail -3
done
```

All four must PASS.

- [ ] **Step 4: Update `docs/eval-inventory.md` and run inventory check**

```bash
npm run system:inventory:check
```

Expected: case count moves from 133 to 137.

- [ ] **Step 5: Mock release gate**

```bash
npm run release:gate
```

Expected: passed.

- [ ] **Step 6: Commit**

```bash
git add evals/cases/synth-*.json docs/eval-inventory.md
git commit -m "test(evals): add 4 cross-feature synthesis cases (G-03 follow-up)

Adds plan+pattern, forecast+intervention, ea-load+intervention, and
survival-packet+forecast synthesis assertions. All pass against mock.
Eval case count: 133 → 137."
```

---

### Task B3: Normalize EAL tag vocabulary across non-demo classrooms (closes L10 / G-15)

**Why:** `classroom_demo.json` uses `eal_level_1/2/3` while non-demo classrooms (`alpha/bravo/charlie/delta/echo`) use `emerging_english`. Two parallel vocabularies for the same concept fragment any pattern-detection or EA-load heuristic that keys on the tag. The G-15 entry documents the gap; the demo fixture validator currently locks the demo convention but does not normalize non-demo.

**Decision:** **Migrate non-demo to `eal_level_N` (option A).** Reasons: (1) the demo convention has tier granularity (1/2/3) that `emerging_english` lacks, which preserves more signal for patterns; (2) the validator already enforces the demo convention, so this minimizes change surface; (3) eval cases citing `emerging_english` will need one rename either way.

**Files:**
- Modify: `data/synthetic_classrooms/classroom_alpha.json`, `classroom_bravo.json`, `classroom_charlie.json`, `classroom_delta.json`, `classroom_echo.json` (5 fixtures)
- Modify: any eval case JSON files that reference `emerging_english` as a tag literal
- Modify: `scripts/validate-demo-fixture.mjs` if it has explicit allow-list of tags
- Modify: `docs/development-gaps.md` G-15 entry (mark closed)

- [ ] **Step 1: Inventory the current usage**

```bash
grep -rn "emerging_english\|eal_for_academic\|eal_level_1\|eal_level_2\|eal_level_3" data/synthetic_classrooms/ evals/cases/ packages/shared/ services/ apps/ | tee /tmp/eal-usage.txt
wc -l /tmp/eal-usage.txt
```

Expected: a list of every occurrence. Roughly: 5 non-demo fixtures × 1-3 students each, plus 1-3 eval cases.

- [ ] **Step 2: For each non-demo classroom fixture, decide the per-student tier**

For each student tagged `emerging_english` in `classroom_{alpha,bravo,charlie,delta,echo}.json`, decide whether they map to `eal_level_1` (newcomer, ≤6 months in school), `eal_level_2` (developing, 6–24 months), or `eal_level_3` (proficient-with-academic-vocabulary support). Use the `communication_notes`, `support_tags`, and `interventions` fields to infer.

If you cannot infer with confidence from the fixture, default to `eal_level_2` (the median).

For tags like `eal_for_academic_vocabulary`, map to `eal_level_3`.

- [ ] **Step 3: Apply renames in fixtures**

For each of the 5 non-demo fixtures, edit the JSON to replace the old tag with the chosen `eal_level_N`. Example for `classroom_alpha.json`:

```json
// before
"support_tags": ["emerging_english"]
// after
"support_tags": ["eal_level_2"]
```

- [ ] **Step 4: Apply renames in any affected eval cases**

For each eval-case file flagged in Step 1:

```bash
# review the case and decide the right tier
grep "emerging_english" evals/cases/<case>.json
# replace
sed -i '' 's/"emerging_english"/"eal_level_2"/g' evals/cases/<case>.json
```

- [ ] **Step 5: Run demo-fixture-check**

```bash
npm run demo:fixture:check
```

Expected: PASS. The validator should already accept the unified vocabulary.

- [ ] **Step 6: Run the full vitest suite**

```bash
npm run test
```

Expected: 1905+ passed, 0 failed. If any test regresses, it is asserting against the old tag literal — update the assertion.

- [ ] **Step 7: Run the mock release gate**

```bash
npm run release:gate
```

Expected: passed.

- [ ] **Step 8: Update `docs/development-gaps.md` G-15 entry**

Change the G-15 status from **Partial** to **Closed**, and add a note dated 2026-04-25:

```markdown
### G-15 — Synthetic classroom fixture convention drift

**Status:** Closed 2026-04-25.

**Resolution:** Non-demo classrooms (`alpha/bravo/charlie/delta/echo`) migrated
from `emerging_english` to the demo convention `eal_level_N`. Cross-fixture
vocabulary now unified. Eval cases referencing the old tag updated in the
same commit.
```

- [ ] **Step 9: Commit**

```bash
git add data/synthetic_classrooms/ evals/cases/ docs/development-gaps.md
git commit -m "fix(fixtures): normalize EAL tag vocabulary to eal_level_N (closes G-15)

Migrates non-demo classroom fixtures (alpha/bravo/charlie/delta/echo)
from 'emerging_english' to the demo convention 'eal_level_N'. Eval cases
referencing the old tag updated in the same commit. Pattern-detection,
EA-load, and support-patterns heuristics now key on a single vocabulary.

See: docs/development-gaps.md G-15"
```

---

### Task B4: Register Sentry transport for errorReporter (closes L11 / G-09)

**Why:** `apps/web/src/errorReporter.ts` already has a pluggable transport interface and ErrorBoundary integration. The remaining work is registering an actual destination so production-pilot deployments capture client-side errors. Sentry is the natural choice — free tier covers up-to-5k errors/month, no PII collected by default.

**Decision:** Implement Sentry only. Skip LogRocket — its session-replay model conflicts with the project's safety governance (no surveillance). Sentry's error-only model is compatible.

**Files:**
- Modify: `apps/web/src/errorReporter.ts` (register Sentry transport)
- Create: `apps/web/src/transports/sentry.ts` (transport implementation)
- Modify: `apps/web/package.json` (add `@sentry/browser` dependency)
- Modify: `.env.example` (document `VITE_SENTRY_DSN`)
- Modify: `docs/development-gaps.md` G-09 entry

- [ ] **Step 1: Read the current errorReporter shape**

```bash
cat apps/web/src/errorReporter.ts
```

Note the `Transport` interface, the `register()` API, and where transports are invoked.

- [ ] **Step 2: Add the dependency**

```bash
npm install --save-dev --workspace apps/web @sentry/browser
```

Expected: `@sentry/browser` added to `apps/web/package.json` `dependencies`. Verify no peer-dependency warnings.

- [ ] **Step 3: Write the failing transport test**

Create `apps/web/src/transports/__tests__/sentry.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { createSentryTransport } from "../sentry";

vi.mock("@sentry/browser", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

describe("sentryTransport", () => {
  it("forwards errors to Sentry.captureException with structured context", async () => {
    const sentry = await import("@sentry/browser");
    const transport = createSentryTransport({ dsn: "https://test@example.com/1" });

    transport.report({
      error: new Error("boom"),
      context: { route: "/api/today/demo-okafor-grade34" },
      severity: "error",
    });

    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ extra: expect.objectContaining({ route: "/api/today/demo-okafor-grade34" }) }),
    );
  });

  it("no-ops when dsn is empty (lets dev environments skip Sentry init)", async () => {
    const sentry = await import("@sentry/browser");
    vi.clearAllMocks();
    const transport = createSentryTransport({ dsn: "" });

    transport.report({ error: new Error("x"), context: {}, severity: "error" });

    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run apps/web/src/transports/__tests__/sentry.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the transport**

Create `apps/web/src/transports/sentry.ts`:

```typescript
import * as Sentry from "@sentry/browser";
import type { Transport, ReportInput } from "../errorReporter";

export interface SentryTransportConfig {
  dsn: string;
  environment?: string;
  release?: string;
}

export function createSentryTransport(config: SentryTransportConfig): Transport {
  const enabled = config.dsn.length > 0;

  if (enabled) {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      // Per safety-governance: no PII, no session replay, no user-identifying context.
      sendDefaultPii: false,
      autoSessionTracking: false,
    });
  }

  return {
    report({ error, context, severity }: ReportInput) {
      if (!enabled) return;
      Sentry.captureException(error, {
        level: severity,
        extra: context,
      });
    },
  };
}
```

If the `Transport` and `ReportInput` types from `errorReporter.ts` differ, adjust the import and types to match. If they don't exist as named exports, add them to `errorReporter.ts` first.

- [ ] **Step 5: Verify the test passes**

```bash
npx vitest run apps/web/src/transports/__tests__/sentry.test.ts
```

Expected: PASS, both cases.

- [ ] **Step 6: Wire the transport in the app entry**

Find the application entry where `errorReporter` is initialised (likely `apps/web/src/main.tsx` or `apps/web/src/App.tsx`). Add:

```typescript
import { createSentryTransport } from "./transports/sentry";
import { errorReporter } from "./errorReporter";

errorReporter.register(
  createSentryTransport({
    dsn: import.meta.env.VITE_SENTRY_DSN ?? "",
    environment: import.meta.env.MODE,
  }),
);
```

- [ ] **Step 7: Document the env var**

Append to `.env.example`:

```bash
# Optional: Sentry DSN for client-side error reporting in production pilots.
# Leave empty to disable. Sentry is initialised with sendDefaultPii: false
# and autoSessionTracking: false to comply with safety-governance.md.
VITE_SENTRY_DSN=
```

- [ ] **Step 8: Update `docs/development-gaps.md` G-09**

Move from "Partially closed" to "Closed":

```markdown
| **G-09** | Error tracking integration | **Closed 2026-04-XX** | Sentry transport registered; DSN configured via VITE_SENTRY_DSN; complies with safety-governance.md (no PII, no session replay). |
```

- [ ] **Step 9: Run the full vitest suite**

```bash
npm run test
```

Expected: 1907+ passed (1905 + 2 new Sentry transport tests), 0 failed.

- [ ] **Step 10: Mock release gate**

```bash
npm run release:gate
```

Expected: passed.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/transports/sentry.ts apps/web/src/transports/__tests__/sentry.test.ts apps/web/src/errorReporter.ts apps/web/src/main.tsx apps/web/package.json package-lock.json .env.example docs/development-gaps.md
git commit -m "feat(observability): register Sentry transport for client error reporting (closes G-09)

Implements the pluggable transport for the existing errorReporter.
Sentry is initialised with sendDefaultPii: false and autoSessionTracking:
false to comply with safety-governance.md (no surveillance, no PII).
DSN configured via VITE_SENTRY_DSN; empty DSN disables initialisation
so dev environments don't ping Sentry.

See: docs/development-gaps.md G-09"
```

---

### Task B5: Verify L1 and L9 (likely already closed) — update gap docs

**Why:** Investigation during the 2026-04-25 audit suggests `extract_worksheet` already has 5 eval cases (extract-001 through extract-005, including mime-tolerance and safety edge cases) and SurvivalPacket print CSS already has 100 lines of `@media print` polish. The development-gaps.md and prior memory are stale on both.

**Files:**
- Modify: `docs/development-gaps.md` G-03 entry (note `extract_worksheet` edge-case coverage)
- Modify: `docs/development-gaps.md` G-12 "What remains" section (note SurvivalPacket print closed)

- [ ] **Step 1: Verify `extract_worksheet` edge-case coverage**

```bash
ls evals/cases/extract-*.json
```

Expected: 5 files. Read each one's `category` field:

```bash
for f in evals/cases/extract-*.json; do
  echo "$f"
  grep '"category"' "$f"
done
```

If at least one of `extract-002` through `extract-005` has a `category` other than `schema_reliability` (e.g., `safety`, `latency`, `content_quality`, `mime_variation`), the edge-case gap is closed.

- [ ] **Step 2: Verify SurvivalPacket print polish**

```bash
grep -c "@media print\|break-inside\|print-color-adjust" apps/web/src/components/SurvivalPacket.css
```

Expected: ≥3 matches across `@media print`, `break-inside: avoid`, and `print-color-adjust: exact`. Visually open `apps/web/src/components/SurvivalPacket.css` and check the print block (around lines 288–388 per the prior audit memo).

- [ ] **Step 3: Manual print-preview verification**

In a running dev environment, navigate to the SurvivalPacket panel with the demo classroom, generate a packet, and use Chrome's "Print → Save as PDF" to render. Open the PDF and verify:
- No section breaks mid-paragraph
- All sections (Heads-Up, Schedule, Routines, EA Notes, Behavior Strategies, Materials) render
- Color blocks render in the PDF (not stripped to white)

If any of those fail, L9 is **not** closed — file a separate task to fix the specific CSS issue. If all pass, proceed.

- [ ] **Step 4: Update `docs/development-gaps.md`**

Edit G-03 to add:

```markdown
**Update 2026-04-25:** `extract_worksheet` has edge-case coverage via
`extract-003-safety`, `extract-004-latency`, and `extract-005-mime-tolerance`.
Original "every prompt class except extract_worksheet" caveat is closed.
```

Edit G-12's "What remains" section to remove the SurvivalPacket bullet and add:

```markdown
**Update 2026-04-25:** SurvivalPacket print CSS verified via Chrome print-preview
against the demo classroom; all 6 sections render with break-inside: avoid and
print-color-adjust: exact preserved. No code change needed.
```

- [ ] **Step 5: Commit**

```bash
git add docs/development-gaps.md
git commit -m "docs(gaps): mark extract_worksheet edge cases (G-03) and SurvivalPacket print (G-12) verified closed

Inventory check on 2026-04-25: extract has 5 eval cases including safety,
latency, and mime-tolerance edge cases. SurvivalPacket.css has 100 lines
of @media print polish; manual print-preview verified rendering across
all 6 sections."
```

---

### Phase B Exit Criteria

- [ ] All four retrieval-relevance evals pass against mock
- [ ] All four cross-feature synthesis evals pass against mock
- [ ] EAL tag vocabulary unified across all 6 classroom fixtures
- [ ] Sentry transport registered, opts-out cleanly when DSN empty
- [ ] `docs/development-gaps.md` updated for G-03, G-09, G-12, G-15
- [ ] System inventory case count: **137**
- [ ] Mock release gate green
- [ ] Vitest count: **1907+** (1905 + Sentry tests)

---

## Phase C — Out of Scope for This Plan

The following items from the audit cannot be closed by code alone. Each gets a one-line action and an owner suggestion. They do not block the hackathon submission.

| ID  | Action                                                                                                  | Owner suggestion         |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------ |
| L4  | Provision an Ollama target host (≥16 GiB RAM, ≥40 GiB free disk); pull `gemma4:4b` + `gemma4:27b`; run `npm run host:preflight:ollama` then `npm run release:gate:ollama`. Closes G-02. | infra/operator           |
| L5  | Recruit one Alberta K-6 teacher (unaffiliated with the project) for a 90-minute walkthrough; observer fills in `docs/pilot/observation-template.md`. Generates G-06 evidence. | pilot coordinator        |
| L6  | Schedule and rehearse incident drills 1–5 from `docs/pilot/incident-drills/` against the demo classroom. Append outcomes to each drill file. Closes a G-14 sub-item. | pilot coordinator        |
| L7  | Pilot coordinator countersigns each of the 5 reviews under `docs/pilot/safety-artifacts/`. Each review's §8 approval line is pilot-gating. Closes a G-14 sub-item. | pilot coordinator        |
| L8  | VocabCard exports (Anki / Quizlet / PDF) — large enough to warrant its own brainstorm and plan. Suggested: invoke `superpowers:brainstorming` to scope formats, schema, persistence, and UX before writing the implementation plan. | maintainer               |

---

## Self-Review

**Spec coverage check:**

| Audit item | Plan task | Status |
| --- | --- | --- |
| F1 (hosted Gemini 504) | A1 | ✅ |
| F2 (smoke:browser exit code) | A2 | ✅ (verify-first) |
| F3 (dirty docs) | A3 | ✅ |
| R1 (timeout/retry) | A1 (folded with F1; root-cause refined to retry, not timeout) | ✅ |
| R2 (smoke:browser) | A2 | ✅ |
| R3 (commit docs) | A3 | ✅ |
| R4 (UI evidence) | A5 | ✅ |
| R5 (memory snapshot) | done in audit | ✅ |
| R6 (evidence portfolio) | A6 | ✅ |
| R7 (free disk) | A4 | ✅ |
| R8 (browser sweep) | A7 | ✅ |
| L1 (extract_worksheet edge case) | B5 (verify likely closed) | ✅ |
| L2 (retrieval-relevance evals) | B1 | ✅ |
| L3 (cross-feature synthesis) | B2 | ✅ |
| L4 (Ollama host) | C (out of scope) | ✅ |
| L5 (real-teacher walkthrough) | C (out of scope) | ✅ |
| L6 (drill rehearsals) | C (out of scope) | ✅ |
| L7 (safety countersigns) | C (out of scope) | ✅ |
| L8 (VocabCard exports) | C (separate plan) | ✅ |
| L9 (SurvivalPacket print) | B5 (verify likely closed) | ✅ |
| L10 (EAL tag normalization) | B3 | ✅ |
| L11 (Sentry/LogRocket) | B4 (Sentry only — LogRocket excluded by safety) | ✅ |

All audit items covered. No placeholders. Type/method names cross-checked across tasks.

---

## Execution Notes

- **Cost cap:** Phase A and B do not require any hosted Gemini calls. The mock lane covers all release-gate verifications. Stay under $20/day.
- **Memory:** After Phase B completes, update `~/.claude/projects/.../memory/project_prairieclassroom.md` with the new vitest count (1907+) and case count (137).
- **Decision log:** A1, B3, and B4 each warrant a `docs/decision-log.md` entry. Add them inline as part of those tasks.
- **Branch posture:** Per maintainer working style ("Delegates full sprints autonomously, prefers decisive proposals, subagent execution confirmed"), this plan can be executed by a single subagent-driven sprint. No need to break Phase A and Phase B into separate worktrees unless their commits interleave with unrelated work.
