import classroomDemo from "../../../data/synthetic_classrooms/classroom_demo.json";
import type {
  ClassroomHealth,
  ClassroomProfile,
  ComplexityDebtRegister,
  ComplexityForecast,
  ComplexityForecastResponse,
  CurriculumEntry,
  CurriculumSubjectSummary,
  DifferentiateRequest,
  DifferentiateResponse,
  EABriefingResponse,
  EALoadResponse,
  ExtractWorksheetResponse,
  FamilyMessageDraft,
  FamilyMessageRequest,
  InterventionRecord,
  InterventionRequest,
  PanelStatus,
  RetrievalTrace,
  StudentSummary,
  StudentThread,
  SupportPatternReport,
  SupportPatternsResponse,
  SurvivalPacketResponse,
  TodaySnapshot,
  TomorrowPlan,
  TomorrowPlanResponse,
  VocabCardsResponse,
} from "./types";

interface StaticDemoRequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: object;
}

type StaticDemoResult<T> =
  | { handled: true; value: T }
  | { handled: false };

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const MODEL_ID = "static-demo-fallback";
const SCHEMA_VERSION = "1.0";
const GENERATED_AT = "2026-05-12T12:00:00.000Z";
const DEMO_API_FLAG = "prairie-static-demo-api";

const classroomProfile: ClassroomProfile = {
  classroom_id: classroomDemo.classroom_id,
  grade_band: classroomDemo.grade_band,
  subject_focus: classroomDemo.subject_focus,
  classroom_notes: classroomDemo.classroom_notes,
  students: classroomDemo.students.map((student) => ({
    alias: student.alias,
    family_language: student.family_language,
    eal_flag: student.eal_flag,
    support_tags: student.support_tags,
  })),
  requires_access_code: false,
  is_demo: true,
  schedule: classroomDemo.schedule,
  upcoming_events: classroomDemo.upcoming_events,
};

const classroomSummary: ClassroomProfile = {
  classroom_id: classroomProfile.classroom_id,
  grade_band: classroomProfile.grade_band,
  subject_focus: classroomProfile.subject_focus,
  requires_access_code: false,
  is_demo: true,
  classroom_notes: [],
  students: [],
};

const curriculumEntries: CurriculumEntry[] = [
  {
    entry_id: "ab-math-3-number-fractions",
    jurisdiction: "ab",
    subject_code: "mathematics",
    subject_label: "Mathematics",
    grade: "3",
    grade_label: "Grade 3",
    title: "Number: Fractions and part-whole relationships",
    summary: "Students represent and compare fractions using concrete, pictorial, and symbolic forms.",
    focus_items: [
      { focus_id: "fractions-represent", text: "Represent fractions as equal parts of a whole." },
      { focus_id: "fractions-compare", text: "Compare familiar fractions using models and language." },
    ],
    implementation_status: "implemented",
    source_kind: "grade_at_a_glance",
    source_title: "Alberta Mathematics Grade 3",
    source_url: "https://curriculum.learnalberta.ca/",
    source_updated_at: "2024-09-01",
    last_verified_at: "2026-04-13",
  },
  {
    entry_id: "ab-ela-4-expression",
    jurisdiction: "ab",
    subject_code: "english_language_arts_and_literature",
    subject_label: "English Language Arts and Literature",
    grade: "4",
    grade_label: "Grade 4",
    title: "Expression: communicate ideas for audience and purpose",
    summary: "Students select language and structure to communicate clearly with familiar audiences.",
    focus_items: [
      { focus_id: "expression-audience", text: "Choose words and structure for audience and purpose." },
    ],
    implementation_status: "implemented",
    source_kind: "grade_at_a_glance",
    source_title: "Alberta English Language Arts and Literature Grade 4",
    source_url: "https://curriculum.learnalberta.ca/",
    source_updated_at: "2024-09-01",
    last_verified_at: "2026-04-13",
  },
];

function isTruthy(value: string | null) {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

export function isStaticDemoApiActive(apiBase: string): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_DEMO_API_FALLBACK === "true") return true;
  if (typeof document !== "undefined" && document.documentElement.dataset.demoApi === DEMO_API_FLAG) return true;

  const demoRequested = isPublicDemoRequest();
  return demoRequested && apiBase === "/api";
}

export function isStaticDemoFallbackAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_DEMO_API_FALLBACK === "true") return true;
  return isPublicDemoRequest();
}

function isPublicDemoRequest(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const demoRequested = isTruthy(params.get("demo")) || isTruthy(params.get("judge")) || isTruthy(params.get("presentation"));
  const staticVercelHost = /\.vercel\.app$/i.test(window.location.hostname);
  return demoRequested && staticVercelHost;
}

export function markStaticDemoApiActive() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.demoApi = DEMO_API_FLAG;
}

export function emitStaticDemoStream<T>(handlers: { onChunk?: (text: string) => void; onThinking?: (text: string) => void } | undefined, value: T) {
  handlers?.onThinking?.("Using the bundled synthetic classroom fixture because no public API is configured.");
  handlers?.onChunk?.(JSON.stringify(value).slice(0, 96));
}

function demoForecast(targetDate = "2026-05-13"): ComplexityForecast {
  return {
    forecast_id: `forecast-${DEMO_CLASSROOM_ID}-static`,
    classroom_id: DEMO_CLASSROOM_ID,
    forecast_date: targetDate,
    blocks: [
      {
        time_slot: "8:30-9:15",
        activity: "Bell work journal + calendar math",
        level: "low",
        contributing_factors: ["Predictable routine", "EA support available"],
        suggested_mitigation: "Start with the visual schedule and preview the math transition.",
      },
      {
        time_slot: "9:30-10:30",
        activity: "Literacy block",
        level: "medium",
        contributing_factors: ["Several EAL students need vocabulary preview", "Fine-motor support may be needed"],
        suggested_mitigation: "Pre-teach three key words and offer keyboard or oral response options.",
      },
      {
        time_slot: "12:30-12:45",
        activity: "Body break + transition to math",
        level: "high",
        contributing_factors: ["Post-lunch transition", "No EA available", "Math anxiety and sensory needs overlap"],
        suggested_mitigation: "Use a two-minute timer, movement job, and concrete fraction models before independent work.",
      },
      {
        time_slot: "12:45-1:45",
        activity: "Math block",
        level: "high",
        contributing_factors: ["Teacher solo with split grades", "Fraction task has language load"],
        suggested_mitigation: "Run a small-group launch for Brody, Elena, Amira, and Daniyal before releasing the extension group.",
      },
      {
        time_slot: "2:45-3:00",
        activity: "Learning reflection + pack-up",
        level: "medium",
        contributing_factors: ["End-of-day transitions", "Family-message follow-up pending"],
        suggested_mitigation: "Use a written pack-up checklist and capture one positive note before dismissal.",
      },
    ],
    overall_summary: "The public demo forecast is highest after lunch when math, transition load, and low adult coverage collide.",
    highest_risk_block: "12:30-12:45 Body break + transition to math",
    schema_version: SCHEMA_VERSION,
  };
}

function demoPlan(): TomorrowPlan {
  return {
    plan_id: `plan-${DEMO_CLASSROOM_ID}-static`,
    classroom_id: DEMO_CLASSROOM_ID,
    source_artifact_ids: ["static-demo-reflection"],
    transition_watchpoints: [
      {
        time_or_activity: "12:30-12:45 Body break + transition to math",
        risk_description: "Post-lunch math starts when EA coverage is no longer available.",
        suggested_mitigation: "Preview the first fraction model before lunch and restart with a visual timer.",
      },
      {
        time_or_activity: "2:45-3:00 Pack-up",
        risk_description: "End-of-day instructions can fragment when family follow-up is pending.",
        suggested_mitigation: "Use one written pack-up checklist and assign Chantal as materials lead.",
      },
    ],
    support_priorities: [
      {
        student_ref: "Brody",
        reason: "Recent notes show transition friction after lunch.",
        suggested_action: "Offer sensory break before math and seat near the concrete fraction materials.",
      },
      {
        student_ref: "Amira",
        reason: "Language load is the main barrier before writing about the math strategy.",
        suggested_action: "Give bilingual vocabulary preview and a sentence frame before independent work.",
      },
      {
        student_ref: "Elena",
        reason: "Confidence drops when the first task is abstract.",
        suggested_action: "Start with manipulatives, then move to the paper model.",
      },
    ],
    ea_actions: [
      {
        timing: "8:30-10:30",
        student_refs: ["Amira", "Daniyal", "Imani"],
        description: "Preview vocabulary, confirm visual schedule, and check first written response.",
      },
      {
        timing: "10:45-11:45",
        student_refs: ["Brody", "Jasper", "Nadia"],
        description: "Pre-correct the after-lunch transition and confirm calming choices before lunch.",
      },
    ],
    prep_checklist: [
      "Print fraction model strips in core, chunked, EAL-supported, and extension versions.",
      "Place visual timer and manipulative tray beside the math launch table.",
      "Write one family praise note for Amira after the vocabulary-supported math response.",
    ],
    family_followups: [
      {
        student_ref: "Amira",
        reason: "Amira used the vocabulary preview to explain a fraction model more independently.",
        message_type: "praise",
      },
      {
        student_ref: "Brody",
        reason: "Share the transition plan so home can reinforce the same calm routine.",
        message_type: "routine_update",
      },
    ],
    schema_version: SCHEMA_VERSION,
  };
}

function demoPatternReport(studentFilter?: string, timeWindow = 10): SupportPatternReport {
  const include = (alias: string) => !studentFilter || alias === studentFilter;
  return {
    report_id: `patterns-${DEMO_CLASSROOM_ID}-static`,
    classroom_id: DEMO_CLASSROOM_ID,
    student_filter: studentFilter ?? null,
    time_window: timeWindow,
    recurring_themes: [
      {
        theme: "After-lunch transition load",
        student_refs: ["Brody", "Jasper"].filter(include),
        evidence_count: 4,
        example_observations: [
          "Math starts more smoothly when the sensory break happens before materials are distributed.",
          "Visual timer reduced repeated prompts during the first ten minutes after lunch.",
        ],
      },
      {
        theme: "Vocabulary preview unlocks written math explanations",
        student_refs: ["Amira", "Daniyal", "Imani"].filter(include),
        evidence_count: 5,
        example_observations: [
          "Sentence frames helped Amira explain the fraction model without waiting for adult prompting.",
          "Picture cues reduced re-teaching time for Daniyal during independent practice.",
        ],
      },
    ].filter((theme) => theme.student_refs.length > 0),
    follow_up_gaps: [
      {
        original_record_id: "intervention-static-001",
        student_refs: ["Brody"].filter(include),
        observation: "Transition strategy should be checked after the next math block.",
        days_since: 3,
      },
    ].filter((gap) => gap.student_refs.length > 0),
    positive_trends: [
      {
        student_ref: "Amira",
        description: "Amira is using sentence frames with less adult prompting during math writing.",
        evidence: ["Used the word wall independently twice during the demo week."],
      },
      {
        student_ref: "Elena",
        description: "Elena is attempting the first model faster when manipulatives are already on the table.",
        evidence: ["Started the core fraction task after one reassurance instead of waiting."],
      },
    ].filter((trend) => include(trend.student_ref)),
    suggested_focus: [
      {
        student_ref: "Brody",
        reason: "Transition support has the largest effect on the afternoon block.",
        suggested_action: "Keep the pre-math sensory routine consistent for the next three days.",
        priority: "high" as const,
      },
      {
        student_ref: "Amira",
        reason: "Vocabulary preview is working and should be made routine.",
        suggested_action: "Prepare two bilingual vocabulary cards before math writing.",
        priority: "medium" as const,
      },
    ].filter((focus) => include(focus.student_ref)),
    generated_at: GENERATED_AT,
    schema_version: SCHEMA_VERSION,
  };
}

function demoDebtRegister(): ComplexityDebtRegister {
  return {
    register_id: `debt-${DEMO_CLASSROOM_ID}-static`,
    classroom_id: DEMO_CLASSROOM_ID,
    items: [
      {
        category: "stale_followup",
        student_refs: ["Brody"],
        description: "Check whether the post-lunch sensory break reduced math transition prompts.",
        source_record_id: "intervention-static-001",
        age_days: 3,
        suggested_action: "Log a quick follow-up after tomorrow's math launch.",
      },
      {
        category: "unapproved_message",
        student_refs: ["Amira"],
        description: "Positive family update is ready for teacher review.",
        source_record_id: "message-static-001",
        age_days: 1,
        suggested_action: "Review and approve the praise note.",
      },
      {
        category: "unaddressed_pattern",
        student_refs: ["Amira", "Daniyal", "Imani"],
        description: "Vocabulary preview pattern should be converted into a reusable prep habit.",
        source_record_id: "patterns-static-001",
        age_days: 2,
        suggested_action: "Add vocabulary preview cards to tomorrow's prep checklist.",
      },
    ],
    item_count_by_category: {
      stale_followup: 1,
      unapproved_message: 1,
      unaddressed_pattern: 1,
      recurring_plan_item: 0,
      approaching_review: 0,
    },
    generated_at: GENERATED_AT,
    schema_version: SCHEMA_VERSION,
  };
}

function demoPanelStatuses(): PanelStatus[] {
  return [
    {
      panel_id: "tomorrow-plan",
      label: "Tomorrow Plan",
      state: "fresh",
      dependency_state: "ready",
      pending_count: 0,
      detail: "Static demo plan available.",
      last_run_at: GENERATED_AT,
    },
    {
      panel_id: "family-message",
      label: "Family Message",
      state: "draft_ready",
      dependency_state: "ready",
      pending_count: 1,
      detail: "One praise note ready for teacher review.",
      last_run_at: GENERATED_AT,
    },
    {
      panel_id: "support-patterns",
      label: "Support Patterns",
      state: "fresh",
      dependency_state: "ready",
      pending_count: 1,
      detail: "Pattern report seeded from synthetic records.",
      last_run_at: GENERATED_AT,
    },
    {
      panel_id: "differentiate",
      label: "Differentiate",
      state: "needs_action",
      dependency_state: "ready",
      pending_count: 1,
      detail: "Fraction worksheet can be adapted for tomorrow.",
      last_run_at: null,
    },
  ];
}

function demoStudentThreads(): StudentThread[] {
  return [
    {
      alias: "Brody",
      priority_reason: "After-lunch transition support",
      last_intervention_days: 3,
      pending_action_count: 1,
      pending_message_count: 0,
      active_pattern_count: 1,
      thread_count: 2,
      eal_flag: false,
      support_tags: ["attention_during_transitions", "sensory_needs"],
      actions: [
        { category: "support", label: "Log transition follow-up", count: 1, target_tab: "log-intervention", state: "needs_action" },
      ],
    },
    {
      alias: "Amira",
      priority_reason: "Vocabulary preview and family praise",
      last_intervention_days: 1,
      pending_action_count: 1,
      pending_message_count: 1,
      active_pattern_count: 1,
      thread_count: 3,
      eal_flag: true,
      family_language: "tl",
      support_tags: ["eal_level_2", "needs_visual_supports"],
      actions: [
        { category: "family", label: "Approve praise note", count: 1, target_tab: "family-message", state: "draft_ready" },
      ],
    },
    {
      alias: "Elena",
      priority_reason: "Math confidence with manipulatives",
      last_intervention_days: 2,
      pending_action_count: 0,
      pending_message_count: 0,
      active_pattern_count: 1,
      thread_count: 1,
      eal_flag: false,
      support_tags: ["math_anxiety", "benefits_from_manipulatives"],
      actions: [
        { category: "plan", label: "Use concrete model first", count: 1, target_tab: "tomorrow-plan", state: "fresh" },
      ],
    },
  ];
}

function demoTodaySnapshot(): TodaySnapshot {
  return {
    debt_register: demoDebtRegister(),
    latest_plan: demoPlan(),
    latest_forecast: demoForecast(),
    student_count: classroomProfile.students.length,
    last_activity_at: GENERATED_AT,
    panel_statuses: demoPanelStatuses(),
    student_threads: demoStudentThreads(),
  };
}

function demoHealth(): ClassroomHealth {
  return {
    streak_days: 4,
    plans_last_7: [true, true, true, false, true, false, false],
    messages_approved: 5,
    messages_total: 7,
    trends: {
      debt_total_14d: [7, 7, 6, 6, 5, 6, 5, 4, 5, 4, 4, 3, 3, 3],
      plans_14d: [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      peak_complexity_14d: [2, 2, 3, 2, 1, 3, 2, 2, 3, 2, 2, 3, 2, 3],
    },
  };
}

function demoStudentSummaries(): StudentSummary[] {
  const priority = new Map([
    ["Brody", "After-lunch transition support"],
    ["Amira", "Vocabulary preview and family praise"],
    ["Elena", "Math confidence with manipulatives"],
    ["Daniyal", "Routine and picture-cue support"],
  ]);
  return classroomProfile.students.map((student, index) => ({
    alias: student.alias,
    pending_action_count: priority.has(student.alias) ? 1 : 0,
    last_intervention_days: priority.has(student.alias) ? (index % 4) + 1 : null,
    active_pattern_count: priority.has(student.alias) ? 1 : 0,
    pending_message_count: student.alias === "Amira" ? 1 : 0,
    latest_priority_reason: priority.get(student.alias) ?? null,
    intervention_history_14d: Array.from({ length: 14 }, (_, day) => (
      priority.has(student.alias) && (day + index) % 5 === 0 ? 1 : 0
    )),
  }));
}

function demoMessage(request?: Partial<FamilyMessageRequest>): FamilyMessageDraft {
  const studentRefs = request?.student_refs?.length ? request.student_refs : ["Amira"];
  const messageType = request?.message_type ?? "praise";
  const targetLanguage = request?.target_language ?? "en";
  return {
    draft_id: "message-static-001",
    classroom_id: DEMO_CLASSROOM_ID,
    student_refs: studentRefs,
    message_type: messageType,
    target_language: targetLanguage,
    plain_language_text: `${studentRefs.join(", ")} had a strong day using classroom supports during math. Please celebrate the effort and the growing independence at home.`,
    simplified_student_text: "You used your supports well in math today. Keep going.",
    teacher_approved: false,
    schema_version: SCHEMA_VERSION,
  };
}

function demoIntervention(request?: Partial<InterventionRequest>): InterventionRecord {
  return {
    record_id: `intervention-static-${Date.now()}`,
    classroom_id: DEMO_CLASSROOM_ID,
    student_refs: request?.student_refs?.length ? request.student_refs : ["Brody"],
    observation: request?.teacher_note ?? "Post-lunch transition needed a visual timer and calm restart.",
    action_taken: request?.context ?? "Used pre-correction, visual timer, and concrete math materials.",
    outcome: "Student rejoined the math launch with fewer prompts.",
    follow_up_needed: true,
    created_at: GENERATED_AT,
    schema_version: SCHEMA_VERSION,
  };
}

function demoTomorrowPlanResponse(): TomorrowPlanResponse {
  return {
    plan: demoPlan(),
    thinking_summary: "Static demo response: prioritized transition risk, EAL vocabulary load, and family follow-up from synthetic classroom records.",
    pattern_informed: true,
    retrieval_trace: demoRetrievalTrace("tomorrow-plan"),
    model_id: MODEL_ID,
    latency_ms: 45,
  };
}

function demoRetrievalTrace(_route: string): RetrievalTrace {
  return {
    citations: [
      {
        source_type: "plan",
        record_id: `plan-${DEMO_CLASSROOM_ID}-static`,
        excerpt: "EA available mornings only; math block follows lunch and is teacher-only.",
        created_at: GENERATED_AT,
      },
      {
        source_type: "intervention",
        record_id: "intervention-static-001",
        excerpt: "Visual timer and sensory break reduced post-lunch prompts.",
        created_at: GENERATED_AT,
      },
    ],
    total_records_considered: 4,
  };
}

function demoDifferentiateResponse(request?: Partial<DifferentiateRequest>): DifferentiateResponse {
  const artifactId = request?.artifact?.artifact_id ?? "artifact-static-fractions";
  return {
    artifact_id: artifactId,
    variants: [
      {
        variant_id: "variant-core-static",
        artifact_id: artifactId,
        variant_type: "core",
        title: "Core fraction model task",
        student_facing_instructions: "Use the fraction strips to show one-half, one-third, and one-fourth. Explain one model in a complete sentence.",
        teacher_notes: "Use with most students after the concrete launch.",
        required_materials: ["fraction strips", "math journal"],
        estimated_minutes: 20,
        schema_version: SCHEMA_VERSION,
      },
      {
        variant_id: "variant-eal-static",
        artifact_id: artifactId,
        variant_type: "eal_supported",
        title: "Vocabulary-supported fraction task",
        student_facing_instructions: "Match each fraction word to a picture. Then finish the sentence: I know this is ___ because ___.",
        teacher_notes: "Preview denominator, numerator, equal parts with picture cues.",
        required_materials: ["picture vocabulary cards", "fraction strips"],
        estimated_minutes: 20,
        schema_version: SCHEMA_VERSION,
      },
      {
        variant_id: "variant-extension-static",
        artifact_id: artifactId,
        variant_type: "extension",
        title: "Extension comparison challenge",
        student_facing_instructions: "Create two fraction models that look different but name the same amount. Explain your proof.",
        teacher_notes: "Use with students ready for equivalence reasoning.",
        required_materials: ["grid paper", "fraction strips"],
        estimated_minutes: 25,
        schema_version: SCHEMA_VERSION,
      },
    ],
    model_id: MODEL_ID,
    latency_ms: 35,
  };
}

function demoSupportPatternsResponse(request?: { student_filter?: string; time_window?: number }): SupportPatternsResponse {
  return {
    report: demoPatternReport(request?.student_filter, request?.time_window ?? 10),
    thinking_summary: "Static demo response: scanned synthetic intervention and plan history for recurring coordination patterns.",
    retrieval_trace: demoRetrievalTrace("support-patterns"),
    model_id: MODEL_ID,
    latency_ms: 42,
  };
}

function demoSurvivalPacketResponse(targetDate = "2026-05-13"): SurvivalPacketResponse {
  return {
    packet: {
      packet_id: `packet-${DEMO_CLASSROOM_ID}-static`,
      classroom_id: DEMO_CLASSROOM_ID,
      generated_for_date: targetDate,
      routines: [
        { time_or_label: "Morning", description: "Bell work journal, calendar math, then vocabulary preview for the math task." },
        { time_or_label: "After lunch", description: "Body break, visual timer, then concrete fraction model before paper work.", recent_changes: "Keep sensory break before math." },
      ],
      student_support: [
        {
          student_ref: "Brody",
          current_scaffolds: ["visual timer", "sensory break", "advance notice"],
          key_strategies: "Use pre-correction before lunch and restart math with a concrete role.",
          things_to_avoid: "Do not begin with a long verbal direction after lunch.",
        },
        {
          student_ref: "Amira",
          current_scaffolds: ["bilingual word wall", "sentence frames", "peer buddy"],
          key_strategies: "Preview vocabulary before asking for a written explanation.",
        },
        {
          student_ref: "Elena",
          current_scaffolds: ["manipulatives first", "small group launch"],
          key_strategies: "Let her prove the first answer with materials before writing.",
        },
      ],
      ea_coordination: {
        ea_name: "Ms. Fehr",
        schedule_summary: "EA available 8:30-12:00 only; no afternoon EA coverage.",
        primary_students: ["Amira", "Daniyal", "Imani", "Brody"],
        if_ea_absent: "Prioritize visual schedule, vocabulary preview, and the post-lunch transition plan.",
      },
      simplified_day_plan: [
        { time_slot: "8:30-9:15", activity: "Calendar math", sub_instructions: "Use the board routine and preview fraction words.", materials_location: "Math shelf, blue bin" },
        { time_slot: "12:30-1:45", activity: "Math block", sub_instructions: "Start with body break, timer, and fraction strips before independent work.", materials_location: "Back counter" },
      ],
      family_comms: [
        { student_ref: "Amira", status: "expecting_message", language_preference: "English with simple vocabulary", notes: "Teacher will approve praise note before it is sent." },
        { student_ref: "Nadia", status: "defer_to_teacher", notes: "Contact through main office only." },
      ],
      complexity_peaks: [
        { time_slot: "12:30-12:45", level: "high", reason: "Post-lunch transition into math without EA coverage.", mitigation: "Use timer, movement job, and concrete fraction launch." },
      ],
      heads_up: [
        "No real student data is used in this public demo.",
        "Afternoon math is the highest-risk block because EA coverage ends at noon.",
        "Teacher approval is required before any family-facing message leaves the workspace.",
      ],
      schema_version: SCHEMA_VERSION,
    },
    retrieval_trace: demoRetrievalTrace("survival-packet"),
    model_id: MODEL_ID,
    latency_ms: 52,
    thinking_summary: "Static demo response: packet assembled from synthetic routines, schedule, and support patterns.",
  };
}

function demoSessionSummary() {
  return {
    total_sessions: 12,
    avg_duration_minutes: 18,
    common_flows: [
      { sequence: ["today", "tomorrow-plan", "family-message"], count: 5 },
      { sequence: ["prep", "tomorrow-plan"], count: 3 },
    ],
    transition_counts: [
      { from_panel: "today", to_panel: "tomorrow-plan", count: 5 },
      { from_panel: "tomorrow-plan", to_panel: "family-message", count: 4 },
    ],
    terminal_counts: [{ panel_id: "family-message", count: 4 }],
    completion_counts: [{ panel_id: "tomorrow-plan", count: 5 }],
    reopen_counts: [{ panel_id: "support-patterns", count: 2 }],
    median_time_to_resolution_minutes: 11,
    panel_time_distribution: {
      today: 28,
      "tomorrow-plan": 32,
      "family-message": 16,
      differentiate: 14,
      "support-patterns": 10,
    },
    generations_per_session: 1.8,
    today_workflow_nudge: {
      week: "2026-W20",
      is_current_week: true,
      sequence: ["today", "tomorrow-plan", "family-message"],
      count: 5,
    },
  };
}

function demoFeedbackSummary() {
  return {
    total: 6,
    by_panel: {
      "tomorrow-plan": { count: 3, avg_rating: 4.7, recent_comments: ["Useful handoff structure."] },
      "family-message": { count: 2, avg_rating: 4.5, recent_comments: ["Positive-first wording worked."] },
    },
    by_week: [{ week: "2026-W20", count: 6, avg_rating: 4.6 }],
    top_comments: [
      { text: "Useful handoff structure.", panel_id: "tomorrow-plan", rating: 5, created_at: GENERATED_AT },
    ],
  };
}

function ok<T>(value: T): StaticDemoResult<T> {
  return { handled: true, value };
}

function requestBody<T>(body: object | undefined): Partial<T> {
  return body && typeof body === "object" ? body as Partial<T> : {};
}

export function resolveStaticDemoRequest<T>(path: string, options: StaticDemoRequestOptions = {}): StaticDemoResult<T> {
  const method = options.method ?? "GET";
  const url = new URL(path, "https://prairie-static-demo.local");
  const route = url.pathname;

  if (method === "GET" && route === "/classrooms") return ok([classroomSummary] as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/profile`) return ok(classroomProfile as T);
  if (method === "GET" && route === `/today/${DEMO_CLASSROOM_ID}`) return ok(demoTodaySnapshot() as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/health`) return ok(demoHealth() as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/student-summary`) return ok({ summaries: demoStudentSummaries() } as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/plans`) return ok({ plans: [demoPlan()] } as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/messages`) return ok({ messages: [demoMessage()] } as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/interventions`) return ok({ interventions: [demoIntervention()] } as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/patterns`) return ok({ patterns: [demoPatternReport()] } as T);
  if (method === "GET" && route === `/classrooms/${DEMO_CLASSROOM_ID}/runs`) return ok({ runs: [] } as T);
  if (method === "POST" && route === `/classrooms/${DEMO_CLASSROOM_ID}/runs`) {
    const body = requestBody<{ run_id: string; created_at: string }>(options.body);
    return ok({ run_id: body.run_id ?? "run-static", created_at: body.created_at ?? GENERATED_AT } as T);
  }

  if (method === "GET" && route === "/curriculum/subjects") {
    const subjects: CurriculumSubjectSummary[] = [
      { subject_code: "mathematics", subject_label: "Mathematics" },
      { subject_code: "english_language_arts_and_literature", subject_label: "English Language Arts and Literature" },
    ];
    return ok({ subjects } as T);
  }
  if (method === "GET" && route === "/curriculum/entries") {
    const subject = url.searchParams.get("subject");
    const grade = url.searchParams.get("grade");
    const entries = curriculumEntries.filter((entry) =>
      (!subject || entry.subject_code === subject) && (!grade || entry.grade === grade)
    );
    return ok({ entries } as T);
  }

  if (method === "POST" && route === "/differentiate") return ok(demoDifferentiateResponse(requestBody<DifferentiateRequest>(options.body)) as T);
  if (method === "POST" && route === "/tomorrow-plan") return ok(demoTomorrowPlanResponse() as T);
  if (method === "POST" && route === "/family-message") {
    return ok({
      draft: demoMessage(requestBody<FamilyMessageRequest>(options.body)),
      model_id: MODEL_ID,
      latency_ms: 32,
    } as T);
  }
  if (method === "POST" && route === "/family-message/approve") return ok({ ok: true } as T);
  if (method === "POST" && (route === "/intervention" || route === "/intervention/quick")) {
    return ok({ record: demoIntervention(requestBody<InterventionRequest>(options.body)), model_id: MODEL_ID, latency_ms: 18 } as T);
  }
  if (method === "POST" && route === "/simplify") {
    return ok({
      simplified: {
        simplified_id: "simplified-static-001",
        source_text: "Fractions are equal parts of a whole.",
        grade_band: "3-4",
        eal_level: "intermediate",
        simplified_text: "A fraction shows equal parts. The bottom number says how many equal parts. The top number says how many parts we use.",
        key_vocabulary: ["fraction", "equal parts", "whole"],
        visual_cue_suggestions: ["Use fraction strips", "Draw a circle split into equal pieces"],
        schema_version: SCHEMA_VERSION,
      },
      model_id: MODEL_ID,
      latency_ms: 24,
    } as T);
  }
  if (method === "POST" && route === "/vocab-cards") {
    return ok({
      card_set: {
        set_id: "vocab-static-001",
        artifact_id: "artifact-static-fractions",
        subject: "math",
        target_language: "tl",
        grade_band: "3-4",
        cards: [
          { term: "fraction", definition: "Equal parts of a whole", target_translation: "bahagi", example_sentence: "One half is a fraction.", visual_hint: "Show one shaded part out of two equal parts." },
          { term: "denominator", definition: "The bottom number in a fraction", target_translation: "pang-ilalim na bilang", example_sentence: "In 1/4, 4 is the denominator.", visual_hint: "Point to the bottom number." },
        ],
        schema_version: SCHEMA_VERSION,
      },
      model_id: MODEL_ID,
      latency_ms: 28,
    } satisfies VocabCardsResponse as T);
  }
  if (method === "POST" && route === "/support-patterns") return ok(demoSupportPatternsResponse(requestBody<{ student_filter?: string; time_window?: number }>(options.body)) as T);
  if (method === "POST" && route === "/ea-briefing") {
    return ok({
      briefing: {
        briefing_id: "briefing-static-001",
        classroom_id: DEMO_CLASSROOM_ID,
        date: "2026-05-13",
        schedule_blocks: [
          { time_slot: "8:30-9:15", student_refs: ["Amira", "Daniyal"], task_description: "Preview fraction words and visual schedule.", materials_needed: ["word cards", "visual schedule"] },
        ],
        student_watch_list: [
          { student_ref: "Brody", context_summary: "Transition load after lunch.", suggested_approach: "Preview the timer and sensory break before lunch." },
        ],
        pending_followups: [
          { student_ref: "Amira", original_observation: "Vocabulary preview supported math explanation.", days_since: 1, suggested_action: "Capture one positive note." },
        ],
        teacher_notes_for_ea: "Focus morning coverage on vocabulary preview and post-lunch transition preparation.",
        schema_version: SCHEMA_VERSION,
      },
      retrieval_trace: demoRetrievalTrace("ea-briefing"),
      model_id: MODEL_ID,
      latency_ms: 44,
    } satisfies EABriefingResponse as T);
  }
  if (method === "POST" && route === "/complexity-forecast") {
    const body = requestBody<{ forecast_date?: string }>(options.body);
    return ok({
      forecast: demoForecast(body.forecast_date),
      thinking_summary: "Static demo response: after-lunch math is the highest-complexity block.",
      retrieval_trace: demoRetrievalTrace("complexity-forecast"),
      model_id: MODEL_ID,
      latency_ms: 38,
    } satisfies ComplexityForecastResponse as T);
  }
  if (method === "POST" && route === "/ea-load") {
    return ok({
      profile: {
        load_id: "ea-load-static-001",
        classroom_id: DEMO_CLASSROOM_ID,
        target_date: "2026-05-13",
        blocks: [
          { time_slot: "8:30-9:15", activity: "Calendar math", ea_available: true, supported_students: ["Amira", "Daniyal", "Imani"], load_level: "medium", load_factors: ["EAL vocabulary preview", "routine support"] },
          { time_slot: "12:45-1:45", activity: "Math block", ea_available: false, supported_students: [], load_level: "break", load_factors: ["EA unavailable"] },
        ],
        alerts: ["No EA coverage after noon; prepare afternoon materials before lunch."],
        overall_summary: "Morning load is manageable; afternoon load shifts to teacher-only routines.",
        highest_load_block: "9:30-10:30 Literacy block",
        schema_version: SCHEMA_VERSION,
      },
      thinking_summary: "Static demo response: load concentrates before noon and disappears after EA departure.",
      retrieval_trace: demoRetrievalTrace("ea-load"),
      model_id: MODEL_ID,
      latency_ms: 40,
    } satisfies EALoadResponse as T);
  }
  if (method === "POST" && route === "/survival-packet") {
    const body = requestBody<{ target_date?: string }>(options.body);
    return ok(demoSurvivalPacketResponse(body.target_date) as T);
  }
  if (method === "POST" && route === "/extract-worksheet") {
    return ok({
      extracted_text: "Fractions worksheet: shade equal parts, compare one-half and one-fourth, explain your model.",
      confidence_notes: ["Static demo extraction used because no public hosted model is configured."],
      curriculum_suggestions: curriculumEntries.slice(0, 1),
      model_id: MODEL_ID,
      latency_ms: 20,
    } satisfies ExtractWorksheetResponse as T);
  }
  if (method === "POST" && route === "/feedback") return ok({ id: "feedback-static-001", created_at: GENERATED_AT } as T);
  if (method === "POST" && route === "/sessions") return ok({ id: "session-static-001" } as T);
  if (method === "GET" && route === `/feedback/summary/${DEMO_CLASSROOM_ID}`) return ok(demoFeedbackSummary() as T);
  if (method === "GET" && route === `/sessions/summary/${DEMO_CLASSROOM_ID}`) return ok(demoSessionSummary() as T);

  return { handled: false };
}
