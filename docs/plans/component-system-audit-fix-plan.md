# Component System Audit — Remediation Plan

**Date:** 2026-04-19
**Source audit:** Layer-by-layer system review (Layers 1–7, Issues #1–#17)
**Design philosophy applied:** Nothing-inspired — *subtract, don't add*. Three-layer hierarchy. Spacing as meaning. One break per screen.
**Scope:** Shared shell + cross-panel primitives. Panel-specific output rendering is out of scope except for Layer 7 (empty states).

---

## Guiding Principles For This Sprint

1. **Remove before adding.** Every issue below is first asked "can we delete this layer entirely?" before "can we restyle it?"
2. **Fix at the primitive, not the panel.** Changes land in `WorkspaceLayout.tsx`, `nothing-theme.css`, `tokens.css`, and the shared `PageIntro` / `PrepSectionIntro` / `EmptyStateCard` components. We do not patch 12 panels in parallel.
3. **One break per screen.** The current shell breaks the pattern in 4–5 places (chrome stripes, GOT IT borders, static chips, monospace subtitles, illustrated empty states). We reduce this to ONE expressive moment per panel.
4. **Reserve the dark-mode contract.** All token changes flow through `npm run check:contrast` before merge. See `docs/dark-mode-contract.md`.

---

## Workstream A — Chrome Stack Compression (Issues #1–#3)

**Problem:** Four sticky chrome layers (~190px) before any content. Layers shift between sections. Visual chunking is ambiguous.

### A1. Merge Layer B (Classroom Bar) into Layer C (Section Tabs) — *fixes #1, #2*
- **Target:** `apps/web/src/components/WorkspaceLayout.tsx` + `apps/web/src/styles/shell.css`.
- **New shape:** Single 48px row containing `[🔒 Grade 3-4]  ·  TODAY · PREP · OPS · REVIEW`. The classroom identity becomes a leading chip (clickable → opens classroom switcher), section tabs sit to the right of a `·` separator.
- **Removed surface:** ~44px of vertical chrome reclaimed. No new component required.
- **Token addition:** `--chrome-divider-tint` (light: `#FAFAFA`, dark: `#0E0E0E`) — gives App Header vs. Section Bar a 1px tonal seam without a hard border.

### A2. Reserve Layer D (sub-tabs) on TODAY with a zero-height placeholder — *fixes #3*
- **Target:** `WorkspaceLayout.tsx` — render an empty `<div className="workspace-subtabs workspace-subtabs--empty" />` on TODAY rather than conditionally mounting the row.
- **Why a placeholder, not animation:** percussive, not fluid. No layout shift, no spring transition. Matches Nothing's "click not swoosh" rule.

### A3. Subtle tonal contrast between rows — *secondary on #2*
- **Target:** `nothing-theme.css`. App header keeps `--surface-page`. Merged classroom+section row gets `--surface-elevated` (already defined; verify both modes).
- **Validation:** `npm run check:contrast` after token changes.

**Net result:** 3 chrome layers, ~146px total. ~44px reclaimed. No layout shift between sections.

---

## Workstream B — Page Wrapper Simplification (Issues #4, #5)

**Problem:** Outer gray + inner white card creates redundant nesting. Top padding is per-panel rather than wrapper-controlled.

### B1. Lighten the outer page layer (preserve three-layer hierarchy) — *fixes #4*
- **Architectural constraint:** `docs/dark-mode-contract.md §1` defines `canvas → workspace → surface` as a load-bearing material stack. Do **not** collapse the stack. Instead, reduce its *visual weight* so the workspace plane reads as material depth rather than as a hovering card.
- **Target:** `apps/web/src/styles/shell.css` `.app-main` rules.
- **Changes:**
  - Reduce `.app-main` border opacity from 55% to 30% of `--color-border`.
  - Replace `box-shadow: var(--shadow-lg)` with `var(--shadow-sm)` — keep elevation, drop the heavy ambient.
  - Keep `--color-workspace`, `--radius-xl`, and the inner stroke as documented.
- **Result:** Same architectural stack, less visual noise. The "card on a card" effect from the audit goes away without violating the documented material hierarchy.

### B2. Define `--page-content-padding-top` token — *fixes #5*
- **Target:** `tokens.css` — add `--page-content-padding-top: 32px;` (light + dark identical).
- **Apply at:** `.workspace-content` only. Per-panel padding overrides are removed; flag any panel that tries to set its own top padding in code review.

---

## Workstream C — Section Header Block Discipline (Issues #6, #7)

**Problem:** Four type treatments stacked in the header (label / serif h2 / mono subtitle / chip row) violate the 2-family / 3-size budget. Static "GRADE 3-4" chips signal customization without delivering it.

### C1. Collapse header to two type levels — *fixes #6*
- **Target:** `apps/web/src/components/PrepSectionIntro.tsx` + `PageIntro.tsx`.
- **New typography:**
  - Section label: 12px Space Mono, ALL CAPS, `--text-secondary`. (e.g., `PREP WORKSPACE`)
  - Page title: 28–32px Space Grotesk, weight 500, `--text-display`.
  - Description: 14px Space Grotesk, regular, `--text-primary`. *No more monospace subtitle.*
- **Result:** 2 families, 3 sizes, 2 weights. Within budget.

### C2. Remove static context chip row — *fixes #7*
- **Target:** `PrepSectionIntro.tsx` chip row block.
- **Action:** Delete the static `[GRADE 3-4] [ARTIFACT-LED] [STUDENT-READY]` row entirely.
- **Reserved:** Chip component remains for genuinely dynamic context labels (e.g., `📍 Pinned to Alberta Curriculum Grade 4 ELA` *only when alignment is active*). A new prop `dynamicContext?: ChipSpec[]` carries these conditionally.
- **Classroom identity:** Already lives in the merged Layer B/C chip from Workstream A. No duplication.

---

## Workstream D — Split-Panel Layout Contract (Issues #8–#10)

**Problem:** 45/55 split inverts visual hierarchy (form does work in less space). TODAY uses single-column; every other section uses split — different spatial models. No responsive behavior.

### D1. Two-stage split ratio — *fixes #8*
- **Target:** `WorkspaceLayout.tsx` split container + `shell.css`.
- **New behavior:**
  - **Input phase** (no result yet): `grid-template-columns: 55fr 45fr` — form gets prominence.
  - **Output phase** (result rendered): `grid-template-columns: 40fr 60fr` — canvas takes over.
- **Mechanism:** `data-split-state="input" | "output"` attribute on the split container. CSS handles transition at `200ms ease-out` (no spring).

### D2. Sanctioned layout modes via attribute — *fixes #9*
- **Target:** `WorkspaceLayout.tsx`.
- **New contract:** `data-layout="single" | "split"` on the workspace root.
- **TODAY adoption:** introduce a mild split on viewports ≥1280px — narrative + actions left (~60%), context/data rail right (~40%). On smaller viewports, TODAY remains single-column. Reduces cognitive jolt when switching sections.
- **Documentation:** Add layout mode contract to `docs/architecture.md` (UI section) and link from this plan.

### D3. Responsive collapse breakpoint — *fixes #10*
- **Target:** `shell.css` split rules.
- **Behavior:** at `max-width: 900px`, split stacks vertically (form on top, canvas below). Sticky chrome remains.
- **Validation:** Manual smoke at 1024px, 900px, 768px, 414px during the sprint demo. Add a `@media` snapshot test to `apps/web/src/__tests__` if feasible.

---

## Workstream E — Dismissable vs. Static Card Disambiguation (Issues #11–#13)

**Problem:** GOT IT cards, the Carry Forward card, and other callouts all share the left-border accent. The visual treatment has lost its meaning. Dismissal labelling is informal and irreversible.

### E1. Section-coded GOT IT borders — *fixes #11*
- **Architectural constraint:** Existing section color tokens already exist and are wired in `shell.css:392-407`. Mapping is: TODAY=sun, PREP=sage, OPS=slate, REVIEW=forest. Do **not** add new `--accent-*` tokens — that creates token drift.
- **Target:** `ContextualHint.tsx` + `ContextualHint.css` (or whichever component owns the GOT IT card; verify in implementation).
- **Token reuse** (no new tokens):
  - TODAY → `--color-border-sun`
  - PREP → `--color-border-sage`
  - OPS → `--color-border-slate`
  - REVIEW → `--color-border-forest`
- **Application:** The GOT IT card reads its section context (likely via `data-active-section` on a parent or via a prop) and applies the matching `--color-border-*` to its left border at `4px solid`.
- **Constraint:** Accent borders are *only* applied to the GOT IT card. Existing section-tab indicators already use these tokens — no leakage into buttons, chips, or text.

### E2. Replace "GOT IT" with `✕` icon + persistent recovery — *fixes #12*
- **Target:** `ContextualHint.tsx`.
- **Shape:**
  - Dismiss control: `✕` icon (16px, `--text-secondary`) in top-right.
  - Persistence: dismissal stored in `localStorage` under `prairie:hint:dismissed:<panelId>`.
  - Recovery: when dismissed, an `ⓘ` icon (14px, `--text-disabled`) sits in the same top-right slot of the panel header. Click → re-expands the hint.
- **Copy:** No "GOT IT" label anywhere. The ✕ alone communicates dismissal.

### E3. Reserve left-border accent exclusively for dismissable hints — *fixes #13*
- **Target:** Every component currently using a left-border accent. Audit candidates: `ContextualHint`, the Carry Forward card on TODAY (likely in `TodayStory.tsx` or `PendingActionsCard.tsx`), Support Patterns callouts.
- **Replacement for static callouts:**
  - Carry Forward → full subtle background tint (`--surface-elevated`), no border.
  - Support Pattern callouts → top-border accent (1px, `--text-disabled`) instead of left.
- **Result:** Left border = "this can be dismissed." Always. Anywhere.

---

## Workstream F — Form Card Affordance (Issues #14–#16)

**Problem:** Forms float on white with no boundary. Field labels are inconsistent in case/weight. The classroom selector eats the prime form slot on every panel even though it's almost never changed.

### F1. Give the form a visible interactive zone — *fixes #14*
- **Target:** Shared form wrapper (likely a new `FormCard` component, or extend `WorkspaceLayout`'s form slot).
- **Treatment:** `background: var(--surface-elevated)`; `border: 1px solid var(--divider-subtle)`; `border-radius: 8px`; `padding: 24px`.
- **Why subtle:** Per nothing-design's container strategy — use the lightest tool that works. Background tint + 1px border is enough to chunk the form away from the GOT IT card and from raw whitespace. No shadow.
- **Single source:** Build this once; refactor each panel's form to use the shared wrapper.

### F2. Standardize field label treatment — *fixes #15*
- **Target:** `tokens.css` + a shared `.form-label` class in `nothing-theme.css`.
- **Spec:**
  - 12px Space Grotesk, weight 600, sentence case.
  - Color: `--text-secondary`.
  - Letter-spacing: 0.
  - **No ALL CAPS in forms.** ALL CAPS is reserved for section labels and status indicators.
- **Migration:** grep for current label markup in panels and replace inline styles with the shared class. Lint rule (eslint custom or comment-flag) to prevent regression.

### F3. Lift the classroom selector out of every form — *fixes #16*
- **Target:** Every panel form + a new persistent context strip in `WorkspaceLayout.tsx`.
- **New shape:** A small line above the form wrapper:
  > `Context: Grade 3-4 cross curricular [change]`
- **Behavior:** `[change]` opens the existing classroom switcher. The selector is removed from form bodies entirely.
- **Edge case:** Panels that need to operate on a *different* classroom than the active one (rare; likely Forecast and Support Patterns when comparing) get an explicit "Comparing against:" override row — opt-in, not default.
- **Net win:** Every form loses one field. The first form field becomes the panel's actual *task* (artifact title, student, lesson topic).

---

## Workstream G — Empty State Differentiation (Issue #17)

**Problem:** Every empty canvas uses the same icon + "No X yet" + numbered-step template. By panel 4, it's invisible noise.

### G1. Three empty-state archetypes — *fixes #17*
- **Target:** `EmptyStateCard.tsx`, `EmptyStateIllustration.tsx`, `DifferentiateEmptyState.tsx`, `LanguageToolsEmptyState.tsx`, plus per-panel empty states for EA Briefing, EA Load, Forecast, Log Intervention, Support Patterns, etc.

| Archetype | Use for | Treatment |
|-----------|---------|-----------|
| **Minimal cue** | High-frequency 2–3 tap flows (Log Intervention, Family Message draft) | Single line of `--text-secondary` text: `Select a student to begin.` No icon. No steps. |
| **Output preview** | Complex generators (Differentiate, Tomorrow Plan, EA Briefing) | Show a *visual skeleton* of the expected output structure — outlined cards at 40% opacity. No numbered instructions. The shape teaches faster than text. |
| **Sample collapse** | Analysis tools (Support Patterns, Forecast) | Show a collapsed sample result card at 60% opacity with a `[SAMPLE]` tag. Real run replaces it with no layout shift. |

- **Removed:** Numbered steps with circle badges. Icon illustrations on every panel. The descriptor box around the prose. All three are deleted from the empty-state library.
- **Per-panel mapping:** Recorded as a checklist in the implementation PR (one row per panel → archetype assignment).

---

## Cross-Cutting Token Additions (consolidated)

Added to `apps/web/src/styles/tokens.css` (always grep before re-using):

```
--chrome-divider-tint
--page-content-padding-top
--divider-subtle
```

Each must be defined for both light and dark modes. `npm run check:contrast` runs after token PR.

**Reused (no new token):** `--color-border-sun/sage/slate/forest` for Workstream E1 section accents. Already defined in `tokens.css`.

---

## Sequencing & PR Plan

The 7 workstreams are *not* equal in risk. Recommended order:

| Order | Workstream | Why first / why later |
|-------|-----------|----------------------|
| 1 | **B** (Page wrapper) | Smallest blast radius, immediate visual win. Validates token strategy. |
| 2 | **A** (Chrome compression) | High user-visible impact. Independent of forms/empty states. |
| 3 | **F** (Form card) | Largest cross-panel refactor. Land it once shell is stable. |
| 4 | **C** (Section header) | Cosmetic; depends on F's shared primitives. |
| 5 | **E** (Card disambiguation) | Touches several components but each is small. |
| 6 | **D** (Split layout) | Highest risk — affects every workspace panel. Land last in shell work. |
| 7 | **G** (Empty states) | Per-panel; can run in parallel with D once archetypes are defined. |

**Per-workstream gates:**
- TypeScript: `npm run typecheck`
- Tests: `npm run test`
- Contrast: `npm run check:contrast` (after any token addition)
- Visual: manual smoke at 1280 / 1024 / 900 / 414px
- Release gate: `npm run release:gate` before merging Workstream D and G (cross-service surface touched).

---

## Out of Scope (Explicitly)

- Panel-internal content layout (variant cards, plan viewer rows, intervention timeline) — separate audit.
- Color *system* redesign beyond the 4 section accent tokens.
- Doto display font usage — reserved for hero TODAY metric only; not introduced by this plan.
- Mobile nav (`MobileNav.tsx`) — already a separate component path; D3's responsive collapse refers to the desktop split only.
- New animations or motion timing changes beyond the 200ms split-state transition.

---

## Documentation Updates Required At Merge

- `docs/architecture.md` — UI section: document the `data-layout="single|split"` contract and the two-stage split ratio.
- `docs/dark-mode-contract.md` — register the 7 new tokens.
- `docs/decision-log.md` — one entry: *"2026-04-19: Compressed chrome stack from 4 layers to 3, lifted classroom selector out of forms, sectioned GOT IT accent colors, established empty-state archetype taxonomy."*

---

## What This Plan Refuses To Do

The audit could be read as a request for *more* visual treatments — more chip types, more accent colors, more hover states, more illustrations. This plan does the opposite. **The audit's complaints are mostly symptoms of too many things competing for attention, not too few.** Every workstream above either deletes a layer, merges two redundant treatments, or replaces a custom panel-specific style with a shared primitive. If the implementation PR ends up *adding* more components than it removes, the plan has failed.
