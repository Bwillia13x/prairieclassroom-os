// Barrel export for all PrairieClassroom OS shared schemas.
// Exports both Zod schema objects (for validation) and inferred types (for type checking).

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
