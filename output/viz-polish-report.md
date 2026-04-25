# Visualization Polish Pass — Audit Report

Generated: 2026-04-25 (update on each pass)

## Inventory

### `apps/web/src/components/DataVisualizations.tsx`
41:export function StudentPriorityMatrix({ students, onStudentClick }: PriorityMatrixProps) {
468:export function ComplexityDebtGauge({ debtItems, previousTotal, onSegmentClick }: DebtGaugeProps) {
774:export function ClassroomCompositionRings({ students, onSegmentClick }: CompositionRingsProps) {
1186:export function ComplexityHeatmap({ blocks }: ComplexityHeatmapProps) {
1252:export function InterventionRecencyTimeline({ students, maxDays = 14, onStudentClick }: RecencyTimelineProps) {
1407:export function EALoadStackedBars({ blocks }: EALoadStackedBarsProps) {
1494:export function SupportPatternRadar({ themes, onSegmentClick }: PatternRadarProps) {
1616:export function PlanStreakCalendar({ plans14d, onSegmentClick }: PlanStreakCalendarProps) {
1714:export function FollowUpDecayIndicators({ gaps, onStudentClick }: FollowUpDecayProps) {
1772:export function MessageApprovalFunnel({ messagesTotal, messagesApproved }: MessageFunnelProps) {
1826:export function ScaffoldEffectivenessChart({ scaffolds }: ScaffoldBarProps) {
1870:export function StudentSparkIndicator({ student }: StudentSparkProps) {
1919:export function DebtTrendSparkline({ data, onSegmentClick }: DebtTrendProps) {
2044:export function ComplexityTrendCalendar({ data, onSegmentClick }: ComplexityTrendProps) {
2104:export function InterventionTimeline({ records, onDotClick }: IntTimelineProps) {
2193:export function FollowUpSuccessRate({ records, onSegmentClick }: FollowUpRateProps) {
2281:export function ScheduleLoadStrip({ blocks }: ScheduleLoadStripProps) {
2341:export function VariantSummaryStrip({ variants, onSegmentClick }: VariantSummaryStripProps) {
2399:export function StudentThemeHeatmap({ themes }: StudentThemeHeatmapProps) {
2552:export function PlanCoverageRadar(props: PlanCoverageRadarProps) {
2824:export function WorkflowFlowStrip({ flows }: WorkflowFlowStripProps) {
2870:export function ReadabilityComparisonGauge({ sourceText, simplifiedText }: ReadabilityComparisonGaugeProps) {

### `apps/web/src/components/shared/DataViz.tsx`
16:export function Sparkline({
75:export function TrendIndicator({ value, direction }: TrendIndicatorProps) {
96:export function HealthDot({ status, tooltip }: HealthDotProps) {
115:export function ProgressBar({

### Standalone files
apps/web/src/components/Sparkline.tsx
apps/web/src/components/ForecastTimeline.tsx
apps/web/src/components/CohortSparklineGrid.tsx

## Dimension 1: Token Consistency

**Audit date:** 2026-04-25
**Status:** PASS — no invented tokens detected.

### Files scanned (CSS)

| File | Tokens used |
|------|-------------|
| `apps/web/src/components/DataVisualizations.css` | (majority of viz token load) |
| `apps/web/src/components/ForecastTimeline.css` | |
| `apps/web/src/components/CohortSparklineGrid.css` | |
| `apps/web/src/components/shared/DataViz.css` | 13 `--ds-*` tokens |

**Total unique tokens used across viz CSS:** 96
**Token definition sources checked:**
- `apps/web/src/styles/tokens.css` (278 tokens defined)
- `apps/web/src/tokens.css` (54 additional `--ds-*` alias tokens defined)

### TSX inline `var(--)` audit

Files checked: `DataVisualizations.tsx`, `ForecastTimeline.tsx`, `CohortSparklineGrid.tsx`, `shared/DataViz.tsx`

All inline `stroke="var(--…)"`, `fill="var(--…)"` and `style={{…var(--…)…}}` references resolve to defined canonical tokens.

### Candidate investigation

Initial diff (comm -23 used vs defined) produced 22 candidates. Each was resolved:

**`--ds-*` tokens (13 tokens in `shared/DataViz.css`):**
All 13 are legitimately defined in `apps/web/src/tokens.css`, which is a deliberate shared-component alias layer (maps `--ds-*` names onto canonical Prairie palette tokens). The audit grep initially missed this file because it sits in `apps/web/src/` rather than `apps/web/src/styles/`. These are NOT violations.

**Component-scoped runtime values (9 tokens in `DataVisualizations.css`):**
`--axis-tone`, `--composition-row-delay`, `--composition-row-pct`, `--debt-bar-width`, `--dot-delay`, `--label-delay`, `--recency-pct`, `--recency-row-delay`, `--ribbon-delay` — all injected via `style={{…}}` in `DataVisualizations.tsx` as per-element data channels. All have safe fallback values in the CSS (e.g. `var(--debt-bar-width, 0%)`). These are intentional CSS-custom-property data passing, not design-token references. NOT violations.

**Regex artifact (`--color-`):**
Produced by template literals like `` `var(--color-${tone})` `` in DataVisualizations.tsx lines 2240–2251. The pattern `var\(--[a-z][a-z0-9-]+` captures the prefix before the JS interpolation. NOT a real token.

### Result

PASS — no invented tokens detected. 96 tokens used across viz CSS; all resolve in `apps/web/src/styles/tokens.css` or `apps/web/src/tokens.css` (the `--ds-*` alias layer). No remediation required.

## Dimension 2: Accessibility
<!-- filled by Task 4 -->

## Dimension 3: Reduced Motion
<!-- filled by Task 6 -->

## Dimension 4: Dark Mode Contrast
<!-- filled by Task 8 -->

## Dimension 5: Mobile Reflow
<!-- filled by Task 10 -->

## Dimension 6: Test Coverage
<!-- filled by Task 12 -->

## Summary
<!-- final pass summary -->
