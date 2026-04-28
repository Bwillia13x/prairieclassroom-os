/**
 * DataVisualizations — barrel re-export.
 *
 * The 22 visualization components live in `./dataviz/*.tsx`, grouped by
 * feature surface (priority, composition, debt, complexity/load,
 * patterns, plans, outputs). All consumers continue to import from
 * "components/DataVisualizations" — this file resolves their imports
 * unchanged. The shared stylesheet is imported here once so every
 * component inherits the same CSS without each module re-importing it.
 */

import "./DataVisualizations.css";

export { StudentPriorityMatrix } from "./dataviz/priority";
export { ClassroomCompositionRings } from "./dataviz/composition";
export { ComplexityDebtGauge, DebtTrendSparkline } from "./dataviz/debt";
export {
  ComplexityHeatmap,
  ComplexityTrendCalendar,
  EALoadStackedBars,
  ScheduleLoadStrip,
  WeekRiskHorizon,
} from "./dataviz/complexity";
export {
  SupportPatternRadar,
  FollowUpDecayIndicators,
  ScaffoldEffectivenessChart,
  StudentThemeHeatmap,
  InterventionRecencyTimeline,
} from "./dataviz/patterns";
export { PlanStreakCalendar, PlanCoverageRadar } from "./dataviz/plans";
export {
  InterventionTimeline,
  FollowUpSuccessRate,
  VariantSummaryStrip,
  MessageApprovalFunnel,
  StudentSparkIndicator,
  WorkflowFlowStrip,
  ReadabilityComparisonGauge,
} from "./dataviz/outputs";
