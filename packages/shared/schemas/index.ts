// Barrel export for all PrairieClassroom OS shared schemas.
// Exports both Zod schema objects (for validation) and inferred types (for type checking).

export type {
  ClassroomId,
  StudentRef,
  PlanId,
  DraftId,
  RecordId,
} from "./branded.js";
export {
  classroomId,
  studentRef,
  planId,
  draftId,
  recordId,
  unsafeCastClassroomId,
} from "./branded.js";

export {
  ClassroomProfileSchema,
  StudentSupportSummarySchema,
} from "./classroom.js";
export type {
  ClassroomProfile,
  StudentSupportSummary,
} from "./classroom.js";

export {
  LessonArtifactSchema,
  VariantTypeSchema,
  DifferentiatedVariantSchema,
} from "./artifact.js";
export type {
  LessonArtifact,
  VariantType,
  DifferentiatedVariant,
} from "./artifact.js";

export {
  TomorrowPlanSchema,
  TransitionWatchpointSchema,
  SupportPrioritySchema,
  EAActionSchema,
  FamilyFollowupSchema,
} from "./plan.js";
export type {
  TomorrowPlan,
  TransitionWatchpoint,
  SupportPriority,
  EAAction,
  FamilyFollowup,
} from "./plan.js";

export { InterventionRecordSchema } from "./intervention.js";
export type { InterventionRecord } from "./intervention.js";

export { FamilyMessageDraftSchema } from "./message.js";
export type { FamilyMessageDraft } from "./message.js";

export {
  SimplifiedOutputSchema,
  VocabCardSchema,
  VocabCardSetSchema,
} from "./language.js";
export type {
  SimplifiedOutput,
  VocabCard,
  VocabCardSet,
} from "./language.js";

export {
  EABriefingSchema,
  ScheduleBlockSchema,
  StudentWatchItemSchema,
  PendingFollowupSchema,
} from "./briefing.js";
export type {
  EABriefing,
  ScheduleBlock,
  StudentWatchItem,
  PendingFollowup,
} from "./briefing.js";

export {
  ComplexityForecastSchema,
  ComplexityBlockSchema,
  ScheduleBlockInputSchema,
  UpcomingEventSchema,
} from "./forecast.js";
export type {
  ComplexityForecast,
  ComplexityBlock,
  ScheduleBlockInput,
  UpcomingEvent,
} from "./forecast.js";

export {
  SupportPatternReportSchema,
  RecurringThemeSchema,
  FollowUpGapSchema,
  PositiveTrendSchema,
  SuggestedFocusSchema,
} from "./pattern.js";
export type {
  SupportPatternReport,
  RecurringTheme,
  FollowUpGap,
  PositiveTrend,
  SuggestedFocus,
} from "./pattern.js";

export {
  DebtCategorySchema,
  DebtItemSchema,
  DebtThresholdsSchema,
  ComplexityDebtRegisterSchema,
} from "./debt.js";
export type {
  DebtCategory,
  DebtItem,
  DebtThresholds,
  ComplexityDebtRegister,
} from "./debt.js";

export { ClassroomHealthSchema } from "./health.js";
export type { ClassroomHealth } from "./health.js";

export { StudentSummarySchema } from "./student-summary.js";
export type { StudentSummary } from "./student-summary.js";

export {
  ScaffoldDecayReportSchema,
  ScaffoldReviewSchema,
  ScaffoldUsageTrendSchema,
  PositiveSignalSchema,
  WithdrawalPhaseSchema,
} from "./scaffold-decay.js";
export type {
  ScaffoldDecayReport,
  ScaffoldReview,
  ScaffoldUsageTrend,
  PositiveSignal,
  WithdrawalPhase,
} from "./scaffold-decay.js";

export {
  SurvivalPacketSchema,
  RoutineEntrySchema,
  StudentSupportEntrySchema,
  EACoordinationSchema,
  SimplifiedDayPlanSchema,
  FamilyCommsEntrySchema,
  ComplexityPeakSchema,
} from "./survival-packet.js";
export type {
  SurvivalPacket,
  RoutineEntry,
  StudentSupportEntry,
  EACoordination,
  SimplifiedDayPlan,
  FamilyCommsEntry,
  ComplexityPeak,
} from "./survival-packet.js";
