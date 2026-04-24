# World-Class UI Polish — Verification & Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that every task and quality intent from `docs/superpowers/plans/2026-04-23-world-class-ui-polish.md` was delivered completely and to production quality; surface, classify, and fix any gaps, drift, partial implementations, or silent-regressions before declaring the 6-phase sprint shipped.

**Architecture:** Seven verification phases. V1-V6 mirror the six implementation phases one-for-one — each verifies evidence, checks spec conformance, runs tests, and applies refinements where quality falls short of the intent. V7 is a cross-cutting final gate: release gate, manual viewport sweep, accessibility, dark-mode toggle, keyboard flows, bundle sanity. Every phase is independently runnable and ends with the same `typecheck && test && check:contrast` gate the implementation plan used.

**Tech Stack:** No new dependencies. All checks use existing tooling: `grep`, `rg`, `ls`, `git log`, `npm run typecheck`, `npm run test`, `npm run check:contrast`, `npm run release:gate`, `npx vitest`. Manual visual checks require `npm run dev` and a browser.

---

## Context for a fresh session

Before starting, read these in order — they are load-bearing:

1. **`CLAUDE.md`** — product boundaries, cost guardrails, validation rules
2. **`docs/superpowers/plans/2026-04-23-world-class-ui-polish.md`** — the plan whose completion this document verifies
3. **`docs/dark-mode-contract.md`** — canonical color system (required for Phase 5 chart-tone verification)
4. **`apps/web/src/styles/tokens.css`** — 127+ design tokens; verification includes token-existence grep
5. **`docs/decision-log.md`** (top of file) — should contain 6 dated entries for 2026-04-23 (one per phase)
6. **`docs/development-gaps.md`** — G-16 should show "Closed 2026-04-24"

### Known baseline findings (initial audit 2026-04-24)

| ID | Phase | Finding | Severity |
|---|---|---|---|
| V1-gap-001 | 1 | 4 stale `var(--shell-control-h, var(--control-h-md))` fallback references remain in `page-tool-switcher.css` (lines 32, 368), `RoleContextPill.css:10`, `TomorrowChip.css:8`. Phase 1 Task 1.2's grep-check was only scoped to `shell.css`, missing these. Currently work via fallback; represent fragile tech debt. | Medium — tech debt, not user-facing regression |

All other baseline checks passed on 2026-04-24 reconnaissance:
- `MultiToolHero` fully retired (0 refs in `apps/web/src`)
- `PageHero` imported in 4 panels (Classroom, Ops, Prep, Review)
- 5 new test files exist (HeaderAction, PageHero, ToolSwitcherStepper, MondayResetMoment, useZoneDisclosure)
- 5 new component files exist (same set)
- `--chart-tone-low / medium / high` tokens and their -bg variants exist at `tokens.css:217-222`
- `--color-forecast-*` compat aliases exist at `tokens.css:226-233`
- `--font-editorial` token exists at `tokens.css:379`
- `apps/web/public/fonts/source-serif-4-variable.woff2` exists
- `docs/decision-log.md` has 6 dated 2026-04-23 entries (Shell, PageHero, Composition, Today polish, Editorial, Motion)
- `docs/development-gaps.md` G-16 shows "Closed 2026-04-24"

### Verification ground rules

- **Evidence before assertion.** Every "fixed" / "verified" claim must have a paired grep/test output in the commit body or checklist comment. No "looks right" without a command.
- **Narrow scope per phase.** Fix only what fails conformance for that phase. Adjacent polish goes on a follow-up list in `docs/development-gaps.md`, not into this plan's commits.
- **Token discipline.** Every token referenced in this plan's fixes must be grep-confirmed present in `apps/web/src/styles/tokens.css` before use. Invented tokens silently fail.
- **Frequent commits.** Every fix or refinement lands its own commit. Pure verification that finds nothing gets no commit — but the verifier records the commands + outputs in the task checkbox comment or a brief note on the PR.
- **No scope creep.** This plan is not the place to introduce new features. If a quality gap suggests new work, append to `docs/development-gaps.md` as a new gap and move on.

---

## File structure summary

### Files potentially modified by fixes

| Path | Why it might be touched |
|---|---|
| `apps/web/src/styles/page-tool-switcher.css` | Remove 2 stale `--shell-control-h` fallbacks (V1-gap-001) |
| `apps/web/src/components/RoleContextPill.css` | Remove 1 stale `--shell-control-h` fallback (V1-gap-001) |
| `apps/web/src/components/TomorrowChip.css` | Remove 1 stale `--shell-control-h` fallback (V1-gap-001) |
| `apps/web/src/panels/*Panel.tsx` | Only if a verification step surfaces a gap per phase |
| `apps/web/src/components/shared/PageHero.tsx` | Only if pulse-gating / variant / prop coverage fails V2 / V3 |
| `apps/web/src/styles/tokens.css` | Only if a motion-alias gap surfaces in V6 |
| `docs/development-gaps.md` | Append follow-up items surfaced by verification (non-blocking) |
| `docs/decision-log.md` | Only if a verification-triggered fix warrants a new dated entry |

### Files NOT touched

No new primitives, no new hooks, no new test files unless a spec-required test is missing (in which case the plan explicitly calls for creating it). This is verification + refinement, not net-new work.

---

# Phase V1 — Shell coherence verification

**Implementation reference:** `2026-04-23-world-class-ui-polish.md` Phase 1 (Tasks 1.1–1.6)

**What this phase verifies:**
1. Canonical control heights (`--control-h-md: 44px` and `--control-h-lg: 52px`) replaced `--shell-control-h` (49.6px) and `--shell-nav-h` (63.2px) throughout `apps/web/src`, not just `shell.css`.
2. `HeaderAction` primitive exists with 4 passing tests and the documented props (label, onClick, kbd, iconOnly, children, data-testid).
3. Palette and help chips in `App.tsx` migrated to `HeaderAction`; label changed from "Jump to" → "Search".
4. `.app-header__inner` collapses to single-row flex layout at `≥1280px`.
5. Decision-log entry dated 2026-04-23 exists for "Shell coherence pass".

### Task V1.1 — Confirm no stale shell-specific control-height tokens remain

**Files:**
- Check: All files under `apps/web/src`

- [ ] **Step 1: Grep for stale references**

Run:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
grep -rn "shell-control-h\|shell-nav-h" apps/web/src
```

Expected after Phase 1 spec intent: empty output.
Actual (2026-04-24 baseline): 4 references:
- `apps/web/src/styles/page-tool-switcher.css:32` — `min-height: var(--shell-control-h, var(--control-h-md));`
- `apps/web/src/styles/page-tool-switcher.css:368` — `min-height: var(--shell-control-h, var(--control-h-md));`
- `apps/web/src/components/RoleContextPill.css:10` — `min-height: var(--shell-control-h, var(--control-h-md));`
- `apps/web/src/components/TomorrowChip.css:8` — `min-height: var(--shell-control-h, var(--control-h-md));`

- [ ] **Step 2: Confirm the token `--shell-control-h` no longer resolves**

Run:
```bash
grep -n "^\s*--shell-control-h\s*:\|^\s*--shell-nav-h\s*:" apps/web/src/styles
```

Expected: empty (token definitions retired in Phase 1 Task 1.2).

If non-empty: the token is still being re-declared somewhere — stop and inspect before fixing call sites.

### Task V1.2 — Fix the 4 stale `--shell-control-h` fallback references

**Files:**
- Modify: `apps/web/src/styles/page-tool-switcher.css:32`
- Modify: `apps/web/src/styles/page-tool-switcher.css:368`
- Modify: `apps/web/src/components/RoleContextPill.css:10`
- Modify: `apps/web/src/components/TomorrowChip.css:8`

- [ ] **Step 1: Read the surrounding context for each site** to confirm the intent is a control-chip height (44px) not a nav-tab height (52px). All four are chip-like controls — `--control-h-md` is correct.

Run (for each file):
```bash
sed -n '28,36p' apps/web/src/styles/page-tool-switcher.css
sed -n '364,372p' apps/web/src/styles/page-tool-switcher.css
sed -n '6,14p' apps/web/src/components/RoleContextPill.css
sed -n '4,12p' apps/web/src/components/TomorrowChip.css
```

Expected: each site uses the height for a chip / pill / button row consistent with `--control-h-md` (44px).

- [ ] **Step 2: Replace each stale reference.** For all four sites, replace:

```css
min-height: var(--shell-control-h, var(--control-h-md));
```

with:

```css
min-height: var(--control-h-md);
```

Exact Edit tool operations (4 edits, one per file):
  - `apps/web/src/styles/page-tool-switcher.css` — `replace_all` of the literal string `var(--shell-control-h, var(--control-h-md))` → `var(--control-h-md)`
  - `apps/web/src/components/RoleContextPill.css` — single replacement
  - `apps/web/src/components/TomorrowChip.css` — single replacement

- [ ] **Step 3: Verify no stale references remain**

Run:
```bash
grep -rn "shell-control-h\|shell-nav-h" apps/web/src
```

Expected: empty.

- [ ] **Step 4: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web`
Expected: green. No test should depend on the stale tokens.

- [ ] **Step 5: Manual visual check**

Start dev server: `npm run dev -w apps/web`. Open `http://localhost:5173`. Verify:
- Tool switcher chips (visit Prep, Ops, Review pages) render at the same height as before — 44px.
- RoleContextPill (header) renders at 44px, aligned with palette/help chips.
- TomorrowChip (Today page, "Save to Tomorrow") renders at 44px.

If any chip visibly shrinks or grows, the fallback was masking a deeper issue — inspect `--control-h-md` value in `tokens.css` and compare to the previous `3.1rem` (49.6px).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/styles/page-tool-switcher.css \
        apps/web/src/components/RoleContextPill.css \
        apps/web/src/components/TomorrowChip.css
git commit -m "refactor(shell): remove stale --shell-control-h fallbacks in chip components

Completes Phase 1 Task 1.2 from 2026-04-23-world-class-ui-polish.md.
The original grep-check was scoped to shell.css and missed these four
call sites that relied on CSS var() fallback syntax. The tokens
--shell-control-h and --shell-nav-h were retired in that phase; all
consumers now use canonical --control-h-md directly."
```

### Task V1.3 — Verify `HeaderAction` component contract

**Files:**
- Read: `apps/web/src/components/shared/HeaderAction.tsx`
- Read: `apps/web/src/components/shared/HeaderAction.css`
- Read: `apps/web/src/components/shared/__tests__/HeaderAction.test.tsx`

- [ ] **Step 1: Confirm all 4 tests from plan Task 1.3 exist and pass**

Run:
```bash
npx vitest run apps/web/src/components/shared/__tests__/HeaderAction.test.tsx
```

Expected: PASS (4 tests: renders label; exposes accessible name in iconOnly; invokes onClick; renders kbd).

If a test is missing: add from plan Task 1.3 Step 1 verbatim.

- [ ] **Step 2: Confirm the component Props match spec**

Read `apps/web/src/components/shared/HeaderAction.tsx`. Required Props interface:

```ts
interface Props {
  label: string;
  onClick: () => void;
  kbd?: string;
  iconOnly?: boolean;
  children?: ReactNode;
  "data-testid"?: string;
}
```

If any prop is missing or renamed: restore the original spec signature (Plan Task 1.3 Step 3) — downstream consumers depend on this API.

- [ ] **Step 3: Verify CSS uses only documented tokens**

Run:
```bash
grep -oE "var\(--[a-z0-9-]+" apps/web/src/components/shared/HeaderAction.css | sort -u
```

Every token in the output should exist in `apps/web/src/styles/tokens.css`. Spot-check each:

```bash
for t in $(grep -oE "var\(--[a-z0-9-]+" apps/web/src/components/shared/HeaderAction.css | sed 's/var(//' | sort -u); do
  grep -q "^\s*$t:" apps/web/src/styles/tokens.css && echo "OK  $t" || echo "MISS $t"
done
```

Expected: all lines start with `OK`. If any `MISS`: the token is invented — either add it to `tokens.css` (rare, needs decision-log) or replace with an existing token.

- [ ] **Step 4: No commit unless a gap was found.** Verification-only.

### Task V1.4 — Verify `App.tsx` shell chip migration and label rename

**Files:**
- Read: `apps/web/src/App.tsx`

- [ ] **Step 1: Confirm HeaderAction import**

Run:
```bash
grep -n "from.*HeaderAction" apps/web/src/App.tsx
```

Expected: one import line like `import HeaderAction from "./components/shared/HeaderAction";`.

- [ ] **Step 2: Confirm palette and help chips use HeaderAction**

Run:
```bash
grep -n "HeaderAction" apps/web/src/App.tsx
```

Expected: at least 3 lines — the import, the `<HeaderAction label="Search"` for the palette, and `<HeaderAction ... iconOnly` for help.

- [ ] **Step 3: Confirm "Jump to" label is retired**

Run:
```bash
grep -rn "Jump to" apps/web/src
```

Expected: zero user-facing instances. If any remain in test files or comments, check they are not live strings.

- [ ] **Step 4: Confirm "Search" + `⌘K` hint is present**

Run:
```bash
grep -n "label=\"Search\"\|kbd=\"⌘K\"" apps/web/src/App.tsx
```

Expected: at least one line containing `label="Search"` and one containing `kbd="⌘K"` (likely same JSX block).

- [ ] **Step 5: Verify smoke tests updated**

Run:
```bash
grep -rn "Jump to\|jump-to" apps/web tests e2e 2>/dev/null | grep -v node_modules
```

Expected: zero live assertions on the old label. If any, update to match "Search".

- [ ] **Step 6: No commit unless a gap was found.**

### Task V1.5 — Verify single-row header at ≥1280px

**Files:**
- Read: `apps/web/src/styles/shell.css`

- [ ] **Step 1: Confirm the `@media (min-width: 1280px)` block exists**

Run:
```bash
grep -n "min-width: 1280px" apps/web/src/styles/shell.css
```

Expected: at least one line inside a `.app-header__inner` or `.shell-bar` block.

- [ ] **Step 2: Confirm the block sets `flex-direction: row` on `.app-header__inner`**

Run:
```bash
awk '/@media \(min-width: 1280px\)/,/^}$/' apps/web/src/styles/shell.css | head -40
```

Expected: the block contains `flex-direction: row;` and `display: contents;` on `.shell-bar`.

- [ ] **Step 3: Manual viewport sweep (required)**

Start dev server: `npm run dev -w apps/web`. Open `http://localhost:5173` in a browser DevTools window. Step through breakpoints:

- 1440px — header: brand + classroom pill + nav + action chips on ONE row. Log a screenshot to `output/verification/2026-04-24/header-1440.png` if possible; otherwise note visual result in the commit body.
- 1280px — header still single-row (edge case — should not wrap).
- 1200px — header flips to two rows; nav sits on its own row.
- 800px — mobile fallback; chips collapse, no overlap.

If any breakpoint shows overlap, wrap, or missing chips — open DevTools, inspect which chip is overflowing, and report. This is a visual regression blocker.

- [ ] **Step 4: No commit unless a regression was found.**

### Task V1.6 — Verify Phase 1 decision-log entry

**Files:**
- Read: `docs/decision-log.md`

- [ ] **Step 1: Confirm the entry exists**

Run:
```bash
grep -n "Shell coherence pass" docs/decision-log.md
```

Expected: one line near the top of the file (around line 66 per baseline audit).

- [ ] **Step 2: Read the entry for completeness**

The entry must include: Decision, Why, Alternatives, Consequences, What would change this. All five sections present.

Run:
```bash
awk '/Shell coherence pass/,/^---$|^### 2026/' docs/decision-log.md | head -20
```

Expected: the 2026-04-23 entry with all five sections.

- [ ] **Step 3: No commit unless the entry is missing or malformed.**

### Phase V1 validation gate

- [ ] **Run the full frontend lane**

```bash
npm run typecheck && npm run test -- apps/web && npm run check:contrast
```

Expected: all green. If red, investigate root cause before proceeding.

---

# Phase V2 — `PageHero` primitive verification

**Implementation reference:** `2026-04-23-world-class-ui-polish.md` Phase 2 (Tasks 2.1–2.7)

**What this phase verifies:**
1. `MultiToolHero` component, CSS, and all `multi-tool-hero` class references are fully retired.
2. `PageHero` primitive exists with 5 passing tests and supports all spec'd props: eyebrow, title, description, pulse, metrics, pivots, actions, variant, id, ariaLabel.
3. Variant CSS exists for classroom / prep / ops / review / week (5 variants).
4. OpsPanel, PrepPanel, ReviewPanel, ClassroomPanel all migrated to PageHero.
5. `.classroom-hero*` / `.classroom-pivot*` CSS fully removed from ClassroomPanel.css.
6. `.multi-tool-hero*` CSS fully removed from multi-tool-page.css.
7. Decision-log entry dated 2026-04-23 exists for "PageHero primitive extraction".

### Task V2.1 — Verify MultiToolHero retirement

**Files:**
- Check: entire `apps/web/src`

- [ ] **Step 1: Grep for any MultiToolHero import or reference**

Run:
```bash
grep -rn "MultiToolHero\|multi-tool-hero" apps/web/src
```

Expected (2026-04-24 baseline confirmed): empty.

- [ ] **Step 2: Confirm the source file is deleted**

Run:
```bash
ls apps/web/src/components/MultiToolHero.tsx apps/web/src/components/MultiToolHero.css 2>&1
```

Expected: both `No such file or directory`.

- [ ] **Step 3: Confirm the CSS class block is removed from multi-tool-page.css**

Run:
```bash
grep -n "multi-tool-hero" apps/web/src/styles/multi-tool-page.css
```

Expected: empty.

- [ ] **Step 4: Confirm tool-switcher + workspace-section rules are preserved**

Run:
```bash
grep -cn "page-tool-switcher\|multi-tool-workspace-section\|multi-tool-page" apps/web/src/styles/multi-tool-page.css
```

Expected: count > 0 — these rules survived the purge per plan Task 2.6 Step 3.

- [ ] **Step 5: No commit unless a stray reference is found.**

### Task V2.2 — Verify `PageHero` component contract

**Files:**
- Read: `apps/web/src/components/shared/PageHero.tsx`
- Read: `apps/web/src/components/shared/PageHero.css`

- [ ] **Step 1: Confirm 5 tests exist and pass**

Run:
```bash
npx vitest run apps/web/src/components/shared/__tests__/PageHero.test.tsx
```

Expected: PASS (5 tests):
1. renders eyebrow, title, description
2. renders pulse when provided
3. renders metrics grid when provided
4. renders pivots and fires onClick
5. applies variant-specific class for ops

If any test is missing, add verbatim from plan Task 2.2 Step 1.

- [ ] **Step 2: Confirm the exported types**

Run:
```bash
grep -E "^(export|interface|type)" apps/web/src/components/shared/PageHero.tsx
```

Expected exports: `PageHeroPulseTone`, `PageHeroVariant`, `PageHeroPulse`, `PageHeroPivot`, `PageHeroMetric`, `default (PageHero)`.

If `PageHeroPulse` is not exported, downstream panels importing it break — this is a V2-blocker.

- [ ] **Step 3: Confirm Props interface matches spec**

Required fields:
- `eyebrow: string`
- `title: string`
- `description?: ReactNode`
- `pulse?: PageHeroPulse`
- `metrics?: PageHeroMetric[]`
- `pivots?: PageHeroPivot[]`
- `actions?: ReactNode`
- `variant?: PageHeroVariant`
- `id?: string`
- `ariaLabel?: string`

Read the Props interface end-to-end. Mismatches are V2-blockers.

- [ ] **Step 4: Confirm all 5 variant classes exist**

Run:
```bash
grep -E "^\.page-hero--(classroom|prep|ops|review|week)" apps/web/src/components/shared/PageHero.css
```

Expected: 4+ lines (classroom is the default; prep/ops/review/week each need their own `--page-hero-rule`, `--page-hero-eyebrow`, `--page-hero-glow` triplet).

If `page-hero--classroom` is missing, confirm the base `.page-hero` selector captures the classroom variant's default tokens; if `page-hero--week` or other is missing, that variant is unstyled — open the file and add the missing block per plan Task 2.2 CSS.

- [ ] **Step 5: Token discipline check**

Run:
```bash
for t in $(grep -oE "var\(--[a-z0-9-]+" apps/web/src/components/shared/PageHero.css | sed 's/var(//' | sort -u); do
  grep -q "^\s*$t:" apps/web/src/styles/tokens.css && echo "OK  $t" || echo "MISS $t"
done
```

Expected: all `OK`. Any `MISS` is a silent-failure risk.

Note: tokens like `--_pulse-tone` starting with underscore are local CSS custom properties (scoped to the `.page-hero` rule) — those are OK as defined locally; the script above will flag them as `MISS` but that's a false positive.

### Task V2.3 — Verify panel migrations to `PageHero`

**Files:**
- Read: `apps/web/src/panels/OpsPanel.tsx`
- Read: `apps/web/src/panels/PrepPanel.tsx`
- Read: `apps/web/src/panels/ReviewPanel.tsx`
- Read: `apps/web/src/panels/ClassroomPanel.tsx`

- [ ] **Step 1: Confirm imports**

Run:
```bash
grep -n "from.*shared/PageHero" apps/web/src/panels/OpsPanel.tsx apps/web/src/panels/PrepPanel.tsx apps/web/src/panels/ReviewPanel.tsx apps/web/src/panels/ClassroomPanel.tsx
```

Expected: 4 lines, one per file.

Baseline audit 2026-04-24 confirmed ✅:
- `OpsPanel.tsx:9` ← `PageHero, { type PageHeroPulse }`
- `PrepPanel.tsx:9` ← `PageHero, { type PageHeroPulse }`
- `ReviewPanel.tsx:9` ← `PageHero, { type PageHeroPulse }`
- `ClassroomPanel.tsx:20` ← `PageHero`

- [ ] **Step 2: Confirm no panel still references `MultiToolHero`**

Already covered in V2.1 Step 1 (empty grep result).

- [ ] **Step 3: Confirm each panel passes `variant` correctly**

Run:
```bash
grep -n 'variant="' apps/web/src/panels/OpsPanel.tsx apps/web/src/panels/PrepPanel.tsx apps/web/src/panels/ReviewPanel.tsx apps/web/src/panels/ClassroomPanel.tsx | grep -E 'variant="(ops|prep|review|classroom|week)"'
```

Expected: 4 lines matching their respective variant name.

If any panel passes no variant, the hero renders with default classroom styling — not a compile error but a visual regression. Fix by adding the variant prop per plan Task 2.3–2.5.

- [ ] **Step 4: Confirm ClassroomPanel uses `pivots` prop**

Run:
```bash
grep -n "pivots={" apps/web/src/panels/ClassroomPanel.tsx
```

Expected: one line with the pivots array (Today, Tomorrow, Week — 3 pivots).

- [ ] **Step 5: Confirm ClassroomPivot sub-component and old JSX deleted**

Run:
```bash
grep -n "ClassroomPivot\|classroom-hero\|classroom-pivot" apps/web/src/panels/ClassroomPanel.tsx
```

Expected: empty (sub-component deleted per plan Task 2.5 Step 3).

- [ ] **Step 6: Confirm `.classroom-hero*` CSS removed**

Run:
```bash
grep -n "^\.classroom-hero\|^\.classroom-pivot" apps/web/src/panels/ClassroomPanel.css
```

Expected: empty.

- [ ] **Step 7: Tests for panel migrations**

Run:
```bash
npx vitest run apps/web/src/panels/__tests__/OpsPanel.test.tsx apps/web/src/panels/__tests__/PrepPanel.test.tsx apps/web/src/panels/__tests__/ReviewPanel.test.tsx apps/web/src/panels/__tests__/ClassroomPanel.test.tsx 2>&1 | tail -20
```

Expected: green. If any panel has no test file, that's an existing condition — this plan does not require adding new panel tests; file a follow-up in `docs/development-gaps.md` if coverage is a concern.

### Task V2.4 — Verify decision-log entry for Phase 2

- [ ] **Step 1: Confirm the entry**

Run:
```bash
grep -n "PageHero primitive extraction" docs/decision-log.md
```

Expected: one line (baseline audit: line 56 of decision-log.md).

- [ ] **Step 2: Read the entry for completeness** (Decision, Why, Alternatives, Consequences, What would change this — all 5 sections).

### Phase V2 validation gate

- [ ] **Run the full frontend lane**

```bash
npm run typecheck && npm run test -- apps/web && npm run check:contrast
```

Expected: green.

---

# Phase V3 — Page composition & progressive disclosure verification

**Implementation reference:** `2026-04-23-world-class-ui-polish.md` Phase 3 (Tasks 3.1–3.6)

**What this phase verifies:**
1. `useZoneDisclosure` hook exists with 4 tests (default closed, default open, toggle+persist, scope).
2. ClassroomPanel wraps Intel + Roster zones in `<details>` with hook-backed state.
3. `ToolSwitcherStepper` component exists with 3 tests (dot count, active dot, aria label).
4. Stepper is mounted on OpsPanel, PrepPanel, ReviewPanel between the tool switcher and workspace.
5. PageHero pulse-dot animation is gated to React state changes (3 iterations on change, idle otherwise).
6. Decision-log entry dated 2026-04-23 exists for "Page composition pass".

### Task V3.1 — Verify `useZoneDisclosure` hook

**Files:**
- Read: `apps/web/src/hooks/useZoneDisclosure.ts`
- Read: `apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx`

- [ ] **Step 1: Confirm file exists**

Run:
```bash
ls apps/web/src/hooks/useZoneDisclosure.ts apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx
```

Expected: both files exist. Baseline 2026-04-24: ✅ both present.

- [ ] **Step 2: Run the 4 tests**

Run:
```bash
npx vitest run apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx
```

Expected: PASS (4 tests):
1. defaults to collapsed when no persisted state
2. defaults to open when defaultOpen is true
3. toggles and persists to localStorage
4. scopes persistence per key+zone

If any test is missing or failing, restore from plan Task 3.1 Step 1.

- [ ] **Step 3: Confirm the storage key format**

Run:
```bash
grep -n "prairie:disclosure" apps/web/src/hooks/useZoneDisclosure.ts
```

Expected: `prairie:disclosure:${pageKey}:${zoneKey}` format. Any deviation breaks the scoping test.

- [ ] **Step 4: Confirm SSR-safe localStorage access (try/catch)**

Run:
```bash
grep -c "try {" apps/web/src/hooks/useZoneDisclosure.ts
```

Expected: ≥ 2 (one for read in useState initializer, one for write in useEffect).

### Task V3.2 — Verify ClassroomPanel zone disclosure

**Files:**
- Read: `apps/web/src/panels/ClassroomPanel.tsx`
- Read: `apps/web/src/panels/ClassroomPanel.css`

- [ ] **Step 1: Confirm hook import and usage**

Run:
```bash
grep -n "useZoneDisclosure" apps/web/src/panels/ClassroomPanel.tsx
```

Expected: at least 3 lines — one import and two usages (intelDisclosure, rosterDisclosure).

- [ ] **Step 2: Confirm `<details>` + `<summary>` present for Intel and Roster zones**

Run:
```bash
grep -nc "<details" apps/web/src/panels/ClassroomPanel.tsx
grep -nc "classroom-zone__summary" apps/web/src/panels/ClassroomPanel.tsx
```

Expected: `<details` count ≥ 2; `classroom-zone__summary` count ≥ 2.

If either is 0, the disclosure never renders; open the panel and compare against plan Task 3.2 Steps 3-4.

- [ ] **Step 3: Confirm default-closed (`defaultOpen: false`)**

Run:
```bash
grep -n "defaultOpen" apps/web/src/panels/ClassroomPanel.tsx
```

Expected: two lines, both showing `defaultOpen: false`. Plan intent is progressive disclosure — default-open defeats the purpose.

- [ ] **Step 4: Confirm CSS for `.classroom-zone--collapsible`**

Run:
```bash
grep -n "^\.classroom-zone--collapsible\|^\.classroom-zone__summary" apps/web/src/panels/ClassroomPanel.css
```

Expected: ≥ 3 lines (the base rule, `[open]`, and `__summary`).

- [ ] **Step 5: Manual interaction check (required)**

Start dev server. Navigate to Classroom tab. Verify:
- Hero + pulse + watchlist + ops zones are visible.
- Intel + Roster zones show collapsed summaries.
- Click Intel summary → zone expands, Roster stays closed.
- Refresh page → Intel stays open for this classroom.
- Switch to another classroom → disclosure state is independent.

If disclosure state leaks across classrooms, the storage key likely doesn't include the classroomId — verify Task V3.1 Step 3 key format and the panel's hook call uses `` `classroom-${activeClassroom}` `` as the pageKey.

### Task V3.3 — Verify `ToolSwitcherStepper`

**Files:**
- Read: `apps/web/src/components/ToolSwitcherStepper.tsx`
- Read: `apps/web/src/components/ToolSwitcherStepper.css`

- [ ] **Step 1: Confirm 3 tests pass**

Run:
```bash
npx vitest run apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 2: Confirm Props interface** (total, activeIndex, label?) — read the TSX.

- [ ] **Step 3: Confirm `role="progressbar"` on the container** for a11y.

Run:
```bash
grep -n 'role="progressbar"' apps/web/src/components/ToolSwitcherStepper.tsx
```

Expected: one line. If missing, the a11y test from plan Task 3.3 Step 1 would fail.

- [ ] **Step 4: Token discipline**

Run:
```bash
for t in $(grep -oE "var\(--[a-z0-9-]+" apps/web/src/components/ToolSwitcherStepper.css | sed 's/var(//' | sort -u); do
  grep -q "^\s*$t:" apps/web/src/styles/tokens.css && echo "OK  $t" || echo "MISS $t"
done
```

Expected: all `OK`.

### Task V3.4 — Verify stepper mounts on Ops / Prep / Review

**Files:**
- Read: `apps/web/src/panels/OpsPanel.tsx`
- Read: `apps/web/src/panels/PrepPanel.tsx`
- Read: `apps/web/src/panels/ReviewPanel.tsx`

- [ ] **Step 1: Grep for stepper import + usage**

Run:
```bash
grep -n "ToolSwitcherStepper" apps/web/src/panels/OpsPanel.tsx apps/web/src/panels/PrepPanel.tsx apps/web/src/panels/ReviewPanel.tsx
```

Expected: at least 2 lines per panel (import + render), for 6 lines total.

- [ ] **Step 2: Confirm stepper sits between switcher and workspace**

For each panel, read the JSX around the `ToolSwitcherStepper` render and confirm it renders between the `page-tool-switcher` block and the `multi-tool-workspace-section` / workspace area.

If the stepper is placed above the switcher or below the workspace, the visual progression disappears; move it to the right slot per plan Task 3.4 Step 1.

- [ ] **Step 3: Confirm correct `total` and `activeIndex`**

Run:
```bash
grep -A 4 "<ToolSwitcherStepper" apps/web/src/panels/OpsPanel.tsx apps/web/src/panels/PrepPanel.tsx apps/web/src/panels/ReviewPanel.tsx
```

Expected: each render passes `total={OPS_TOOLS.length}` / `PREP_TOOLS.length` / `REVIEW_TOOLS.length` and `activeIndex={<arr>.indexOf(currentTool)}`.

If total is hardcoded (e.g. `total={4}`), the stepper silently desynchs when a tool is added/removed — fix by using the array length.

### Task V3.5 — Verify PageHero pulse React-gating

**Files:**
- Read: `apps/web/src/components/shared/PageHero.tsx`

- [ ] **Step 1: Confirm pulseKey state + useEffect**

Run:
```bash
grep -n "pulseKey\|pulseStateRef" apps/web/src/components/shared/PageHero.tsx
```

Expected: references to both `pulseStateRef` (useRef) and `pulseKey` (useState) plus a `useEffect` that watches `pulse?.state`.

If these are missing, the pulse-dot animation is the old infinite loop — apply plan Task 3.5 Steps 1-2.

- [ ] **Step 2: Confirm the `<span key={pulseKey}>` re-key in the render**

Run:
```bash
grep -B 1 -A 4 "page-hero__pulse-dot" apps/web/src/components/shared/PageHero.tsx | head -20
```

Expected: the dot `<span>` passes `key={pulseKey}` so React remounts it on state change and the 3-iteration keyframe restarts.

- [ ] **Step 3: Confirm CSS keyframe is 3-iteration, not infinite**

Run:
```bash
grep -A 2 "animation:.*page-hero-pulse-ring" apps/web/src/components/shared/PageHero.css
```

Expected: animation property ends with `3;` (iteration count), not `infinite`. Baseline: per plan Task 2.2, this was authored with 3 iterations.

- [ ] **Step 4: Confirm `@media (prefers-reduced-motion)` disables the ring**

Run:
```bash
grep -A 3 "prefers-reduced-motion" apps/web/src/components/shared/PageHero.css
```

Expected: a rule setting `.page-hero__pulse-dot--live::after { animation: none; }`.

### Task V3.6 — Verify Phase 3 decision-log entry

- [ ] **Step 1: Confirm entry**

Run:
```bash
grep -n "Page composition pass" docs/decision-log.md
```

Expected: one line (baseline: line 46).

### Phase V3 validation gate

- [ ] **Run the full frontend lane**

```bash
npm run typecheck && npm run test -- apps/web && npm run check:contrast
```

Expected: green.

---

# Phase V4 — Chart drill-downs (G-16) verification

**Implementation reference:** `2026-04-23-world-class-ui-polish.md` Phase 4 (Tasks 4.1–4.6)

**What this phase verifies:**
1. `PlanCoverageRadar.onSegmentClick` wired on TomorrowPlanPanel with `plan-coverage-section` context.
2. `VariantSummaryStrip.onSegmentClick` wired on DifferentiatePanel with `variant-lane` context.
3. `SupportPatternRadar.onSegmentClick` wired on SupportPatternsPanel with `student-tag-group` context.
4. `FollowUpSuccessRate.onSegmentClick` + `InterventionTimeline.onDotClick` both wired on InterventionPanel.
5. `DrillDownDrawer` mounted on all four panels (once per panel, not twice).
6. G-16 closed in `docs/development-gaps.md` with "Closed 2026-04-24" marker.
7. Helper functions defined where needed: `buildPlanCoverageSectionItems`, `deriveStudentTagGroup`, `mapInterventionsToDebtItems`.

### Task V4.1 — Confirm G-16 closure and audit the baseline wiring

**Files:**
- Read: `docs/development-gaps.md`

- [ ] **Step 1: Confirm G-16 row shows "Closed 2026-04-24"**

Run:
```bash
grep -n "G-16" docs/development-gaps.md | head -5
```

Expected (baseline 2026-04-24 ✅): one line showing `**Closed 2026-04-24**`.

- [ ] **Step 2: Confirm "What was shipped" detail**

Run:
```bash
awk '/### G-16/,/### G-/' docs/development-gaps.md | head -40
```

Expected: paragraph listing the 5 wired components (PlanCoverageRadar, VariantSummaryStrip, SupportPatternRadar, FollowUpSuccessRate, InterventionTimeline).

### Task V4.2 — Verify TomorrowPlanPanel drill-down wiring

**Files:**
- Read: `apps/web/src/panels/TomorrowPlanPanel.tsx`

- [ ] **Step 1: Confirm drill-down state + DrillDownDrawer mount**

Run:
```bash
grep -n "drillDown\|DrillDownDrawer\|PlanCoverageRadar" apps/web/src/panels/TomorrowPlanPanel.tsx
```

Expected:
- `useState<DrillDownContext | null>` (or similar discriminated-union null)
- `<DrillDownDrawer` render with context, onClose, onNavigate
- `onSegmentClick` prop on PlanCoverageRadar

- [ ] **Step 2: Confirm `plan-coverage-section` context type is emitted**

Run:
```bash
grep -n '"plan-coverage-section"' apps/web/src/panels/TomorrowPlanPanel.tsx
```

Expected: at least one line inside the `onSegmentClick` handler.

- [ ] **Step 3: Confirm `buildPlanCoverageSectionItems` helper exists**

Run:
```bash
grep -n "buildPlanCoverageSectionItems" apps/web/src/panels/TomorrowPlanPanel.tsx apps/web/src/panels/drilldown/ 2>/dev/null
```

Expected: definition in the panel file OR imported from a shared helper. If neither, the runtime will throw on click — stop and implement per plan Task 4.2 Step 2.

- [ ] **Step 4: Confirm DrillDownDrawer has all required handlers**

Run:
```bash
grep -A 10 "<DrillDownDrawer" apps/web/src/panels/TomorrowPlanPanel.tsx
```

Expected: `context`, `onClose`, `onNavigate`, `onContextChange`, `onInterventionPrefill`, `onMessagePrefill` — all 6 per plan Task 4.2 Step 3.

Missing handlers silently disable UX features (nav + prefill). Add any missing.

### Task V4.3 — Verify DifferentiatePanel drill-down wiring

**Files:**
- Read: `apps/web/src/panels/DifferentiatePanel.tsx`

- [ ] **Step 1: Same pattern checks as V4.2**

Run:
```bash
grep -n "drillDown\|DrillDownDrawer\|VariantSummaryStrip\|variant-lane" apps/web/src/panels/DifferentiatePanel.tsx
```

Expected: drill-down state + drawer mount + `VariantSummaryStrip` with `onSegmentClick` + `"variant-lane"` context emission.

- [ ] **Step 2: Verify the lane lookup logic**

Run:
```bash
grep -A 5 "onSegmentClick" apps/web/src/panels/DifferentiatePanel.tsx | head -15
```

Expected: `result?.variant_lanes.find((l) => l.key === laneKey)` pattern; early return if `!lane`.

### Task V4.4 — Verify SupportPatternsPanel drill-down wiring

**Files:**
- Read: `apps/web/src/panels/SupportPatternsPanel.tsx`

- [ ] **Step 1: Same pattern**

Run:
```bash
grep -n "drillDown\|DrillDownDrawer\|SupportPatternRadar\|student-tag-group" apps/web/src/panels/SupportPatternsPanel.tsx
```

Expected: drill-down state + drawer mount + `SupportPatternRadar` with `onSegmentClick` + `"student-tag-group"` context emission.

- [ ] **Step 2: Verify `deriveStudentTagGroup` helper**

Run:
```bash
grep -n "deriveStudentTagGroup" apps/web/src/panels/SupportPatternsPanel.tsx apps/web/src/panels/drilldown/ 2>/dev/null
```

Expected: definition in the panel file OR shared helper.

### Task V4.5 — Verify InterventionPanel drill-down wiring (two charts, one drawer)

**Files:**
- Read: `apps/web/src/panels/InterventionPanel.tsx`

- [ ] **Step 1: Confirm both chart handlers**

Run:
```bash
grep -n "FollowUpSuccessRate\|InterventionTimeline\|onSegmentClick\|onDotClick" apps/web/src/panels/InterventionPanel.tsx
```

Expected:
- `FollowUpSuccessRate` with `onSegmentClick` → sets `debt-category` context
- `InterventionTimeline` with `onDotClick` → sets `student` context

- [ ] **Step 2: Confirm single DrillDownDrawer mount (not two)**

Run:
```bash
grep -c "<DrillDownDrawer" apps/web/src/panels/InterventionPanel.tsx
```

Expected: `1`. A double-mount would cause two drawers to open on click — plan Task 4.5 Step 2 explicitly calls for one.

If `> 1`, delete the duplicate.

- [ ] **Step 3: Confirm `mapInterventionsToDebtItems` helper**

Run:
```bash
grep -n "mapInterventionsToDebtItems" apps/web/src/panels/InterventionPanel.tsx
```

Expected: definition somewhere in the panel or imported.

### Task V4.6 — Manual drill-down interaction sweep (required)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173?classroom=demo-okafor-grade34`.

- [ ] **Step 2: Interact with each drill-down chart**

| Page | Chart | Action | Expected |
|---|---|---|---|
| Tomorrow | PlanCoverageRadar | Click a segment | Drawer opens with plan section items |
| Prep → Differentiate | VariantSummaryStrip | Click a lane | Drawer opens with variant lane |
| Review → Support Patterns | SupportPatternRadar | Click a theme | Drawer opens with student-tag-group |
| Ops → Log Intervention | FollowUpSuccessRate | Click a category | Drawer opens with debt category |
| Ops → Log Intervention | InterventionTimeline | Click a dot | Drawer opens with student context |

Any failure: note the chart + expected behavior, stop, and trace the click handler.

- [ ] **Step 3: No commit unless a regression is found.**

### Phase V4 validation gate

- [ ] **Run the full frontend lane**

```bash
npm run typecheck && npm run test -- apps/web && npm run check:contrast
```

Expected: green. (Baseline per plan Phase 4 gate was green.)

---

# Phase V5 — Editorial register, chart tonal palette, skeleton shimmer, Monday moment verification

**Implementation reference:** `2026-04-23-world-class-ui-polish.md` Phase 5 (Tasks 5.1–5.7)

**What this phase verifies:**
1. Source Serif 4 Variable font file exists (>40KB), `@font-face` registered, `--font-editorial` token defined, `.editorial` utility in primitives.css.
2. `.editorial` class applied exactly to FamilyMessagePanel body, TomorrowPlanPanel narrative, and SurvivalPacketPanel cover — and nowhere else.
3. `--chart-tone-low/medium/high` + `-bg` tokens defined; `--color-forecast-*` aliases map to the new scale; DataVisualizations + ForecastTimeline consume either the new or aliased tokens.
4. SectionSkeleton has brand-mark watermark at ≤4% opacity; hidden under `prefers-reduced-motion`.
5. `MondayResetMoment` component exists with 3 tests (Monday visible; Tuesday empty; dismissed empty); mounted on TodayPanel gated by activeClassroom.
6. Contrast gate passes after chart retune — no regression on `--color-forecast-*-text` readability.
7. Decision-log entry dated 2026-04-23 exists for "Editorial register / chart retune / Monday moment".

### Task V5.1 — Verify Source Serif 4 install and token

**Files:**
- Check: `apps/web/public/fonts/source-serif-4-variable.woff2`
- Read: `apps/web/src/styles/fonts.css`
- Read: `apps/web/src/styles/tokens.css`
- Read: `apps/web/src/styles/primitives.css`

- [ ] **Step 1: Font file exists and is >40KB**

Run:
```bash
ls -la apps/web/public/fonts/source-serif-4-variable.woff2
```

Expected: file exists, size > 40000 bytes. Baseline 2026-04-24: ✅ present.

- [ ] **Step 2: `@font-face` registered**

Run:
```bash
grep -n 'font-family: "Source Serif 4"' apps/web/src/styles/fonts.css
```

Expected: one line inside a `@font-face` block with `font-weight: 200 900`, `font-display: swap`, and the correct `url(...woff2)` reference.

- [ ] **Step 3: `--font-editorial` token**

Run:
```bash
grep -n "\-\-font-editorial:" apps/web/src/styles/tokens.css
```

Expected: one line (baseline: `tokens.css:379`). Value should include `"Source Serif 4"` + fallbacks (Georgia, Times New Roman, serif).

- [ ] **Step 4: `.editorial` utility**

Run:
```bash
grep -A 10 "^\.editorial" apps/web/src/styles/primitives.css
```

Expected: rule block with `font-family: var(--font-editorial)`, `line-height: var(--leading-loose)`, plus `.editorial p`, `.editorial strong`, `.editorial em` sub-rules.

If the utility is in a file other than `primitives.css`, that's a drift — the plan explicitly placed it there. Confirm via grep of all style files:

```bash
grep -rn "^\.editorial" apps/web/src/styles
```

Expected: matches only in `primitives.css`.

### Task V5.2 — Verify `.editorial` application (and no over-application)

**Files:**
- Read: `apps/web/src/panels/FamilyMessagePanel.tsx`
- Read: `apps/web/src/panels/TomorrowPlanPanel.tsx`
- Read: `apps/web/src/panels/SurvivalPacketPanel.tsx`

- [ ] **Step 1: Confirm application on the three target panels**

Run:
```bash
grep -n 'className=.*editorial' apps/web/src/panels/FamilyMessagePanel.tsx apps/web/src/panels/TomorrowPlanPanel.tsx apps/web/src/panels/SurvivalPacketPanel.tsx
```

Expected: at least one line per file (3 minimum, likely 3-4).

- [ ] **Step 2: Confirm over-application has NOT occurred**

Run:
```bash
grep -rn 'className=.*editorial' apps/web/src --include='*.tsx' --include='*.jsx'
```

Expected: matches only in the three target panels + component-level tests (no UI chrome, no headers, no form inputs).

If `.editorial` appears in any other panel or component, the plan's narrow scope was violated — surface in `docs/development-gaps.md` and decide whether to revert or document the new application site.

### Task V5.3 — Verify chart tonal palette tokens

**Files:**
- Read: `apps/web/src/styles/tokens.css`
- Read: `apps/web/src/components/DataVisualizations.tsx`
- Read: `apps/web/src/components/ForecastTimeline.tsx`

- [ ] **Step 1: Confirm new tokens**

Run:
```bash
grep -n "\-\-chart-tone-" apps/web/src/styles/tokens.css
```

Expected (baseline 2026-04-24 ✅): 6 lines — `low`, `low-bg`, `medium`, `medium-bg`, `high`, `high-bg`.

- [ ] **Step 2: Confirm legacy `--color-forecast-*` aliases**

Run:
```bash
grep -n "\-\-color-forecast-.*: var(\-\-chart-tone-" apps/web/src/styles/tokens.css
```

Expected (baseline ✅): 6 lines — each of the 6 forecast tokens aliases to its chart-tone equivalent. `-text` tokens have their own `light-dark(...)` values, not aliases.

- [ ] **Step 3: Confirm no duplicate legacy declarations**

Run:
```bash
grep -cE "^\s*--color-forecast-(low|medium|high)\b" apps/web/src/styles/tokens.css
```

Expected: each of `low`, `medium`, `high` appears exactly once (the alias line). If the original hex declarations were left in AND aliases appended, the later alias wins but it's untidy — clean up.

- [ ] **Step 4: Confirm chart components migrated**

Run:
```bash
grep -cE "var\(--color-forecast-(low|medium|high)\b|var\(--chart-tone-" apps/web/src/components/DataVisualizations.tsx apps/web/src/components/ForecastTimeline.tsx
```

Expected: > 0. Either token family is fine since the aliases route legacy consumers correctly. If 0, the components ignore the system entirely — inspect.

- [ ] **Step 5: Contrast gate**

Run:
```bash
npm run check:contrast
```

Expected: green. If red, the retune broke AA on `--color-forecast-*-text` — bump the text value one shade toward darker (light mode) or lighter (dark mode) per plan Task 5.4 Step 3.

### Task V5.4 — Verify branded SectionSkeleton shimmer

**Files:**
- Read: `apps/web/src/components/SectionSkeleton.css`

- [ ] **Step 1: Confirm `::before` watermark rule**

Run:
```bash
grep -A 10 "^\.section-skeleton::before" apps/web/src/components/SectionSkeleton.css
```

Expected: background-image referencing `/brand/prairieclassroom-mark.png` (or equivalent), `opacity: 0.035` (or ~3-4%), `pointer-events: none`.

- [ ] **Step 2: Confirm `prefers-reduced-motion` gate**

Run:
```bash
grep -A 3 "prefers-reduced-motion" apps/web/src/components/SectionSkeleton.css
```

Expected: rule setting `.section-skeleton::before { display: none; }` (or equivalent).

- [ ] **Step 3: Confirm the brand-mark asset exists**

Run:
```bash
ls apps/web/public/brand/prairieclassroom-mark.png 2>&1
```

If the asset is missing, the `::before` renders blank — either restore the asset or adjust the URL to an existing brand image. This is a silent visual regression.

- [ ] **Step 4: Existing skeleton tests still pass**

Run:
```bash
npx vitest run apps/web/src/components/__tests__/SectionSkeleton.test.tsx 2>&1 | tail -10
```

Expected: green. (Plan did not require a new test; existing tests should be unaffected by the pseudo-element addition.)

### Task V5.5 — Verify MondayResetMoment

**Files:**
- Read: `apps/web/src/components/MondayResetMoment.tsx`
- Read: `apps/web/src/components/MondayResetMoment.css`
- Read: `apps/web/src/components/__tests__/MondayResetMoment.test.tsx`
- Read: `apps/web/src/panels/TodayPanel.tsx`

- [ ] **Step 1: Confirm 3 tests pass**

Run:
```bash
npx vitest run apps/web/src/components/__tests__/MondayResetMoment.test.tsx
```

Expected: PASS (3 tests: Monday render; Tuesday empty; dismissed empty).

- [ ] **Step 2: Confirm ISO week key calculation**

Run:
```bash
grep -n "getIsoWeek\|prairie:monday-reset" apps/web/src/components/MondayResetMoment.tsx
```

Expected: a local `getIsoWeek` helper and a `prairie:monday-reset:${classroomId}:${weekKey}` storage key.

Sanity: per the test, `new Date("2026-04-20")` (Monday, week 17) should produce storage key suffix `2026-W17`. If the helper uses a different algorithm, the test will either fail or pass spuriously — double-check the ISO-8601 formula.

- [ ] **Step 3: Confirm TodayPanel mount**

Run:
```bash
grep -n "MondayResetMoment" apps/web/src/panels/TodayPanel.tsx
```

Expected: at least 2 lines — import and render.

Confirm the render is gated by activeClassroom:

```bash
grep -B 1 -A 2 "<MondayResetMoment" apps/web/src/panels/TodayPanel.tsx
```

Expected: a ternary or conditional on `activeClassroom` so the component doesn't render for an empty string (which would still be treated as dismiss-able, corrupting storage).

- [ ] **Step 4: Token discipline for CSS**

Run:
```bash
for t in $(grep -oE "var\(--[a-z0-9-]+" apps/web/src/components/MondayResetMoment.css | sed 's/var(//' | sort -u); do
  grep -q "^\s*$t:" apps/web/src/styles/tokens.css && echo "OK  $t" || echo "MISS $t"
done
```

Expected: all `OK`. Note `--color-brand-green-soft`, `--color-brand-green`, `--control-h-xs`, `--radius-pill` are all referenced — confirm each exists.

### Task V5.6 — Verify Phase 5 decision-log entry

- [ ] **Step 1: Confirm entry**

Run:
```bash
grep -n "Editorial register introduction" docs/decision-log.md
```

Expected: one line (baseline: line 26 of decision-log.md).

### Phase V5 validation gate

- [ ] **Run the full frontend lane**

```bash
npm run typecheck && npm run test -- apps/web && npm run check:contrast
```

Expected: green.

---

# Phase V6 — Motion pruning & workspace float verification

**Implementation reference:** `2026-04-23-world-class-ui-polish.md` Phase 6 (Tasks 6.1–6.4)

**What this phase verifies:**
1. `.btn` transition collapsed to single `all` property in `primitives.css`.
2. 11 motion eases and 5 durations aliased to canonical 4 eases (`standard`, `emphasis`, `spring`, `out-expo`) and 3 durations (`fast`, `base`, `slow`).
3. No call sites directly reference the retired/aliased eases with new intent; existing references correctly route through the alias to a canonical value.
4. Workspace floats with 16px gutter + rounded corners + shadow at `≥1280px`.
5. Decision-log entry dated 2026-04-23 exists for "Motion prune + floating workspace".

### Task V6.1 — Verify `.btn` transition collapse

**Files:**
- Read: `apps/web/src/styles/primitives.css`

- [ ] **Step 1: Confirm the single-`all` transition**

Run:
```bash
grep -B 1 -A 2 "^\.btn {" apps/web/src/styles/primitives.css | head -20
```

Look for: `transition: all var(--motion-letterpress) var(--ease-letterpress);` (or equivalently `var(--motion-fast)` if the aliases are already inlined in the authoring source).

If the transition block still lists multiple properties (`background-color ..., color ..., transform ...`), apply plan Task 6.1 Step 1 — collapse to `all`.

### Task V6.2 — Verify motion alias block

**Files:**
- Read: `apps/web/src/styles/tokens.css`

- [ ] **Step 1: Confirm canonical eases exist**

Run:
```bash
grep -nE "^\s*--ease-(standard|emphasis|spring|out-expo):" apps/web/src/styles/tokens.css
```

Expected: 4 lines, one per canonical ease.

- [ ] **Step 2: Confirm retired eases aliased**

Run:
```bash
grep -nE "^\s*--ease-(spring-heavy|in-out-circ|decelerate|accelerate|elastic|bounce|snap|out-back|letterpress|press):" apps/web/src/styles/tokens.css
```

Expected: at least 10 lines. Each should be of form `--ease-XXX: var(--ease-standard|emphasis|spring|out-expo);`.

Plan Task 6.2 Step 3 lists 10 retired names mapping to the 4 canonical. If fewer than 10 appear, some retirements were missed — inspect and add the missing alias per the plan.

- [ ] **Step 3: Confirm canonical durations exist**

Run:
```bash
grep -nE "^\s*--motion-(fast|base|slow):" apps/web/src/styles/tokens.css
```

Expected: 3 lines.

- [ ] **Step 4: Confirm retired durations aliased**

Run:
```bash
grep -nE "^\s*--motion-(slower|letterpress|micro|hover):" apps/web/src/styles/tokens.css
grep -nE "^\s*--duration-fast:" apps/web/src/styles/tokens.css
```

Expected: 4+1 = 5 lines, each aliasing to a canonical duration.

- [ ] **Step 5: Confirm `--motion-stagger-step` retained** (plan note: unique use case, keep at 40ms)

Run:
```bash
grep -n "\-\-motion-stagger-step:" apps/web/src/styles/tokens.css
```

Expected: one line, value `40ms` or equivalent.

- [ ] **Step 6: Confirm no call-site regressions**

Run a quick audit of how many files still use the retired names — they are expected to still work via aliases, but elevated counts indicate the org will need to rename over time.

```bash
for name in ease-spring-heavy ease-in-out-circ ease-decelerate ease-accelerate ease-elastic ease-bounce ease-snap ease-out-back ease-letterpress ease-press motion-slower motion-letterpress motion-micro motion-hover duration-fast; do
  count=$(grep -rn "$name" apps/web/src --include='*.css' --include='*.tsx' | wc -l)
  echo "$name: $count"
done
```

Document the counts. Each alias lets consumers keep working; the canonical reduction is an org-wide rename that happens over time (plan Task 6.2 Step 3 is explicit about this).

If any count is 0, the alias is dead code — safe to prune, but not required by this plan.

### Task V6.3 — Verify workspace float at ≥1280px

**Files:**
- Read: `apps/web/src/styles/shell.css`

- [ ] **Step 1: Confirm the `@media (min-width: 1280px)` rule for `.app-main`**

Run:
```bash
awk '/@media \(min-width: 1280px\)/{flag=1; print; next} /^}$/{if(flag){print; flag=0}} flag' apps/web/src/styles/shell.css | grep -A 6 "\.app-main"
```

Expected: block containing `margin: 0 var(--space-4) var(--space-4);`, `border: 1px solid ...`, `border-radius: var(--radius-lg);`, `box-shadow: var(--shadow-sm);`.

- [ ] **Step 2: Manual viewport check**

Start dev server, open at 1440px:
- Workspace visible as a floating card — 16px gutter visible around it, rounded corners on all 4 sides, subtle shadow.
- Header padding-bottom increased (plan Task 6.3 Step 1 set `padding-bottom: var(--space-3)`).
- Resize to 1200px — workspace docks flush to header (no gutter, no float).

If the gutter is missing at 1440px or still present at 1200px, the media query bound is off — inspect.

### Task V6.4 — Verify Phase 6 decision-log entry

- [ ] **Step 1: Confirm entry**

Run:
```bash
grep -n "Motion prune + floating workspace" docs/decision-log.md
```

Expected: one line (baseline: line 16 of decision-log.md).

### Phase V6 validation gate

- [ ] **Run the full frontend lane + release gate**

```bash
npm run typecheck && npm run test -- apps/web && npm run check:contrast
```

Expected: green.

---

# Phase V7 — Cross-cutting final verification

**What this phase verifies:**
1. `npm run release:gate` passes on mock mode (the end-to-end gate across web + orchestrator + inference).
2. Manual viewport sweep at 375 / 768 / 1024 / 1280 / 1440 px — all layouts render cleanly.
3. Dark mode toggle works on every page.
4. Keyboard shortcuts work: `⌘K` opens palette (labeled "Search"), `?` opens shortcuts, `1-7` jump to tabs.
5. Plan's "Final checklist" (line 2784 of the implementation plan) is walked end-to-end.
6. Any follow-up polish surfaced during verification is recorded in `docs/development-gaps.md` with a new gap ID — this plan does not absorb new work.

### Task V7.1 — Release gate

- [ ] **Step 1: Run the end-to-end release gate**

Run:
```bash
npm run release:gate
```

Expected: green (mock mode, default no-cost lane). This is the canonical structural validation.

- [ ] **Step 2: If red, triage before proceeding**

Most likely failure modes:
- Unit test regression (fix the test or the code, per standard TDD loop)
- Contrast gate regression (bump a color value, see Phase V5 Task V5.3 Step 5)
- Schema drift (shouldn't apply — this plan touched no schemas)
- Demo fixture drift (shouldn't apply — this plan touched no fixtures)

Fix root cause; do not `--no-verify` or skip hooks.

### Task V7.2 — Manual viewport sweep

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk the 5 breakpoints**

Open `http://localhost:5173?classroom=demo-okafor-grade34` in Chrome DevTools. For each breakpoint, visit these 7 tabs: classroom, today, tomorrow, week, prep, ops, review.

| Breakpoint | Expected shell state | What to watch for |
|---|---|---|
| 375px | Mobile: two-row header; chips collapse; tap targets ≥44px | No overflow, no overlap |
| 768px | Tablet portrait: two-row header; nav tabs on their own row | Tool switchers still usable |
| 1024px | Tablet landscape: two-row header still | Watchlist + Ops zones visible on Classroom |
| 1280px | Single-row header begins; workspace NOT yet floating | Breakpoint-edge case — no flicker |
| 1440px | Single-row header; workspace floats with 16px gutter | Rounded corners + shadow visible |

Document any regression in `docs/development-gaps.md` as a new row.

### Task V7.3 — Dark-mode sweep

- [ ] **Step 1: For each of the 7 tabs**, toggle theme (header ThemeToggle) between light and dark. Verify:
- No contrast issues (no white text on near-white background, no black-on-black)
- Charts use `--chart-tone-*` family; low/medium/high colors distinguishable in both themes
- PageHero border-left rule visible in both themes
- Editorial serif (.editorial) is legible on Family Message / Plan narrative / Survival Packet

### Task V7.4 — Keyboard flows

- [ ] **Step 1: With the app open, verify keyboard shortcuts**

| Shortcut | Expected |
|---|---|
| `⌘K` (macOS) / `Ctrl+K` (Linux/Windows) | Command palette opens with label "Search" |
| `?` | Help / shortcuts overlay opens |
| `1`–`7` | Jump to classroom/today/tomorrow/week/prep/ops/review respectively |
| `Escape` | Closes palette, modal, drawer |
| `Tab` | Focuses HeaderAction chips in order; focus ring visible |

Document misses.

### Task V7.5 — Plan final checklist walk

- [ ] **Step 1: Walk the implementation plan's final checklist (line 2784)**

Re-read `docs/superpowers/plans/2026-04-23-world-class-ui-polish.md` lines 2784–2797. For each item:
- [ ] All 6 phases' validation gates pass — covered by V1-V6 + V7.1
- [ ] `npm run release:gate` passes — covered by V7.1
- [ ] `docs/decision-log.md` has 6 new dated entries — confirmed by V1.6, V2.4, V3.6 (implicit in Phase 3 check), V5.6, V6.4 + a sixth (Today polish, outside the 6 primary phases but counted in the inventory)
- [x] `docs/development-gaps.md` G-16 closed — confirmed by V4.1
- [ ] No `--shell-control-h` / `--shell-nav-h` references remain — fixed by V1.2 if baseline audit stood (now should be clean)
- [ ] No `MultiToolHero` imports remain — confirmed by V2.1
- [ ] Manual visual check at 375 / 768 / 1024 / 1280 / 1440 — covered by V7.2
- [ ] Dark mode toggle works on every page — covered by V7.3
- [ ] Keyboard: ⌘K opens palette, ? opens shortcuts, 1-7 jump to tabs — covered by V7.4

Any remaining unchecked item is a blocker. Document and fix.

### Task V7.6 — Record follow-ups

- [ ] **Step 1: Append any non-blocking polish surfaced during verification** to `docs/development-gaps.md`.

Suggested format (append under a new "Polish follow-ups from 2026-04-24 verification" section):

```markdown
### G-XX — [Short title]

**Status:** Open
**Surfaced by:** 2026-04-24 verification of 2026-04-23-world-class-ui-polish
**Why:** [one sentence]
**Scope:** [one sentence]
**Est. effort:** [XS | S | M | L]
```

If nothing surfaced, this step is a no-op.

- [ ] **Step 2: If anything blocking was fixed during this plan, commit a summary entry** to `docs/decision-log.md`:

```markdown
### 2026-04-24 — Verification-triggered refinements of 2026-04-23 polish sprint

- **Decision:** Close the gaps surfaced by the 2026-04-24 verification pass: [list].
- **Why:** [one sentence].
- **Alternatives considered:** [brief].
- **Consequences:** [brief].
- **What would change this:** [brief].
```

If no fix was needed (pure verification), no new decision-log entry is required.

### Phase V7 final gate

- [ ] **Last release-gate run on a clean working tree**

```bash
git status            # Expect clean or only the verification-surfaced fixes
npm run release:gate  # Expect green
```

Done.

---

# Self-Review (required by writing-plans skill)

**Spec coverage.** Every phase of the implementation plan (`2026-04-23-world-class-ui-polish.md`) has a corresponding V-phase here:
- Impl Phase 1 → V1 (shell coherence + HeaderAction + single-row)
- Impl Phase 2 → V2 (PageHero + variants + migrations + MultiToolHero retirement)
- Impl Phase 3 → V3 (useZoneDisclosure + Intel/Roster disclosure + ToolSwitcherStepper + pulse-gating)
- Impl Phase 4 → V4 (5 drill-downs + single drawer + G-16 closure)
- Impl Phase 5 → V5 (Source Serif 4 + .editorial + chart-tone + SectionSkeleton + MondayResetMoment)
- Impl Phase 6 → V6 (.btn collapse + motion aliases + workspace float)
- Implementation plan's "Final checklist" (line 2784) → V7

Each of the 33+ tasks in the original plan maps to a verification step in this plan. No orphan tasks.

**Placeholder scan.** Every grep command has an expected output. Every fix step has exact files + exact replacement text (V1.2). No TBDs. Known gaps are called out up front with severity. Follow-up format (V7.6) is provided verbatim.

**Type consistency.** `PageHeroPulse` / `PageHeroVariant` / `DrillDownContext` / `ZoneDisclosure` / `PageHero*` — all types referenced in verification steps match the names introduced in the implementation plan. `--control-h-md` / `--control-h-lg` / `--chart-tone-*` / `--font-editorial` — all canonical tokens are consistent across verification phases.

**Known baseline findings** (re-stated from top of plan):
- **V1-gap-001** (medium): 4 stale `--shell-control-h` fallback references remain. Fixed in V1.2.

This is the only concrete gap the 2026-04-24 reconnaissance found. All other checks landed green. The plan is conservative — it re-runs evidence-gathering even for confirmed-green items, because verification claims must be defensible, not inherited.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-ui-polish-verification-refinement.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per verification phase (V1–V7), review between phases, surface + fix gaps inline. Best for parallel evidence-gathering: V2, V3, V4, V5 can verify in parallel once V1's shared token hygiene is fixed.

**2. Inline Execution** — run phases V1 → V7 sequentially in this session. Fastest feedback on the V1 token-hygiene fix but slower overall if the visual sweep (V7.2) surfaces regressions across multiple phases.

Recommend Subagent-Driven because: (a) each V-phase is independently verifiable; (b) V2–V5 are bounded reads + greps that parallelize well; (c) the concrete V1 fix (4 stale refs) should land first, then V2–V6 verification can fan out, then V7 convenes.
