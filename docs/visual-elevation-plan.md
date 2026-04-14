# Visual Elevation Plan — Next-Highest-Impact UI/UX Visualizations

> Generated 2026-04-13 from audit of current dashboard visual elements and cross-panel data availability.

## Current State

The **Today (Command Center)** dashboard is the visual benchmark. It uses 9 of 16 available visualization components — the DayArc hero, 4 primary data visualizations (`ComplexityDebtGauge`, `StudentPriorityMatrix`, `InterventionRecencyTimeline`, `ClassroomCompositionRings`), and 3 health strip charts (`PlanStreakCalendar`, `DebtTrendSparkline`, `ComplexityTrendCalendar`). The student roster uses `StudentSparkIndicator`, and the drill-down drawer uses `InterventionTimeline` + `FollowUpSuccessRate`.

Outside the dashboard, only 3 panels have any DataVisualization integration:
| Panel | Visualization |
|---|---|
| Forecast | `ComplexityHeatmap` |
| EA Load | `EALoadStackedBars` |
| Family Messages | `MessageApprovalFunnel` |

**7 panels remain text-only** — no rich visual data representation beyond basic cards and lists.

---

## Prioritized Implementation Tiers

Priority is scored by: (1) data already available in the panel's API response, (2) visual impact / pattern-breaking differentiation from text, (3) teacher decision-support value, and (4) implementation cost (reusing an existing viz component vs. building new).

---

### Tier 1 — Immediate (Drop-in, data ready, highest impact)

These use **existing components** with data **already present** in the panel's API response. No backend changes needed.

#### 1.1 `SupportPatternsPanel` + `SupportPatternRadar` + `FollowUpDecayIndicators` + `ScaffoldEffectivenessChart`
- **Impact:** Transforms the densest analytical panel from a wall of text into a scannable insight dashboard.
- **Data fit:** `recurring_themes` maps directly to the radar's 6-axis model. `follow_up_gaps` maps directly to `FollowUpDecayIndicators`. `recurring_themes[].theme + evidence_count` maps to `ScaffoldEffectivenessChart`.
- **Where:** Insert the radar at the top of result rendering, follow-up decay below themes, scaffold chart below the main report.
- **Effort:** ~1 hour. Pure import + prop mapping.

#### 1.2 `SurvivalPacketPanel` + `ComplexityHeatmap`
- **Impact:** The sub packet already has `complexity_peaks[]` with `time_slot`, `level`, `reason`, `mitigation` — identical semantics to `ComplexityBlock`. Adding the heatmap before the existing Complexity Peaks section gives the substitute teacher an instant visual read of when the day gets hard.
- **Where:** Insert above the "Complexity peaks" section in the generated packet.
- **Effort:** ~30 min. Map `ComplexityPeak` → `ComplexityBlock` shape (add `activity` from `reason`, `contributing_factors` from `[reason]`, `suggested_mitigation` from `mitigation`).

#### 1.3 `TomorrowPlanPanel` + `PlanStreakCalendar`
- **Impact:** Answers "Am I building planning momentum?" directly on the planning surface. Currently `PlanStreakCalendar` only appears on the HealthBar (dashboard) — surfacing it contextually on the planning panel reinforces the habit loop.
- **Data:** The panel's `HistoryDrawer` already fetches plan history. Derive 14-day presence array from plan `created_at` timestamps.
- **Where:** Insert in the rail form area, below the submit button, as a small motivational indicator.
- **Effort:** ~45 min. Derive `plans14d` from history timestamps.

---

### Tier 2 — High Value (Existing components, light data derivation)

#### 2.1 `EABriefingPanel` + `FollowUpDecayIndicators`
- **Impact:** The EA briefing has `pending_followups[]` with `days_since` and `student_ref` — exactly the shape needed. This gives the EA an immediate visual of which students have aging follow-ups before reading the full briefing.
- **Data mapping:** Map `PendingFollowup` → `FollowUpGap` shape (rename fields).
- **Where:** Insert above the "Pending Follow-ups" section.
- **Effort:** ~30 min.

#### 2.2 `EABriefingPanel` + schedule timeline strip (new mini-component)
- **Impact:** The briefing's `schedule_blocks[]` array is a natural timeline. A lightweight horizontal strip showing time slots + student count per block gives the EA an instant load preview before reading details.
- **What to build:** Adapt `ComplexityHeatmap` into a `ScheduleLoadStrip` — cells colored by `student_refs.length` (0 = break, 1-2 = light, 3+ = heavy).
- **Where:** Below the "Schedule Blocks" header, before the card grid.
- **Effort:** ~1.5 hours. Small new component or adapt existing heatmap.

#### 2.3 `InterventionPanel` + `InterventionTimeline` + `FollowUpSuccessRate`
- **Impact:** Currently these two visualizations only appear in the drill-down drawer when viewing a single student. The Intervention panel's own `HistoryDrawer` has the full classroom intervention list — showing a timeline of all interventions and a global follow-up resolution rate would give the teacher context before logging a new one.
- **Data:** `InterventionRecord[]` from history is already the exact shape both components expect.
- **Where:** Insert in the rail (sidebar) above the history list.
- **Effort:** ~45 min. Wire history data from the drawer to the viz components.

#### 2.4 `DifferentiatePanel` + variant type distribution + time comparison
- **Impact:** When the teacher generates 4-5 variants, a quick visual showing the distribution (core / EAL / chunked / EA small group / extension) and estimated time per variant helps them scan the result instead of reading every card.
- **What to build:** New mini `VariantSummaryStrip`: a horizontal bar showing variant types as color segments + time labels.
- **Where:** Insert between the summary Card and the VariantCard grid.
- **Effort:** ~2 hours. New small component.

---

### Tier 3 — Enrichment (New visualizations, higher effort)

#### 3.1 `SupportPatternsPanel` + Student-Theme Heatmap (new component)
- **Impact:** Cross-referencing `recurring_themes[].student_refs` × theme names produces a heatmap grid showing which students cluster on which needs. Highly diagnostic for teacher reflection.
- **What to build:** New `StudentThemeHeatmap` — grid of student × theme cells, color intensity = evidence count per student-theme pair.
- **Effort:** ~3 hours. New SVG grid component.

#### 3.2 `TomorrowPlanPanel` + Plan Coverage Radar (new component)
- **Impact:** A spider chart with axes for watchpoints / priorities / EA actions / prep items / family followups — showing how comprehensive the plan is at a glance.
- **What to build:** Adapt `SupportPatternRadar` into a `PlanCoverageRadar` with 5 axes.
- **Effort:** ~2 hours. Adapt existing radar logic.

#### 3.3 `UsageInsightsPanel` + workflow flow diagram (new component)
- **Impact:** The "Common workflows" section currently shows text sequences (e.g., "Today → Forecast → EA Briefing"). A visual Sankey or flow strip would make workflow patterns scannable.
- **What to build:** New `WorkflowFlowStrip` — horizontal multi-lane diagram.
- **Effort:** ~4 hours. New component, moderate SVG complexity.

#### 3.4 `LanguageToolsPanel` + Readability Comparison Gauge (new component)
- **Impact:** When text is simplified, a before/after comparison gauge (word count, sentence count, vocabulary level) gives the teacher immediate confidence that the simplification worked.
- **What to build:** New `ReadabilityComparisonGauge` — dual-bar or before/after gauge.
- **Effort:** ~2 hours. New component, light derivation from text.

---

## Implementation Sequence (Recommended)

```
Week 1 — Tier 1
  ├── 1.1  SupportPatterns + Radar + DecayIndicators + ScaffoldChart
  ├── 1.2  SurvivalPacket + ComplexityHeatmap
  └── 1.3  TomorrowPlan + PlanStreakCalendar

Week 2 — Tier 2
  ├── 2.1  EABriefing + FollowUpDecayIndicators
  ├── 2.2  EABriefing + ScheduleLoadStrip
  ├── 2.3  InterventionPanel + InterventionTimeline + FollowUpSuccessRate
  └── 2.4  DifferentiatePanel + VariantSummaryStrip

Week 3+ — Tier 3 (as capacity allows)
  ├── 3.1  SupportPatterns + StudentThemeHeatmap
  ├── 3.2  TomorrowPlan + PlanCoverageRadar
  ├── 3.3  UsageInsights + WorkflowFlowStrip
  └── 3.4  LanguageTools + ReadabilityComparisonGauge
```

---

## Component Utilization After Full Plan

| Component | Current Panels | After Tier 1-2 |
|---|---|---|
| `StudentPriorityMatrix` | Dashboard | Dashboard |
| `ComplexityDebtGauge` | Dashboard | Dashboard |
| `ClassroomCompositionRings` | Dashboard | Dashboard |
| `ComplexityHeatmap` | Forecast | Forecast, **SurvivalPacket** |
| `InterventionRecencyTimeline` | Dashboard | Dashboard |
| `EALoadStackedBars` | EA Load | EA Load |
| `SupportPatternRadar` | — | **SupportPatterns** |
| `PlanStreakCalendar` | HealthBar | HealthBar, **TomorrowPlan** |
| `FollowUpDecayIndicators` | — | **SupportPatterns**, **EABriefing** |
| `MessageApprovalFunnel` | Family Messages | Family Messages |
| `ScaffoldEffectivenessChart` | — | **SupportPatterns** |
| `StudentSparkIndicator` | StudentRoster | StudentRoster |
| `DebtTrendSparkline` | HealthBar | HealthBar |
| `ComplexityTrendCalendar` | HealthBar | HealthBar |
| `InterventionTimeline` | StudentDetail | StudentDetail, **InterventionPanel** |
| `FollowUpSuccessRate` | StudentDetail | StudentDetail, **InterventionPanel** |

After Tier 1-2: **14 of 16 components** actively used across the app (up from 11).

---

## Validation Approach

For each integration:
1. Verify component renders with panel's actual data shape (mock mode)
2. Confirm CSS tokens and dark-mode work via `npm run check:contrast`
3. Run `npm run typecheck` and `npm run lint`
4. Run `npm run test` for any panels that have existing tests
5. Verify empty-state handling (viz should gracefully hide when data is empty)
6. Visual check in both light and dark modes
