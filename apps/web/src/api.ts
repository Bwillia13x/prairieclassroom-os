import type {
  ClassroomHealth,
  CurriculumEntry,
  CurriculumGrade,
  CurriculumSubjectCode,
  CurriculumSubjectSummary,
  ComplexityForecastRequest,
  ComplexityForecastResponse,
  ClassroomProfile,
  DifferentiateRequest,
  DifferentiateResponse,
  EABriefingRequest,
  EABriefingResponse,
  EALoadRequest,
  EALoadResponse,
  ExtractWorksheetResponse,
  FamilyMessageDraft,
  FamilyMessageRequest,
  FamilyMessageResponse,
  InterventionRecord,
  InterventionRequest,
  InterventionResponse,
  SimplifyRequest,
  SimplifyResponse,
  StudentSummary,
  SupportPatternReport,
  SupportPatternsRequest,
  SupportPatternsResponse,
  SurvivalPacketResponse,
  TodaySnapshot,
  TomorrowPlan,
  TomorrowPlanRequest,
  TomorrowPlanResponse,
  VocabCardsRequest,
  VocabCardsResponse,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface ApiErrorPayload {
  error?: string;
  category?: string;
  retryable?: boolean;
  detail_code?: string;
}

interface AuthChallenge {
  classroomId: string;
  status: number;
  message: string;
}

interface ApiClientConfig {
  getClassroomCode?: (classroomId: string) => string | undefined;
  getClassroomRole?: (classroomId: string) => string | undefined;
  requestClassroomCode?: (challenge: AuthChallenge) => Promise<string | null>;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: object;
  headers?: HeadersInit;
  signal?: AbortSignal;
  classroomId?: string;
  classroomCode?: string;
  keepalive?: boolean;
  /**
   * When true, suppress the interactive auth prompt on 401/403.
   * Used by fire-and-forget telemetry (session/feedback) where we don't
   * want a background failure to hijack the UI with a modal.
   */
  silent?: boolean;
  /**
   * Client abort timeout in ms. Defaults to 135_000 so it stays just past
   * the server's longest planning-tier Gemini timeout (130_000). A shorter
   * client timeout creates a race where the client aborts while the server
   * keeps running and persists an artifact the user thinks they abandoned.
   * Callers (e.g. fire-and-forget telemetry) can shorten this explicitly.
   */
  timeoutMs?: number;
}

export interface StreamingEventHandlers {
  onChunk?: (text: string) => void;
  onThinking?: (text: string) => void;
}

interface StreamStartResponse {
  stream_id: string;
  stream_url: string;
}

/**
 * Default client abort timeout — see RequestOptions.timeoutMs. Set 5 seconds
 * longer than the server's longest planning-tier Gemini budget so the client
 * never aborts before the server's own timeout fires.
 */
const DEFAULT_CLIENT_TIMEOUT_MS = 135_000;

const apiClientConfig: ApiClientConfig = {};

export class ApiError extends Error {
  readonly status: number;
  readonly category?: string;
  readonly retryable?: boolean;
  readonly detailCode?: string;
  readonly handled: boolean;

  constructor(status: number, payload: ApiErrorPayload, handled = false) {
    super(payload.error || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.category = payload.category;
    this.retryable = payload.retryable;
    this.detailCode = payload.detail_code;
    this.handled = handled;
  }
}

export function configureApiClient(config: Partial<ApiClientConfig>) {
  Object.assign(apiClientConfig, config);
}

function resolveClassroomId(
  explicitClassroomId?: string,
  body?: object,
): string | undefined {
  if (explicitClassroomId) return explicitClassroomId;
  const fromBody = body && "classroom_id" in body ? (body as { classroom_id?: unknown }).classroom_id : undefined;
  return typeof fromBody === "string" ? fromBody : undefined;
}

async function parseErrorPayload(res: Response): Promise<ApiErrorPayload> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await res.json().catch(() => ({}));
    return typeof payload === "object" && payload !== null
      ? payload as ApiErrorPayload
      : {};
  }

  const text = await res.text().catch(() => "");
  return text ? { error: text } : {};
}

function isAuthChallenge(status: number, payload: ApiErrorPayload) {
  return (status === 401 || status === 403)
    && (payload.detail_code === "classroom_code_missing" || payload.detail_code === "classroom_code_invalid");
}

// Server errors speak in HTTP vocabulary ("Provide X-Classroom-Code header").
// Teachers don't know what a header is — translate on the way to the dialog.
function teacherFriendlyAuthMessage(payload: ApiErrorPayload): string {
  if (payload.detail_code === "classroom_code_invalid") {
    return "That access code didn't match. Check with your lead teacher, then try again.";
  }
  return "This classroom is protected. Enter its access code to keep going.";
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const classroomId = resolveClassroomId(options.classroomId, options.body);
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const classroomCode = options.classroomCode
    ?? (classroomId ? apiClientConfig.getClassroomCode?.(classroomId) : undefined);
  if (classroomCode) {
    headers.set("X-Classroom-Code", classroomCode);
  }

  const classroomRole = classroomId ? apiClientConfig.getClassroomRole?.(classroomId) : undefined;
  if (classroomRole) {
    headers.set("X-Classroom-Role", classroomRole);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    keepalive: options.keepalive,
    signal: options.signal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_CLIENT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const payload = await parseErrorPayload(res);
    if (
      !options.silent
      && classroomId
      && isAuthChallenge(res.status, payload)
      && apiClientConfig.requestClassroomCode
    ) {
      const code = await apiClientConfig.requestClassroomCode({
        classroomId,
        status: res.status,
        message: teacherFriendlyAuthMessage(payload),
      });
      if (code) {
        return requestJson<T>(path, {
          ...options,
          classroomId,
          classroomCode: code,
          signal: undefined,
        });
      }
      throw new ApiError(res.status, payload, true);
    }

    throw new ApiError(res.status, payload);
  }

  return res.json() as Promise<T>;
}

async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await requestJson<unknown>(path, options);
}

function resolveEventSourceUrl(streamUrl: string): string {
  if (/^https?:\/\//i.test(streamUrl)) return streamUrl;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const base = /^https?:\/\//i.test(API_BASE)
    ? API_BASE
    : `${origin}${API_BASE}`;
  const normalizedStreamUrl = streamUrl.startsWith("/api/")
    ? streamUrl.slice("/api".length)
    : streamUrl;
  return `${base}${normalizedStreamUrl}`;
}

function parseMessageData(event: MessageEvent): Record<string, unknown> {
  try {
    const parsed = JSON.parse(event.data);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function streamRequestJson<T>(
  path: string,
  options: RequestOptions,
  handlers?: StreamingEventHandlers,
): Promise<T> {
  const start = await requestJson<StreamStartResponse>(`${path}/stream`, {
    ...options,
  });

  if (typeof EventSource === "undefined") {
    throw new ApiError(500, {
      error: "This browser does not support streaming updates.",
      category: "inference",
      retryable: false,
      detail_code: "eventsource_unavailable",
    });
  }

  return new Promise<T>((resolve, reject) => {
    const eventSource = new EventSource(resolveEventSourceUrl(start.stream_url));
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      eventSource.close();
      options.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = () => {
      finish(() => reject(new DOMException("Request aborted", "AbortError")));
    };

    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    options.signal?.addEventListener("abort", onAbort, { once: true });

    eventSource.addEventListener("chunk", (event) => {
      const payload = parseMessageData(event as MessageEvent);
      if (typeof payload.text === "string") handlers?.onChunk?.(payload.text);
    });

    eventSource.addEventListener("thinking", (event) => {
      const payload = parseMessageData(event as MessageEvent);
      if (typeof payload.text === "string") handlers?.onThinking?.(payload.text);
    });

    eventSource.addEventListener("complete", (event) => {
      const payload = parseMessageData(event as MessageEvent);
      finish(() => resolve(payload as T));
    });

    eventSource.addEventListener("stream_error", (event) => {
      const payload = parseMessageData(event as MessageEvent);
      const status = typeof payload.status === "number" ? payload.status : 500;
      finish(() => reject(new ApiError(status, payload as ApiErrorPayload)));
    });

    eventSource.onerror = () => {
      finish(() => reject(new ApiError(502, {
        error: "Streaming connection lost before the request completed.",
        category: "inference",
        retryable: true,
        detail_code: "stream_connection_lost",
      })));
    };
  });
}

export function listClassrooms(): Promise<ClassroomProfile[]> {
  return requestJson<ClassroomProfile[]>("/classrooms");
}

export async function listCurriculumSubjects(
  signal?: AbortSignal,
): Promise<CurriculumSubjectSummary[]> {
  const data = await requestJson<{ subjects: CurriculumSubjectSummary[] }>("/curriculum/subjects", {
    signal,
  });
  return data.subjects;
}

export async function listCurriculumEntries(
  filters?: {
    subjectCode?: CurriculumSubjectCode;
    grade?: CurriculumGrade;
  },
  signal?: AbortSignal,
): Promise<CurriculumEntry[]> {
  const params = new URLSearchParams();
  if (filters?.subjectCode) params.set("subject", filters.subjectCode);
  if (filters?.grade) params.set("grade", filters.grade);
  const suffix = params.size ? `?${params.toString()}` : "";
  const data = await requestJson<{ entries: CurriculumEntry[] }>(`/curriculum/entries${suffix}`, {
    signal,
  });
  return data.entries;
}

export function differentiate(
  request: DifferentiateRequest,
  signal?: AbortSignal,
): Promise<DifferentiateResponse> {
  return requestJson<DifferentiateResponse>("/differentiate", {
    method: "POST",
    body: request,
    signal,
  });
}

export function generateTomorrowPlan(
  request: TomorrowPlanRequest,
  signal?: AbortSignal,
  stream?: StreamingEventHandlers,
): Promise<TomorrowPlanResponse> {
  if (stream) {
    return streamRequestJson<TomorrowPlanResponse>("/tomorrow-plan", {
      method: "POST",
      body: request,
      signal,
    }, stream);
  }
  return requestJson<TomorrowPlanResponse>("/tomorrow-plan", {
    method: "POST",
    body: request,
    signal,
  });
}

export function draftFamilyMessage(
  request: FamilyMessageRequest,
  signal?: AbortSignal,
): Promise<FamilyMessageResponse> {
  return requestJson<FamilyMessageResponse>("/family-message", {
    method: "POST",
    body: request,
    signal,
  });
}

export function approveFamilyMessage(
  classroomId: string,
  draftId: string,
  editedText?: string,
): Promise<void> {
  return requestVoid("/family-message/approve", {
    method: "POST",
    body: {
      classroom_id: classroomId,
      draft_id: draftId,
      // Only include edited_text when the teacher actually edited the draft.
      // Sending it on every approve would write the AI draft back as an
      // "edit," polluting the audit trail.
      ...(editedText !== undefined ? { edited_text: editedText } : {}),
    },
    classroomId,
  });
}

export function logIntervention(
  request: InterventionRequest,
  signal?: AbortSignal,
): Promise<InterventionResponse> {
  return requestJson<InterventionResponse>("/intervention", {
    method: "POST",
    body: request,
    signal,
  });
}

export function simplifyText(
  request: SimplifyRequest,
  signal?: AbortSignal,
): Promise<SimplifyResponse> {
  return requestJson<SimplifyResponse>("/simplify", {
    method: "POST",
    body: request,
    signal,
  });
}

export function generateVocabCards(
  request: VocabCardsRequest,
  signal?: AbortSignal,
): Promise<VocabCardsResponse> {
  return requestJson<VocabCardsResponse>("/vocab-cards", {
    method: "POST",
    body: request,
    signal,
  });
}

export function detectSupportPatterns(
  request: SupportPatternsRequest,
  signal?: AbortSignal,
  stream?: StreamingEventHandlers,
): Promise<SupportPatternsResponse> {
  if (stream) {
    return streamRequestJson<SupportPatternsResponse>("/support-patterns", {
      method: "POST",
      body: request,
      signal,
    }, stream);
  }
  return requestJson<SupportPatternsResponse>("/support-patterns", {
    method: "POST",
    body: request,
    signal,
  });
}

export function generateEABriefing(
  request: EABriefingRequest,
  signal?: AbortSignal,
): Promise<EABriefingResponse> {
  return requestJson<EABriefingResponse>("/ea-briefing", {
    method: "POST",
    body: request,
    signal,
  });
}

export function generateComplexityForecast(
  request: ComplexityForecastRequest,
  signal?: AbortSignal,
  stream?: StreamingEventHandlers,
): Promise<ComplexityForecastResponse> {
  if (stream) {
    return streamRequestJson<ComplexityForecastResponse>("/complexity-forecast", {
      method: "POST",
      body: request,
      signal,
    }, stream);
  }
  return requestJson<ComplexityForecastResponse>("/complexity-forecast", {
    method: "POST",
    body: request,
    signal,
  });
}

export function generateEALoadProfile(
  request: EALoadRequest,
  signal?: AbortSignal,
  stream?: StreamingEventHandlers,
): Promise<EALoadResponse> {
  if (stream) {
    return streamRequestJson<EALoadResponse>("/ea-load", {
      method: "POST",
      body: request,
      signal,
    }, stream);
  }
  return requestJson<EALoadResponse>("/ea-load", {
    method: "POST",
    body: request,
    signal,
  });
}

export function generateSurvivalPacket(
  classroomId: string,
  targetDate: string,
  teacherNotes?: string,
  classroomCode?: string,
  signal?: AbortSignal,
  stream?: StreamingEventHandlers,
): Promise<SurvivalPacketResponse> {
  if (stream) {
    return streamRequestJson<SurvivalPacketResponse>("/survival-packet", {
      method: "POST",
      classroomId,
      classroomCode,
      signal,
      body: {
        classroom_id: classroomId,
        target_date: targetDate,
        teacher_notes: teacherNotes || undefined,
      },
    }, stream);
  }
  return requestJson<SurvivalPacketResponse>("/survival-packet", {
    method: "POST",
    classroomId,
    classroomCode,
    signal,
    body: {
      classroom_id: classroomId,
      target_date: targetDate,
      teacher_notes: teacherNotes || undefined,
    },
  });
}

export function fetchTodaySnapshot(
  classroomId: string,
  signal?: AbortSignal,
): Promise<TodaySnapshot> {
  return requestJson<TodaySnapshot>(`/today/${encodeURIComponent(classroomId)}`, {
    classroomId,
    signal,
  });
}

export async function fetchPlanHistory(
  classroomId: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<TomorrowPlan[]> {
  const data = await requestJson<{ plans: TomorrowPlan[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/plans?limit=${limit}`,
    { classroomId, signal },
  );
  return data.plans;
}

export async function fetchMessageHistory(
  classroomId: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<FamilyMessageDraft[]> {
  const data = await requestJson<{ messages: FamilyMessageDraft[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/messages?limit=${limit}`,
    { classroomId, signal },
  );
  return data.messages;
}

export async function fetchInterventionHistory(
  classroomId: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<InterventionRecord[]> {
  const data = await requestJson<{ interventions: InterventionRecord[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/interventions?limit=${limit}`,
    { classroomId, signal },
  );
  return data.interventions;
}

export async function fetchPatternHistory(
  classroomId: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<SupportPatternReport[]> {
  const data = await requestJson<{ patterns: SupportPatternReport[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/patterns?limit=${limit}`,
    { classroomId, signal },
  );
  return data.patterns;
}

// ---------------------------------------------------------------------------
// Recent Prep runs (differentiate / simplify / vocab chip row).
// Writes are fire-and-forget; failure is silent so the UI remains responsive.
// ---------------------------------------------------------------------------

type RunTool = "differentiate" | "simplify" | "vocab";

interface RunRecordApi {
  run_id: string;
  classroom_id: string;
  tool: RunTool;
  label: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export async function fetchRecentRuns(
  classroomId: string,
  tool: RunTool,
  limit = 3,
  signal?: AbortSignal,
): Promise<{ id: string; label: string; at: number }[]> {
  const params = new URLSearchParams({ tool, limit: String(limit) });
  const data = await requestJson<{ runs: RunRecordApi[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/runs?${params.toString()}`,
    { classroomId, signal, silent: true },
  );
  return data.runs.map((r) => ({
    id: r.run_id,
    label: r.label,
    at: Date.parse(r.created_at),
  }));
}

export async function saveRun(
  classroomId: string,
  run: {
    run_id: string;
    tool: RunTool;
    label: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  },
  signal?: AbortSignal,
): Promise<void> {
  await requestJson<{ run_id: string; created_at: string }>(
    `/classrooms/${encodeURIComponent(classroomId)}/runs`,
    {
      method: "POST",
      body: run,
      classroomId,
      signal,
      silent: true,
    },
  );
}

export function extractWorksheet(
  classroomId: string,
  imageBase64: string,
  mimeType: string,
  signal?: AbortSignal,
): Promise<ExtractWorksheetResponse> {
  return requestJson<ExtractWorksheetResponse>("/extract-worksheet", {
    method: "POST",
    classroomId,
    signal,
    body: {
      classroom_id: classroomId,
      image_base64: imageBase64,
      mime_type: mimeType,
    },
  });
}

export function fetchClassroomHealth(
  classroomId: string,
  signal?: AbortSignal,
): Promise<ClassroomHealth> {
  return requestJson<ClassroomHealth>(
    `/classrooms/${encodeURIComponent(classroomId)}/health`,
    { classroomId, signal },
  );
}

export async function fetchStudentSummary(
  classroomId: string,
  studentRef?: string,
  signal?: AbortSignal,
): Promise<StudentSummary[]> {
  const studentParam = studentRef ? `?student=${encodeURIComponent(studentRef)}` : "";
  const data = await requestJson<{ summaries: StudentSummary[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/student-summary${studentParam}`,
    { classroomId, signal },
  );
  return data.summaries;
}

export async function fetchInterventionHistoryForStudent(
  classroomId: string,
  studentRef: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<InterventionRecord[]> {
  const data = await requestJson<{ interventions: InterventionRecord[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/interventions?limit=${limit}&student=${encodeURIComponent(studentRef)}`,
    { classroomId, signal },
  );
  return data.interventions;
}

export async function fetchMessageHistoryForStudent(
  classroomId: string,
  studentRef: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<FamilyMessageDraft[]> {
  const data = await requestJson<{ messages: FamilyMessageDraft[] }>(
    `/classrooms/${encodeURIComponent(classroomId)}/messages?limit=${limit}&student=${encodeURIComponent(studentRef)}`,
    { classroomId, signal },
  );
  return data.messages;
}

// ---------------------------------------------------------------------------
// Feedback & Session API functions (evidence instrumentation)
// ---------------------------------------------------------------------------

export interface SubmitFeedbackRequest {
  classroom_id: string;
  panel_id: string;
  prompt_class?: string;
  rating: number;
  comment?: string;
  generation_id?: string;
  session_id?: string;
}

export interface SubmitFeedbackResponse {
  id: string;
  created_at: string;
}

export interface SubmitSessionRequest {
  classroom_id: string;
  session_id: string;
  started_at: string;
  ended_at: string;
  panels_visited: string[];
  generations_triggered: { panel_id: string; prompt_class: string; timestamp: string }[];
  feedback_count: number;
}

export interface SubmitSessionResponse {
  id: string;
}

export interface FeedbackSummary {
  total: number;
  by_panel: Record<string, { count: number; avg_rating: number; recent_comments: string[] }>;
  by_week: { week: string; count: number; avg_rating: number }[];
  top_comments: { text: string; panel_id: string; rating: number; created_at: string }[];
}

export interface SessionWorkflowNudge {
  week: string;
  is_current_week: boolean;
  sequence: string[];
  count: number;
}

export interface SessionTransitionCount {
  from_panel: string;
  to_panel: string;
  count: number;
}

export interface SessionTerminalCount {
  panel_id: string;
  count: number;
}

export interface SessionResolutionCount {
  panel_id: string;
  count: number;
}

export interface SessionSummary {
  total_sessions: number;
  avg_duration_minutes: number;
  common_flows: { sequence: string[]; count: number }[];
  transition_counts?: SessionTransitionCount[];
  terminal_counts?: SessionTerminalCount[];
  completion_counts?: SessionResolutionCount[];
  reopen_counts?: SessionResolutionCount[];
  median_time_to_resolution_minutes?: number | null;
  panel_time_distribution: Record<string, number>;
  generations_per_session: number;
  today_workflow_nudge: SessionWorkflowNudge | null;
}

export function submitFeedbackApi(
  request: SubmitFeedbackRequest,
  signal?: AbortSignal,
): Promise<SubmitFeedbackResponse> {
  return requestJson<SubmitFeedbackResponse>("/feedback", {
    method: "POST",
    body: request,
    classroomId: request.classroom_id,
    signal,
    silent: true,
  });
}

export function submitSessionApi(
  request: SubmitSessionRequest,
  signal?: AbortSignal,
  options?: Pick<RequestOptions, "keepalive">,
): Promise<SubmitSessionResponse> {
  return requestJson<SubmitSessionResponse>("/sessions", {
    method: "POST",
    body: request,
    classroomId: request.classroom_id,
    keepalive: options?.keepalive,
    signal,
    silent: true,
  });
}

export function fetchFeedbackSummary(
  classroomId: string,
  signal?: AbortSignal,
): Promise<FeedbackSummary> {
  return requestJson<FeedbackSummary>(
    `/feedback/summary/${encodeURIComponent(classroomId)}`,
    { classroomId, signal },
  );
}

export function fetchSessionSummary(
  classroomId: string,
  signal?: AbortSignal,
): Promise<SessionSummary> {
  return requestJson<SessionSummary>(
    `/sessions/summary/${encodeURIComponent(classroomId)}`,
    { classroomId, signal },
  );
}
