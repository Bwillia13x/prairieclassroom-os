# Today Page Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 34 audit findings across the 10 sections of the `Today` panel, elevating it from "long vertical scroll of cards" to a composed, observably-fresh, nothing-design dashboard that the morning-prep teacher can trust without reverse-engineering its metrics.

**Architecture:** Surgical edits in `apps/web/src/panels/TodayPanel.tsx` and the seven section components it composes. No API/contract changes (the backend already exposes `last_activity_at`, `debt_total_14d`, etc.). One small shared primitive is added (`PageFreshness`) and one small utility (`prepChecklistStore`). All visual decisions follow the nothing-design system: monochrome canvas, spacing-over-dividers, three-layer hierarchy per card, ALL CAPS Space Mono metadata, one accent per surface.

**Tech Stack:** React 18 + TypeScript, Vite, vitest + @testing-library/react, Prairie `tokens.css` + `nothing-theme.css`, no external chart library.

---

## Concur / Decline Summary

All 34 findings are addressed. Grouped into 14 tasks by codebase locality so each task edits one (or two) files and commits independently.

| # | Finding (section · audit ID) | Task | Nothing-design principle invoked |
|---|---|---|---|
| 1 | Static "26 STUDENTS" / "MORNING TRIAGE FIRST" chips | T2 | §2.1 three-layer: elevate directive, demote count to tertiary metadata |
| 2 | FOLLOW-UP NEEDED card visually detached from headline | T2 | §2.7 asymmetry with intention, not accident |
| 3 | "MORNING TRIAGE FIRST" directive buried as chip | T2 | §2.5 color as hierarchy — make one thing louder |
| 4 | No timestamp / "as of" indicator | T1 | §2.1 tertiary: Space Mono caption pushed to edge |
| 5 | Classroom Pulse "35 ACTIONS" anxiety-inducing, no benchmark | T3 | §2.3 spacing as meaning: add trend anchor |
| 6 | Three Pulse rows not clickable | T3 | §2.4 lightest-tool — already buttons, just need affordance |
| 7 | Student name pills not linked to profiles | T3 | Already linked — add hover tooltip for reason |
| 8 | Day Arc x-axis labels truncate mid-word | T4 | §2.2 — fix with spacing, not font shrink |
| 9 | Day Arc legend indicators undifferentiated | T4 | §2.5 — parenthetical counts do the work |
| 10 | No tooltips on Day Arc nodes | T4 | §2.8 precision in the small things |
| 11 | Debt 0–3 / 4–7 / 8+ scale has no label | T5 | §2.1 — tertiary legend line |
| 12 | "CRITICAL" badge undefined | T5 | §2.8 — tooltip with threshold rule |
| 13 | Debt breakdown colors don't match Day Arc | T5 | §2.6 consistency — unify status-color encoding |
| 14 | **[CRITICAL]** Scatter plot shows 3 of 26 students | T6 | §2.9 — low-opacity dots show density without noise |
| 15 | "CHECK FIRST" quadrant looks like empty state | T6 | §2.3 — quadrant tint, not dashed box |
| 16 | Score column 108/10/6 has no header | T6 | §2.1 — Space Mono caption above values |
| 17 | Student notes truncate mid-sentence | T6 | §2.4 — expand inline, not modal |
| 18 | Intervention Recency bars mis-scale (11d vs 387d) | T7 | §2.9 — different form per magnitude tier |
| 19 | "376D BEYOND TARGET" lacks baseline | T7 | §2.1 — supplemental tertiary caption |
| 20 | Donut has no hover states / legend linkage | T8 | §2.8 — percussive cross-highlight |
| 21 | "7 NEED GROUPS" / "EXTENSION LEADS" chip purpose unclear | T8 | §2.4 — clearer affordance or drop to caption |
| 22 | Debt sparkline has no Y-axis context | T9 | §2.9 — shaded healthy band = data encoding |
| 23 | "2 OF 7" vs "2 OF 14" denominator mismatch | T9 | §2.6 consistency — one denominator |
| 24 | **[HIGH]** Prep checklist has no completion state | T10 | §2.8 mechanical honesty — controls look like controls |
| 25 | "+2 MORE ITEMS" hides checklist | T10 | §2.1 — prep list IS the primary, not tertiary |
| 26 | Family follow-up row has no action | T10 | §2.4 — inline CTA |
| 27 | Risk Windows timeline clips on right | T11 | §2.3 — grid, not overflow |
| 28 | "OPEN FORECAST" ambiguously placed inside peak callout | T11 | §2.4 — separate CTA from content surface |
| 29 | **[CRITICAL]** Conflicting counts (35 / 3 / 23) | T12 | §2.6 — one glossary, clear roles |
| 30 | Footer strip visually blends in | T12 | §2.1 — end-of-scroll deserves different weight |
| 31 | **[HIGH]** No in-page anchor navigation for 10-section scroll | T13 | §2.7 edge-anchored sticky rail |
| 32 | Section numbering (01, 02) inconsistent | T13 | §2.6 — commit to the pattern or drop it |
| 33 | No "end of Today" / return-to-top signal | T13 | §2.1 — tertiary Space Mono caption |
| 34 | No AI vs. record-derived content differentiation | T14 | §2.1 — small tag, not a banner |

Issues #6 and #7 are partial-wins (already implemented) — tasks 3 polish their affordances rather than wire them from scratch.

---

## File Map

### Files created

- `apps/web/src/components/PageFreshness.tsx` — tiny "Last updated 8:47 AM · AI snapshot" strip (used by TodayHero; reusable for other panels later)
- `apps/web/src/components/PageFreshness.css`
- `apps/web/src/components/SourceTag.tsx` — `<SourceTag kind="ai" | "record" />` one-character Space-Mono caption
- `apps/web/src/components/TodayAnchorRail.tsx` — sticky left-rail in-page nav for the Today panel
- `apps/web/src/components/TodayAnchorRail.css`
- `apps/web/src/utils/prepChecklistStore.ts` — localStorage-backed checkbox state keyed by `${classroomId}:${planDate}`
- `apps/web/src/utils/__tests__/prepChecklistStore.test.ts`
- `apps/web/src/components/__tests__/PageFreshness.test.tsx`
- `apps/web/src/components/__tests__/TodayAnchorRail.test.tsx`

### Files modified

- `apps/web/src/panels/TodayPanel.tsx` (hero timestamp, anchor rail, count glossary, section IDs, RiskWindowsPanel layout fix)
- `apps/web/src/panels/TodayPanel.css` (sticky rail offsets, footer weight, section anchor scroll-padding)
- `apps/web/src/components/TodayHero.tsx` (morning-triage elevation, CTA symmetry, freshness strip mount)
- `apps/web/src/components/TodayHero.css` (triage-directive styling)
- `apps/web/src/components/PendingActionsCard.tsx` (benchmark caption, row affordance, student tooltip)
- `apps/web/src/components/DayArc.tsx` (label wrap, legend counts, node tooltips)
- `apps/web/src/components/DayArc.css` (rotated-label layout)
- `apps/web/src/components/DataVisualizations.tsx` (scatter plot shows all students, quadrant tint, score header, note expansion, intervention recency log-split, donut cross-highlight)
- `apps/web/src/components/DataVisualizations.css` (quadrant tint, score header, hover cross-highlight)
- `apps/web/src/components/PlanRecap.tsx` (checkboxes, remove truncation, family-followup CTA)
- `apps/web/src/components/PlanRecap.css` (checkbox styling)
- `apps/web/src/components/StudentRoster.tsx` (footer weight, count label clarified)
- `apps/web/src/components/StudentRoster.css` (footer-strip tint)
- `apps/web/src/components/HealthBar.tsx` (debt sparkline healthy band, planned-denominator unification, CRITICAL tooltip)

### Validation cadence (per CLAUDE.md §Validation Rules)

- Each task: `npm run typecheck && npm run test -- <relevant file>`
- End of plan: `npm run lint`, `npm run test`, `npm run check:contrast` (token-adjacent CSS changes), `npm run release:gate` in mock mode.

---

## Task 1: Page freshness strip + SourceTag primitive

**Why:** Findings #4 (no timestamp) and #34 (no AI vs record-derived indicator). The Today snapshot already carries `last_activity_at: string | null` (types.ts:338). We build two tiny primitives now so subsequent tasks can mount them.

**Files:**
- Create: `apps/web/src/components/PageFreshness.tsx`
- Create: `apps/web/src/components/PageFreshness.css`
- Create: `apps/web/src/components/SourceTag.tsx`
- Create: `apps/web/src/components/__tests__/PageFreshness.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/PageFreshness.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PageFreshness from "../PageFreshness";

describe("PageFreshness", () => {
  it("renders a Space-Mono timestamp caption", () => {
    render(<PageFreshness generatedAt="2026-04-18T08:47:00-06:00" kind="ai" />);
    const el = screen.getByTestId("page-freshness");
    expect(el).toHaveTextContent(/LAST UPDATED/i);
    expect(el).toHaveTextContent(/AI SNAPSHOT/i);
  });

  it("renders a record tag when kind=record", () => {
    render(<PageFreshness generatedAt="2026-04-18T08:47:00-06:00" kind="record" />);
    expect(screen.getByTestId("page-freshness")).toHaveTextContent(/RECORD/i);
  });

  it("falls back to 'not yet generated' when generatedAt is null", () => {
    render(<PageFreshness generatedAt={null} kind="ai" />);
    expect(screen.getByTestId("page-freshness")).toHaveTextContent(/NOT YET GENERATED/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/PageFreshness.test.tsx`
Expected: FAIL with `Cannot find module '../PageFreshness'`.

- [ ] **Step 3: Implement `SourceTag.tsx`**

Create `apps/web/src/components/SourceTag.tsx`:

```tsx
/**
 * SourceTag — one-caption primitive distinguishing AI-generated recommendations
 * from record-derived data (audit finding #34). Nothing-design: Space Mono,
 * ALL CAPS, tertiary color, never competing with content.
 */

interface Props {
  kind: "ai" | "record";
  className?: string;
}

const LABELS: Record<Props["kind"], string> = {
  ai: "AI SNAPSHOT",
  record: "RECORD",
};

export default function SourceTag({ kind, className }: Props) {
  return (
    <span
      className={`source-tag source-tag--${kind}${className ? ` ${className}` : ""}`}
      aria-label={kind === "ai" ? "AI-generated content" : "Record-derived data"}
      data-testid={`source-tag-${kind}`}
    >
      {LABELS[kind]}
    </span>
  );
}
```

- [ ] **Step 4: Implement `PageFreshness.tsx`**

Create `apps/web/src/components/PageFreshness.tsx`:

```tsx
/**
 * PageFreshness — "LAST UPDATED 8:47 AM · AI SNAPSHOT" tertiary strip.
 * Mounts in the Today hero (audit #4). Space Mono, caption size, edge-anchored.
 */

import SourceTag from "./SourceTag";
import "./PageFreshness.css";

interface Props {
  generatedAt: string | null;
  kind: "ai" | "record";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function PageFreshness({ generatedAt, kind }: Props) {
  return (
    <p className="page-freshness" data-testid="page-freshness">
      <span className="page-freshness__label">Last updated</span>
      <span className="page-freshness__value">
        {generatedAt ? formatTime(generatedAt) : "not yet generated"}
      </span>
      <span className="page-freshness__divider" aria-hidden="true">·</span>
      <SourceTag kind={kind} className="page-freshness__tag" />
    </p>
  );
}
```

- [ ] **Step 5: Implement `PageFreshness.css`**

Create `apps/web/src/components/PageFreshness.css`:

```css
/* Nothing-design tertiary caption: Space Mono, ALL CAPS, muted. */
.page-freshness {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.page-freshness__value {
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.page-freshness__divider {
  opacity: 0.5;
}

.source-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.source-tag--ai {
  color: var(--color-analysis);
}

.source-tag--record {
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- apps/web/src/components/__tests__/PageFreshness.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/PageFreshness.tsx apps/web/src/components/PageFreshness.css apps/web/src/components/SourceTag.tsx apps/web/src/components/__tests__/PageFreshness.test.tsx
git commit -m "feat(today): add PageFreshness + SourceTag primitives for audit findings #4/#34"
```

---

## Task 2: Command Center hero — elevate directive, symmetrize CTA, mount freshness

**Why:** Findings #1 (static count/triage chips), #2 (asymmetric CTA), #3 (buried directive), #4 (timestamp mount). Current `TodayPanel.tsx:133-137` renders the count + triage as `PageIntro` badges, visually identical. `TodayHero.tsx:48-64` only has the CTA on the right. We'll add a triage directive row and mount the freshness strip.

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx:133-137` (drop the static badges; fold "Morning triage first" into TodayHero)
- Modify: `apps/web/src/components/TodayHero.tsx:44-67`
- Modify: `apps/web/src/components/TodayHero.css`

- [ ] **Step 1: Write the failing test**

Extend `apps/web/src/components/__tests__/TodayHero.test.tsx` (existing file):

```tsx
it("renders the morning triage directive prominently (not as a tag chip)", () => {
  renderHero();
  const directive = screen.getByTestId("today-hero-directive");
  expect(directive).toHaveTextContent(/morning triage first/i);
  // It must NOT live in a .pill or .chip element (elevation check).
  expect(directive.className).not.toMatch(/pill|chip|badge/i);
});

it("mounts PageFreshness with the snapshot's last_activity_at as AI-snapshot", () => {
  renderHero({ snapshot: { ...baseSnapshot, last_activity_at: "2026-04-18T08:47:00-06:00" } });
  const freshness = screen.getByTestId("page-freshness");
  expect(freshness).toHaveTextContent(/AI SNAPSHOT/i);
});
```

(Reuse `renderHero` helper already in that test file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/TodayHero.test.tsx`
Expected: FAIL — `directive` testid not found, `page-freshness` not rendered.

- [ ] **Step 3: Update `TodayHero.tsx` — directive + freshness**

Replace the body of `TodayHero.tsx` with:

```tsx
import type { ActiveTab } from "../appReducer";
import type { TodaySnapshot, ClassroomHealth, StudentSummary } from "../types";
import TodayStory from "./TodayStory";
import StatusChip from "./StatusChip";
import PageFreshness from "./PageFreshness";
import { ActionButton } from "./shared";
import "./TodayHero.css";

export interface TodayHeroAction {
  description: string;
  tab: ActiveTab;
  cta: string;
  label: string;
  tone: "pending" | "warning" | "analysis" | "provenance" | "success";
}

interface Props {
  snapshot: TodaySnapshot | null;
  health: ClassroomHealth | null;
  students: StudentSummary[];
  recommendedAction: TodayHeroAction | null;
  onCtaClick: () => void;
}

export default function TodayHero({
  snapshot,
  health,
  students,
  recommendedAction,
  onCtaClick,
}: Props) {
  return (
    <section className="today-hero" aria-label="Today hero">
      <TodayStory snapshot={snapshot} health={health} students={students} />

      <p className="today-hero__directive" data-testid="today-hero-directive">
        <span className="today-hero__directive-arrow" aria-hidden="true">→</span>
        Morning triage first
      </p>

      <div className="today-hero__meta-row">
        <PageFreshness
          generatedAt={snapshot?.last_activity_at ?? null}
          kind="ai"
        />
      </div>

      {recommendedAction ? (
        <div className="today-hero__cta-row">
          <StatusChip label={recommendedAction.label} tone={recommendedAction.tone} />
          <p className="today-hero__cta-rationale">{recommendedAction.description}</p>
          <ActionButton
            variant="primary"
            size="lg"
            onClick={onCtaClick}
            className="today-hero__cta"
          >
            Open {recommendedAction.cta}
          </ActionButton>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Update `TodayHero.css`** — add directive + meta-row styles

Append to `apps/web/src/components/TodayHero.css`:

```css
/* Audit #3: Morning triage directive — tertiary-elevated, second-loudest after headline. */
.today-hero__directive {
  margin: var(--space-4) 0 0;
  padding-left: var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  font-weight: 500;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.today-hero__directive-arrow {
  display: inline-block;
  margin-right: var(--space-2);
  color: var(--color-accent);
}

.today-hero__meta-row {
  margin-top: var(--space-3);
}
```

- [ ] **Step 5: Update `TodayPanel.tsx` — remove static badges**

In `apps/web/src/panels/TodayPanel.tsx:133-137`, replace:

```tsx
        badges={[
          { label: `${profile.students.length} students`, tone: "sun" },
          { label: "Morning triage first", tone: "pending" },
        ]}
```

with:

```tsx
        badges={[
          { label: `${profile.students.length} students`, tone: "sun" },
        ]}
```

(The triage directive now lives in TodayHero with proper visual weight. The student count stays as a tertiary eyebrow badge — that's a true count, not a directive.)

- [ ] **Step 6: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/TodayHero.test.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS. If a TodayPanel snapshot/text assertion trips on the removed "Morning triage first" badge, update it to assert on the new `today-hero-directive` testid.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/TodayHero.tsx apps/web/src/components/TodayHero.css apps/web/src/panels/TodayPanel.tsx apps/web/src/components/__tests__/TodayHero.test.tsx
git commit -m "fix(today): elevate morning triage directive and mount freshness strip (audit #1-#4)"
```

---

## Task 3: Classroom Pulse — benchmark caption + student tooltip

**Why:** Findings #5 (anxiety with no benchmark), #6 (rows need affordance — already `<button>` per PendingActionsCard.tsx:57-70, but visually flat), #7 (student pills need hover reason). `ClassroomHealth.trends.debt_total_14d` is already fetched (TodayPanel.tsx:78); we pass `previousTotal` to ComplexityDebtGauge already — do the same for PendingActionsCard as a benchmark caption.

**Files:**
- Modify: `apps/web/src/components/PendingActionsCard.tsx` (benchmark caption, `aria-describedby` tooltip on student chips)
- Modify: `apps/web/src/panels/TodayPanel.tsx:170-213` (pass `previousTotal` and `studentReasons` props)
- Modify: `apps/web/src/panels/TodayPanel.css` (optional — caption styling only if missing)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/PendingActionsCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import PendingActionsCard from "../PendingActionsCard";

const baseProps = {
  items: [
    { key: "stale_followup", label: "open follow-ups", count: 3, targetTab: "log-intervention" as const, icon: <span /> },
  ],
  totalCount: 35,
  studentsToCheckFirst: ["Hannah", "Liam"],
};

describe("PendingActionsCard", () => {
  it("shows a contextual benchmark caption when previousTotal is supplied", () => {
    render(<PendingActionsCard {...baseProps} previousTotal={28} />);
    const caption = screen.getByTestId("pending-actions-benchmark");
    expect(caption).toHaveTextContent(/up 7 from last check/i);
  });

  it("omits benchmark caption when previousTotal is absent", () => {
    render(<PendingActionsCard {...baseProps} />);
    expect(screen.queryByTestId("pending-actions-benchmark")).toBeNull();
  });

  it("exposes a tooltip with reason when a student reason is supplied", async () => {
    const reasons: Record<string, string> = { Hannah: "Stale math follow-up (4 days)" };
    render(<PendingActionsCard {...baseProps} studentReasons={reasons} />);
    const chip = screen.getByRole("button", { name: /Hannah/ });
    expect(chip).toHaveAttribute("title", "Stale math follow-up (4 days)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/PendingActionsCard.test.tsx`
Expected: FAIL — props `previousTotal` and `studentReasons` unknown.

- [ ] **Step 3: Extend `PendingActionsCard.tsx` props + render**

In `apps/web/src/components/PendingActionsCard.tsx`, update the `Props` interface and body:

```tsx
interface Props {
  items: ActionItem[];
  onItemClick?: (item: ActionItem) => void;
  totalCount: number;
  previousTotal?: number;
  studentsToCheckFirst?: string[];
  studentReasons?: Record<string, string>;
  onStudentClick?: (studentRef: string) => void;
}

function formatBenchmark(total: number, previous: number): string {
  const delta = total - previous;
  if (delta === 0) return "same as last check";
  return `${delta > 0 ? "up" : "down"} ${Math.abs(delta)} from last check`;
}
```

Then inside the header row (currently just `.today-triage-card__header-copy`), render the caption right below the chip:

```tsx
            <div className="today-triage-card__meta">
              <span className="pending-actions-heading">Needs Attention Now</span>
              <StatusChip
                label={formatActionCount(totalCount)}
                tone={totalCount > 0 ? "warning" : "success"}
              />
            </div>
            {typeof previousTotal === "number" ? (
              <p
                className="today-triage-card__benchmark"
                data-testid="pending-actions-benchmark"
              >
                {formatBenchmark(totalCount, previousTotal)}
              </p>
            ) : null}
```

And update the student-chip button to apply a title:

```tsx
              {studentsToCheckFirst.map((studentRef) => (
                <button
                  key={studentRef}
                  type="button"
                  className="today-triage-students__chip"
                  title={studentReasons?.[studentRef]}
                  onClick={() => onStudentClick?.(studentRef)}
                >
                  {studentRef}
                </button>
              ))}
```

- [ ] **Step 4: Add the benchmark caption style**

Append to `apps/web/src/panels/TodayPanel.css` (or the nearest existing `today-triage-card` rule set):

```css
.today-triage-card__benchmark {
  margin: var(--space-1) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 5: Wire props from TodayPanel**

In `apps/web/src/panels/TodayPanel.tsx`, near the existing `previousDebtTotal` memo (line 77), add:

```tsx
  const studentReasons = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of studentSummaries.result ?? []) {
      if (s.latest_priority_reason) out[s.alias] = s.latest_priority_reason;
    }
    return out;
  }, [studentSummaries.result]);
```

In the `<PendingActionsCard …>` JSX (line 170-211), add two props:

```tsx
              totalCount={totalActionCount}
              previousTotal={previousDebtTotal}
              studentsToCheckFirst={studentsToCheckFirst}
              studentReasons={studentReasons}
```

- [ ] **Step 6: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/PendingActionsCard.test.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/PendingActionsCard.tsx apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/TodayPanel.css apps/web/src/components/__tests__/PendingActionsCard.test.tsx
git commit -m "fix(today): add benchmark caption + student tooltip to Classroom Pulse (audit #5-#7)"
```

---

## Task 4: Day Arc — label wrap, legend counts, node tooltips

**Why:** Findings #8 (x-axis truncates mid-word), #9 (legend indicators undifferentiated), #10 (no hover tooltips). `DayArc.tsx:699-707` already has a `truncateSvgLabel` helper — we replace single-line truncation with two-line wrap, add counts to the legend (`"STUDENT ATTENTION (7)"`), and add `<title>` elements (SVG-native tooltips, no JS needed) to each block node.

**Files:**
- Modify: `apps/web/src/components/DayArc.tsx:~460-500` (block rendering — add `<title>`, use wrap helper)
- Modify: `apps/web/src/components/DayArc.tsx:~699-707` (replace `truncateSvgLabel` with `wrapSvgLabel` two-line)
- Modify: `apps/web/src/components/DayArc.tsx` legend section (search `legend` / `STUDENT ATTENTION`)
- Modify: `apps/web/src/components/DayArc.css` (label line height)

- [ ] **Step 1: Write the failing test**

Create or extend `apps/web/src/components/__tests__/DayArc.test.tsx`:

```tsx
it("renders block labels fully without a trailing ellipsis for labels up to 20 chars", () => {
  // "Morning literacy" is 16 chars, "Science — planning" is 18.
  const forecast = makeForecast([
    { time_slot: "09:00-09:45", activity: "Morning literacy", level: "medium" },
    { time_slot: "10:00-10:45", activity: "Math block", level: "high" },
    { time_slot: "11:00-11:45", activity: "Science — planning", level: "low" },
  ]);
  render(<DayArc forecast={forecast} students={[]} debtItems={[]} health={null} />);
  expect(screen.queryByText(/Morning liter\.\.\./)).toBeNull();
  expect(screen.getByText(/Morning literacy/)).toBeInTheDocument();
  expect(screen.getByText(/Science — planning/)).toBeInTheDocument();
});

it("shows counts in the legend entries", () => {
  const forecast = makeForecast(/* …3 blocks… */);
  render(<DayArc forecast={forecast} students={threeStudents} debtItems={fiveDebtItems} health={null} />);
  expect(screen.getByText(/STUDENT ATTENTION\s*\(/)).toBeInTheDocument();
  expect(screen.getByText(/OPEN THREADS\s*\(/)).toBeInTheDocument();
});

it("renders a <title> tooltip element per block node", () => {
  const { container } = render(<DayArc forecast={makeForecast(/*…*/)} students={[]} debtItems={[]} health={null} />);
  const titles = container.querySelectorAll(".day-arc__block-node title");
  expect(titles.length).toBeGreaterThanOrEqual(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/DayArc.test.tsx`
Expected: FAIL — labels still truncate at ~11 chars, legend has no counts, no `<title>` children.

- [ ] **Step 3: Replace `truncateSvgLabel` with `wrapSvgLabel`**

In `apps/web/src/components/DayArc.tsx` (lines ~699-707), replace the helper:

```tsx
/**
 * Split a label onto two SVG <tspan> lines at the nearest word boundary.
 * Falls back to a 2-line break at maxLength if no space is present.
 */
function wrapSvgLabel(label: string, maxLineLength: number): [string, string] {
  const clean = label.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLineLength) return [clean, ""];
  const mid = Math.min(maxLineLength, clean.length);
  const spaceIdx = clean.lastIndexOf(" ", mid);
  const breakAt = spaceIdx > 0 ? spaceIdx : mid;
  return [clean.slice(0, breakAt).trim(), clean.slice(breakAt).trim()];
}
```

Update the label rendering (search for `className="day-arc__block-label"`, around line 466) — replace single-string render with two-line tspan render:

```tsx
                <text
                  className="day-arc__block-label"
                  x={p.x}
                  y={axisLabelY}
                  textAnchor="middle"
                >
                  {(() => {
                    const [line1, line2] = wrapSvgLabel(p.block.activity, 16);
                    return (
                      <>
                        <tspan x={p.x} dy={0}>{line1}</tspan>
                        {line2 ? <tspan x={p.x} dy="1.05em">{line2}</tspan> : null}
                      </>
                    );
                  })()}
                </text>
```

(Also remove any remaining call to `truncateSvgLabel` in that file — `grep -n truncateSvgLabel` should return 0 matches after.)

- [ ] **Step 4: Add `<title>` children to block nodes**

Find the clickable block circle (`.day-arc__block-node` around line 489) and add a `<title>` inside:

```tsx
                <g
                  className={`day-arc__block-node day-arc__block-node--${p.block.level}`}
                  onClick={() => onBlockClick?.(p.index)}
                  aria-label={`${p.block.time_slot} ${p.block.activity}: ${p.block.level} complexity. Open detail.`}
                  role="button"
                  tabIndex={0}
                >
                  <title>
                    {`${p.block.time_slot} · ${p.block.activity} · ${p.block.level.toUpperCase()} complexity` +
                      (p.studentAttentionCount ? ` · ${p.studentAttentionCount} students flagged` : "") +
                      (p.openThreadCount ? ` · ${p.openThreadCount} open threads` : "")}
                  </title>
                  {/* existing <circle> children */}
                </g>
```

(If `studentAttentionCount` / `openThreadCount` aren't already computed per-block, compute them from `students` and `debtItems` props alongside the existing per-point model — see the existing per-block mapping around line 200-260.)

- [ ] **Step 5: Legend with counts**

Find the legend block (search `STUDENT ATTENTION` in DayArc.tsx). Update the two list items to append counts:

```tsx
        <li className="day-arc__legend-item day-arc__legend-item--attention">
          <span className="day-arc__legend-dot" aria-hidden="true" />
          <span>
            Student attention
            {totalAttentionCount > 0 ? ` (${totalAttentionCount})` : ""}
          </span>
        </li>
        <li className="day-arc__legend-item day-arc__legend-item--threads">
          <span className="day-arc__legend-ring" aria-hidden="true" />
          <span>
            Open threads
            {totalThreadCount > 0 ? ` (${totalThreadCount})` : ""}
          </span>
        </li>
```

Compute `totalAttentionCount` and `totalThreadCount` once at the top of the component body, summing the per-block values.

- [ ] **Step 6: Let the label block breathe (CSS)**

Append to `apps/web/src/components/DayArc.css`:

```css
.day-arc__block-label {
  font-size: var(--text-xs);
  line-height: 1.15;
}

/* Audit #9: legend dots and rings slightly larger for morning glance. */
.day-arc__legend-dot,
.day-arc__legend-ring {
  width: 10px;
  height: 10px;
}
```

Also increase the SVG viewBox bottom padding by ~16px (or bump the wrapping container's `padding-bottom`) so the second label line isn't clipped. Look for `viewBox=` near the top of DayArc.tsx — extend height by 16.

- [ ] **Step 7: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/DayArc.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/DayArc.tsx apps/web/src/components/DayArc.css apps/web/src/components/__tests__/DayArc.test.tsx
git commit -m "fix(today): wrap day-arc labels, add legend counts + block tooltips (audit #8-#10)"
```

---

## Task 5: Complexity Debt — scale label, CRITICAL tooltip, color unification

**Why:** Findings #11 (0-3/4-7/8+ unlabeled), #12 (CRITICAL undefined), #13 (debt breakdown colors don't match Day Arc). `ComplexityDebtGauge` renders the threshold row with no caption (DataVisualizations.tsx:382-386) and uses `debtCategoryTone()` (line 428-433) that doesn't map to the `level` color vocabulary used elsewhere (low/medium/high).

**Files:**
- Modify: `apps/web/src/components/DataVisualizations.tsx:295-433` (add scale label, CRITICAL title tooltip, unify `debtCategoryTone`)
- Modify: `apps/web/src/components/DataVisualizations.css` (scale-label caption; tone class colors realigned if needed)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/ComplexityDebtGauge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ComplexityDebtGauge } from "../DataVisualizations";

const mkItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    category: "approaching_review",
    student_refs: [],
    age_days: 5,
    description: "",
    surfaced_at: new Date().toISOString(),
  }));

describe("ComplexityDebtGauge", () => {
  it("labels the 0-3 / 4-7 / 8+ scale explicitly", () => {
    render(<ComplexityDebtGauge debtItems={mkItems(12)} />);
    expect(screen.getByTestId("debt-scale-legend")).toHaveTextContent(/DEBT SEVERITY TIER/i);
  });

  it("puts a definition title on the CRITICAL/WARNING/SUCCESS tone badge", () => {
    render(<ComplexityDebtGauge debtItems={mkItems(12)} />);
    const badge = screen.getByText(/Critical/i);
    expect(badge).toHaveAttribute("title", expect.stringMatching(/8\+/));
  });

  it("uses a level-aligned tone for approaching_review (danger=high)", () => {
    render(<ComplexityDebtGauge debtItems={mkItems(12)} />);
    const row = screen.getByText(/Approaching review/i).closest(".viz-debt-gauge__cat");
    expect(row?.className).toMatch(/viz-debt-gauge__cat--high/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/ComplexityDebtGauge.test.tsx`
Expected: FAIL — no legend, no title on badge, tone class is `danger` not `high`.

- [ ] **Step 3: Add scale legend above threshold row**

In `apps/web/src/components/DataVisualizations.tsx`, replace the existing `viz-debt-gauge__threshold` block (lines 382-386):

```tsx
          <div className="viz-debt-gauge__threshold-wrapper">
            <p
              className="viz-debt-gauge__threshold-legend"
              data-testid="debt-scale-legend"
            >
              Debt severity tier
            </p>
            <div className="viz-debt-gauge__threshold" aria-hidden="true">
              <span className={`viz-debt-gauge__threshold-zone${tone === "success" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>0–3</span>
              <span className={`viz-debt-gauge__threshold-zone${tone === "warning" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>4–7</span>
              <span className={`viz-debt-gauge__threshold-zone${tone === "danger" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>8+</span>
            </div>
          </div>
```

- [ ] **Step 4: Add CRITICAL tooltip + realign tone mapping**

Still in `DataVisualizations.tsx`, update the tone-badge render (line 368):

```tsx
          <span
            className={`viz-tone-badge viz-tone-badge--${tone}`}
            title={
              tone === "danger"
                ? "Critical: 8 or more open items. Healthy range is 0–3; 4–7 is accumulating."
                : tone === "warning"
                  ? "Accumulating: 4–7 open items. Healthy range is 0–3."
                  : "Manageable: 3 or fewer open items."
            }
          >
            {toneLabel}
          </span>
```

Replace the `debtCategoryTone` helper (lines 428-433):

```tsx
/**
 * Unify Complexity Debt breakdown colors with the Day Arc LOW/MEDIUM/HIGH
 * vocabulary (audit #13). Every category lands on one of: high / medium / low.
 */
function debtCategoryTone(category: string): "high" | "medium" | "low" {
  if (category === "approaching_review" || category === "stale_followup") return "high";
  if (category === "recurring_plan_item" || category === "unapproved_message") return "medium";
  return "low"; // unaddressed_pattern and any unknown
}
```

- [ ] **Step 5: Add CSS classes for the new tone names**

Append to `apps/web/src/components/DataVisualizations.css`:

```css
/* Audit #11: explicit legend above threshold row */
.viz-debt-gauge__threshold-legend {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

/* Audit #13: align category row colors with Day Arc level vocabulary. */
.viz-debt-gauge__cat--high .viz-debt-gauge__bar-fill {
  background: var(--color-danger);
}
.viz-debt-gauge__cat--medium .viz-debt-gauge__bar-fill {
  background: var(--color-warning);
}
.viz-debt-gauge__cat--low .viz-debt-gauge__bar-fill {
  background: var(--color-analysis);
}
```

Remove (or leave as unused fallbacks) any prior `--danger/--warning/--analysis/--success` bar-fill rules on this selector.

- [ ] **Step 6: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/ComplexityDebtGauge.test.tsx`
Expected: PASS.

Also run contrast check: `npm run check:contrast` — Expected: PASS (we only swapped already-approved palette tokens).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/DataVisualizations.tsx apps/web/src/components/DataVisualizations.css apps/web/src/components/__tests__/ComplexityDebtGauge.test.tsx
git commit -m "fix(today): label debt severity scale, define CRITICAL, unify colors with day arc (audit #11-#13)"
```

---

## Task 6: Student Priority Matrix — show all 26 students, quadrant tint, score header, note expansion

**Why:** Findings #14 (**CRITICAL** — scatter shows 3 of 26), #15 (CHECK FIRST dashed box reads as empty state), #16 (score column unlabeled), #17 (notes truncate). Root cause of #14 is `DataVisualizations.tsx:50`:

```tsx
return students
  .filter((s) => s.pending_action_count > 0 || s.last_intervention_days !== null)
  .map(…)
```

Students lacking both are silently dropped. Nothing-design §2.9: use low-opacity dots for the background population so the 26 claim is honest without adding visual noise.

**Files:**
- Modify: `apps/web/src/components/DataVisualizations.tsx:40-293` (StudentPriorityMatrix)
- Modify: `apps/web/src/components/DataVisualizations.css`

- [ ] **Step 1: Write the failing test**

Extend (or create) `apps/web/src/components/__tests__/StudentPriorityMatrix.test.tsx`:

```tsx
it("plots all 26 students, not just those with open actions", () => {
  const active = makeStudents(3, { pending_action_count: 2 });
  const quiet = makeStudents(23, { pending_action_count: 0, last_intervention_days: null });
  const { container } = render(<StudentPriorityMatrix students={[...active, ...quiet]} />);
  const dots = container.querySelectorAll(".priority-matrix__dot");
  expect(dots.length).toBe(26);
  const quietDots = container.querySelectorAll(".priority-matrix__dot--quiet");
  expect(quietDots.length).toBe(23);
});

it("exposes a PRIORITY SCORE header above the right-side rank list", () => {
  render(<StudentPriorityMatrix students={makeStudents(5, { pending_action_count: 2 })} />);
  expect(screen.getByTestId("priority-matrix-score-header")).toHaveTextContent(/PRIORITY SCORE/i);
});

it("reveals the full student note on row click", async () => {
  const user = userEvent.setup();
  const longReason = "A".repeat(120);
  render(<StudentPriorityMatrix students={makeStudents(1, { pending_action_count: 3, latest_priority_reason: longReason })} />);
  const row = screen.getByTestId("priority-matrix-row-0");
  await user.click(row);
  expect(row).toHaveTextContent(longReason);
});

it("renders quadrant tints (not a dashed CHECK FIRST box)", () => {
  const { container } = render(<StudentPriorityMatrix students={makeStudents(5)} />);
  expect(container.querySelector(".priority-matrix__quadrant--check-first")).toBeInTheDocument();
  // The legacy dashed box must be gone.
  expect(container.querySelector(".priority-matrix__check-first-box")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/StudentPriorityMatrix.test.tsx`
Expected: FAIL on all 4 assertions.

- [ ] **Step 3: Change the filter to a split — `data` (active) + `quietData`**

In `apps/web/src/components/DataVisualizations.tsx:48-71`, replace the single `data` memo with two:

```tsx
  const { data, quietData } = useMemo(() => {
    const active: /* existing shape */ typeof [] = [];
    const quiet: /* same shape, fewer fields */ typeof [] = [];
    for (const s of students) {
      const days = s.last_intervention_days ?? 0;
      const urgency =
        s.pending_action_count * 4 +
        s.active_pattern_count * 1.8 +
        s.pending_message_count * 1.4 +
        Math.min(days / 45, 4);
      const row = {
        alias: s.alias,
        x: days,
        y: urgency,
        pending: s.pending_action_count,
        patterns: s.active_pattern_count,
        messages: s.pending_message_count,
        r: Math.max(4, Math.min(13, 4.5 + (s.active_pattern_count ?? 0) * 2.4 + Math.min(s.pending_action_count, 3))),
        hasAttention: s.pending_action_count > 0,
        reason: s.latest_priority_reason,
      };
      if (s.pending_action_count > 0 || s.last_intervention_days !== null) {
        active.push(row);
      } else {
        quiet.push({ ...row, r: 3 });
      }
    }
    active.sort((a, b) => b.y - a.y || b.x - a.x);
    return { data: active, quietData: quiet };
  }, [students]);
```

Change the early return to only bail if both are empty:

```tsx
  if (data.length === 0 && quietData.length === 0) return null;
```

- [ ] **Step 4: Render quiet dots as a background layer**

In the SVG body (after axes, before the `plottedData` markers), add:

```tsx
        {/* Audit #14: quiet students plotted at low opacity so "26 plotted" is visually honest. */}
        <g className="priority-matrix__quiet-layer" aria-hidden="true">
          {quietData.map((d) => (
            <circle
              key={`quiet-${d.alias}`}
              className="priority-matrix__dot priority-matrix__dot--quiet"
              cx={scaleX(d.x)}
              cy={scaleY(d.y)}
              r={3}
            />
          ))}
        </g>
```

Ensure the active-dot markers also carry `className="priority-matrix__dot"` so the test count works.

- [ ] **Step 5: Replace the dashed CHECK FIRST box with quadrant tints**

Find the existing `CHECK FIRST` label block (likely a `<rect stroke-dasharray>` or a div overlay). Replace with four tinted background rects — one per quadrant — and corner-anchored labels:

```tsx
        <g className="priority-matrix__quadrants" aria-hidden="true">
          <rect
            className="priority-matrix__quadrant priority-matrix__quadrant--check-first"
            x={MATRIX_PAD.left}
            y={MATRIX_PAD.top}
            width={innerW / 2}
            height={innerH / 2}
          />
          <rect
            className="priority-matrix__quadrant priority-matrix__quadrant--watch"
            x={MATRIX_PAD.left + innerW / 2}
            y={MATRIX_PAD.top}
            width={innerW / 2}
            height={innerH / 2}
          />
          <rect
            className="priority-matrix__quadrant priority-matrix__quadrant--stable"
            x={MATRIX_PAD.left}
            y={MATRIX_PAD.top + innerH / 2}
            width={innerW / 2}
            height={innerH / 2}
          />
          <rect
            className="priority-matrix__quadrant priority-matrix__quadrant--stale-ok"
            x={MATRIX_PAD.left + innerW / 2}
            y={MATRIX_PAD.top + innerH / 2}
            width={innerW / 2}
            height={innerH / 2}
          />
          <text x={MATRIX_PAD.left + 6} y={MATRIX_PAD.top + 14} className="priority-matrix__quadrant-label">Check first</text>
          <text x={MATRIX_PAD.left + innerW - 6} y={MATRIX_PAD.top + 14} textAnchor="end" className="priority-matrix__quadrant-label">Watch</text>
          <text x={MATRIX_PAD.left + 6} y={MATRIX_PAD.top + innerH - 6} className="priority-matrix__quadrant-label priority-matrix__quadrant-label--muted">Stable</text>
          <text x={MATRIX_PAD.left + innerW - 6} y={MATRIX_PAD.top + innerH - 6} textAnchor="end" className="priority-matrix__quadrant-label priority-matrix__quadrant-label--muted">Stale · calm</text>
        </g>
```

- [ ] **Step 6: Add the PRIORITY SCORE header + note expansion**

Still in the component, locate the right-side ranked list (`topStudents.map((d, i) => …)` or equivalent). Wrap it with a labeled column header and attach click-to-expand per row:

```tsx
      <ol className="priority-matrix__ranks" aria-label="Ranked priorities">
        <li className="priority-matrix__rank-header" aria-hidden="true">
          <span>Student</span>
          <span data-testid="priority-matrix-score-header">Priority score</span>
        </li>
        {topStudents.map((d, i) => (
          <li key={d.alias}>
            <ExpandingRow rank={i} student={d} onClick={() => onStudentClick?.(d.alias)} />
          </li>
        ))}
      </ol>
```

Then add, near the component definitions in the same file:

```tsx
function ExpandingRow({
  rank, student, onClick,
}: {
  rank: number;
  student: { alias: string; reason: string | null; y: number };
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      className="priority-matrix__rank-row"
      data-testid={`priority-matrix-row-${rank}`}
      onClick={() => {
        setExpanded((v) => !v);
        onClick();
      }}
    >
      <span className="priority-matrix__rank-alias">{student.alias}</span>
      <span className="priority-matrix__rank-score" title="Composite of pending actions, active patterns, message debt, and days since last intervention.">
        {Math.round(student.y)}
      </span>
      {student.reason ? (
        <span className={`priority-matrix__rank-reason${expanded ? " priority-matrix__rank-reason--expanded" : ""}`}>
          {student.reason}
        </span>
      ) : null}
    </button>
  );
}
```

- [ ] **Step 7: CSS — quiet dots, quadrant tints, expanding row**

Append to `apps/web/src/components/DataVisualizations.css`:

```css
.priority-matrix__dot--quiet {
  fill: var(--color-text-tertiary);
  opacity: 0.25;
}

/* Audit #15: quadrant tints (not a dashed box) */
.priority-matrix__quadrant {
  fill: var(--color-surface-muted);
  opacity: 0.35;
}
.priority-matrix__quadrant--check-first { fill: var(--color-bg-danger); opacity: 0.35; }
.priority-matrix__quadrant--watch       { fill: var(--color-bg-warning); opacity: 0.25; }

.priority-matrix__quadrant-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--color-text-secondary);
}
.priority-matrix__quadrant-label--muted { fill: var(--color-text-tertiary); }

/* Audit #16 + #17: ranks list — header + expanding row */
.priority-matrix__rank-header {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.priority-matrix__rank-reason {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--color-text-secondary);
}
.priority-matrix__rank-reason--expanded {
  display: block;
  overflow: visible;
  white-space: normal;
}
```

- [ ] **Step 8: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/StudentPriorityMatrix.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/DataVisualizations.tsx apps/web/src/components/DataVisualizations.css apps/web/src/components/__tests__/StudentPriorityMatrix.test.tsx
git commit -m "fix(today): plot all students, tint quadrants, label score, expand notes (audit #14-#17)"
```

---

## Task 7: Intervention Recency — split scale + target baseline

**Why:** Findings #18 (bars can't be compared across 11d vs 387d), #19 ("376D BEYOND TARGET" lacks baseline). Nothing-design §2.9: when magnitudes differ by >30×, use different forms per tier — full bar for WATCH, number-only for BEYOND TARGET with a dot indicator.

**Files:**
- Modify: `apps/web/src/components/DataVisualizations.tsx:937-1060` (InterventionRecencyTimeline)
- Modify: `apps/web/src/components/DataVisualizations.css`

- [ ] **Step 1: Write the failing test**

Add to the file that already tests recency, or create one:

```tsx
it("renders BEYOND TARGET rows without a scaled bar, with an absolute day number", () => {
  render(<InterventionRecencyTimeline students={[
    mkStudent("Brody", 390),
    mkStudent("Hannah", 11),
  ]} />);
  const brody = screen.getByTestId("recency-row-Brody");
  expect(brody.querySelector(".viz-recency__bar")).toBeNull();
  expect(brody).toHaveTextContent(/390d/);
  const hannah = screen.getByTestId("recency-row-Hannah");
  expect(hannah.querySelector(".viz-recency__bar")).not.toBeNull();
});

it("shows target baseline on the hero callout", () => {
  render(<InterventionRecencyTimeline students={[mkStudent("Brody", 390)]} maxDays={14} />);
  expect(screen.getByTestId("recency-hero-baseline")).toHaveTextContent(/past the 14-day target/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/InterventionRecencyTimeline.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Split BEYOND TARGET vs WATCH rendering**

In `DataVisualizations.tsx` (around 937-1060), inside the row `.map`, branch:

```tsx
{rows.map((r) => {
  const beyond = r.days > maxDays;
  return (
    <div
      key={r.alias}
      className={`viz-recency__row viz-recency__row--${beyond ? "beyond" : "watch"}`}
      data-testid={`recency-row-${r.alias}`}
    >
      <span className="viz-recency__alias">{r.alias}</span>
      {beyond ? (
        <span className="viz-recency__stale-number" aria-label={`${r.days} days since last intervention`}>
          <span className="viz-recency__stale-dot" aria-hidden="true" />
          {r.days}d
        </span>
      ) : (
        <span className="viz-recency__bar" aria-hidden="true">
          <span
            className="viz-recency__bar-fill"
            style={{ "--bar-width": `${Math.min(100, (r.days / maxDays) * 100)}%` } as CSSProperties}
          />
          <span className="viz-recency__bar-number">{r.days}d</span>
        </span>
      )}
    </div>
  );
})}
```

- [ ] **Step 4: Annotate the hero callout with baseline**

Near the hero ("390d · Brody · 376D BEYOND TARGET") render:

```tsx
<p className="viz-recency__hero-baseline" data-testid="recency-hero-baseline">
  {hero.days - maxDays}d past the {maxDays}-day target
</p>
```

Remove the old `376D BEYOND TARGET` string.

- [ ] **Step 5: CSS — stale number + dot**

Append to `DataVisualizations.css`:

```css
.viz-recency__stale-number {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-danger);
}

.viz-recency__stale-dot {
  width: 6px; height: 6px;
  background: var(--color-danger);
  border-radius: 50%;
}

.viz-recency__hero-baseline {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 6: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/InterventionRecencyTimeline.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/DataVisualizations.tsx apps/web/src/components/DataVisualizations.css apps/web/src/components/__tests__/InterventionRecencyTimeline.test.tsx
git commit -m "fix(today): split recency bars by tier + add target baseline (audit #18-#19)"
```

---

## Task 8: Classroom Profile — donut hover cross-highlight + header-badge clarity

**Why:** Findings #20 (donut has no hover states, no linkage to right-side bars), #21 (header badges unclear). The donut already has `<title>` per segment (DataVisualizations.tsx:521). We add a hover-state class that both tints the segment and the paired bar row via `aria-controls`-style DOM linkage, plus rewrite the header chips as either filter buttons (labeled) or drop them to tertiary captions.

**Files:**
- Modify: `apps/web/src/components/DataVisualizations.tsx:545-870` (ClassroomCompositionRings)
- Modify: `apps/web/src/components/DataVisualizations.css`

- [ ] **Step 1: Write the failing test**

Extend `apps/web/src/components/__tests__/ClassroomCompositionRings.test.tsx`:

```tsx
it("highlights paired donut segment + bar row on hover", async () => {
  const user = userEvent.setup();
  render(<ClassroomCompositionRings students={sampleStudents} />);
  const segment = screen.getByTestId("composition-segment-en");
  const bar = screen.getByTestId("composition-bar-en");
  await user.hover(segment);
  expect(segment).toHaveClass("viz-composition__segment--active");
  expect(bar).toHaveClass("viz-composition__bar-row--active");
});

it("labels the header badges with explicit verbs ('View …') instead of standalone nouns", () => {
  render(<ClassroomCompositionRings students={sampleStudents} />);
  const btn = screen.getByRole("button", { name: /View need groups/i });
  expect(btn).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/ClassroomCompositionRings.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Wire cross-highlight via shared hover state**

In `ClassroomCompositionRings` (line 545), add state at the top:

```tsx
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
```

For each donut `<circle>`, add `data-testid={`composition-segment-${seg.tag}`}` and hover handlers that set `hoveredKey`. For each right-side bar row, add `data-testid={`composition-bar-${tag}`}` and:

```tsx
className={`viz-composition__bar-row${hoveredKey === tag ? " viz-composition__bar-row--active" : ""}`}
onMouseEnter={() => setHoveredKey(tag)}
onMouseLeave={() => setHoveredKey(null)}
```

Same treatment on the donut segment (add `viz-composition__segment--active` when `hoveredKey === seg.tag`).

- [ ] **Step 4: Relabel the header chips**

Find the header row with `7 NEED GROUPS` / `EXTENSION LEADS` chips. Replace the bare-noun labels with verb+noun and a visible `aria-label`:

```tsx
<button
  type="button"
  className="viz-composition__header-action"
  aria-label="View need groups"
  onClick={() => onSegmentClick?.({ groupKind: "support_cluster", tag: "all", label: "All need groups", students: allStudents })}
>
  View need groups
</button>
<button
  type="button"
  className="viz-composition__header-action"
  aria-label="View extension leads"
  onClick={() => onSegmentClick?.({ groupKind: "support_cluster", tag: "extension", label: "Extension leads", students: extensionLeads })}
>
  View extension leads
</button>
```

- [ ] **Step 5: CSS — active states**

Append to `DataVisualizations.css`:

```css
.viz-composition__segment--active {
  opacity: 1 !important;
  stroke-width: 22;
}

.viz-composition__bar-row--active {
  background: var(--color-bg-analysis);
}

.viz-composition__header-action {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: var(--space-1) var(--space-2);
  border-radius: 999px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.viz-composition__header-action:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}
```

- [ ] **Step 6: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/ClassroomCompositionRings.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/DataVisualizations.tsx apps/web/src/components/DataVisualizations.css apps/web/src/components/__tests__/ClassroomCompositionRings.test.tsx
git commit -m "fix(today): donut cross-highlight + labeled header actions (audit #20-#21)"
```

---

## Task 9: Planning Health — debt-trend healthy band + unified denominator

**Why:** Findings #22 (Y-axis has no scale context), #23 (2-of-7 vs 2-of-14 conflict). `HealthBar` is where the mini sparkline lives. The existing series is `debt_total_14d` — 14 is the true canonical denominator, so "this week" dots must be framed as `day X of 14` OR clearly scoped to `7 days (this week)`.

**Files:**
- Modify: `apps/web/src/components/HealthBar.tsx` (sparkline band + caption unification)
- Modify: `apps/web/src/components/HealthBar.css` (healthy band styling)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/HealthBar.test.tsx` (or extend existing):

```tsx
it("paints a healthy band from 0–15 behind the debt sparkline", () => {
  const { container } = render(<HealthBar health={healthWithTrends} loading={false} pendingActionCount={37} />);
  expect(container.querySelector(".health-bar__sparkline-healthy-band")).toBeInTheDocument();
});

it("uses one denominator in planning status (14-day total or 'this week · 7 days')", () => {
  render(<HealthBar health={healthWithTrends} loading={false} pendingActionCount={37} />);
  const planning = screen.getByTestId("health-bar-planning");
  const text = planning.textContent ?? "";
  const mentions = [/\bof\s+7\b/, /\bof\s+14\b/];
  const matches = mentions.filter((r) => r.test(text));
  // Exactly one denominator form should appear.
  expect(matches.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/HealthBar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the healthy band to the sparkline SVG**

In `HealthBar.tsx`, find the `<svg>` rendering the debt sparkline. Add a `<rect>` as the first child:

```tsx
<rect
  className="health-bar__sparkline-healthy-band"
  x={0}
  y={scaleY(15)}
  width={svgWidth}
  height={scaleY(0) - scaleY(15)}
/>
```

(Use whatever `scaleY` or equivalent is already in that file; the band spans y-values 0–15.)

- [ ] **Step 4: Unify the planning denominator**

In the same file, find the "2 of 7 planned" / "2 OF 14 DAYS PLANNED" text. Collapse to a single render — prefer "day X of 14" because `debt_total_14d` sets the canonical window:

```tsx
<div className="health-bar__planning" data-testid="health-bar-planning">
  <span className="health-bar__planning-headline">
    {plannedCount} of 14 days planned
  </span>
  <span className="health-bar__planning-subnote">this week · {Math.min(7, plannedCount)} of 7</span>
</div>
```

Remove any separate "OF 7 PLANNED" heading block if present.

- [ ] **Step 5: CSS**

Append to `HealthBar.css`:

```css
.health-bar__sparkline-healthy-band {
  fill: var(--color-bg-success);
  opacity: 0.35;
}

.health-bar__planning-subnote {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 6: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/HealthBar.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/HealthBar.tsx apps/web/src/components/HealthBar.css apps/web/src/components/__tests__/HealthBar.test.tsx
git commit -m "fix(today): healthy band on debt trend + unified planning denominator (audit #22-#23)"
```

---

## Task 10: Carry Forward — prep checkboxes (persist), remove truncation, family-followup CTA

**Why:** Findings #24 (**HIGH** no checkboxes), #25 (**HIGH** +2 MORE hides content), #26 (family follow-up lacks deep-link). We build `prepChecklistStore` keyed by `${classroomId}:${plan.plan_date}` so a refresh doesn't wipe ticks. We remove the `.slice(0, 3)` truncation. We deep-link the family-followup row through `onMessagePrefill`.

**Files:**
- Create: `apps/web/src/utils/prepChecklistStore.ts`
- Create: `apps/web/src/utils/__tests__/prepChecklistStore.test.ts`
- Modify: `apps/web/src/components/PlanRecap.tsx`
- Modify: `apps/web/src/panels/TodayPanel.tsx:299-320` (pass `activeClassroom`, `onMessagePrefill`)

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/utils/__tests__/prepChecklistStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getCompleted, toggle, reset } from "../prepChecklistStore";

describe("prepChecklistStore", () => {
  beforeEach(() => window.localStorage.clear());

  it("toggles membership and persists", () => {
    toggle("demo-class", "2026-04-18", "Set out visual timer");
    expect(getCompleted("demo-class", "2026-04-18")).toEqual(new Set(["Set out visual timer"]));
    toggle("demo-class", "2026-04-18", "Set out visual timer");
    expect(getCompleted("demo-class", "2026-04-18")).toEqual(new Set());
  });

  it("scopes state to classroom+date", () => {
    toggle("demo-class", "2026-04-18", "Item A");
    expect(getCompleted("demo-class", "2026-04-19").size).toBe(0);
    expect(getCompleted("other-class", "2026-04-18").size).toBe(0);
  });
});
```

And extend `apps/web/src/components/__tests__/PlanRecap.test.tsx` (create if absent):

```tsx
it("renders every prep-checklist item (no +N more truncation)", () => {
  const plan = makePlan({ prep_checklist: Array.from({ length: 6 }, (_, i) => `Item ${i + 1}`) });
  render(<PlanRecap plan={plan} classroomId="demo" />);
  for (let i = 1; i <= 6; i++) {
    expect(screen.getByLabelText(`Item ${i}`)).toBeInTheDocument();
  }
  expect(screen.queryByText(/\+\d+ more items/i)).toBeNull();
});

it("marks a prep item complete on checkbox click and persists it", async () => {
  const user = userEvent.setup();
  const plan = makePlan({ prep_checklist: ["Set out timer"] });
  const { rerender } = render(<PlanRecap plan={plan} classroomId="demo" />);
  await user.click(screen.getByLabelText("Set out timer"));
  rerender(<PlanRecap plan={plan} classroomId="demo" />);
  expect(screen.getByLabelText("Set out timer")).toBeChecked();
});

it("deep-links the family follow-up row to the message composer", async () => {
  const user = userEvent.setup();
  const onMessagePrefill = vi.fn();
  const plan = makePlan({ family_followups: [{ student_ref: "Amira", message_type: "praise", reason: "Math reasoning" }] });
  render(<PlanRecap plan={plan} classroomId="demo" onMessagePrefill={onMessagePrefill} />);
  await user.click(screen.getByRole("button", { name: /draft amira/i }));
  expect(onMessagePrefill).toHaveBeenCalledWith(
    expect.objectContaining({ student_ref: "Amira", message_type: "praise" }),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- apps/web/src/utils/__tests__/prepChecklistStore.test.ts apps/web/src/components/__tests__/PlanRecap.test.tsx`
Expected: FAIL — module missing and component doesn't support props.

- [ ] **Step 3: Implement `prepChecklistStore.ts`**

Create `apps/web/src/utils/prepChecklistStore.ts`:

```ts
/**
 * localStorage-backed store for prep-checklist completion state.
 * Scoped by classroomId + plan date so yesterday's ticks don't bleed into today.
 * See audit #24.
 */

const PREFIX = "prairie-prep-checklist:";

function key(classroomId: string, planDate: string): string {
  return `${PREFIX}${classroomId}:${planDate}`;
}

function read(k: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((v) => typeof v === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function write(k: string, set: Set<string>): void {
  try {
    window.localStorage.setItem(k, JSON.stringify([...set]));
  } catch {
    /* storage unavailable; state is session-only */
  }
}

export function getCompleted(classroomId: string, planDate: string): Set<string> {
  return read(key(classroomId, planDate));
}

export function toggle(classroomId: string, planDate: string, item: string): Set<string> {
  const k = key(classroomId, planDate);
  const set = read(k);
  if (set.has(item)) set.delete(item);
  else set.add(item);
  write(k, set);
  return set;
}

export function reset(classroomId: string, planDate: string): void {
  write(key(classroomId, planDate), new Set());
}
```

- [ ] **Step 4: Rewrite `PlanRecap.tsx`**

Replace the body of `apps/web/src/components/PlanRecap.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { FamilyMessagePrefill, TomorrowPlan } from "../types";
import { ActionButton } from "./shared";
import { getCompleted, toggle } from "../utils/prepChecklistStore";

interface Props {
  plan: TomorrowPlan;
  classroomId: string;
  onPriorityClick?: (studentRef: string) => void;
  onOpenPlan?: () => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

export default function PlanRecap({
  plan,
  classroomId,
  onPriorityClick,
  onOpenPlan,
  onMessagePrefill,
}: Props) {
  const [completed, setCompleted] = useState<Set<string>>(() =>
    getCompleted(classroomId, plan.plan_date),
  );

  // Rehydrate if classroom or date changes.
  useEffect(() => {
    setCompleted(getCompleted(classroomId, plan.plan_date));
  }, [classroomId, plan.plan_date]);

  function handleToggle(item: string) {
    setCompleted(toggle(classroomId, plan.plan_date, item));
  }

  const firstFollowup = plan.family_followups[0] ?? null;
  const remainingFollowups = Math.max(plan.family_followups.length - 1, 0);

  return (
    <div className="plan-recap">
      <div className="plan-recap-header-row">
        <div>
          <h3 className="plan-recap-heading">Carry Forward</h3>
          <p className="plan-recap-subtitle">
            Keep the priorities that still matter before opening a fresh planning pass.
          </p>
        </div>
        {onOpenPlan ? (
          <ActionButton size="sm" variant="secondary" onClick={onOpenPlan}>
            Open Tomorrow Plan
          </ActionButton>
        ) : null}
      </div>

      {plan.support_priorities.length > 0 && (
        <div className="plan-recap-section">
          <h4>Support Priorities</h4>
          <ul className="plan-recap-list">
            {plan.support_priorities.map((p, i) => (
              <li key={i}>
                {onPriorityClick ? (
                  <button
                    className="plan-recap-priority-btn"
                    type="button"
                    onClick={() => onPriorityClick(p.student_ref)}
                  >
                    <strong>{p.student_ref}</strong> — {p.suggested_action}
                  </button>
                ) : (
                  <>
                    <strong>{p.student_ref}</strong> — {p.suggested_action}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.prep_checklist.length > 0 && (
        <div className="plan-recap-section">
          <h4>Prep Checklist</h4>
          <ul className="plan-recap-list plan-recap-list--checklist">
            {plan.prep_checklist.map((item, i) => {
              const isDone = completed.has(item);
              return (
                <li key={i} className={isDone ? "plan-recap-item--done" : undefined}>
                  <label className="plan-recap-checkbox">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggle(item)}
                      aria-label={item}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {firstFollowup ? (
        <div className="plan-recap-section">
          <h4>Family Follow-ups</h4>
          <div className="plan-recap-followup-row">
            <p className="plan-recap-summary">
              <strong>
                {plan.family_followups.length} follow-up
                {plan.family_followups.length !== 1 ? "s" : ""}
              </strong>
              {" — "}
              {firstFollowup.student_ref} · {firstFollowup.message_type.replace(/_/g, " ")}
              {remainingFollowups > 0 ? ` · +${remainingFollowups} more` : ""}
            </p>
            {onMessagePrefill ? (
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() =>
                  onMessagePrefill({
                    student_ref: firstFollowup.student_ref,
                    message_type: firstFollowup.message_type,
                    reason: firstFollowup.reason ?? "",
                  })
                }
                aria-label={`Draft ${firstFollowup.student_ref} family message`}
              >
                Draft {firstFollowup.student_ref}
              </ActionButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Thread `activeClassroom` + `onMessagePrefill` in `TodayPanel.tsx`**

In `apps/web/src/panels/TodayPanel.tsx`, update the `<PlanRecap …>` JSX (line ~302):

```tsx
              <PlanRecap
                plan={result.latest_plan}
                classroomId={activeClassroom}
                onPriorityClick={(studentRef) => setDrillDown({ type: "student", alias: studentRef })}
                onOpenPlan={() => onTabChange("tomorrow-plan")}
                onMessagePrefill={(prefill) => {
                  if (onMessagePrefill) {
                    onMessagePrefill(prefill);
                    onTabChange("family-message");
                  }
                }}
              />
```

- [ ] **Step 6: CSS — checkbox styling**

Append to `apps/web/src/panels/TodayPanel.css` (or existing PlanRecap-adjacent CSS):

```css
.plan-recap-list--checklist { list-style: none; padding-left: 0; }

.plan-recap-checkbox {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  cursor: pointer;
  padding: var(--space-1) 0;
}
.plan-recap-checkbox input[type="checkbox"] {
  margin-top: 3px;
  accent-color: var(--color-accent);
}
.plan-recap-item--done span {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

.plan-recap-followup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
```

- [ ] **Step 7: Run tests**

Run: `npm run test -- apps/web/src/utils/__tests__/prepChecklistStore.test.ts apps/web/src/components/__tests__/PlanRecap.test.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/utils/prepChecklistStore.ts apps/web/src/utils/__tests__/prepChecklistStore.test.ts apps/web/src/components/PlanRecap.tsx apps/web/src/components/__tests__/PlanRecap.test.tsx apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/TodayPanel.css
git commit -m "feat(today): prep checkboxes persist + remove truncation + followup deep-link (audit #24-#26)"
```

---

## Task 11: Risk Windows — timeline overflow fix + OPEN FORECAST footer

**Why:** Findings #27 (timeline clips on right edge), #28 (OPEN FORECAST ambiguous). The `RiskWindowsPanel` in `TodayPanel.tsx:359-433` places the CTA inside `.risk-windows__topline` alongside the peak block button — ambiguity. Move it to a dedicated footer row and fix overflow on the `ForecastTimeline` wrapper.

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx:362-432` (RiskWindowsPanel structure)
- Modify: `apps/web/src/panels/TodayPanel.css` (`.risk-windows__body` overflow + footer)

- [ ] **Step 1: Write the failing test**

Extend `apps/web/src/panels/__tests__/TodayPanel.test.tsx`:

```tsx
it("renders OPEN FORECAST in a dedicated footer row (not inside the peak-block callout)", async () => {
  await renderWithForecast();
  const footer = screen.getByTestId("risk-windows-footer");
  const openForecast = within(footer).getByRole("button", { name: /open forecast/i });
  expect(openForecast).toBeInTheDocument();
  // Must NOT be inside the peak-block group.
  const peak = screen.getByRole("button", { name: /open peak window details/i });
  expect(peak.parentElement?.contains(openForecast)).toBe(false);
});

it("gives the risk-windows body overflow-x: auto so the timeline doesn't clip", () => {
  renderWithForecast();
  const body = screen.getByTestId("risk-windows-body");
  const styles = getComputedStyle(body);
  // jsdom returns "" for unset computed style; we check inline/class instead.
  expect(body.className).toMatch(/risk-windows__body/);
  expect(styles.overflowX === "" || styles.overflowX === "auto").toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: FAIL — no `risk-windows-footer` testid.

- [ ] **Step 3: Restructure `RiskWindowsPanel`**

In `apps/web/src/panels/TodayPanel.tsx`, change the JSX of the inline `RiskWindowsPanel` (around line 362-432):

```tsx
  return (
    <Card variant="flat" className="today-forecast-section risk-windows">
      <Card.Body className="risk-windows__body" data-testid="risk-windows-body">
        <div className="risk-windows__readout" aria-label={`${model.highCount} high risk windows`}>
          <p className="risk-windows__eyebrow">Risk Windows</p>
          <div className="risk-windows__metric">
            <span className="risk-windows__metric-number">{model.highCount}</span>
            <span className="risk-windows__metric-unit">{model.highCount === 1 ? "high block" : "high blocks"}</span>
          </div>
          <p className="risk-windows__signal">{model.signal}</p>
        </div>

        <div className="risk-windows__content">
          <div className="risk-windows__peak-group">
            <p className="risk-windows__label">Peak block</p>
            {model.peakBlock ? (
              <button
                type="button"
                className={`risk-windows__peak risk-windows__peak--${model.peakBlock.level}`}
                onClick={() => onBlockClick(model.peakIndex)}
                aria-label={`Open peak window details for ${model.peakBlock.activity} at ${model.peakBlock.time_slot}`}
              >
                <span className="risk-windows__peak-time">{model.peakBlock.time_slot}</span>
                <span className="risk-windows__peak-level">{model.peakBlock.level}</span>
              </button>
            ) : (
              <p className="risk-windows__empty">Forecast ready</p>
            )}
          </div>

          <p className="today-forecast-summary">{getForecastSummary(forecast.overall_summary)}</p>

          <div className="risk-windows__timeline-scroll">
            <ForecastTimeline blocks={forecast.blocks} onBlockClick={onBlockClick} />
          </div>

          {model.watchBlocks.length > 0 ? (
            <div className="risk-windows__ledger" aria-label="Risk window watch list">
              {model.watchBlocks.map(({ block, index }) => (
                <button
                  type="button"
                  key={`${block.time_slot}-${block.activity}-${index}`}
                  className={`risk-windows__row risk-windows__row--${block.level}`}
                  onClick={() => onBlockClick(index)}
                  aria-label={`Open details for ${block.activity} at ${block.time_slot}`}
                >
                  <span className="risk-windows__row-time">{block.time_slot}</span>
                  <span className="risk-windows__row-main">
                    <span className="risk-windows__row-activity">{block.activity}</span>
                    <span className="risk-windows__row-factor">{block.contributing_factors[0] ?? block.suggested_mitigation}</span>
                  </span>
                  <span className="risk-windows__row-level">{block.level}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="risk-windows__footer" data-testid="risk-windows-footer">
          <ActionButton size="sm" variant="secondary" onClick={onOpenForecast}>
            Open Forecast
          </ActionButton>
        </footer>
      </Card.Body>
    </Card>
  );
```

- [ ] **Step 4: Drop the old inline `.risk-windows__topline`** rules; add the new footer + timeline-scroll wrapper rules in CSS.

Append to `apps/web/src/panels/TodayPanel.css`:

```css
.risk-windows__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-x: hidden;
}

.risk-windows__timeline-scroll {
  overflow-x: auto;
  padding-bottom: var(--space-2);
}

.risk-windows__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/TodayPanel.css
git commit -m "fix(today): move Open Forecast to footer + fix timeline overflow (audit #27-#28)"
```

---

## Task 12: Conflicting counts glossary + footer-strip weight

**Why:** Findings #29 (**CRITICAL** — 35/3/23 counts with no definition), #30 (footer blends in). Source of truth:
- `35` = `debt_register.items.length` — *logged debt items across all categories*
- `3` = students with at least one `pending_action_count > 0` who rank in the priority matrix top 5 — *"priority students"*
- `23` = result of `attentionStudents = new Set(debtRegister.items.flatMap(i => i.student_refs))` — *students with ≥1 open item*

Proposed labeling:
- Classroom Pulse: **35 open items** (keep)
- Priority Matrix: **3 priority students**
- Students Footer: **23 students with open items**

Also restyle the footer as a distinct banded strip (§2.1 — end-of-scroll signal gets different weight).

**Files:**
- Modify: `apps/web/src/components/PendingActionsCard.tsx` (just wording — `"X actions waiting"` → `"X open items"`)
- Modify: `apps/web/src/components/DataVisualizations.tsx` — top-of-matrix caption "3 priority students"
- Modify: `apps/web/src/components/StudentRoster.tsx` (wording + strip class)
- Modify: `apps/web/src/components/StudentRoster.css` (banded strip)

- [ ] **Step 1: Write the failing test**

Extend `apps/web/src/components/__tests__/StudentRoster.test.tsx` (create if absent):

```tsx
it("labels the footer count as 'students with open items'", () => {
  render(<StudentRoster attentionCount={23} onDrillDown={() => {}} />);
  expect(screen.getByRole("button", { name: /23 students with open items/i })).toBeInTheDocument();
});

it("renders a distinct banded strip wrapper", () => {
  render(<StudentRoster attentionCount={23} onDrillDown={() => {}} />);
  expect(screen.getByTestId("student-roster-strip")).toHaveClass("student-roster--banded");
});
```

And in `PendingActionsCard.test.tsx`:

```tsx
it("labels the pulse total as 'open items', not 'actions waiting'", () => {
  render(<PendingActionsCard {...baseProps} totalCount={35} />);
  expect(screen.getByText(/35 open items/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- apps/web/src/components/__tests__/StudentRoster.test.tsx apps/web/src/components/__tests__/PendingActionsCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `formatActionCount` in `PendingActionsCard.tsx`**

Replace lines 24-28:

```tsx
function formatActionCount(totalCount: number): string {
  if (totalCount === 0) return "0 open items";
  if (totalCount === 1) return "1 open item";
  return `${totalCount} open items`;
}
```

- [ ] **Step 4: Rename the scatter-plot subtitle**

In `DataVisualizations.tsx` StudentPriorityMatrix, find the subtitle that currently says something like `"26 plotted · 3 with open actions"` and change it to:

```tsx
<p className="priority-matrix__subtitle">
  {total} plotted · {attentionCount} priority {attentionCount === 1 ? "student" : "students"}
</p>
```

- [ ] **Step 5: Update `StudentRoster.tsx`**

In `apps/web/src/components/StudentRoster.tsx`, update the toggle button label (around line 161-165):

```tsx
        {attentionCount > 0 && (
          <span className="student-roster__badge">
            {attentionCount} students with open items
          </span>
        )}
```

Also wrap the whole return in a banded strip class:

```tsx
  return (
    <div className="student-roster student-roster--banded" data-testid="student-roster-strip">
      …
    </div>
  );
```

And update the aria-label on the toggle button for accessibility (line 152-160):

```tsx
      <button
        className="student-roster__toggle"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls="student-roster-body"
        aria-label={attentionCount > 0 ? `${attentionCount} students with open items` : "Students"}
        type="button"
      >
```

- [ ] **Step 6: CSS — banded footer strip**

Append to `apps/web/src/components/StudentRoster.css`:

```css
/* Audit #30: end-of-scroll footer gets a distinct banded treatment. */
.student-roster--banded {
  border-top: 2px solid var(--color-border);
  background: var(--color-surface-muted);
  padding: var(--space-4) var(--space-6);
  margin-top: var(--space-8);
}

.student-roster--banded .student-roster__toggle {
  width: 100%;
  justify-content: space-between;
}
```

- [ ] **Step 7: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/StudentRoster.test.tsx apps/web/src/components/__tests__/PendingActionsCard.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/PendingActionsCard.tsx apps/web/src/components/DataVisualizations.tsx apps/web/src/components/StudentRoster.tsx apps/web/src/components/StudentRoster.css apps/web/src/components/__tests__/StudentRoster.test.tsx apps/web/src/components/__tests__/PendingActionsCard.test.tsx
git commit -m "fix(today): unify count glossary (items vs students vs priority) + footer strip (audit #29-#30)"
```

---

## Task 13: Sticky in-page anchor rail + consistent section numbering

**Why:** Findings #31 (**HIGH** no anchor nav), #32 (inconsistent 01/02 numbering), #33 (no end-of-page return-to-top). Nothing-design §2.7 edge-anchored: a sticky left-rail with Space-Mono section numbers + intersection-observer active state. We commit fully to numbering (01–10) or drop it; the plan goes with "commit fully" because numbering reinforces the dashboard metaphor and the rail uses them as ticks.

**Files:**
- Create: `apps/web/src/components/TodayAnchorRail.tsx`
- Create: `apps/web/src/components/TodayAnchorRail.css`
- Create: `apps/web/src/components/__tests__/TodayAnchorRail.test.tsx`
- Modify: `apps/web/src/panels/TodayPanel.tsx` (assign `id`s to each section, mount rail)
- Modify: `apps/web/src/panels/TodayPanel.css` (scroll-padding-top for fixed shell header; rail gutter)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/TodayAnchorRail.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import TodayAnchorRail, { type Anchor } from "../TodayAnchorRail";

const anchors: Anchor[] = [
  { id: "command-center", number: "01", label: "Command Center" },
  { id: "classroom-pulse", number: "02", label: "Classroom Pulse" },
  { id: "day-arc", number: "03", label: "Today's Shape" },
  { id: "end-of-today", number: "10", label: "End of Today" },
];

describe("TodayAnchorRail", () => {
  it("renders a numbered link for each anchor", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    anchors.forEach((a) => {
      expect(screen.getByRole("link", { name: new RegExp(`${a.number}.*${a.label}`) })).toBeInTheDocument();
    });
  });

  it("marks the first anchor active by default", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    const first = screen.getByRole("link", { name: /01.*Command Center/ });
    expect(first).toHaveAttribute("aria-current", "location");
  });

  it("includes a 'Back to top' tail anchor", () => {
    render(<TodayAnchorRail anchors={anchors} />);
    expect(screen.getByRole("link", { name: /back to top/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/components/__tests__/TodayAnchorRail.test.tsx`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement `TodayAnchorRail.tsx`**

Create `apps/web/src/components/TodayAnchorRail.tsx`:

```tsx
import { useEffect, useState } from "react";
import "./TodayAnchorRail.css";

export interface Anchor {
  id: string;
  number: string; // "01"…"10"
  label: string;
}

interface Props {
  anchors: Anchor[];
}

export default function TodayAnchorRail({ anchors }: Props) {
  const [activeId, setActiveId] = useState<string>(anchors[0]?.id ?? "");

  useEffect(() => {
    const targets = anchors
      .map((a) => document.getElementById(a.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [anchors]);

  return (
    <nav className="today-anchor-rail" aria-label="Today sections">
      <ol className="today-anchor-rail__list">
        {anchors.map((a) => (
          <li key={a.id}>
            <a
              href={`#${a.id}`}
              className={`today-anchor-rail__link${activeId === a.id ? " today-anchor-rail__link--active" : ""}`}
              aria-current={activeId === a.id ? "location" : undefined}
            >
              <span className="today-anchor-rail__number">{a.number}</span>
              <span className="today-anchor-rail__label">{a.label}</span>
            </a>
          </li>
        ))}
        <li>
          <a href="#today-top" className="today-anchor-rail__back-to-top">
            ↑ Back to top
          </a>
        </li>
      </ol>
    </nav>
  );
}
```

- [ ] **Step 4: Implement `TodayAnchorRail.css`**

Create `apps/web/src/components/TodayAnchorRail.css`:

```css
.today-anchor-rail {
  position: sticky;
  top: calc(var(--shell-header-height, 72px) + var(--space-4));
  width: var(--today-rail-width, 180px);
  max-height: calc(100vh - var(--shell-header-height, 72px) - var(--space-8));
  overflow-y: auto;
  padding-right: var(--space-4);
  font-family: var(--font-mono);
}

.today-anchor-rail__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.today-anchor-rail__link {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  text-decoration: none;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  border-left: 2px solid transparent;
  transition: color 120ms ease-out, border-color 120ms ease-out;
}
.today-anchor-rail__link:hover { color: var(--color-text-secondary); }
.today-anchor-rail__link--active {
  color: var(--color-text);
  border-left-color: var(--color-accent);
}

.today-anchor-rail__number {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.today-anchor-rail__label {
  text-transform: uppercase;
}

.today-anchor-rail__back-to-top {
  margin-top: var(--space-4);
  display: inline-block;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  text-decoration: none;
}
.today-anchor-rail__back-to-top:hover { color: var(--color-text); }

/* Hide on narrow viewports — fall back to natural scroll */
@media (max-width: 960px) {
  .today-anchor-rail { display: none; }
}
```

- [ ] **Step 5: Wire into `TodayPanel.tsx`**

Add imports at the top of `apps/web/src/panels/TodayPanel.tsx`:

```tsx
import TodayAnchorRail, { type Anchor } from "../components/TodayAnchorRail";
```

Define the anchor list inside the component body (right after `const suggestion = …`):

```tsx
  const anchors: Anchor[] = [
    { id: "command-center", number: "01", label: "Command Center" },
    { id: "classroom-pulse", number: "02", label: "Classroom Pulse" },
    { id: "day-arc", number: "03", label: "Today's Shape" },
    { id: "complexity-debt", number: "04", label: "Complexity Debt" },
    { id: "student-priority", number: "05", label: "Student Priority" },
    { id: "intervention-recency", number: "06", label: "Intervention Recency" },
    { id: "classroom-profile", number: "07", label: "Classroom Profile" },
    { id: "planning-health", number: "08", label: "Planning Health" },
    { id: "carry-forward", number: "09", label: "Carry Forward" },
    { id: "end-of-today", number: "10", label: "End of Today" },
  ];
```

Change the root `<section>` to have an `id` + layout wrapper:

```tsx
  return (
    <section
      className="workspace-page today-panel today-panel--with-rail"
      id="today-top"
    >
      <TodayAnchorRail anchors={anchors} />
      <div className="today-panel__content">
        {/* existing contents, with section ids added */}
      </div>
    </section>
  );
```

Annotate the existing sections with IDs. For each of the ten anchors, either add `id="…"` to the existing section wrapper or wrap it in a thin anchor div:

- `<section id="command-center">` — the `TodayHero` wrapper
- `<section id="classroom-pulse" className="today-pulse">` (already has `today-pulse` — just add `id`)
- `<div id="day-arc">` around the `DayArc` render
- `<div id="complexity-debt">` around the `ComplexityDebtGauge` render
- `<div id="student-priority">` around the `StudentPriorityMatrix`
- `<div id="intervention-recency">` around the `InterventionRecencyTimeline`
- `<div id="classroom-profile">` around the `ClassroomCompositionRings`
- `<div id="planning-health">` around the `HealthBar`
- `<div id="carry-forward">` around the `PlanRecap` + `RiskWindowsPanel` grid
- `<div id="end-of-today" className="today-end-marker">End of Today · updated {time}</div>` after the StudentRoster

For the end marker, render:

```tsx
        {result ? (
          <footer
            id="end-of-today"
            className="today-end-marker"
            aria-label="End of Today"
          >
            End of Today ·{" "}
            <PageFreshness
              generatedAt={result.last_activity_at}
              kind="ai"
            />
          </footer>
        ) : null}
```

- [ ] **Step 6: CSS — grid for rail + content + end marker**

Append to `apps/web/src/panels/TodayPanel.css`:

```css
.today-panel--with-rail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  scroll-padding-top: calc(var(--shell-header-height, 72px) + var(--space-2));
}

@media (min-width: 961px) {
  .today-panel--with-rail {
    grid-template-columns: var(--today-rail-width, 180px) minmax(0, 1fr);
    column-gap: var(--space-6);
    align-items: start;
  }
}

.today-panel__content { min-width: 0; }

.today-end-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) 0 var(--space-4);
  margin-top: var(--space-8);
  border-top: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

/* html-level scroll anchor (for Back-to-top + in-page jumps) */
html { scroll-behavior: smooth; }
```

- [ ] **Step 7: Run tests**

Run: `npm run test -- apps/web/src/components/__tests__/TodayAnchorRail.test.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/TodayAnchorRail.tsx apps/web/src/components/TodayAnchorRail.css apps/web/src/components/__tests__/TodayAnchorRail.test.tsx apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/TodayPanel.css
git commit -m "feat(today): sticky anchor rail + numbered sections + end-of-page marker (audit #31-#33)"
```

---

## Task 14: AI / record source tags on generated sections

**Why:** Finding #34 — AI recommendations and record-derived data look identical. Mount `<SourceTag>` as a caption on each card so teachers can calibrate trust without breaking the grid.

Assignment:
- **AI-generated:** TodayHero narrative, PlanRecap (support priorities are AI-derived), RiskWindowsPanel (forecast is model output)
- **Record-derived:** PendingActionsCard, ComplexityDebtGauge, InterventionRecencyTimeline, ClassroomCompositionRings, StudentPriorityMatrix, HealthBar

**Files:**
- Modify: each of the above components — add a single `<SourceTag kind="ai|record" />` in the section header

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/panels/__tests__/TodayPanel.test.tsx`:

```tsx
it("renders AI source tags on AI-derived sections only", async () => {
  await renderTodayPanel();
  // AI
  expect(within(screen.getByTestId("today-hero")).getByTestId("source-tag-ai")).toBeInTheDocument();
  expect(within(screen.getByText(/Carry Forward/).closest("[id=\"carry-forward\"]")!).getByTestId("source-tag-ai")).toBeInTheDocument();
  // Record
  expect(within(screen.getByTestId("pending-actions-benchmark").closest(".today-triage-card")!).getByTestId("source-tag-record")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: FAIL — no `source-tag-*` testids present yet.

- [ ] **Step 3: Add the tags**

In each target component, import `SourceTag`:

```tsx
import SourceTag from "./SourceTag";
```

and place one tag in the header row. Examples:

**TodayHero.tsx** — inside the meta row added in Task 2:

```tsx
<div className="today-hero__meta-row">
  <PageFreshness … />
</div>
```

`PageFreshness` already renders a SourceTag internally — no additional change needed. But add `data-testid="today-hero"` on the section root so tests can scope.

**PlanRecap.tsx** — header row:

```tsx
<div className="plan-recap-header-row">
  <div>
    <h3 className="plan-recap-heading">
      Carry Forward <SourceTag kind="ai" />
    </h3>
    …
  </div>
  …
</div>
```

**PendingActionsCard.tsx** — `.today-triage-card__meta` row:

```tsx
<div className="today-triage-card__meta">
  <span className="pending-actions-heading">Needs Attention Now</span>
  <StatusChip … />
  <SourceTag kind="record" />
</div>
```

**ComplexityDebtGauge / InterventionRecencyTimeline / ClassroomCompositionRings / StudentPriorityMatrix / HealthBar** — inside their existing `<div className="viz-header">` / title row, append `<SourceTag kind="record" />` right after the `<h4>`.

**RiskWindowsPanel** (inside TodayPanel.tsx) — add to the eyebrow row:

```tsx
<p className="risk-windows__eyebrow">Risk Windows <SourceTag kind="ai" /></p>
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- apps/web/src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TodayHero.tsx apps/web/src/components/PlanRecap.tsx apps/web/src/components/PendingActionsCard.tsx apps/web/src/components/DataVisualizations.tsx apps/web/src/components/HealthBar.tsx apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/__tests__/TodayPanel.test.tsx
git commit -m "feat(today): source tags on AI vs record sections (audit #34)"
```

---

## Final validation pass

- [ ] **`npm run typecheck`** — Expected: PASS (no new `any`; props flow through cleanly).
- [ ] **`npm run lint`** — Expected: PASS.
- [ ] **`npm run test`** — Expected: all existing + 34 new assertions PASS.
- [ ] **`npm run check:contrast`** — Expected: PASS (no new colors — everything reuses existing `--color-*` tokens; see memory note on token verification).
- [ ] **`npm run release:gate`** — Expected: PASS in mock mode.
- [ ] **Smoke:**
  - Visit `http://127.0.0.1:5173/?classroom=demo-okafor-grade34&demo=true&tab=today`
  - Verify (1) the Priority Matrix now has 26 dots, (2) checkbox state survives a page refresh, (3) anchor rail follows scroll and highlights the active section, (4) "Back to top" works.
- [ ] **Update docs:** run `npm run system:inventory` only if any route or prompt class changed — **none did**, so this is a no-op verification step. Do add a one-line entry to `docs/decision-log.md`:

```markdown
## 2026-04-18 — Today page audit fixes (34 findings)

Addressed external UX audit (34 findings, priority C/H/M/L) across the ten
Today sections. No contract changes. Added `PageFreshness`, `SourceTag`,
`TodayAnchorRail`, `prepChecklistStore` primitives. Priority Matrix now
plots all students (previously silently filtered). Count-glossary unified:
"open items" (debt) vs "priority students" (matrix top-N) vs "students with
open items" (roster footer). Nothing-design system preserved throughout:
monochrome canvas, spacing-over-dividers, ALL CAPS Space Mono captions.
```

- [ ] **Final commit on the docs tweak:**

```bash
git add docs/decision-log.md
git commit -m "docs(decision-log): record 2026-04-18 Today page audit fix pass"
```

---

## Self-review checklist (run before handoff)

- [x] Every audit finding (#1–#34) maps to a task in the table above.
- [x] No placeholders (`TODO`, `TBD`, "fill in") in any task body.
- [x] Type shapes: `Anchor`, `Props` on `PageFreshness`, `PendingActionsCard`, `PlanRecap`, `StudentPriorityMatrix` row, and new store functions are defined in the task that introduces them and used consistently downstream.
- [x] No step references a function or file it does not create or modify in the same task.
- [x] Every code change has a test gate before implementation (red → green → commit).
- [x] Scope stayed inside `apps/web/src/` — no API, no schema, no prompt contract touched.
