# PrairieClassroom OS UI/UX Roadmap — April 2026

> **Status:** planning document. Ties together six implementation plans generated on 2026-04-14 as a coordinated program of work.
>
> **For agentic workers:** This is a roadmap, not a single plan. To execute, pick one of the six child plans below and follow it with `superpowers:subagent-driven-development` or `superpowers:executing-plans`. This roadmap is for sequencing and tradeoff decisions only.

## Intent

Turn PrairieClassroom OS from a dense-dashboard-with-great-bones into a **visual-first, intuitive classroom copilot** where a teacher's first three seconds on Today deliver a narrative, a decision, and a CTA — without rewriting the product.

All six plans respect the existing architecture (Vite + React frontend, Express orchestrator, Python inference, shared Zod schemas), the existing design token system, and the existing human-in-the-loop safety contract. No service-layer changes are required for any plan; this is a frontend program.

## The six plans

| # | Plan | File | Surface area | Risk |
|---|---|---|---|---|
| 1 | TodayStory Hero Restage | `2026-04-14-today-hero-restage.md` | `TodayPanel`, `TodayStory`, CSS | **Low** — pure restaging of existing components |
| 2 | Role Identity Pill + Scope Gating | `2026-04-14-role-identity-pill.md` | `App.tsx`, `AppContext`, `appReducer`, `api.ts`, new `RoleContextPill` | **Medium** — touches state, persistence, API headers |
| 3 | Intervention Quick-Capture | `2026-04-14-intervention-quick-capture.md` | `InterventionPanel`, new `QuickCaptureTray` + `StudentAvatar` + `InterventionChip` + `useSpeechCapture` | **Medium** — Web Speech API has browser-variance risk |
| 4 | OutputActionBar | `2026-04-14-output-action-bar.md` | New shared `OutputActionBar`, 7 panels wired, `MessageApprovalDialog`, `tomorrowNotes` state slot | **Medium** — touches many panels, but mostly additive |
| 5 | Clickable Chart Drill-Downs | `2026-04-14-clickable-chart-drill-downs.md` | `DataVisualizations`, `HealthBar`, `DrillDownDrawer`, `types.ts` (union extension), `TodayPanel` | **Low** — wires existing `DrillDownDrawer`, minimal new surface |
| 6 | Progressive Render + Streaming Parity | `2026-04-14-progressive-render-streaming-parity.md` | `TodayPanel`, `DifferentiatePanel`, new `SectionSkeleton`, `useEmulatedStreaming` hook | **Low** — local refactor + existing `StreamingIndicator` |

## Dependency graph

```
Plan 1 (Today Hero) ──────────────────────┐
                                          │
Plan 5 (Clickable Charts) ────┬───────────┤
                              │           │
Plan 6 (Progressive Render) ──┘           ├──► Plan 4 (OutputActionBar) ──► done
                                          │
Plan 2 (Role Pill) ───────────────────────┤
                                          │
Plan 3 (Quick-Capture) ───────────────────┘
```

**Read this as:**

- Plans **1, 2, 3, 5, 6 are independent** and can be worked in parallel by separate agents or humans — none touches the same file at the same time except Plan 1 ↔ Plan 6 on TodayPanel (see conflict note below).
- Plan **4 (OutputActionBar) depends on Plan 3** only because Plan 3 adds a state slot pattern (`tomorrowNotes`-style) that Plan 4 reuses. Plan 4 can *start* independently but should land after Plan 3 to avoid duplicating state-slot work.
- Plan 4 also *lightly* benefits from Plan 2 (role gating) — if Plan 2 lands first, Plan 4's `MessageApprovalDialog` can honor role scopes from day one.

### Conflict zone: TodayPanel.tsx

Plans **1, 5, and 6 all modify `TodayPanel.tsx`**. They do not conflict semantically, but they will produce merge conflicts if worked in parallel on the same branch.

**Mitigation:** Sequence them on the same branch — Plan 6 (restructure loading) → Plan 1 (hoist hero) → Plan 5 (wire chart click handlers). Each plan's tests remain green after the previous one lands. Alternatively, each plan gets its own worktree and they rebase onto each other.

## Recommended execution order

**Wave 1 — foundational clarity (week 1)**
1. **Plan 6 — Progressive Render** (**8 tasks**). Lowest-risk refactor. Lands first because it restructures `TodayPanel`'s loading architecture in a way Plans 1 and 5 both build on.
2. **Plan 1 — TodayStory Hero** (**5 tasks**). Visual-first payoff. Demo-ready by the end of Wave 1.

**Wave 2 — safety + expressiveness (week 2)**
3. **Plan 2 — Role Identity Pill** (**10 tasks**). Safety-adjacent, requires careful state + persistence work, but well-bounded.
4. **Plan 5 — Clickable Charts** (**10 tasks**, with Task 5 split into 5a/5b/5c for scale → 12 action points). Big "feels like a different product" win. Runs in parallel with Plan 2 on a separate worktree (different files).

**Wave 3 — closing the loop (week 3)**
5. **Plan 3 — Intervention Quick-Capture** (**9 tasks**). Behavioral-change lever for downstream data quality.
6. **Plan 4 — OutputActionBar** (**10 tasks**). Ships after Quick-Capture to reuse its state-slot pattern and after the Role Pill so `MessageApprovalDialog` can honor roles.

Total confirmed effort: **52 tasks** across 6 plans (54 practical action points counting Plan 5's splits), each task sized at 2-5 minutes of focused work per the `writing-plans` discipline. Realistic calendar: **3-4 weeks** at one engineer half-time or one engineer + one agent in parallel.

## Why this order

1. **Start with the restage, not the rebuild.** Plan 6 + Plan 1 together change how Today *feels* without introducing new concepts. If the team stops here, the product is already materially better.
2. **Add safety before expressiveness.** Role Pill (Plan 2) lands before features that expand teacher-vs-EA differentiation. You can't roll out new action surfaces to an audience you can't distinguish.
3. **Clickable charts is the free lunch.** Plan 5 is almost entirely wiring. It lands in Wave 2 because it's independent and high-visibility — a good parallel workstream while Plan 2 proceeds.
4. **Quick-Capture before Action Bar.** Plan 3 establishes the "state slot pattern" (persisting structured entries) that Plan 4 reuses for `tomorrowNotes`.
5. **Action Bar is the closer.** Once the other 5 land, Plan 4 ties it all together — every generation becomes something a teacher can *do something with*, not just *read*.

## Success metrics

Each plan is considered complete when:

- ✅ All tasks' tests pass (`npm run test` green).
- ✅ `npm run typecheck` passes.
- ✅ `npm run lint` passes.
- ✅ `npm run check:contrast` passes (color changes only).
- ✅ Manual smoke — teacher-perspective test of the changed flow in dev.
- ✅ `docs/decision-log.md` updated if the change touches architecture, routing, safety, or operations (per CLAUDE.md rule).

For the program as a whole:

- ✅ `npm run release:gate` passes in mock mode.
- ✅ `npm run system:inventory:check` passes — no drift between code and `docs/api-surface.md` / `docs/system-inventory.md`.
- ✅ Teacher "time to first meaningful action on Today" (stopwatch test) drops from current ~15s scan to ~3s narrative read + CTA click.
- ✅ Intervention log rate measurably increases in synthetic-session replay (Plan 3's downstream lever).

## Rollout strategy

- **All six plans ship behind existing navigation** — no feature flags needed. The panels themselves do not change identity; they improve their contents.
- **Plan 2 (Role Pill)** is the only plan that introduces a new persistent client concept. It defaults to `teacher` on missing/invalid data, so existing users see no behavior change until they opt into a role.
- **Plan 3 (Quick-Capture)** preserves the existing `InterventionLogger` inside a `<details>` expansion, so no workflow is deleted.
- **Plan 4 (OutputActionBar)** is additive — existing panels keep their current closing affordances until the new bar lands, and the old Family Message single-button flow is replaced with a strictly-more-careful 2-step confirm (safer, not looser).

## Cost guardrails (per CLAUDE.md)

None of the six plans require hosted Gemini, Vertex, or any paid API. All validation runs through the `mock` inference lane. The `release:gate:gemini` proof lane is not touched.

If a post-merge hosted-proof refresh is needed (e.g. to demonstrate the new hero + action bar on the hackathon demo classroom), it follows the standard `proof:check → gemini:readycheck → release:gate:gemini` sequence and stays synthetic-data-only.

## What this roadmap does *not* cover

Deliberately out of scope:

- **Onboarding overhaul** — the single 5-step `OnboardingOverlay` doesn't scale to 12 panels, but a contextual-hint-per-panel rebuild is its own plan (~4-5 tasks). Note for future.
- **Asymmetric feedback collection** — `OutputFeedback`'s thumbs-down-hidden-behind-click is a small polish item, worth ~2 tasks. Fold into Plan 4 or a separate quick plan.
- **Print-mode tokenization** — `print.css` bypasses the token system with hardcoded hex. Future polish, ~2 tasks.
- **Motion adoption** — `motion.css` has 16 keyframes and panels use ~2. Future polish, ~3 tasks (add stagger entry animations to panel mount).
- **Mobile subtab row consistency** — minor polish.

These are tracked here as a pending punch list but are not part of the April 2026 program.

## Child plan index

| # | Plan | File | Tasks | Words |
|---|---|---|---|---|
| 1 | Today Hero Restage | [2026-04-14-today-hero-restage.md](./2026-04-14-today-hero-restage.md) | 5 | 3,087 |
| 2 | Role Identity Pill | [2026-04-14-role-identity-pill.md](./2026-04-14-role-identity-pill.md) | 10 | 7,625 |
| 3 | Intervention Quick-Capture | [2026-04-14-intervention-quick-capture.md](./2026-04-14-intervention-quick-capture.md) | 9 | 3,283 |
| 4 | OutputActionBar | [2026-04-14-output-action-bar.md](./2026-04-14-output-action-bar.md) | 10 | 3,667 |
| 5 | Clickable Chart Drill-Downs | [2026-04-14-clickable-chart-drill-downs.md](./2026-04-14-clickable-chart-drill-downs.md) | 10 (5a/5b/5c split) | 5,042 |
| 6 | Progressive Render + Streaming Parity | [2026-04-14-progressive-render-streaming-parity.md](./2026-04-14-progressive-render-streaming-parity.md) | 8 | 5,561 |
|   | **Total** |   | **52** | **28,265** |

## Self-review notes

Self-review pass completed on 2026-04-14 against the six opportunities from the parent review. All checks pass:

- **Spec coverage.** Each of the six review opportunities (Today hero, Role pill, Quick-Capture, OutputActionBar, Clickable charts, Progressive render) maps to exactly one plan. No gaps.
- **Placeholder scan.** Grep across all plan files for `TBD|TODO|FIXME|similar to (above|Task)|fill in|add appropriate|placeholder` returned only two false positives — both legitimate prose: `"etc.md"` in a filename test fixture (Plan 4) and `"1-2 shimmering lines"` in a design description (Plan 6). No true placeholders.
- **Type consistency.**
  - `ClassroomRole` is defined exactly once (Plan 2, Task 1) and not redefined elsewhere.
  - `OutputAction`, `OutputActionKey`, `OutputActionVariant`, `OutputActionBarProps`, `TomorrowNote`, `TomorrowNoteSource` are all defined exactly once (Plan 4, Tasks 1 and 4).
  - `DrillDownContext` is extended (not redefined) in Plan 5 Task 1 — adds `plan-coverage-section`, `student-tag-group`, `variant-lane` variants to the existing union from `apps/web/src/types.ts:291-296`.
  - `InterventionType` / chip data model is defined once in Plan 3 Task 1.
  - `StreamingState` is referenced (not modified) in Plan 6 — existing type from `apps/web/src/appReducer.ts:112-124`.
- **Header format variance.** Plans use two task header styles: `### Task N: Name` (Plans 1, 2, 6) and `## Task N — Name` (Plans 3, 4, 5). Functionally identical; executing-plans tooling parses both. No fix needed.

No corrective edits to child plans were required during self-review.
