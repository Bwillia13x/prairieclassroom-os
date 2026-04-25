# Design Delta Closure — Evidence Walkthrough

- **Date:** 2026-04-24
- **Commits:** `b287be2` (polish pass) → `aca6c7b` (design delta closure, HEAD)
- **Plan (retrospective):** [docs/plans/2026-04-24-design-delta-closure.md](../plans/2026-04-24-design-delta-closure.md)
- **Decision log entry:** [docs/decision-log.md](../decision-log.md) §2026-04-24 — Design delta closure
- **Snapshots:**
  - Pre (20:37Z): `output/ui-touchpoints/2026-04-24T20-37-00Z-prairieclassroom-os/` — 19 images (7 pages + overlays)
  - Post (23:47Z): `output/ui-touchpoints/2026-04-24T23-47-current-design-delta/` — 20 images, includes `00-current-contact-sheet.png` and `00-generated-design-contact-sheet.png` for side-by-side reference

## Purpose

Close the gap between the live app and the generated design comps as **directional product UI**, not pixel-perfect reproduction. Preserve all real contracts:

- Seven top-level pages in fixed order (`classroom / today / tomorrow / week / prep / ops / review`).
- Per-page role scopes per [CLAUDE.md](../../CLAUDE.md) web-shell contract.
- URL parameters (`?tab=`, `?tool=`, `?classroom=`, `?demo=true`) including legacy `?tab=<old-panel>` migration.
- Demo fixture shape (26 students / 36 interventions / 3 plans / 1 pattern / 1 approved message / 5 sessions).
- Thirteen model-routed prompt classes and the generated `docs/api-surface.md` endpoint inventory.
- Human-in-the-loop approval on Family Message and every generative output.

Generated comp imagery is reference material only. Hallucinated nav labels, fabricated student names, and unsupported actions in the comps were **not** adopted.

## What shipped

### Foundation primitives
- **Six new tokens** in `apps/web/src/styles/tokens.css:487–513` for the framed command-block aesthetic. All resolve through `light-dark()` so dark mode stays graphite/black-first per [`docs/dark-mode-contract.md`](../dark-mode-contract.md) §1.
  - `--color-command-surface`, `--color-command-rule`, `--color-command-eyebrow`, `--color-command-border`
  - `--color-preview-surface`, `--color-preview-tile`, `--color-preview-border`
- **`PageHero` evolved** (`apps/web/src/components/shared/PageHero.tsx`): optional `metricGroups` (labeled metric clusters), `statusRows` (secondary signal lines), tone-aware metric figures, tighter mobile stacking. Existing flat `metrics` API preserved.
- **`OperationalPreview` shared primitive** (`apps/web/src/components/shared/OperationalPreview.tsx`): dense below-hero strip with chip rows, evidence rows, group meta, and free-form children. Aria-labelled section landmarks.

### Per-page content hierarchy

| Page | Change |
|---|---|
| **Classroom** | Metric groups (Today / Roster / Plan), status rows (Pressure, Last activity), preview strip with watch chips + coverage + queue. All data from existing `latestTodaySnapshot` / `profile` / `classroomHealth`. |
| **Today** | `OperationalPreview` placed before `TodayHero` (Triage queue / Risk signal / Touchpoints). "34 threads still need you" narrative + `Open Intervention Log` CTA preserved as primary. |
| **Tomorrow** | Bespoke `.tomorrow-planning-hub` replaced with `PageHero` + tool-aware preview that strongly differentiates Plan (Planning order + Support priorities chips) from Forecast (Block risk + Coverage cues chips). Single page, two visually differentiated tool states. |
| **Week** | Bespoke `.week-command-hub` replaced with `PageHero`, Forecast / Events / Pressure metric groups, actions slot for Plan Tomorrow / Review Today. |
| **Prep** | Roster + Toolset metric groups + status row. Differentiate and Language Tools keep their existing tool-switcher pattern. |
| **Ops** | Capture + Coordinate metric groups + tool-aware preview that swaps shape per tool — Log Intervention → recent touchpoints; EA Briefing → priority students + EA actions; EA Load → block load + recommended moves; Sub Packet → readiness + privacy. `OpsWorkflowStepper` semantics preserved. |
| **Review** | Approvals + Signals + Cadence metric groups + human-in-the-loop preview chips ("Always editable", "No autonomous send") that make the approval contract visible above the fold. |

### Bug fix — duplicate React key warning
Root cause was in `CommandPalette.buildPaletteRows` (not header actions as originally suspected). Recents-driven sorts could produce kind sequences like `panel → tool → panel` where a header key collided. Headers now keyed `hdr-${kind}-${idx}`. Regression test added in `CommandPalette.test.tsx` that asserts `buildPaletteRows` always emits unique header keys when a kind appears more than once. Preemptively hardened key uniqueness in `PageCommandHub`, `OperationalPreview`, and `PageHero` metric/status maps with `${label}-${idx}` keys (matches the existing React 19 key-uniqueness convention used elsewhere).

### Layout fix — single-row chrome breakpoint
Moved 1280px → 1660px because the prior value crammed seven tabs + brand + classroom + actions into ~290px of nav width at common laptop viewports (1280–1659px) and mashed the tab labels together. At 1660px+ the bar consumes ~990px and the nav has ~640px — enough for seven tabs at the canonical font-size. Common laptop viewports (1280–1659px) keep the two-row stacked layout. Classroom column max also tightened (280→240px) so wide-screen mode actually fits.

### Overlay polish
`CommandPalette`, `ShortcutSheet`, `RolePromptDialog`, and the shell-classroom-panel now share the `--color-command-surface` + `--inner-stroke` + stronger backdrop-blur treatment. Onboarding card left untouched (pre-existing designed gradient). All overlays preserve `role="dialog"`, focus trap, Esc-to-close, Cmd+K activation, and role confirmation flow.

### CSS cleanup
Pruned ~7.7 kB of dead CSS — `.tomorrow-planning-hub` and `.week-command-hub` families (replaced by `PageHero`), plus speculative `.metric-tile` and `.section-header` primitives that were added during the foundation pass but never wired in. CSS bundle: 246.24 → 238.55 kB (gzip 36.07 → 35.38 kB).

## Validation evidence

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run test` | **1889/1889 vitest pass** (+1 regression test for `buildPaletteRows` duplicate-key guard) |
| `npm run build -w apps/web` | pass |
| `npm run check:contrast` | **80/80 pairs meet WCAG AA** (light + dark) |
| Live browser sweep | all seven panels × light/dark × 375px mobile + 1280/1440/1720px desktop → zero console errors, zero duplicate React key warnings |

Role-scoped tab visibility (`getVisibleTabs` + `isTabVisibleForRole`) is continuously enforced by `apps/web/src/__tests__/appReducer.test.ts:223-251`; the design-delta pass preserves those invariants without requiring a new test file.

## Divergences from the brief

Two deliberate judgment calls the implementer took that differ from the retrospective plan's stated recommendations:

### 1. OperationalPreview — extracted, not composed
The retrospective plan (Decision 1) recommended composing existing components (`OperatingDashboard`, `InterventionRecencyTimeline`, `PendingActionsCard`, `ClassroomCompositionRings`, `TriageSurfaces`) rather than extracting a new shared primitive. The implementer chose **extraction**: a new `OperationalPreview` component in `components/shared/`. Rationale (per commit `aca6c7b` body): the preview strip appeared with identical shape (section header + compact chip/evidence rows + right-aligned meta) on ≥4 pages; the existing components are domain-specific (rings, timelines) rather than cross-cutting shape containers. The extraction has since been reused on Classroom, Today, Tomorrow (both tool states), and Ops (all four tools), validating the decision. Recorded in [decision-log.md](../decision-log.md).

### 2. Duplicate-key bug was in CommandPalette, not header actions
The original plan brief described the bug as "duplicate React key warning for header actions." Reproduction during implementation located it in `CommandPalette.buildPaletteRows` — a kind-keyed header map that collided when recents produced out-of-order kind sequences. `HeaderAction` itself was innocent. The retrospective plan's "reproduce before fixing" caveat (Phase 0) is retained as a process lesson: symptom descriptions in plan briefs are starting points, not ground truth.

## Related documentation

- [`docs/plans/2026-04-24-design-delta-closure.md`](../plans/2026-04-24-design-delta-closure.md) — retrospective plan with phase breakdown, risk register, and exit criteria
- [`docs/decision-log.md`](../decision-log.md) — §2026-04-24 design delta closure architectural decision
- [`docs/dark-mode-contract.md`](../dark-mode-contract.md) §1 Command-block surface family — token contract for the new surfaces
- [`CLAUDE.md`](../../CLAUDE.md) §Current Surface Area / §Web shell contract — the contracts this pass preserved
- Pre/post snapshots under `output/ui-touchpoints/`
