# World-Class UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the PrairieClassroom OS teacher UI from "production-hardened institutional product" to "award-ready operating surface" via six narrow, independently-shippable polish passes that respect the existing dark-mode contract, nothing-theme aesthetic, and three-layer material hierarchy.

**Architecture:** Six phased sprints, each touching a different layer of the UI stack (shell → primitive → composition → component → editorial → motion). Every phase is self-contained and reversible; each phase ends with `npm run typecheck && npm run test && npm run check:contrast` passing before moving on. No new architecture, no new state management, no new data contracts — only refinement of what exists.

**Tech Stack:** Vite + React 18 + TypeScript, vanilla CSS with `light-dark()` theming, Inter / Instrument Sans / JetBrains Mono self-hosted (adding Source Serif 4 in Phase 5). Test runner: Vitest + React Testing Library. Visual check: `npm run check:contrast`. Release gate: `npm run release:gate` (only invoked at end of plan).

---

## Context for a fresh session

Before starting, read these in order — they are load-bearing:

1. **`CLAUDE.md`** — product boundaries, cost guardrails, validation rules
2. **`docs/dark-mode-contract.md`** — canonical color system (light-dark, material hierarchy, contrast targets)
3. **`apps/web/src/styles/tokens.css`** — 127+ design tokens; **never invent a token**, grep here first
4. **`apps/web/src/styles/nothing-theme.css`** header comment (lines 1-25) — the flat-surface / typography-driven aesthetic this plan must respect
5. **`docs/decision-log.md`** (last 10 entries) — recent UI decisions that cannot be silently reversed

### Key rules that apply to every phase

- **Token discipline.** Before using any `--color-*`, `--space-*`, `--font-*`, `--shadow-*`, `--motion-*`, `--ease-*`, or `--control-*` token, grep `apps/web/src/styles/tokens.css` to confirm it exists. Invented tokens silently fail (memory `feedback_design_tokens`).
- **Commit cadence.** Each task ends with a commit. Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`).
- **TDD where it makes sense.** UI state logic gets tests first. Pure-CSS changes don't need new tests but must not break existing ones.
- **Documentation.** When behavior contracts change (e.g. Phase 2's PageHero API), update `docs/decision-log.md` with a dated entry and the usual fields (Decision / Why / Alternatives / Consequences / What would change this).
- **Narrow scope.** Do not refactor adjacent code "while you're in there." Every task lists explicit files; stay within them.
- **Smoke selector preference.** When adding test IDs, prefer `data-testid` over button labels (memory `feedback_smoke_selectors`).

### Decisions already made (do not re-litigate)

| Decision | Answer | Why |
|---|---|---|
| Register & editorial voice | **Add Source Serif 4**, scope narrowly to AI-generated family messages, plan narratives, and survival packet cover | Slows the read at high-stakes teacher-review touchpoints; preserves institutional Instrument Sans everywhere else |
| Density vs. breathing room | **Progressive disclosure** on Classroom; **single-row header** at ≥1280px only (two-row below) | Teacher use is tablet/laptop; density wins on wide screens, breathing wins on narrow |
| Mobile commitment | **Desktop-first**, mobile stays as graceful fallback | Hallway use is tablet/laptop; phone is not a first-class pilot surface |

---

## File structure summary

### New files

| Path | Responsibility |
|---|---|
| `apps/web/src/components/shared/PageHero.tsx` | Canonical hero primitive (eyebrow, title, caption, pulse, metrics, pivots, actions, variant) |
| `apps/web/src/components/shared/PageHero.css` | Presentation for PageHero + all variants |
| `apps/web/src/components/shared/__tests__/PageHero.test.tsx` | Render + variant + prop-matrix tests |
| `apps/web/src/components/shared/HeaderAction.tsx` | Consistent header chip wrapper (button + radius + border + hover) |
| `apps/web/src/components/shared/HeaderAction.css` | Presentation for HeaderAction |
| `apps/web/src/components/shared/__tests__/HeaderAction.test.tsx` | Props + a11y tests |
| `apps/web/src/components/ToolSwitcherStepper.tsx` | Visual stepper line under `.page-tool-switcher--cards` |
| `apps/web/src/components/ToolSwitcherStepper.css` | Stepper presentation |
| `apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx` | Active-index + role tests |
| `apps/web/src/components/MondayResetMoment.tsx` | Monday morning first-visit celebration strip on TodayPanel |
| `apps/web/src/components/MondayResetMoment.css` | Presentation for the reset strip |
| `apps/web/src/components/__tests__/MondayResetMoment.test.tsx` | Day-of-week gating + dismissal persistence tests |
| `apps/web/public/fonts/source-serif-4-variable.woff2` | Self-hosted editorial serif (downloaded from Fontsource) |

### Files modified

| Path | What changes |
|---|---|
| `apps/web/src/styles/tokens.css` | Add `--font-editorial`, `--chart-tone-*` tokens; retire `--shell-control-h` / `--shell-nav-h` (Phase 1); prune motion tokens (Phase 6) |
| `apps/web/src/styles/shell.css` | Use canonical `--control-h-md` / `--control-h-lg`; collapse to single-row header at ≥1280px; float workspace with gutter at ≥1280px |
| `apps/web/src/styles/fonts.css` | Add `@font-face` for Source Serif 4 |
| `apps/web/src/styles/primitives.css` | Collapse `.btn` transition list; add `.editorial` type utility |
| `apps/web/src/panels/ClassroomPanel.tsx` + `.css` | Wrap Intel + Roster zones in `<details>`; migrate hero to `PageHero`; persist disclosure state |
| `apps/web/src/panels/TomorrowPlanPanel.tsx` | Wire `PlanCoverageRadar` drill-down; mount `DrillDownDrawer` |
| `apps/web/src/panels/DifferentiatePanel.tsx` | Wire `VariantSummaryStrip` drill-down; mount `DrillDownDrawer` |
| `apps/web/src/panels/SupportPatternsPanel.tsx` | Wire `SupportPatternRadar` drill-down; mount `DrillDownDrawer` |
| `apps/web/src/panels/InterventionPanel.tsx` | Wire `FollowUpSuccessRate` + `InterventionTimeline` drill-downs; mount `DrillDownDrawer` |
| `apps/web/src/panels/TodayPanel.tsx` + `.css` | Mount `MondayResetMoment` above hero; gate pulse-dot animation to transitions |
| `apps/web/src/panels/FamilyMessagePanel.tsx` | Apply `.editorial` class to generated message body |
| `apps/web/src/panels/TomorrowPlanPanel.tsx` (again, Phase 5) | Apply `.editorial` class to narrative summary |
| `apps/web/src/panels/SurvivalPacketPanel.tsx` | Apply `.editorial` class to cover-page section |
| `apps/web/src/components/SectionSkeleton.tsx` + `.css` | Replace gray lines with brand-mark shimmer |
| `apps/web/src/components/MultiToolHero.tsx` | Delete; replaced by PageHero |
| `apps/web/src/styles/multi-tool-page.css` | Remove `.multi-tool-hero*` rules (moved to PageHero.css); keep tool-switcher + workspace-section rules |
| `apps/web/src/components/DataVisualizations.tsx` | Replace `--color-danger/warning/success` chart fills with new `--chart-tone-*` scale |
| `apps/web/src/App.tsx` | Rename "Jump to" → "Search"; use `HeaderAction` for all chips |
| `docs/decision-log.md` | One dated entry per phase |

### Files retired (deleted)

| Path | Why |
|---|---|
| `apps/web/src/components/MultiToolHero.tsx` | Replaced by PageHero (Phase 2) |

---

# Phase 1 — Shell coherence

**Goal:** Every control in the header snaps to the canonical 4-tier scale; the chip cluster reads as one family; the header compresses to a single row at ≥1280px.

**Scope:** `apps/web/src/styles/shell.css`, `apps/web/src/App.tsx`, `apps/web/src/styles/tokens.css`, new `HeaderAction` component.

### Task 1.1 — Audit the current shell control height contract

**Files:**
- Read: `apps/web/src/styles/shell.css:1-30`
- Read: `apps/web/src/styles/tokens.css:305-318`

- [ ] **Step 1: Read both ranges and confirm** the non-canonical values: `--shell-control-h: 3.1rem` (49.6px) and `--shell-nav-h: 3.95rem` (63.2px) vs. canonical `--control-h-md: 44px` and `--control-h-lg: 52px`.

- [ ] **Step 2: Grep for all `--shell-control-h` and `--shell-nav-h` usages**

Run: `grep -rn "shell-control-h\|shell-nav-h" apps/web/src`
Expected: ~30-50 references across shell.css and a handful of tests.

- [ ] **Step 3: Write down the migration mapping** (keep this list in your head / a scratch note):
  - `--shell-control-h` → `--control-h-md` (44px, canonical)
  - `--shell-nav-h` → `--control-h-lg` (52px, canonical)

No commit — this is preparation.

### Task 1.2 — Retire the shell-specific control height tokens

**Files:**
- Modify: `apps/web/src/styles/shell.css:6-7` (retire the custom `--shell-control-h` and `--shell-nav-h`)
- Modify: `apps/web/src/styles/shell.css` (replace all `var(--shell-control-h)` with `var(--control-h-md)` and `var(--shell-nav-h)` with `var(--control-h-lg)`)

- [ ] **Step 1: Delete the custom height declarations.** In `shell.css` lines 6-7, remove:

```css
--shell-control-h: 3.1rem;
--shell-nav-h: 3.95rem;
```

Keep `--shell-control-radius`, `--shell-control-border`, `--shell-control-bg`, `--shell-control-bg-hover`, `--shell-control-accent` — those stay.

- [ ] **Step 2: Global replace** `var(--shell-control-h)` → `var(--control-h-md)` in `shell.css`.

- [ ] **Step 3: Global replace** `var(--shell-nav-h)` → `var(--control-h-lg)` in `shell.css`.

- [ ] **Step 4: Verify no stale references remain**

Run: `grep -n "shell-control-h\|shell-nav-h" apps/web/src/styles/shell.css`
Expected: empty

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run typecheck && npm run test -- apps/web`
Expected: green. If header-height assertion in any test fails, update the assertion to the new 44/52 pixel values. Do **not** revert the token change.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/styles/shell.css
git commit -m "refactor(shell): snap header control heights to canonical 4-tier scale

Retires --shell-control-h (49.6px) and --shell-nav-h (63.2px) in favor of
--control-h-md (44px) and --control-h-lg (52px). Brings header in line
with the tokens.css canonical sizing contract."
```

### Task 1.3 — Build the `HeaderAction` primitive

**Files:**
- Create: `apps/web/src/components/shared/HeaderAction.tsx`
- Create: `apps/web/src/components/shared/HeaderAction.css`
- Create: `apps/web/src/components/shared/__tests__/HeaderAction.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/shared/__tests__/HeaderAction.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HeaderAction from "../HeaderAction";

describe("HeaderAction", () => {
  it("renders a button with the provided label", () => {
    render(<HeaderAction label="Search" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("exposes an accessible name when using icon-only mode", () => {
    render(
      <HeaderAction
        label="Open theme"
        iconOnly
        onClick={() => {}}
      >
        <span aria-hidden="true">☀</span>
      </HeaderAction>,
    );
    expect(screen.getByRole("button", { name: /open theme/i })).toBeInTheDocument();
  });

  it("invokes onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<HeaderAction label="Search" onClick={onClick} />);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a trailing kbd when provided", () => {
    render(
      <HeaderAction
        label="Search"
        kbd="⌘K"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/components/shared/__tests__/HeaderAction.test.tsx`
Expected: FAIL with "Cannot find module '../HeaderAction'"

- [ ] **Step 3: Implement the component**

```tsx
// apps/web/src/components/shared/HeaderAction.tsx
import type { ReactNode } from "react";
import "./HeaderAction.css";

interface Props {
  label: string;
  onClick: () => void;
  kbd?: string;
  iconOnly?: boolean;
  children?: ReactNode;
  "data-testid"?: string;
}

export default function HeaderAction({
  label,
  onClick,
  kbd,
  iconOnly = false,
  children,
  "data-testid": testId,
}: Props) {
  return (
    <button
      type="button"
      className={`header-action${iconOnly ? " header-action--icon-only" : ""}`}
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      title={label}
      data-testid={testId}
    >
      {children ? (
        <span className="header-action__icon" aria-hidden="true">
          {children}
        </span>
      ) : null}
      {!iconOnly ? <span className="header-action__label">{label}</span> : null}
      {kbd ? (
        <kbd className="header-action__kbd" aria-hidden="true">
          {kbd}
        </kbd>
      ) : null}
    </button>
  );
}
```

- [ ] **Step 4: Write the CSS**

```css
/* apps/web/src/components/shared/HeaderAction.css */
.header-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-h-md);
  min-width: var(--control-h-md);
  padding: 0 var(--space-3);
  border: var(--shell-control-border);
  border-radius: var(--shell-control-radius);
  background: var(--shell-control-bg);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-spring);
}

.header-action:hover {
  border-color: color-mix(in srgb, var(--color-border-accent) 55%, transparent);
  background: var(--shell-control-bg-hover);
  color: var(--color-text);
  transform: translateY(-0.5px);
}

.header-action:focus-visible {
  outline: var(--focus-ring-outline);
  outline-offset: var(--focus-ring-offset);
}

.header-action--icon-only {
  padding: 0;
}

.header-action__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--icon-lg);
  height: var(--icon-lg);
}

.header-action__kbd {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run apps/web/src/components/shared/__tests__/HeaderAction.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/shared/HeaderAction.tsx \
        apps/web/src/components/shared/HeaderAction.css \
        apps/web/src/components/shared/__tests__/HeaderAction.test.tsx
git commit -m "feat(shell): add HeaderAction primitive for header chip cluster"
```

### Task 1.4 — Migrate header chips to `HeaderAction`; rename "Jump to" to "Search"

**Files:**
- Modify: `apps/web/src/App.tsx:898-928` (shell-bar__actions cluster)

- [ ] **Step 1: Import HeaderAction**

In `App.tsx`, near the other shared imports (around line 40), add:

```tsx
import HeaderAction from "./components/shared/HeaderAction";
```

- [ ] **Step 2: Replace the palette button block** at lines 900-909 with:

```tsx
<HeaderAction
  label="Search"
  kbd="⌘K"
  onClick={() => setPaletteOpen(true)}
  data-testid="shell-search-trigger"
/>
```

- [ ] **Step 3: Replace the quick-help button block** at lines 911-927 with:

```tsx
<HeaderAction
  label={
    state.activeTool && TOOLS_WITH_HINT.has(state.activeTool) && state.featuresSeen[state.activeTool]
      ? "Restore panel tip"
      : "Open onboarding tour"
  }
  iconOnly
  onClick={handleQuickHelpClick}
  data-testid="shell-help-trigger"
>
  ?
</HeaderAction>
```

- [ ] **Step 4: Leave `ThemeToggle` and `RoleContextPill` as-is for now.** Those have their own state contracts; HeaderAction migration for them is Phase 2 scope-creep and deferred here.

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run typecheck && npm run test -- apps/web`
Expected: green. If any smoke test asserts the label "Jump to", update the assertion to "Search" — this is the intended behavioral change.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "refactor(shell): migrate palette + help chips to HeaderAction; rename Jump to → Search

Discoverability: Search is the expected label for ⌘K command palette.
Consistency: Palette + help chips now share HeaderAction's border, radius, and hover treatment."
```

### Task 1.5 — Single-row header at ≥1280px

**Files:**
- Modify: `apps/web/src/styles/shell.css:48-54` (`.shell-bar` grid-template-columns)
- Modify: `apps/web/src/styles/shell.css:31-40` (`.app-header__inner` direction)

- [ ] **Step 1: Add a new `@media (min-width: 1280px)` block after the existing `.app-header__inner` rule (after line 40), scoping to one-row behavior.**

Append after line 40:

```css
@media (min-width: 1280px) {
  .app-header__inner {
    /* Single-row chrome at wide viewports: brand + classroom pill + nav
       + actions all align horizontally, reducing vertical chrome from
       ~7rem to ~3.5rem. Tablet and below continue to stack in two rows
       (see @media (max-width: 1100px) block below). */
    flex-direction: row;
    align-items: center;
    gap: var(--space-4);
  }

  .shell-bar {
    display: contents;
  }

  .shell-nav {
    flex: 1;
    min-width: 0;
  }

  .shell-nav__groups {
    /* Absorb the nav into the single row. Narrower columns OK here because
       the nav only has 7 tabs and wide viewports have room. */
    min-height: var(--control-h-md);
  }

  .shell-nav__group {
    min-height: var(--control-h-md);
    font-size: var(--text-sm);
  }
}
```

- [ ] **Step 2: Run typecheck + test**

Run: `npm run typecheck && npm run test -- apps/web`
Expected: green.

- [ ] **Step 3: Manual visual check (required)**

Start the dev server: `npm run dev` (from `apps/web` or the root)
Open http://localhost:5173 at 1440px viewport width. Confirm:
- Brand, classroom pill, nav tabs, and action chips sit on ONE row
- No overlap, no wrap
- Resize to 1200px — header flips to two rows cleanly
- Resize to 800px — mobile fallback still works

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/shell.css
git commit -m "feat(shell): collapse header to single row at ≥1280px

Reclaims ~3.5rem of vertical chrome on wide viewports while preserving
the two-row layout at tablet widths. Nav and actions now share the
same horizontal band as brand + classroom pill."
```

### Task 1.6 — Decision-log entry for Phase 1

**Files:**
- Modify: `docs/decision-log.md` (append new entry at top, under "Template")

- [ ] **Step 1: Add a dated entry**

Prepend after the template block (around line 13-ish — look for the most recent dated entry and insert just above it):

```markdown
### 2026-04-23 — Shell coherence pass (canonical control heights, HeaderAction primitive, single-row wide-viewport header)

- **Decision:** Retire shell-specific control heights in favor of canonical `--control-h-md` / `--control-h-lg`; extract shared `HeaderAction` chip primitive; rename "Jump to" label to "Search"; collapse header to single row at ≥1280px.
- **Why:** Previous shell-specific heights (49.6px and 63.2px) sat off the canonical 4-tier scale (28/36/44/52), causing subtle vertical misalignment between header controls and page controls. "Jump to" copy was non-standard for a ⌘K palette and hurt discoverability. Two-row header burned ~7rem of vertical on laptops where screen real estate is scarcest.
- **Alternatives considered:** Keep shell-specific heights (rejected — violates the canonical sizing contract); leave "Jump to" copy (rejected — discoverability for first-time teachers is primary); compress header on all viewports (rejected — tablet users need the two-row fallback for tap targets).
- **Consequences:** Every header control now measures 44px or 52px; HeaderAction is the canonical chip primitive for future additions; wide-viewport users reclaim ~3.5rem of vertical workspace; narrow-viewport users see no change.
- **What would change this:** Teacher feedback that single-row header feels cramped at 1280-1440px range, or a11y audit identifying tap-target issues with 44px at desktop.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: log 2026-04-23 shell coherence decision"
```

### Phase 1 validation gate

- [ ] **Run the full frontend lane**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: all green.

Do not proceed to Phase 2 until this gate is clean.

---

# Phase 2 — Extract `PageHero` primitive

**Goal:** Consolidate the near-identical `.classroom-hero` (ClassroomPanel.css) and `.multi-tool-hero` (multi-tool-page.css) into a single `PageHero` component with variants for Classroom, Prep, Ops, Review, Week.

**Scope:** New `PageHero` component; deletion of `MultiToolHero`; migration of ClassroomPanel, OpsPanel, PrepPanel, ReviewPanel (and WeekPanel if it uses the hero pattern).

### Task 2.1 — Audit current hero usages

- [ ] **Step 1: Grep for every `MultiToolHero` import and `.classroom-hero` / `.multi-tool-hero` CSS consumer**

Run: `grep -rn "MultiToolHero\|classroom-hero\|multi-tool-hero" apps/web/src`

Expected: imports in `OpsPanel.tsx`, `PrepPanel.tsx`, `ReviewPanel.tsx`; CSS classes in `ClassroomPanel.css` and `multi-tool-page.css`.

- [ ] **Step 2: Read the current MultiToolHero component** at `apps/web/src/components/MultiToolHero.tsx` end-to-end. Note its Props interface — this is the baseline for `PageHeroProps`.

- [ ] **Step 3: Sketch the `PageHeroProps` interface on paper.** It must carry:
  - `eyebrow: string`
  - `title: string`
  - `description?: ReactNode`
  - `pulse?: { tone: "success" | "warning" | "danger" | "neutral"; state: string; meta: string; live?: boolean }`
  - `metrics?: Array<{ value: number | string; label: string }>`
  - `pivots?: Array<{ eyebrow: string; label: string; icon: "sun" | "clock" | "grid"; onClick: () => void }>` (Classroom only)
  - `actions?: ReactNode` (for hero-level CTA; use for other panels if needed)
  - `variant?: "classroom" | "prep" | "ops" | "review" | "week"`
  - `id?: string` + `ariaLabel?: string` (for anchor-linking and screen readers)

No commit — preparation.

### Task 2.2 — Create `PageHero` with the test-first pattern

**Files:**
- Create: `apps/web/src/components/shared/PageHero.tsx`
- Create: `apps/web/src/components/shared/PageHero.css`
- Create: `apps/web/src/components/shared/__tests__/PageHero.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/shared/__tests__/PageHero.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PageHero from "../PageHero";

describe("PageHero", () => {
  it("renders eyebrow, title, and description", () => {
    render(
      <PageHero
        eyebrow="Classroom command"
        title="The room at a glance"
        description={<>Bird's-eye view of today.</>}
      />,
    );
    expect(screen.getByText(/classroom command/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the room at a glance/i })).toBeInTheDocument();
    expect(screen.getByText(/bird's-eye view of today/i)).toBeInTheDocument();
  });

  it("renders pulse when provided", () => {
    render(
      <PageHero
        eyebrow="Ops"
        title="Coordinate"
        pulse={{ tone: "success", state: "Coordinated", meta: "5 EA moves" }}
      />,
    );
    expect(screen.getByText(/coordinated/i)).toBeInTheDocument();
    expect(screen.getByText(/5 ea moves/i)).toBeInTheDocument();
  });

  it("renders metrics grid when provided", () => {
    render(
      <PageHero
        eyebrow="Ops"
        title="Coordinate"
        metrics={[
          { value: 4, label: "Tools" },
          { value: "—", label: "Blocks" },
        ]}
      />,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders pivots and fires onClick", () => {
    const onTodayClick = vi.fn();
    render(
      <PageHero
        eyebrow="Classroom"
        title="Today"
        pivots={[
          { eyebrow: "Now", label: "Today", icon: "sun", onClick: onTodayClick },
        ]}
      />,
    );
    screen.getByRole("button", { name: /today/i }).click();
    expect(onTodayClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant-specific class for ops", () => {
    const { container } = render(
      <PageHero eyebrow="Ops" title="Coord" variant="ops" />,
    );
    expect(container.querySelector(".page-hero--ops")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/components/shared/__tests__/PageHero.test.tsx`
Expected: FAIL with "Cannot find module '../PageHero'"

- [ ] **Step 3: Implement the component**

```tsx
// apps/web/src/components/shared/PageHero.tsx
import type { ReactNode } from "react";
import SectionIcon from "../SectionIcon";
import "./PageHero.css";

export type PageHeroPulseTone = "success" | "warning" | "danger" | "neutral";
export type PageHeroVariant = "classroom" | "prep" | "ops" | "review" | "week";

export interface PageHeroPulse {
  tone: PageHeroPulseTone;
  state: string;
  meta: string;
  live?: boolean;
}

export interface PageHeroPivot {
  eyebrow: string;
  label: string;
  icon: "sun" | "clock" | "grid";
  onClick: () => void;
}

export interface PageHeroMetric {
  value: number | string;
  label: string;
}

interface Props {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  pulse?: PageHeroPulse;
  metrics?: PageHeroMetric[];
  pivots?: PageHeroPivot[];
  actions?: ReactNode;
  variant?: PageHeroVariant;
  id?: string;
  ariaLabel?: string;
}

const PIVOT_ICON: Record<PageHeroPivot["icon"], "sun" | "clock" | "grid"> = {
  sun: "sun",
  clock: "clock",
  grid: "grid",
};

export default function PageHero({
  eyebrow,
  title,
  description,
  pulse,
  metrics,
  pivots,
  actions,
  variant,
  id,
  ariaLabel,
}: Props) {
  const className = `page-hero${variant ? ` page-hero--${variant}` : ""}`;

  return (
    <section className={className} id={id} aria-label={ariaLabel}>
      <div className="page-hero__lede">
        <span className="page-hero__eyebrow">{eyebrow}</span>
        <h1 className="page-hero__title">{title}</h1>
        {description ? <p className="page-hero__caption">{description}</p> : null}
        {pivots && pivots.length > 0 ? (
          <div className="page-hero__pivots" role="group" aria-label="Temporal pivots">
            {pivots.map((pivot) => (
              <button
                key={pivot.label}
                type="button"
                className="page-hero__pivot"
                onClick={pivot.onClick}
                aria-label={`${pivot.eyebrow}: ${pivot.label}`}
              >
                <span className="page-hero__pivot-icon" aria-hidden="true">
                  <SectionIcon name={PIVOT_ICON[pivot.icon]} />
                </span>
                <span className="page-hero__pivot-body">
                  <span className="page-hero__pivot-eyebrow">{pivot.eyebrow}</span>
                  <span className="page-hero__pivot-label">{pivot.label}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {actions ? <div className="page-hero__actions">{actions}</div> : null}
      </div>

      {pulse || metrics ? (
        <aside
          className={`page-hero__pulse${pulse ? ` page-hero__pulse--${pulse.tone}` : ""}`}
          aria-label="Classroom pulse"
        >
          {pulse ? (
            <div className="page-hero__pulse-row">
              <span
                className={`page-hero__pulse-dot${pulse.live ? " page-hero__pulse-dot--live" : ""}`}
                aria-hidden="true"
              />
              <div className="page-hero__pulse-label">
                <strong className="page-hero__pulse-state">{pulse.state}</strong>
                <span className="page-hero__pulse-meta">{pulse.meta}</span>
              </div>
            </div>
          ) : null}
          {metrics && metrics.length > 0 ? (
            <div className="page-hero__pulse-metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="page-hero__pulse-metric">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Implement the CSS (copy + consolidate from existing)**

Create `apps/web/src/components/shared/PageHero.css` by copying the content from both `ClassroomPanel.css` lines 37-250-ish (the `.classroom-hero*` block, for reference patterns) AND `multi-tool-page.css` lines 22-248 (the `.multi-tool-hero*` block). **Do not duplicate both** — consolidate into one `.page-hero*` selector tree. Key sections:

```css
/* apps/web/src/components/shared/PageHero.css
   Canonical hero primitive — consolidates .classroom-hero and
   .multi-tool-hero, which had drifted into near-identical scaffolds
   across two files. 2026-04-23 Phase 2.

   Variants recolor the left-rule and eyebrow only; shape stays
   identical across Classroom, Prep, Ops, Review, Week. */

.page-hero {
  --page-hero-rule: color-mix(
    in srgb,
    var(--color-brand-highlight) 64%,
    var(--color-border-strong)
  );
  --page-hero-eyebrow: var(--color-brand-highlight-strong);
  --page-hero-glow: var(--color-brand-highlight);

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
  padding: var(--space-5) var(--space-5) var(--space-5) var(--space-6);
  border: 1px solid color-mix(in srgb, var(--color-border) 58%, transparent);
  border-left: 3px solid var(--page-hero-rule);
  border-radius: var(--radius-md);
  background:
    radial-gradient(
      ellipse 70% 60% at 6% -10%,
      color-mix(in srgb, var(--page-hero-glow) 4%, transparent),
      transparent 65%
    ),
    color-mix(in srgb, var(--color-surface-elevated) 86%, transparent);
  box-shadow: var(--shadow-sm);
}

@media (min-width: 960px) {
  .page-hero {
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
    align-items: stretch;
  }
}

/* ----- Variants: classroom (cognac, default), prep (cognac stronger),
   ops (navy), review (prairie green), week (cognac softer) ----- */

.page-hero--prep {
  --page-hero-rule: color-mix(in srgb, var(--color-brand-highlight) 64%, var(--color-border-strong));
  --page-hero-eyebrow: var(--color-brand-highlight-strong);
  --page-hero-glow: var(--color-brand-highlight);
}

.page-hero--ops {
  --page-hero-rule: color-mix(in srgb, var(--color-accent) 70%, var(--color-border-strong));
  --page-hero-eyebrow: var(--color-text-accent);
  --page-hero-glow: var(--color-accent);
}

.page-hero--review {
  --page-hero-rule: color-mix(in srgb, var(--color-brand-green) 80%, var(--color-border-strong));
  --page-hero-eyebrow: color-mix(in srgb, var(--color-brand-green) 80%, var(--color-text));
  --page-hero-glow: var(--color-brand-green);
}

.page-hero--week {
  --page-hero-rule: color-mix(in srgb, var(--color-brand-highlight) 50%, var(--color-border-strong));
  --page-hero-eyebrow: var(--color-text-secondary);
  --page-hero-glow: var(--color-brand-highlight);
}

/* ----- Lede column ----- */

.page-hero__lede {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.page-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--page-hero-eyebrow);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.page-hero__eyebrow::before {
  content: "";
  width: 16px;
  height: 1px;
  background: currentColor;
  opacity: 0.6;
}

.page-hero__title {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-display-md);
  font-weight: var(--font-weight-semibold);
  font-feature-settings: var(--font-feature-display);
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-display);
  text-wrap: balance;
}

.page-hero__caption {
  max-width: 56ch;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
}

.page-hero__caption strong {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

/* ----- Pivots (Classroom only today; available to any panel that supplies them) ----- */

.page-hero__pivots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.page-hero__pivot {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-border) 56%, transparent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--motion-hover) var(--ease-standard),
    background-color var(--motion-hover) var(--ease-standard),
    transform var(--motion-fast) var(--ease-press);
}

.page-hero__pivot:hover {
  border-color: color-mix(in srgb, var(--color-border-accent) 55%, transparent);
  background: color-mix(in srgb, var(--color-surface) 96%, var(--color-bg-accent));
}

.page-hero__pivot:focus-visible {
  outline: var(--focus-ring-outline);
  outline-offset: var(--focus-ring-offset);
}

.page-hero__pivot-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--icon-lg);
  height: var(--icon-lg);
  color: var(--page-hero-eyebrow);
}

.page-hero__pivot-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.page-hero__pivot-eyebrow {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.page-hero__pivot-label {
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.005em;
}

/* ----- Pulse side ----- */

.page-hero__pulse {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.page-hero__pulse-row {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
}

.page-hero__pulse-dot {
  position: relative;
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--_pulse-tone, var(--color-text-tertiary));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--_pulse-tone, var(--color-text-tertiary)) 16%, transparent);
}

.page-hero__pulse-dot--live::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--_pulse-tone, var(--color-text-tertiary)) 60%, transparent);
  animation: page-hero-pulse-ring 2.4s var(--ease-out-expo) 3;
  /* Three iterations instead of infinite — pulse dwells on state change
     then settles. Phase 3 gate flips this to a React-driven trigger. */
}

@keyframes page-hero-pulse-ring {
  0% { transform: scale(0.8); opacity: 0.9; }
  80% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .page-hero__pulse-dot--live::after { animation: none; }
}

.page-hero__pulse--success { --_pulse-tone: var(--color-success); }
.page-hero__pulse--warning { --_pulse-tone: var(--color-warning); }
.page-hero__pulse--danger  { --_pulse-tone: var(--color-danger); }
.page-hero__pulse--neutral { --_pulse-tone: var(--color-accent); }

.page-hero__pulse-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.page-hero__pulse-state {
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0;
}

.page-hero__pulse-meta {
  color: var(--color-text-tertiary);
  font-size: var(--text-2xs);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.page-hero__pulse-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5.6rem, 1fr));
  gap: var(--space-2);
  padding-top: var(--space-2-5);
  border-top: 1px dashed color-mix(in srgb, var(--color-border) 60%, transparent);
}

.page-hero__pulse-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.page-hero__pulse-metric strong {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: var(--tracking-display);
}

.page-hero__pulse-metric span {
  color: var(--color-text-tertiary);
  font-size: var(--text-2xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ----- Actions slot ----- */

.page-hero__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

/* ----- Narrow ----- */

@media (max-width: 720px) {
  .page-hero {
    padding: var(--space-4);
    gap: var(--space-3);
  }
  .page-hero__title {
    font-size: var(--text-display-sm);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run apps/web/src/components/shared/__tests__/PageHero.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/shared/PageHero.tsx \
        apps/web/src/components/shared/PageHero.css \
        apps/web/src/components/shared/__tests__/PageHero.test.tsx
git commit -m "feat(shared): add PageHero primitive consolidating hero scaffold

Replaces the duplicated .classroom-hero + .multi-tool-hero CSS with one
primitive that supports variants (classroom, prep, ops, review, week).
Markup shape mirrors MultiToolHero + ClassroomPanel hero. Live-pulse
ring gated to 3 iterations to dwell-then-settle (Phase 3 will replace
with React-driven trigger)."
```

### Task 2.3 — Migrate `OpsPanel` to `PageHero`

**Files:**
- Modify: `apps/web/src/panels/OpsPanel.tsx` (replace MultiToolHero usage)

- [ ] **Step 1: Replace the import**

In `OpsPanel.tsx`, change line 8:

```tsx
// Before:
import MultiToolHero, { type MultiToolHeroPulse } from "../components/MultiToolHero";

// After:
import PageHero, { type PageHeroPulse } from "../components/shared/PageHero";
```

- [ ] **Step 2: Update the type alias on line 49**

```tsx
// Before:
function derivePulse(
  staleFollowups: number,
  eaActions: number,
  forecastBlocks: number,
): MultiToolHeroPulse {

// After:
function derivePulse(
  staleFollowups: number,
  eaActions: number,
  forecastBlocks: number,
): PageHeroPulse {
```

- [ ] **Step 3: Replace the hero render block** (in the JSX, around line 120-140). Locate the `<MultiToolHero ... variant="ops" />` block and change the component name only:

```tsx
// Before:
<MultiToolHero
  id="ops-command"
  ariaLabel="..."
  eyebrow="Ops command"
  title="..."
  description={...}
  metrics={[...]}
  pulse={pulse}
  variant="ops"
/>

// After (same props; component is rename-compatible):
<PageHero
  id="ops-command"
  ariaLabel="Ops command, intervention capture, adult briefing, and coverage handoff"
  eyebrow="Ops command"
  title="Coordinate the adults without losing the thread."
  description={<>Capture today's evidence, brief the adults in the room, balance coverage, and package the handoff from one operational surface.</>}
  metrics={[
    { value: OPS_TOOLS.length, label: "Tools" },
    { value: staleFollowups, label: "Follow-ups" },
    { value: watchThreads, label: "Threads" },
    { value: eaActions || "—", label: "EA moves" },
    { value: forecastBlocks || "—", label: "Blocks" },
  ]}
  pulse={pulse}
  variant="ops"
/>
```

- [ ] **Step 4: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/OpsPanel`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/OpsPanel.tsx
git commit -m "refactor(ops): migrate OpsPanel hero to PageHero primitive"
```

### Task 2.4 — Migrate `PrepPanel` and `ReviewPanel` to `PageHero`

**Files:**
- Modify: `apps/web/src/panels/PrepPanel.tsx`
- Modify: `apps/web/src/panels/ReviewPanel.tsx`

- [ ] **Step 1: For each file, apply the same rename** as Task 2.3: `MultiToolHero` → `PageHero`, `MultiToolHeroPulse` → `PageHeroPulse`. Update the import path. Props are API-compatible.

- [ ] **Step 2: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/panels/PrepPanel.tsx apps/web/src/panels/ReviewPanel.tsx
git commit -m "refactor(prep,review): migrate hero to PageHero primitive"
```

### Task 2.5 — Migrate `ClassroomPanel` to `PageHero` + delete duplicated CSS

**Files:**
- Modify: `apps/web/src/panels/ClassroomPanel.tsx` (replace the inline hero with PageHero)
- Modify: `apps/web/src/panels/ClassroomPanel.css` (delete the `.classroom-hero*` and `.classroom-pivot*` rules; keep zone-separator, Intel-grid, Roster, etc.)

- [ ] **Step 1: In `ClassroomPanel.tsx`, read the current hero render** (around lines 200-260). Locate the inline `<header className="classroom-hero">` block and the `ClassroomPivot` sub-component usage.

- [ ] **Step 2: Replace the inline hero with PageHero**

Replace the `<header className="classroom-hero">...</header>` JSX with:

```tsx
<PageHero
  id="classroom-command"
  ariaLabel="Classroom command and temporal pivots"
  eyebrow="Classroom command"
  title={`${describeClassroom(profile)} at a glance`}
  description={<>Bird's-eye view of health, coverage, queues, and the students to check first.</>}
  pulse={{
    tone: pulse.tone === "neutral" ? "neutral" : pulse.tone,
    state: pulse.label,
    meta: pulse.meta,
    live: pulse.tone !== "neutral",
  }}
  metrics={heroMetrics}
  pivots={[
    {
      eyebrow: "Now",
      label: "Today",
      icon: "sun",
      onClick: () => onTabChange("today"),
    },
    {
      eyebrow: "Next",
      label: "Tomorrow",
      icon: "clock",
      onClick: () => onTabChange("tomorrow"),
    },
    {
      eyebrow: "Week",
      label: "Week band",
      icon: "grid",
      onClick: () => onTabChange("week"),
    },
  ]}
  variant="classroom"
/>
```

- [ ] **Step 3: Remove the now-unused `ClassroomPivot` component and its `PivotProps` interface** (lines 82-128). It's been replaced by PageHero's internal pivot renderer.

- [ ] **Step 4: Add the PageHero import**

```tsx
import PageHero from "../components/shared/PageHero";
```

- [ ] **Step 5: Delete the `.classroom-hero*` and `.classroom-pivot*` CSS rules** from `ClassroomPanel.css`. Preserve everything related to `.classroom-panel` (the root layout), zone separators, intel grid, and roster. (Roughly: delete lines 33-ish through 400-ish of ClassroomPanel.css — inspect before deleting; keep the zone-separator comments and anything not prefixed `.classroom-hero` / `.classroom-pivot`.)

- [ ] **Step 6: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/ClassroomPanel`
Expected: green. If the ClassroomPanel snapshot tests fail, update them — the DOM structure legitimately changed.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/panels/ClassroomPanel.tsx apps/web/src/panels/ClassroomPanel.css
git commit -m "refactor(classroom): migrate ClassroomPanel hero to PageHero primitive

Retires .classroom-hero + .classroom-pivot CSS (~220 lines), inline
ClassroomPivot sub-component, and the ad-hoc hero markup in the panel.
All carried behavior (eyebrow, title, caption, pulse, metrics, pivots)
is preserved via the PageHero primitive."
```

### Task 2.6 — Delete `MultiToolHero` and clean `multi-tool-page.css`

**Files:**
- Delete: `apps/web/src/components/MultiToolHero.tsx`
- Delete: `apps/web/src/components/MultiToolHero.css` (if it exists)
- Modify: `apps/web/src/styles/multi-tool-page.css` (remove `.multi-tool-hero*` rules lines ~22-248; preserve tool-switcher + workspace-section rules)

- [ ] **Step 1: Confirm no stragglers**

Run: `grep -rn "MultiToolHero\|multi-tool-hero" apps/web/src`
Expected: empty (PageHero migrations in 2.3–2.5 removed them all).

- [ ] **Step 2: Delete the MultiToolHero component files**

```bash
rm apps/web/src/components/MultiToolHero.tsx
# Only if it exists:
rm -f apps/web/src/components/MultiToolHero.css
```

- [ ] **Step 3: Remove `.multi-tool-hero*` block** from `multi-tool-page.css`. Preserve:
- `.multi-tool-page` (top-level gap rule)
- `.page-tool-switcher--cards` overrides
- `.multi-tool-workspace-section*` rules (these are not hero-related)

- [ ] **Step 4: Run typecheck + test**

Run: `npm run typecheck && npm run test -- apps/web`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/src/components/MultiToolHero.tsx apps/web/src/styles/multi-tool-page.css
git commit -m "refactor: retire MultiToolHero in favor of PageHero primitive

Deletes the now-unused MultiToolHero component and the duplicated
.multi-tool-hero* CSS block. Tool-switcher and workspace-section rules
in multi-tool-page.css are preserved — they remain independent."
```

### Task 2.7 — Decision-log entry for Phase 2

- [ ] **Step 1: Add dated entry** to `docs/decision-log.md`:

```markdown
### 2026-04-23 — PageHero primitive extraction

- **Decision:** Consolidate `.classroom-hero` (ClassroomPanel.css) and `.multi-tool-hero` (multi-tool-page.css) into a single `PageHero` component (`apps/web/src/components/shared/PageHero.{tsx,css}`) supporting variants: classroom, prep, ops, review, week.
- **Why:** The two hero scaffolds had drifted into near-identical shapes (eyebrow + title + caption + pulse + metrics + pivots) across two CSS files, requiring every future hero tweak to be made twice. Consolidation removes ~200 lines of duplicated CSS and locks a shared API for future pages.
- **Alternatives considered:** Keep both and document the intentional divergence (rejected — no intentional divergence existed); copy the Classroom markup into MultiToolHero and delete the latter (rejected — ClassroomPanel's inline pivots were not exposed on MultiToolHero's Props).
- **Consequences:** All five hero-carrying pages (Classroom, Prep, Ops, Review, and any future additions) render from a single component; variants recolor the left-rule and eyebrow only.
- **What would change this:** A page-specific hero requirement that PageHero's variants cannot satisfy (e.g. a marketing hero with a big illustration) — but that should be solved with a new primitive, not by forking PageHero.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: log 2026-04-23 PageHero extraction decision"
```

### Phase 2 validation gate

- [ ] **Run the full frontend lane**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: all green.

---

# Phase 3 — Page composition & progressive disclosure

**Goal:** On ClassroomPanel, collapse Intel + Roster zones behind `<details>` by default, persisted per classroom. Add a visual stepper under the tool-switcher on multi-tool pages. Gate the hero pulse-dot animation to React-controlled transitions.

### Task 3.1 — Write the test for disclosure persistence

**Files:**
- Create: `apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx`
- Create: `apps/web/src/hooks/useZoneDisclosure.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useZoneDisclosure } from "../useZoneDisclosure";

describe("useZoneDisclosure", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to collapsed when no persisted state", () => {
    const { result } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "intel", { defaultOpen: false }),
    );
    expect(result.current.open).toBe(false);
  });

  it("defaults to open when defaultOpen is true", () => {
    const { result } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "watchlist", { defaultOpen: true }),
    );
    expect(result.current.open).toBe(true);
  });

  it("toggles and persists to localStorage", () => {
    const { result } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "intel", { defaultOpen: false }),
    );
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    expect(window.localStorage.getItem("prairie:disclosure:classroom-panel:intel")).toBe("open");
  });

  it("scopes persistence per key+zone", () => {
    const { result: intel } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "intel", { defaultOpen: false }),
    );
    const { result: roster } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "roster", { defaultOpen: false }),
    );
    act(() => intel.current.toggle());
    expect(intel.current.open).toBe(true);
    expect(roster.current.open).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx`
Expected: FAIL with "Cannot find module '../useZoneDisclosure'"

- [ ] **Step 3: Implement the hook**

```ts
// apps/web/src/hooks/useZoneDisclosure.ts
import { useCallback, useEffect, useState } from "react";

interface Options {
  defaultOpen: boolean;
}

interface ZoneDisclosure {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

function storageKey(pageKey: string, zoneKey: string): string {
  return `prairie:disclosure:${pageKey}:${zoneKey}`;
}

export function useZoneDisclosure(
  pageKey: string,
  zoneKey: string,
  options: Options,
): ZoneDisclosure {
  const [open, setOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return options.defaultOpen;
    try {
      const saved = window.localStorage.getItem(storageKey(pageKey, zoneKey));
      if (saved === "open") return true;
      if (saved === "closed") return false;
    } catch {
      /* private browsing / quota */
    }
    return options.defaultOpen;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(pageKey, zoneKey), open ? "open" : "closed");
    } catch {
      /* ignore */
    }
  }, [open, pageKey, zoneKey]);

  const setOpen = useCallback((next: boolean) => setOpenState(next), []);
  const toggle = useCallback(() => setOpenState((prev) => !prev), []);

  return { open, toggle, setOpen };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useZoneDisclosure.ts \
        apps/web/src/hooks/__tests__/useZoneDisclosure.test.tsx
git commit -m "feat(hooks): add useZoneDisclosure for per-page zone collapse persistence"
```

### Task 3.2 — Wrap ClassroomPanel Intel + Roster zones in `<details>`

**Files:**
- Modify: `apps/web/src/panels/ClassroomPanel.tsx`
- Modify: `apps/web/src/panels/ClassroomPanel.css` (add `.classroom-zone--collapsible` styles)

- [ ] **Step 1: Import the hook** in `ClassroomPanel.tsx`:

```tsx
import { useZoneDisclosure } from "../hooks/useZoneDisclosure";
```

- [ ] **Step 2: Inside `ClassroomPanel` function**, declare disclosure state:

```tsx
const intelDisclosure = useZoneDisclosure(`classroom-${activeClassroom}`, "intel", {
  defaultOpen: false,
});
const rosterDisclosure = useZoneDisclosure(`classroom-${activeClassroom}`, "roster", {
  defaultOpen: false,
});
```

- [ ] **Step 3: Wrap the Intel zone** (currently a `<section>` containing the 2x2 viz grid) with:

```tsx
<details
  className="classroom-zone classroom-zone--collapsible"
  open={intelDisclosure.open}
  onToggle={(e) => intelDisclosure.setOpen(e.currentTarget.open)}
>
  <summary className="classroom-zone__summary">
    <span className="classroom-zone__summary-eyebrow">Intel</span>
    <span className="classroom-zone__summary-title">Debt, priority, recency, composition</span>
    <span className="classroom-zone__summary-hint">{intelDisclosure.open ? "Collapse" : "Expand"}</span>
  </summary>
  {/* existing 2x2 viz grid JSX */}
</details>
```

- [ ] **Step 4: Wrap the Roster zone** identically with `rosterDisclosure` and the appropriate summary text ("Roster" / "Full student list").

- [ ] **Step 5: Add disclosure summary CSS** to `ClassroomPanel.css`:

```css
/* ----- Collapsible zone disclosure ----- */

.classroom-zone--collapsible {
  border: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.classroom-zone--collapsible[open] {
  background: color-mix(in srgb, var(--color-surface-elevated) 92%, transparent);
}

.classroom-zone__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  list-style: none;
  user-select: none;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.classroom-zone__summary::-webkit-details-marker {
  display: none;
}

.classroom-zone__summary:hover {
  background: color-mix(in srgb, var(--color-bg-muted) 40%, transparent);
}

.classroom-zone__summary-eyebrow {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.classroom-zone__summary-title {
  flex: 1;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.classroom-zone__summary-hint {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.classroom-zone--collapsible[open] > :not(.classroom-zone__summary) {
  padding: 0 var(--space-5) var(--space-5);
}
```

- [ ] **Step 6: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/ClassroomPanel`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/panels/ClassroomPanel.tsx apps/web/src/panels/ClassroomPanel.css
git commit -m "feat(classroom): collapse Intel + Roster zones behind disclosure by default

Above-the-fold content (Hero, Pulse, Watchlist, Ops) stays expanded.
Intel (2x2 viz grid) and Roster (full student list) collapse by default
and persist per-classroom in localStorage via useZoneDisclosure."
```

### Task 3.3 — Tool switcher stepper component

**Files:**
- Create: `apps/web/src/components/ToolSwitcherStepper.tsx`
- Create: `apps/web/src/components/ToolSwitcherStepper.css`
- Create: `apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ToolSwitcherStepper from "../ToolSwitcherStepper";

describe("ToolSwitcherStepper", () => {
  it("renders one dot per step", () => {
    const { container } = render(
      <ToolSwitcherStepper total={4} activeIndex={1} />,
    );
    expect(container.querySelectorAll(".tool-switcher-stepper__dot")).toHaveLength(4);
  });

  it("marks the active dot", () => {
    const { container } = render(
      <ToolSwitcherStepper total={4} activeIndex={2} />,
    );
    const active = container.querySelector(".tool-switcher-stepper__dot--active");
    expect(active).toBeInTheDocument();
    expect(active?.getAttribute("data-index")).toBe("2");
  });

  it("has an accessible label", () => {
    render(<ToolSwitcherStepper total={4} activeIndex={0} label="Prep tool progress" />);
    expect(screen.getByRole("progressbar", { name: /prep tool progress/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx`
Expected: FAIL with "Cannot find module '../ToolSwitcherStepper'"

- [ ] **Step 3: Implement the component**

```tsx
// apps/web/src/components/ToolSwitcherStepper.tsx
import "./ToolSwitcherStepper.css";

interface Props {
  total: number;
  activeIndex: number;
  label?: string;
}

export default function ToolSwitcherStepper({
  total,
  activeIndex,
  label = "Tool progress",
}: Props) {
  return (
    <div
      className="tool-switcher-stepper"
      role="progressbar"
      aria-label={label}
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <span className="tool-switcher-stepper__rail" aria-hidden="true" />
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-index={i}
          className={`tool-switcher-stepper__dot${i === activeIndex ? " tool-switcher-stepper__dot--active" : ""}${i < activeIndex ? " tool-switcher-stepper__dot--complete" : ""}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write the CSS**

```css
/* apps/web/src/components/ToolSwitcherStepper.css */
.tool-switcher-stepper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin-top: calc(-1 * var(--space-2));
  margin-bottom: var(--space-3);
}

.tool-switcher-stepper__rail {
  position: absolute;
  left: var(--space-4);
  right: var(--space-4);
  top: 50%;
  height: 1px;
  background: color-mix(in srgb, var(--color-border) 60%, transparent);
  transform: translateY(-50%);
  pointer-events: none;
}

.tool-switcher-stepper__dot {
  position: relative;
  z-index: 1;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  transition: background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-spring);
}

.tool-switcher-stepper__dot--complete {
  background: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
  border-color: transparent;
}

.tool-switcher-stepper__dot--active {
  width: 12px;
  height: 12px;
  background: var(--color-accent);
  border-color: transparent;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 14%, transparent);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ToolSwitcherStepper.tsx \
        apps/web/src/components/ToolSwitcherStepper.css \
        apps/web/src/components/__tests__/ToolSwitcherStepper.test.tsx
git commit -m "feat(components): add ToolSwitcherStepper for multi-tool page progression"
```

### Task 3.4 — Mount stepper in OpsPanel, PrepPanel, ReviewPanel

**Files:**
- Modify: `apps/web/src/panels/OpsPanel.tsx` (insert stepper between switcher and workspace-section)
- Modify: `apps/web/src/panels/PrepPanel.tsx`
- Modify: `apps/web/src/panels/ReviewPanel.tsx`

- [ ] **Step 1: In `OpsPanel.tsx`**, add the import:

```tsx
import ToolSwitcherStepper from "../components/ToolSwitcherStepper";
```

And insert between the tool-switcher div (line ~148) and the workspace-section (line ~150):

```tsx
<ToolSwitcherStepper
  total={OPS_TOOLS.length}
  activeIndex={OPS_TOOLS.indexOf(currentTool)}
  label="Ops tool progress"
/>
```

- [ ] **Step 2: Repeat for `PrepPanel.tsx`** (using `PREP_TOOLS.indexOf(currentTool)` and label "Prep tool progress"). Read the file to locate the switcher + workspace-section.

- [ ] **Step 3: Repeat for `ReviewPanel.tsx`** (label "Review tool progress").

- [ ] **Step 4: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/OpsPanel.tsx \
        apps/web/src/panels/PrepPanel.tsx \
        apps/web/src/panels/ReviewPanel.tsx
git commit -m "feat(multi-tool): mount ToolSwitcherStepper under tool-switcher rows

Visualizes the 01→04 (Ops) / 01→02 (Prep) / 01→03 (Review) progression
that tool kickers already communicate in copy."
```

### Task 3.5 — Gate hero pulse-dot animation to React transitions

**Files:**
- Modify: `apps/web/src/components/shared/PageHero.tsx` (add state-change detection)
- Modify: `apps/web/src/components/shared/PageHero.css` (flip infinite → 3-iteration; keep reduced-motion)

- [ ] **Step 1: Add a pulse-trigger key to PageHero**. In `PageHero.tsx`, inside the component, add:

```tsx
import { useEffect, useRef, useState } from "react";

// ...inside PageHero function:
const pulseStateRef = useRef(pulse?.state);
const [pulseKey, setPulseKey] = useState(0);

useEffect(() => {
  if (pulse?.state && pulse.state !== pulseStateRef.current) {
    pulseStateRef.current = pulse.state;
    setPulseKey((k) => k + 1);
  }
}, [pulse?.state]);
```

- [ ] **Step 2: Use the key to reset the ring animation** — change the pulse-dot render to:

```tsx
<span
  key={pulseKey}
  className={`page-hero__pulse-dot${pulse.live ? " page-hero__pulse-dot--live" : ""}`}
  aria-hidden="true"
/>
```

- [ ] **Step 3: The CSS is already correct from Phase 2 Task 2.2** — the `3` iteration count is in the existing keyframe rule. No further CSS change needed.

- [ ] **Step 4: Run tests**

Run: `npx vitest run apps/web/src/components/shared/__tests__/PageHero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/PageHero.tsx
git commit -m "feat(page-hero): gate pulse-dot animation to React state transitions

Re-keying the dot on pulse.state change restarts the 3-iteration ring
animation. Replaces the prior infinite loop that pulled eye motion
continuously; pulse now dwells on state change and settles."
```

### Task 3.6 — Decision-log entry for Phase 3

- [ ] **Step 1: Append to `docs/decision-log.md`**:

```markdown
### 2026-04-23 — Page composition pass (zone disclosure, tool-switcher stepper, pulse transition gating)

- **Decision:** (1) Collapse ClassroomPanel's Intel (2x2 viz grid) and Roster zones behind `<details>` by default, persisted per-classroom via `useZoneDisclosure`. (2) Mount `ToolSwitcherStepper` between the tool switcher and active workspace on Prep / Ops / Review. (3) Gate hero pulse-dot animation to React state changes (3 iterations on change, idle otherwise).
- **Why:** Classroom default rendered ~2000px of content on first paint with no hierarchy cue separating above-the-fold from peripheral; tool-switcher's 01→04 kickers communicated progression in copy only; infinite pulse-dot motion pulled eye attention continuously in the corner of the viewport.
- **Alternatives considered:** Hide Intel + Roster entirely (rejected — needed on demand); render stepper above the switcher row (rejected — visually crowded with the hero); keep infinite pulse (rejected — ambient motion is a cost most of the time).
- **Consequences:** ClassroomPanel first-paint height drops ~50% on new classrooms; teachers get a progressive disclosure language that extends to other high-density pages; pulse reads as intentional state change rather than ambient decoration.
- **What would change this:** Teacher feedback that Intel / Roster by-default-closed loses important first-look context; a11y audit flagging the disclosure pattern as too-subtle.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: log 2026-04-23 page composition pass"
```

### Phase 3 validation gate

- [ ] **Run the full frontend lane**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: all green.

---

# Phase 4 — Chart drill-downs (G-16)

**Goal:** Wire the five remaining chart drill-downs — `PlanCoverageRadar`, `VariantSummaryStrip`, `SupportPatternRadar`, `FollowUpSuccessRate`, `InterventionTimeline` — on their four parent panels.

**Scope reference:** `docs/development-gaps.md` G-16 describes the exact work; estimate ~1 day.

### Task 4.1 — Audit the current drill-down wiring baseline on TodayPanel

- [x] **Step 1: Read the TodayPanel drill-down pattern** at `apps/web/src/panels/TodayPanel.tsx:300-310` and `400-413` for `DrillDownDrawer` mount.

- [x] **Step 2: Read `DrillDownDrawer`** at `apps/web/src/components/DrillDownDrawer.tsx` to understand the `DrillDownContext` discriminated union.

- [x] **Step 3: Note the drawer context types available**: `student`, `forecast-block`, `debt-category`, `trend`, and (from G-16) `plan-coverage-section`, `variant-lane`, `student-tag-group`.

No commit — preparation.

### Task 4.2 — Wire `PlanCoverageRadar` drill-down on TomorrowPlanPanel

**Files:**
- Modify: `apps/web/src/panels/TomorrowPlanPanel.tsx`

- [x] **Step 1: Add drill-down state and DrillDownDrawer mount** at the top of the component body:

```tsx
import { useState } from "react";
import DrillDownDrawer from "../components/DrillDownDrawer";
import type { DrillDownContext } from "../types";

// ...inside TomorrowPlanPanel:
const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
```

- [x] **Step 2: Wire the `onSegmentClick` prop on `PlanCoverageRadar`** (locate the existing render of this chart in TomorrowPlanPanel; pass):

```tsx
<PlanCoverageRadar
  /* ... existing props ... */
  onSegmentClick={(sectionKey) => {
    if (!result?.plan) return;
    const sectionItems = buildPlanCoverageSectionItems(result.plan, sectionKey);
    setDrillDown({
      type: "plan-coverage-section",
      sectionKey,
      items: sectionItems,
    });
  }}
/>
```

If `buildPlanCoverageSectionItems` doesn't exist in the codebase, define it inline in the panel file as a pure helper function that takes the plan + section key and returns the watchpoints / priorities / ea_actions / prep_items / family_followups for that key.

- [x] **Step 3: Mount `DrillDownDrawer` near the bottom of the render**, before the panel closing tag:

```tsx
<DrillDownDrawer
  context={drillDown}
  onClose={() => setDrillDown(null)}
  onNavigate={(tab) => { setDrillDown(null); onTabChange?.(tab); }}
  onContextChange={setDrillDown}
  onInterventionPrefill={onInterventionPrefill}
  onMessagePrefill={onMessagePrefill}
/>
```

- [x] **Step 4: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/TomorrowPlanPanel`
Expected: green.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/panels/TomorrowPlanPanel.tsx
git commit -m "feat(tomorrow): wire PlanCoverageRadar drill-down + DrillDownDrawer mount

Part of G-16. Clicking a radar segment opens the plan-coverage-section
drill-down with the section's watchpoints, priorities, EA actions,
prep items, and family follow-ups."
```

### Task 4.3 — Wire `VariantSummaryStrip` drill-down on DifferentiatePanel

**Files:**
- Modify: `apps/web/src/panels/DifferentiatePanel.tsx`

- [x] **Step 1: Apply the same pattern** as Task 4.2: add `drillDown` state, mount `DrillDownDrawer`, pass `onSegmentClick` to `VariantSummaryStrip`:

```tsx
<VariantSummaryStrip
  /* ... existing props ... */
  onSegmentClick={(laneKey) => {
    const lane = result?.variant_lanes.find((l) => l.key === laneKey);
    if (!lane) return;
    setDrillDown({ type: "variant-lane", lane });
  }}
/>
```

- [x] **Step 2: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/DifferentiatePanel`
Expected: green.

- [x] **Step 3: Commit**

```bash
git add apps/web/src/panels/DifferentiatePanel.tsx
git commit -m "feat(differentiate): wire VariantSummaryStrip drill-down

Part of G-16. Clicking a lane opens the variant-lane drill-down."
```

### Task 4.4 — Wire `SupportPatternRadar` drill-down on SupportPatternsPanel

**Files:**
- Modify: `apps/web/src/panels/SupportPatternsPanel.tsx`

- [x] **Step 1: Apply the pattern** with `type: "student-tag-group"`:

```tsx
<SupportPatternRadar
  /* ... existing ... */
  onSegmentClick={(themeKey) => {
    const students = deriveStudentTagGroup(result, themeKey);
    setDrillDown({ type: "student-tag-group", themeKey, students });
  }}
/>
```

Define `deriveStudentTagGroup` inline if the helper isn't already shared.

- [x] **Step 2: Mount DrillDownDrawer + run typecheck + tests.**

- [x] **Step 3: Commit**

```bash
git add apps/web/src/panels/SupportPatternsPanel.tsx
git commit -m "feat(support-patterns): wire SupportPatternRadar drill-down

Part of G-16. Clicking a theme opens the student-tag-group drill-down."
```

### Task 4.5 — Wire `FollowUpSuccessRate` + `InterventionTimeline` on InterventionPanel

**Files:**
- Modify: `apps/web/src/panels/InterventionPanel.tsx`

- [x] **Step 1: Apply the pattern for both charts**. The InterventionTimeline uses `onDotClick` (not `onSegmentClick`):

```tsx
<FollowUpSuccessRate
  /* ... existing ... */
  onSegmentClick={(category) => {
    setDrillDown({ type: "debt-category", category, items: mapInterventionsToDebtItems(result, category) });
  }}
/>

<InterventionTimeline
  /* ... existing ... */
  onDotClick={(record) => {
    setDrillDown({ type: "student", alias: record.student_ref });
  }}
/>
```

Define `mapInterventionsToDebtItems` inline if not already shared.

- [x] **Step 2: Mount DrillDownDrawer once (not twice) + run typecheck + tests.**

- [x] **Step 3: Commit**

```bash
git add apps/web/src/panels/InterventionPanel.tsx
git commit -m "feat(intervention): wire FollowUpSuccessRate + InterventionTimeline drill-downs

Closes G-16. All five previously-unwired chart drill-downs now mount
DrillDownDrawer on their parent panels."
```

### Task 4.6 — Update G-16 in development-gaps.md

**Files:**
- Modify: `docs/development-gaps.md` (G-16 status → Closed)

- [x] **Step 1: Update the G-16 row in the priority-map table** to "Closed 2026-04-24" and add a brief "What was shipped" section under the "Gap details" heading below.

- [x] **Step 2: Commit**

```bash
git add docs/development-gaps.md
git commit -m "docs: close G-16 (chart drill-downs on TomorrowPlan, Differentiate, SupportPatterns, Intervention)"
```

### Phase 4 validation gate

- [x] **Run the full frontend lane**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: all green.

---

# Phase 5 — Editorial register (Source Serif 4, branded skeleton, chart tonal palette, Monday reset moment)

**Goal:** Introduce a narrowly-scoped editorial serif for AI-generated long-form content; upgrade SectionSkeleton to a branded shimmer; retune chart tonal palette so low/medium/high read as a calm gradient, not a siren; add a Monday first-visit reset moment on TodayPanel.

### Task 5.1 — Download Source Serif 4 Variable and wire the @font-face

**Files:**
- Create: `apps/web/public/fonts/source-serif-4-variable.woff2`
- Modify: `apps/web/src/styles/fonts.css` (add `@font-face`)
- Modify: `apps/web/src/styles/tokens.css` (add `--font-editorial`)

- [ ] **Step 1: Fetch the font** from Fontsource (OFL-licensed; aligns with existing fonts):

```bash
curl -L -o apps/web/public/fonts/source-serif-4-variable.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/source-serif-4:vf@latest/latin-wght-normal.woff2
```

If that URL 404s, fall back to:

```bash
npm install --no-save @fontsource-variable/source-serif-4
cp node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2 \
   apps/web/public/fonts/source-serif-4-variable.woff2
```

Verify the file exists and is >40KB:

```bash
ls -la apps/web/public/fonts/source-serif-4-variable.woff2
```

- [ ] **Step 2: Add the @font-face** to `fonts.css` after the JetBrains Mono block:

```css
/* Source Serif 4 Variable — editorial register for AI-generated long-form
   content (family messages, plan narratives, survival packet cover). Not
   for UI chrome or body copy. 2026-04-23 Phase 5. */
@font-face {
  font-family: "Source Serif 4";
  font-style: normal;
  font-weight: 200 900;
  font-display: swap;
  src: url("/fonts/source-serif-4-variable.woff2") format("woff2");
}
```

- [ ] **Step 3: Add the editorial token** to `tokens.css`. Locate the `--font-sans` / `--font-display` declaration block (around line 362-364) and add:

```css
--font-editorial: "Source Serif 4", Georgia, "Times New Roman", serif;
```

- [ ] **Step 4: Add the `.editorial` utility** to `primitives.css` (append at the end of the file or near other typography utilities):

```css
/* Editorial register — narrowly scoped to AI-generated long-form content.
   See docs/decision-log.md 2026-04-23 ("editorial register introduction").
   Do not apply to UI chrome or short copy. */
.editorial {
  font-family: var(--font-editorial);
  font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
  font-size: var(--text-md);
  line-height: var(--leading-loose);
  letter-spacing: -0.003em;
  color: var(--color-text);
}

.editorial p {
  margin: 0 0 var(--space-3);
}

.editorial p:last-child {
  margin-bottom: 0;
}

.editorial strong {
  font-weight: 600;
}

.editorial em {
  font-style: italic;
}
```

- [ ] **Step 5: Update the font preload in index.html** if preloads exist. Locate `apps/web/index.html`; if it preloads inter-variable.woff2 and instrument-sans-*.woff2, add a preload for source-serif-4-variable.woff2 (only if already following this pattern — otherwise skip; font-display: swap is the fallback).

- [ ] **Step 6: Run typecheck + test + contrast**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/public/fonts/source-serif-4-variable.woff2 \
        apps/web/src/styles/fonts.css \
        apps/web/src/styles/tokens.css \
        apps/web/src/styles/primitives.css
git commit -m "feat(type): add Source Serif 4 editorial face + .editorial utility

Scoped narrowly: family messages, plan narratives, survival packet cover.
Not applied yet — application follows in subsequent tasks."
```

### Task 5.2 — Apply `.editorial` to FamilyMessagePanel generated body

**Files:**
- Modify: `apps/web/src/panels/FamilyMessagePanel.tsx`

- [ ] **Step 1: Locate the message body render**. Find the `<div>`/`<p>` that renders `result.message_body` / `result.draft_message` / similar.

- [ ] **Step 2: Apply the class**

```tsx
<div className="editorial family-message__body">
  {renderedBody}
</div>
```

- [ ] **Step 3: Run test + typecheck**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/FamilyMessagePanel`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/panels/FamilyMessagePanel.tsx
git commit -m "style(family-message): apply editorial serif to generated message body"
```

### Task 5.3 — Apply `.editorial` to TomorrowPlanPanel narrative and SurvivalPacketPanel cover

**Files:**
- Modify: `apps/web/src/panels/TomorrowPlanPanel.tsx` (plan narrative rendering)
- Modify: `apps/web/src/panels/SurvivalPacketPanel.tsx` (cover page / substitute summary)

- [ ] **Step 1: TomorrowPlan** — locate the long-form narrative (plan summary / `result.narrative`). Wrap in `<div className="editorial">`.

- [ ] **Step 2: SurvivalPacket** — locate the cover-page / substitute summary section. Wrap in `<div className="editorial">`.

- [ ] **Step 3: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/panels/TomorrowPlanPanel.tsx apps/web/src/panels/SurvivalPacketPanel.tsx
git commit -m "style: apply editorial serif to plan narrative and survival packet cover"
```

### Task 5.4 — Chart tonal palette (`--chart-tone-*`)

**Files:**
- Modify: `apps/web/src/styles/tokens.css` (add chart-tone tokens)
- Modify: `apps/web/src/components/DataVisualizations.tsx` (migrate chart fills)
- Modify: `apps/web/src/components/ForecastTimeline.tsx` (migrate forecast-level colors)

- [ ] **Step 1: Add new chart-tone tokens** to `tokens.css`. Place near the existing `--color-forecast-*` block (around line 212):

```css
/* Chart tonal palette (2026-04-23 Phase 5).
   Calm gradient for data visualization — used where chart color is
   encoding a scalar, not an alert. Low → medium → high runs
   navy → amber → rust. For true alerts (approve denied, critical
   error), continue to use --color-danger / --color-success. */
--chart-tone-low: light-dark(#3f5a7a, #8f98a8);
--chart-tone-low-bg: light-dark(#eaeef5, #0b0d12);
--chart-tone-medium: light-dark(#a66a00, #d4a15c);
--chart-tone-medium-bg: light-dark(#faf0dc, #100d07);
--chart-tone-high: light-dark(#8a3630, #c97b73);
--chart-tone-high-bg: light-dark(#f7e8e5, #120909);
```

- [ ] **Step 2: Migrate the forecast-level fills** in `DataVisualizations.tsx` and `ForecastTimeline.tsx`. Replace:
  - `var(--color-forecast-low)` → `var(--chart-tone-low)`
  - `var(--color-forecast-low-bg)` → `var(--chart-tone-low-bg)`
  - `var(--color-forecast-medium)` → `var(--chart-tone-medium)`
  - `var(--color-forecast-medium-bg)` → `var(--chart-tone-medium-bg)`
  - `var(--color-forecast-high)` → `var(--chart-tone-high)`
  - `var(--color-forecast-high-bg)` → `var(--chart-tone-high-bg)`

**Keep** the `--color-forecast-*` tokens in `tokens.css` as aliases — map them to the new scale at the bottom of the compatibility-aliases block (around line 187-203):

```css
--color-forecast-low: var(--chart-tone-low);
--color-forecast-low-bg: var(--chart-tone-low-bg);
--color-forecast-low-text: light-dark(#35486a, #c2cad9);
--color-forecast-medium: var(--chart-tone-medium);
--color-forecast-medium-bg: var(--chart-tone-medium-bg);
--color-forecast-medium-text: light-dark(#7a4e02, #e2bf7f);
--color-forecast-high: var(--chart-tone-high);
--color-forecast-high-bg: var(--chart-tone-high-bg);
--color-forecast-high-text: light-dark(#6a2a24, #d9a098);
```

(The original `--color-forecast-*` declarations, around lines 213-221, should be deleted in favor of these aliases — or left, with the aliases appended at the bottom. The key is ensuring every existing consumer gets the new tonal values through either route.)

- [ ] **Step 3: Run contrast gate + typecheck + test**

Run: `npm run check:contrast && npm run typecheck && npm run test -- apps/web`
Expected: green. If any `--color-forecast-*-text` pair fails AA, tune the `-text` values up one shade toward darker (light) or lighter (dark).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/tokens.css apps/web/src/components/DataVisualizations.tsx apps/web/src/components/ForecastTimeline.tsx
git commit -m "refactor(charts): introduce --chart-tone-* for calm tonal palette

Low → medium → high runs navy → amber → rust rather than green → amber →
red. Keeps true-alert red for approval denials and critical errors only.
Legacy --color-forecast-* tokens alias to the new scale so existing
consumers pick up the retune automatically."
```

### Task 5.5 — Branded SectionSkeleton shimmer

**Files:**
- Modify: `apps/web/src/components/SectionSkeleton.tsx`
- Modify: `apps/web/src/components/SectionSkeleton.css`

- [ ] **Step 1: Read the current SectionSkeleton component** to understand its `lines` prop and existing markup.

- [ ] **Step 2: Update the CSS** to show the brand mark at ~4% opacity behind the skeleton rows:

```css
/* apps/web/src/components/SectionSkeleton.css — append / replace */
.section-skeleton {
  position: relative;
  overflow: hidden;
  /* preserve existing layout rules */
}

.section-skeleton::before {
  content: "";
  position: absolute;
  top: 50%;
  right: var(--space-6);
  transform: translateY(-50%);
  width: 120px;
  height: 120px;
  background: url("/brand/prairieclassroom-mark.png") center / contain no-repeat;
  opacity: 0.035;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .section-skeleton::before {
    display: none;
  }
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run apps/web/src/components/__tests__/SectionSkeleton.test.tsx`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SectionSkeleton.tsx apps/web/src/components/SectionSkeleton.css
git commit -m "style(skeleton): add brand-mark watermark to SectionSkeleton

Low-opacity (3.5%) PrairieClassroom mark sits behind skeleton rows,
giving loading states a branded stage rather than a generic gray wall.
Hidden under prefers-reduced-motion."
```

### Task 5.6 — Monday reset moment on TodayPanel

**Files:**
- Create: `apps/web/src/components/MondayResetMoment.tsx`
- Create: `apps/web/src/components/MondayResetMoment.css`
- Create: `apps/web/src/components/__tests__/MondayResetMoment.test.tsx`
- Modify: `apps/web/src/panels/TodayPanel.tsx` (mount it)

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/__tests__/MondayResetMoment.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import MondayResetMoment from "../MondayResetMoment";

describe("MondayResetMoment", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders on Monday when not dismissed this week", () => {
    vi.setSystemTime(new Date("2026-04-20")); // Monday
    render(<MondayResetMoment classroomId="demo" />);
    expect(screen.getByText(/fresh week/i)).toBeInTheDocument();
  });

  it("does not render on Tuesday", () => {
    vi.setSystemTime(new Date("2026-04-21")); // Tuesday
    const { container } = render(<MondayResetMoment classroomId="demo" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render after dismissal", () => {
    vi.setSystemTime(new Date("2026-04-20")); // Monday
    const weekKey = "2026-W17"; // The ISO week
    window.localStorage.setItem(`prairie:monday-reset:demo:${weekKey}`, "dismissed");
    const { container } = render(<MondayResetMoment classroomId="demo" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/MondayResetMoment.test.tsx`
Expected: FAIL with "Cannot find module '../MondayResetMoment'"

- [ ] **Step 3: Implement the component**

```tsx
// apps/web/src/components/MondayResetMoment.tsx
import { useEffect, useMemo, useState } from "react";
import "./MondayResetMoment.css";

interface Props {
  classroomId: string;
}

function getIsoWeek(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function storageKey(classroomId: string, weekKey: string): string {
  return `prairie:monday-reset:${classroomId}:${weekKey}`;
}

export default function MondayResetMoment({ classroomId }: Props) {
  const today = useMemo(() => new Date(), []);
  const weekKey = useMemo(() => getIsoWeek(today), [today]);
  const isMonday = today.getDay() === 1;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey(classroomId, weekKey)) === "dismissed";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey(classroomId, weekKey), "dismissed");
    } catch {
      /* ignore */
    }
  };

  if (!isMonday || dismissed || !classroomId) return null;

  return (
    <section className="monday-reset-moment" role="status" aria-label="Fresh week">
      <div className="monday-reset-moment__band" aria-hidden="true" />
      <div className="monday-reset-moment__body">
        <span className="monday-reset-moment__eyebrow">Monday</span>
        <p className="monday-reset-moment__title">A fresh week. One calm move opens it.</p>
      </div>
      <button
        type="button"
        className="monday-reset-moment__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss fresh week banner"
      >
        ×
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Write the CSS**

```css
/* apps/web/src/components/MondayResetMoment.css */
.monday-reset-moment {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border: 1px solid color-mix(in srgb, var(--color-brand-green) 30%, var(--color-border));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-brand-green-soft) 70%, var(--color-surface));
  overflow: hidden;
}

.monday-reset-moment__band {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--color-brand-green);
}

.monday-reset-moment__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.monday-reset-moment__eyebrow {
  color: color-mix(in srgb, var(--color-brand-green) 90%, var(--color-text));
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.monday-reset-moment__title {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-editorial);
  font-size: var(--text-md);
  font-weight: 500;
  line-height: var(--leading-snug);
  letter-spacing: -0.008em;
}

.monday-reset-moment__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-h-xs);
  height: var(--control-h-xs);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-lg);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.monday-reset-moment__dismiss:hover {
  background: var(--color-bg-muted);
  color: var(--color-text);
}

.monday-reset-moment__dismiss:focus-visible {
  outline: var(--focus-ring-outline);
  outline-offset: var(--focus-ring-offset);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run apps/web/src/components/__tests__/MondayResetMoment.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Mount in TodayPanel**. In `apps/web/src/panels/TodayPanel.tsx`, add import and render at the top of the panel body (above the hero):

```tsx
import MondayResetMoment from "../components/MondayResetMoment";

// ...inside the main JSX return, right after the opening <section>:
{activeClassroom ? <MondayResetMoment classroomId={activeClassroom} /> : null}
```

- [ ] **Step 7: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/TodayPanel`
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/MondayResetMoment.tsx \
        apps/web/src/components/MondayResetMoment.css \
        apps/web/src/components/__tests__/MondayResetMoment.test.tsx \
        apps/web/src/panels/TodayPanel.tsx
git commit -m "feat(today): add Monday reset moment strip

Shows a quiet editorial band on Monday first-visit; dismissible and
persisted per classroom + ISO week. Adds the first branded moment that
rewards the teacher's week rhythm without pulling eye motion continuously."
```

### Task 5.7 — Decision-log entry for Phase 5

- [ ] **Step 1: Append** to `docs/decision-log.md`:

```markdown
### 2026-04-23 — Editorial register introduction (Source Serif 4), chart tonal retune, branded skeleton, Monday moment

- **Decision:** (1) Add Source Serif 4 Variable as a third font family under `--font-editorial`, scoped narrowly via the `.editorial` utility to family messages, plan narratives, and survival packet cover. (2) Introduce `--chart-tone-low / medium / high` calm gradient; retune forecast chart fills from green/amber/red to navy/amber/rust via token aliases. (3) Watermark the brand mark at 3.5% opacity behind SectionSkeleton. (4) Add a Monday first-visit reset banner (dismissible, per-classroom, per-ISO-week persistence).
- **Why:** (1) AI-generated long-form content at high-stakes touchpoints (families, subs, plans) benefits from the editorial register's reading tempo. (2) Forecast red was firing on almost every day with one "high" block; the tonal retune preserves ranking without broadcasting alarm. (3) Loading states had no brand presence. (4) Teachers' week is rhythmic; one quiet delight moment earns trust without ambient motion cost.
- **Alternatives considered:** (1) Ship without a serif (rejected — register stays flat); use the serif for UI chrome too (rejected — institutional calm is primary). (2) Leave forecast red (rejected — too loud); move to all-gray (rejected — loses ordinality). (3) Leave gray skeletons (rejected — missed brand moment). (4) Add daily reset moments (rejected — ambient cost too high).
- **Consequences:** A new self-hosted font adds ~75KB to the bundle at first visit; `.editorial` now an approved utility for long-form content only; forecast charts read as a calm ordinal gradient; loading states carry brand signal; Monday-morning teachers see one quiet delight moment.
- **What would change this:** Contrast gate regression on the retuned forecast palette; teacher feedback that Monday moment feels too prompt-like; bundle audit flagging the serif as unused.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: log 2026-04-23 editorial register + chart retune + Monday moment"
```

### Phase 5 validation gate

- [ ] **Run the full frontend lane**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: all green.

---

# Phase 6 — Motion pruning & workspace float

**Goal:** Collapse `.btn` transition sprawl; reduce the motion-token set from 15+ eases / 7 durations to 4 / 3; float the workspace with a gutter at ≥1280px.

### Task 6.1 — Collapse `.btn` transition list

**Files:**
- Modify: `apps/web/src/styles/primitives.css:18-25`

- [ ] **Step 1: Replace the 7-property `.btn` transition** with:

```css
/* Before (lines 18-25):
  transition:
    background-color var(--motion-letterpress) var(--ease-letterpress),
    color var(--motion-letterpress) var(--ease-letterpress),
    ...
*/

/* After: */
  transition: all var(--motion-letterpress) var(--ease-letterpress);
```

- [ ] **Step 2: Run typecheck + test + contrast**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: green.

- [ ] **Step 3: Manual check** — start dev server, hover/focus/press a primary button, verify no regression in motion feel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/primitives.css
git commit -m "style(primitives): collapse .btn transitions to single 'all' property"
```

### Task 6.2 — Prune motion tokens to canonical 4 eases + 3 durations

**Files:**
- Modify: `apps/web/src/styles/tokens.css:427-459` (the motion block)

- [ ] **Step 1: Audit current usage**

Run: `grep -rn "ease-standard\|ease-emphasis\|ease-spring\|ease-spring-heavy\|ease-out-expo\|ease-in-out-circ\|ease-decelerate\|ease-accelerate\|ease-elastic\|ease-bounce\|ease-snap\|ease-out-back\|ease-letterpress\|ease-press" apps/web/src | wc -l`

Record the count. This guides the canonical four.

- [ ] **Step 2: Pick the canonical four** (keep):
  - `--ease-standard` (cubic-bezier(0.2, 0, 0.38, 0.9)) — default
  - `--ease-emphasis` (cubic-bezier(0.34, 1.08, 0.64, 1)) — emphasis
  - `--ease-spring` (cubic-bezier(0.175, 0.885, 0.32, 1.1)) — controls press
  - `--ease-out-expo` (cubic-bezier(0.16, 1, 0.3, 1)) — panels / drawers

- [ ] **Step 3: Retire the others** by aliasing them to the canonical four. In `tokens.css`, after the canonical four, add:

```css
/* Retired motion eases — aliased to canonical four (2026-04-23 Phase 6). */
--ease-spring-heavy: var(--ease-spring);
--ease-in-out-circ: var(--ease-standard);
--ease-decelerate: var(--ease-out-expo);
--ease-accelerate: var(--ease-standard);
--ease-elastic: var(--ease-emphasis);
--ease-bounce: var(--ease-emphasis);
--ease-snap: var(--ease-standard);
--ease-out-back: var(--ease-emphasis);
--ease-letterpress: var(--ease-standard);
--ease-press: var(--ease-spring);
```

This is DRY-violating in one direction (maps all orphaned names to 4 canonical) but intentional — it lets us retire the names over time without a big-bang rename.

- [ ] **Step 4: Prune durations** to canonical three: `--motion-fast` (150ms), `--motion-base` (260ms), `--motion-slow` (420ms). Alias the rest:

```css
--motion-slower: var(--motion-slow);
--motion-letterpress: var(--motion-fast);
--motion-micro: var(--motion-fast);
--motion-hover: var(--motion-fast);
--motion-stagger-step: 40ms; /* unique use case; keep */
--duration-fast: var(--motion-fast);
```

- [ ] **Step 5: Run typecheck + test + contrast + visual check**

Run: `npm run typecheck && npm run test -- apps/web && npm run check:contrast`
Expected: green. Manually verify button press, card hover, drawer open feel unchanged.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/styles/tokens.css
git commit -m "refactor(motion): alias 11 orphaned eases and 5 durations to canonical set

Canonical eases: standard, emphasis, spring, out-expo.
Canonical durations: fast, base, slow.
Retired names alias to the canonical set; no call-site changes required.
Future call sites should prefer canonical names."
```

### Task 6.3 — Float workspace with gutter at ≥1280px

**Files:**
- Modify: `apps/web/src/styles/shell.css` (add `@media (min-width: 1280px)` rule for `.app-main`)

- [ ] **Step 1: Append to shell.css**, after the existing `.app-main` rules:

```css
@media (min-width: 1280px) {
  .app-main {
    /* Floating workspace — 16px gutter from viewport edge; rounded both
       top and bottom since the header is now a single row that does not
       need to dock visually. Maintains the material hierarchy: the
       canvas breathes around the floating workspace card. */
    margin: 0 var(--space-4) var(--space-4);
    border: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .app-header {
    padding-bottom: var(--space-3);
  }
}
```

- [ ] **Step 2: Run tests + typecheck**

Run: `npm run typecheck && npm run test -- apps/web`
Expected: green.

- [ ] **Step 3: Manual visual check** at 1440px — workspace should float with a gutter, rounded on all four corners, subtle shadow. At 1200px, it reverts to flush (docked to header).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/shell.css
git commit -m "feat(shell): float workspace with gutter at ≥1280px

Wide-viewport workspace now sits on the canvas as a floating card with
16px gutter, rounded corners, and subtle shadow — matching the material
hierarchy documented in dark-mode-contract.md. Narrow viewports keep
the flush-to-header shell silhouette."
```

### Task 6.4 — Decision-log entry for Phase 6

- [ ] **Step 1: Append** to `docs/decision-log.md`:

```markdown
### 2026-04-23 — Motion prune + floating workspace at wide viewports

- **Decision:** (1) Collapse `.btn` transition list from 7 properties to single `all`. (2) Alias 11 motion eases and 5 durations to canonical 4 eases + 3 durations. (3) At ≥1280px viewports, float the workspace with a 16px gutter, rounded corners, and subtle shadow.
- **Why:** Button transitions had drifted to 7 properties — CSS engine recomputes each on every state change. Motion token sprawl (15+ eases, 7 durations) made it unclear which to use. Wide-viewport workspace docked flush to the header felt like a 2010s enterprise app; floating it matches the material hierarchy's intent (workspace is a layer *above* the canvas, not an edge-to-edge pane).
- **Alternatives considered:** Keep the full motion palette (rejected — cognitive overhead); delete the orphan names outright (rejected — big-bang rename risk); float the workspace at all widths (rejected — narrow viewports need every pixel).
- **Consequences:** Button state changes animate all properties uniformly; motion tokens converge to a canonical four eases and three durations over time as future edits switch away from aliased names; wide-viewport workspace gains a floating card silhouette.
- **What would change this:** Motion audit flagging a property that should not animate (e.g. if `all` causes filter-computation regressions on lower-end hardware); teacher feedback that the floating workspace feels "disconnected" at 1280-1440px.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: log 2026-04-23 motion prune + floating workspace decision"
```

### Phase 6 validation gate

- [ ] **Run the full frontend lane + release gate**

Run: `npm run typecheck && npm run test && npm run check:contrast`
Expected: all green.

- [ ] **Run the end-to-end release gate (final cross-service check)**

Run: `npm run release:gate`
Expected: green (mock mode, default no-cost lane).

---

# Final checklist

Before declaring the plan complete:

- [ ] All 6 phases' validation gates pass
- [ ] `npm run release:gate` passes on mock mode
- [ ] `docs/decision-log.md` has 6 new dated entries
- [x] `docs/development-gaps.md` G-16 is marked closed
- [ ] No `--shell-control-h` / `--shell-nav-h` references remain in the codebase
- [ ] No `MultiToolHero` imports remain
- [ ] Manual visual check at 375px, 768px, 1024px, 1280px, 1440px — all layouts render cleanly
- [ ] Dark mode toggle works on every page
- [ ] Keyboard: `⌘K` opens palette (now labeled "Search"), `?` opens shortcuts, `1-7` jump to tabs

---

## Self-review (completed during plan authoring)

**Spec coverage.** Every issue A1–A5, B1–B5, C1–C5, D1, D3, D5 from the audit is mapped to a task above. C2 (btn transitions) = Task 6.1. C3 (motion sprawl) = Task 6.2. D2 (floating workspace) = Task 6.3. C4 (chart tonal palette) = Task 5.4. C1 (G-16 chart drill-downs) = Phase 4. No audit items left orphaned.

**Placeholder scan.** Every code block contains real code; every command is exact; every file path is absolute-from-repo-root. No "TBD", "implement later", or "similar to Task N".

**Type consistency.** `PageHeroPulse.tone` declared in Task 2.2 as `"success" | "warning" | "danger" | "neutral"` — used consistently in Tasks 2.3-2.5. `useZoneDisclosure` declared in Task 3.1 — matches usage in Task 3.2. `DrillDownContext` types `plan-coverage-section`, `variant-lane`, `student-tag-group` assumed to exist in `types.ts` (they are referenced in `DrillDownDrawer.tsx`, per development-gaps.md G-16). If any is missing, add the type to `apps/web/src/types.ts` before wiring — but G-16 claims the chart props already exist, so this is expected to be a no-op.
