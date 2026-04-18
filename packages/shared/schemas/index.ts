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
} from "./branded.js";
// `unsafeCastClassroomId` is deliberately NOT re-exported from this barrel.
// It exists as a compile-time escape hatch for tests and the inference
// client (where the ID already came through `isValidClassroomId`). New
// code should import it directly from ./branded so the escape hatch is
// visible in review rather than hidden inside an `@prairie/shared` import.

export {
  ClassroomProfileSchema,
  StudentSupportSummarySchema,
  RetentionPolicySchema,
  RETENTION_TABLES,
} from "./classroom.js";
export type {
  ClassroomProfile,
  StudentSupportSummary,
  RetentionPolicy,
  RetentionTable,
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
  CurriculumJurisdictionSchema,
  CurriculumSubjectCodeSchema,
  CurriculumGradeSchema,
  CurriculumSourceKindSchema,
  CurriculumImplementationStatusSchema,
  CurriculumFocusItemSchema,
  CurriculumEntrySchema,
  CurriculumSelectionSchema,
} from "./curriculum.js";
export type {
  CurriculumJurisdiction,
  CurriculumSubjectCode,
  CurriculumGrade,
  CurriculumSourceKind,
  CurriculumImplementationStatus,
  CurriculumFocusItem,
  CurriculumEntry,
  CurriculumSelection,
} from "./curriculum.js";

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
  SupportedLanguageSchema,
  SUPPORTED_LANGUAGE_CODES,
} from "./language.js";
export type { SupportedLanguage } from "./language.js";
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
  EALoadProfileSchema,
  EALoadBlockSchema,
  EALoadLevelSchema,
} from "./ea-load.js";
export type {
  EALoadProfile,
  EALoadBlock,
  EALoadLevel,
} from "./ea-load.js";

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

export {
  ExtractWorksheetRequestSchema,
  ExtractWorksheetResponseSchema,
} from "./extract-worksheet.js";
export type {
  ExtractWorksheetRequest,
  ExtractWorksheetResponse,
} from "./extract-worksheet.js";

export {
  PANEL_IDS,
  FeedbackRequestSchema,
  FeedbackResponseSchema,
  FeedbackSummarySchema,
} from "./feedback.js";
export type {
  FeedbackRequest,
  FeedbackResponse,
  FeedbackSummary,
} from "./feedback.js";

export {
  GenerationEventSchema,
  SessionRequestSchema,
  SessionResponseSchema,
  SessionSummarySchema,
} from "./session.js";
export type {
  GenerationEvent,
  SessionRequest,
  SessionResponse,
  SessionSummary,
} from "./session.js";

export {
  RetrievalSourceTypeSchema,
  RetrievalCitationSchema,
  RetrievalTraceSchema,
  emptyRetrievalTrace,
} from "./retrieval-trace.js";
export type {
  RetrievalSourceType,
  RetrievalCitation,
  RetrievalTrace,
} from "./retrieval-trace.js";
