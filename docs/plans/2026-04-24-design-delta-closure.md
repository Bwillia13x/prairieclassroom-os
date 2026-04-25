# PrairieClassroom OS — Design Delta Closure Plan

> **Status:** SHIPPED 2026-04-24 as commits `b287be2` (polish pass) + `aca6c7b` (design delta closure, HEAD).
> **Evidence:** [docs/evidence/2026-04-24-design-delta-closure.md](../evidence/2026-04-24-design-delta-closure.md)
> **Decision log:** [docs/decision-log.md](../decision-log.md) §2026-04-24 Design delta closure
> **Document kind:** Retrospective + forward template. Captures the revised plan that was used as the brief, plus the actual-vs-plan divergences and reasoning for future design-delta passes.

## Summary
Close the delta between the live app and the generated design comps as a **visual/product refinement pass**, not a pixel-perfect rebuild. Comps are directional. The seven-top-level-page shell, per-page role scopes, URL contract (`?tab=`, `?tool=`, `?classroom=`, `?demo=true`, and legacy `tab=<old-panel>` migration), data sources, and all model-routed prompts stay unchanged. Work lands as shared-primitive tuning first, then content hierarchy per page, then overlay polish.

## Non-Goals (explicit)
- No backend, API, schema, or prompt routing changes.
- No new top-level pages; no reordering the seven.
- No new panels; `extract_worksheet` remains a backend-only capability.
- No role/capability changes beyond preserving existing `useRole` / `roleCapabilities()` behavior.
- No demo-data reshape (26 students / 36 interventions / 3 plans / 1 pattern / 1 approved message).
- No removal of approval gates on Family Message or any human-in-the-loop surface.
- No re-adoption of comp hallucinations: invented nav labels, fake student names, fabricated metrics, or unsupported actions are reference only.
- No new backend fields to feed UI; the UI must derive from `latestTodaySnapshot`, `profile`, histories, generated outputs, and session/feedback summaries already in the API surface.

## Shipping Shape
Five sequenced phases, each exits on a checkpoint. Phases 2–3 are parallelizable across panels once Phase 1 primitives are stable.

### Phase 0 — Inventory & Guardrails (scope-locking)
- [x] Enumerate every token the comps imply vs. what exists in `apps/web/src/styles/tokens.css`. Any token the comps use that isn't present gets added **as a token**, not inlined as a hex value. Grep-first policy is non-negotiable.
- [x] Reproduce the "duplicate React key warning for header actions." **Reality:** root cause was in `CommandPalette.buildPaletteRows`, not `HeaderAction`. Captured in commit body + regression test.
- [x] Snapshot the current live UI at **375 / 768 / 1200 / 1440** for all seven pages + overlays. Stored at `output/ui-touchpoints/2026-04-24T20-37-00Z-prairieclassroom-os/` (19 images).
- [x] Role-scoped tab visibility already covered at `apps/web/src/__tests__/appReducer.test.ts:223-251` — no new test required.

**Exit criteria:** token gap list ✅, duplicate-key repro ✅, pre-change contact sheet ✅, role-visibility test green ✅.

### Phase 1 — Shared Shell & Primitives (foundation)
- [x] **App shell / header:** tighter selected-tab affordance, clearer pressed state, keyboard focus-ring audit. Single-row chrome breakpoint moved 1280px → 1660px to avoid tab cramming at common laptop viewports.
- [x] **MobileNav:** polished selected/pressed states; all seven tabs remain reachable at 375 px.
- [x] **PageHero extensions:** compact-mobile stacking for `metricGroups`, `pivots`, `actions`; stronger dark-surface contrast for `pulse` tones; tone-aware metric figures. Existing flat `metrics` API preserved; existing tests intact.
- [x] **OperationalPreview — architectural decision taken as EXTRACT (B), not compose (A).** New primitive at `apps/web/src/components/shared/OperationalPreview.tsx`. See "Divergences" below and [decision-log.md](../decision-log.md).
- [x] **Overlays (CommandPalette, ShortcutSheet, RolePromptDialog, Classroom Switcher, Role Menu UI):** visual pass; preserved `role="dialog"`, focus trap, Esc-to-close, Cmd+K activation, role confirmation flow.

**Exit criteria:** duplicate-key fix verified ✅; primitives pass existing tests ✅; Classroom rendered correctly as representative page ✅.

### Phase 2 — Bird's-Eye Pages (read-heavy command surfaces)
Parallelizable across three panels; each has the same acceptance shape.

- [x] **Classroom (`panels/ClassroomPanel.tsx`):** health, open threads, plan streak, EAL count, pressure status, Today/Tomorrow/Week pivots, students-to-watch (from active support threads + watchlist — **not** a risk score), coverage snapshot, queue preview into first screen. Framing stays "complexity pressure / coverage need," never "student risk."
- [x] **Today (`panels/TodayPanel.tsx`):** "34 threads" narrative kept, recommended next move + `Open Intervention Log` elevated as primary, followed by day arc, risk tiles, triage queue, roster touchpoints, class pulse. "Risk tiles" means block-level complexity load, not per-student scoring.
- [x] **Week (`panels/WeekPanel.tsx`):** Mon–Fri columns above the fold at ≥1200 px with complexity confidence, events, coverage pressure, compact "review today" action; gracefully stacks on mobile.

**Per-page acceptance (all green):**
1. URL round-trip: deep-linking `?tab=<page>` renders the correct panel; `?tool=` restores correctly where applicable.
2. Role visibility: only the roles listed for that page see it (Phase 0 test still green).
3. Data provenance: every visible number / chip / row traces to an existing data source.
4. Accessibility: Axe on the page passes; focus order matches visual order; `prefers-reduced-motion` respected.
5. Responsive: parity at 375 / 768 / 1200 / 1440 verified in contact sheets.

### Phase 3 — Tool Pages (multi-tool surfaces)
- [x] **Tomorrow (`panels/TomorrowPanel.tsx` hosting `TomorrowPlanPanel.tsx` + `ForecastPanel.tsx`):** single page, two **visually differentiated tool states** via the existing tool switcher. Tomorrow Plan → planning order, plan preview, block cards, student support chips, carry-forward notes. Forecast → block-risk timeline, risk bands, adult coverage constraints, mitigation rows. **Not split into two pages.**
- [x] **Prep (`panels/PrepPanel.tsx` hosting `DifferentiatePanel.tsx` + `LanguageToolsPanel.tsx`):** shared prep command header; Differentiate = lesson intake, mode controls, student/support chips, recent runs, output preview; Language Tools = EAL learner cards, language selector, vocab/simplify/bilingual segmented controls, practical scaffold previews.
- [x] **Ops (`panels/OpsPanel.tsx` hosting `InterventionPanel.tsx` + `EABriefingPanel.tsx` + `EALoadPanel.tsx` + `SurvivalPacketPanel.tsx`):** four tools, each as an adult-coordination surface. `OpsWorkflowStepper` semantics preserved.
- [x] **Review (`panels/ReviewPanel.tsx` hosting `FamilyMessagePanel.tsx` + `SupportPatternsPanel.tsx` + usage-insights):** Family Message draft preview + language preference + tone controls + **approval status (human-in-the-loop is non-negotiable)** + evidence trace. Human-in-the-loop preview chips ("Always editable", "No autonomous send") make the approval contract visible above the fold.

### Phase 4 — QA Sweep, Contact Sheet, Demo Dry-Run
- [x] Regenerate contact sheet at 375 / 1280 / 1440 / 1720 across seven pages + overlays. Stored at `output/ui-touchpoints/2026-04-24T23-47-current-design-delta/` (20 images including comp reference).
- [x] Evidence memo written: [docs/evidence/2026-04-24-design-delta-closure.md](../evidence/2026-04-24-design-delta-closure.md).
- [x] `docs/dark-mode-contract.md` updated with the new Command-block surface family subsection (this pass).
- [x] `docs/decision-log.md` records the extract-vs-compose judgment and full rationale (this pass).
- [x] Validation gate (see below) green.

## Validation Gate (executed)

Ordered cheapest-to-most-expensive; all green at commit time:

1. `npm run typecheck` — ✅ pass
2. `npm run lint` — ✅ pass
3. `npm run test` — ✅ **1889/1889 vitest pass** (+1 regression test for `buildPaletteRows` duplicate-key guard)
4. `npm run check:contrast` — ✅ **80/80 pairs meet WCAG AA** (light + dark)
5. `npm run build -w apps/web` — ✅ pass
6. Live browser sweep across 375/1280/1440/1720 × light/dark on all seven panels + overlays — ✅ zero console errors, zero duplicate React key warnings

Baseline preserved at or above 1,802 vitest + 69 pytest (CLAUDE.md). Post-pass vitest count: **1,889** — delta of +87 consistent with regression test addition and the new `OperationalPreview` test coverage.

## Risk Register (as-drafted vs. outcome)

| # | Risk | Mitigation | Outcome |
|---|------|------------|---------|
| R1 | Comp hallucinations (fake names, alt nav, invented metrics) sneak into UI | Phase 0 token/nav audit; every data binding traced to a real source | Controlled — all page data traces to existing sources; no hallucinated nav labels or student names |
| R2 | Invented design tokens silently fail at runtime | Grep `tokens.css` before any `var(--*)` use; `npm run check:contrast` gated | Controlled — six new tokens added to `tokens.css` and contract doc; contrast 80/80 |
| R3 | Role-scoped nav regresses | Phase 0 visibility test suite runs on every PR | Controlled — `appReducer.test.ts` existing coverage held through the pass |
| R4 | Mobile regression from desktop-focused comps | 375 / 768 checks mandatory per phase | Controlled — live browser sweep includes 375px mobile in both themes |
| R5 | "Risk tile" / "students to watch" framing drifts toward per-student risk-scoring | Copy-review gate: no ordinal student risk ranks; pressure metrics are class- or block-level | Controlled — framing kept at "complexity pressure / coverage need" |
| R6 | Overlay accessibility regresses | Existing tests + Axe sweep per overlay | Controlled — overlay tests green; `role="dialog"`, focus trap, Esc preserved |
| R7 | Duplicate-key warning claim is actually a different bug | Phase 0 repro required before Phase 1 "fix" | **Realized — and handled well.** Repro located it in `CommandPalette.buildPaletteRows`, not `HeaderAction`. Regression test added. |
| R8 | Dark-mode contrast regressions | `npm run check:contrast` gated; doc updated | Controlled — 80/80 WCAG AA |
| R9 | Scope creep into App.tsx decomposition (1,088 lines) | Explicitly out of scope; file a follow-up if pain surfaces | Controlled — App.tsx not touched structurally |

## Divergences (reality vs. retrospective plan)

### 1. OperationalPreview — extracted (B), not composed (A)
The retrospective plan recommended compose-only. The implementer chose extraction as a new shared primitive `components/shared/OperationalPreview.tsx`. Rationale: the preview strip appears on Classroom, Today, both Tomorrow tool states, and all four Ops tools (≥7 sites with an identical shape contract), which comfortably exceeds the plan's stated ≥4-site threshold for extraction. The existing `OperatingDashboard`/`InterventionRecencyTimeline`/`PendingActionsCard`/`ClassroomCompositionRings`/`TriageSurfaces` components are domain-specific (rings for roster composition, timeline for intervention recency) and would have required wrapping each use site in ad-hoc shape-container markup. The extracted primitive preserved aria-labelled section landmarks and didn't disturb existing zone layouts. **Decision was sound** — if anything, the plan's recommendation was over-cautious given the actual repeated shape.

### 2. Duplicate-key bug location
The original plan brief described the bug as "duplicate React key warning for header actions." During Phase 0 reproduction, the bug was located in `CommandPalette.buildPaletteRows` (a kind-keyed header map that collided when recents produced out-of-order kind sequences like `panel → tool → panel`). `HeaderAction` was innocent. The retrospective plan's "reproduce before fixing" caveat was validated and is retained as a process lesson: **symptom descriptions in plan briefs are starting points, not ground truth.**

### 3. Scope — bounded header split (plan Decision 2) was deferred
The retrospective plan recommended an opportunistic header split (peel header chrome into `components/shell/AppHeader.tsx` while already in that area). Implementation held back and did not split `App.tsx`. Rationale: the single-row chrome breakpoint fix (1280 → 1660px) was localized; splitting the 1,088-line `App.tsx` was deemed scope creep given all other delta-closure work landed without it. **Filed as follow-up** — no open PR, but worth picking up in the next shell-level pass.

## Decisions Taken (as documented in decision-log)

- **OperationalPreview extraction** — see [decision-log.md](../decision-log.md) §2026-04-24 Design delta closure.
- **Command-block surface family token scope** — exactly two consumers (`PageHero`, `OperationalPreview`). Guardrail against the command-block aesthetic bleeding into ordinary card surfaces. Documented in [dark-mode-contract.md](../dark-mode-contract.md) §1.
- **Single-row chrome breakpoint at 1660px** — chosen because 1280px crammed seven tabs + brand + classroom + actions into ~290px of nav width. At 1660px+ the nav has ~640px — enough for the canonical tab font-size. Common laptop viewports (1280–1659px) keep the two-row stacked layout.

## Exit Criteria (all met)
- ✅ All seven pages render at 375 / 1280 / 1440 / 1720 with no console errors or React warnings.
- ✅ `npm run typecheck`, `npm run lint`, `npm run test`, `npm run check:contrast` all pass.
- ✅ Vitest baseline at or above 1,802 — currently 1,889; pytest at or above 69.
- ✅ Role-visibility tests still green (`appReducer.test.ts`).
- ✅ Contact sheet regenerated and evidence doc written.
- ✅ `docs/dark-mode-contract.md` reflects token additions.
- ✅ `docs/decision-log.md` carries the architectural-decision entry.
- ✅ No net-new backend endpoints; `docs/api-surface.md` unchanged except for generation-timestamp reruns.

## Template Value for Future Design-Delta Passes

This plan is preserved as a forward reference for similar refinement passes. Its most portable parts:

- **Non-Goals section** — explicitly rule out backend/schema/role/demo-data changes when the work is visual-only. Keeps the pass from drifting into architecture.
- **Phased sequencing with exit criteria** — foundation primitives before per-page work before overlay polish before QA sweep. Each phase exits on a checkpoint, not a wall-clock date.
- **"Reproduce before fixing" caveat** — symptom descriptions in briefs must be verified in dev, not accepted as ground truth.
- **Data-provenance acceptance criterion** — every visible number / chip / row traces to an existing source. Prevents drift toward hallucinated metrics.
- **Framing guards for sensitive surfaces** — e.g., "risk" / "students to watch" language must stay at class- or block-level pressure, never per-student risk-scoring. Applies any time teacher-facing UI touches student data.
- **Validation gate ordered cheapest-first** — typecheck → lint → targeted test → contrast → build → browser sweep. Catches issues at the gate they can be fixed in most cheaply.
