import type {
  DifferentiateRequest,
  DifferentiateResponse,
  ClassroomProfile,
  TomorrowPlan,
  TomorrowPlanRequest,
  TomorrowPlanResponse,
  FamilyMessageDraft,
  FamilyMessageRequest,
  FamilyMessageResponse,
  InterventionRecord,
  InterventionRequest,
  InterventionResponse,
  SimplifyRequest,
  SimplifyResponse,
  VocabCardsRequest,
  VocabCardsResponse,
  SupportPatternReport,
  SupportPatternsRequest,
  SupportPatternsResponse,
  EABriefingRequest,
  EABriefingResponse,
  ComplexityForecastRequest,
  ComplexityForecastResponse,
  SurvivalPacketResponse,
  TodaySnapshot,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function differentiate(
  request: DifferentiateRequest,
  signal?: AbortSignal,
): Promise<DifferentiateResponse> {
  const res = await fetch(`${API_BASE}/differentiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Differentiation failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function listClassrooms(): Promise<ClassroomProfile[]> {
  const res = await fetch(`${API_BASE}/classrooms`);
  if (!res.ok) throw new Error(`Failed to list classrooms (${res.status})`);
  return res.json();
}

export async function generateTomorrowPlan(
  request: TomorrowPlanRequest,
  signal?: AbortSignal,
): Promise<TomorrowPlanResponse> {
  const res = await fetch(`${API_BASE}/tomorrow-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tomorrow plan failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function draftFamilyMessage(
  request: FamilyMessageRequest,
  signal?: AbortSignal,
): Promise<FamilyMessageResponse> {
  const res = await fetch(`${API_BASE}/family-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Family message failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function approveFamilyMessage(
  classroomId: string,
  draftId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/family-message/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classroom_id: classroomId, draft_id: draftId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Approval failed (${res.status}): ${body}`);
  }
}

export async function logIntervention(
  request: InterventionRequest,
  signal?: AbortSignal,
): Promise<InterventionResponse> {
  const res = await fetch(`${API_BASE}/intervention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Intervention logging failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function simplifyText(
  request: SimplifyRequest,
  signal?: AbortSignal,
): Promise<SimplifyResponse> {
  const res = await fetch(`${API_BASE}/simplify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Simplification failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function generateVocabCards(
  request: VocabCardsRequest,
  signal?: AbortSignal,
): Promise<VocabCardsResponse> {
  const res = await fetch(`${API_BASE}/vocab-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vocab card generation failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function detectSupportPatterns(
  request: SupportPatternsRequest,
  signal?: AbortSignal,
): Promise<SupportPatternsResponse> {
  const res = await fetch(`${API_BASE}/support-patterns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Support pattern detection failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function generateEABriefing(
  request: EABriefingRequest,
  signal?: AbortSignal,
): Promise<EABriefingResponse> {
  const res = await fetch(`${API_BASE}/ea-briefing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EA briefing generation failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function generateComplexityForecast(
  request: ComplexityForecastRequest,
  signal?: AbortSignal,
): Promise<ComplexityForecastResponse> {
  const res = await fetch(`${API_BASE}/complexity-forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Complexity forecast failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function generateSurvivalPacket(
  classroomId: string,
  targetDate: string,
  teacherNotes?: string,
  classroomCode?: string,
  signal?: AbortSignal,
): Promise<SurvivalPacketResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (classroomCode) headers["X-Classroom-Code"] = classroomCode;

  const resp = await fetch(`${API_BASE}/survival-packet`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      classroom_id: classroomId,
      target_date: targetDate,
      teacher_notes: teacherNotes || undefined,
    }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || `Request failed: ${resp.status}`);
  }

  return resp.json();
}

export async function fetchTodaySnapshot(
  classroomId: string,
  signal?: AbortSignal,
): Promise<TodaySnapshot> {
  const res = await fetch(`${API_BASE}/today/${classroomId}`, { signal });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Today snapshot failed (${res.status}): ${body}`);
  }
  return res.json();
}

// ----- History fetch functions -----

export async function fetchPlanHistory(
  classroomId: string, limit = 10, signal?: AbortSignal,
): Promise<TomorrowPlan[]> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/plans?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`Plan history failed (${res.status})`);
  const data = await res.json();
  return data.plans;
}

export async function fetchMessageHistory(
  classroomId: string, limit = 10, signal?: AbortSignal,
): Promise<FamilyMessageDraft[]> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/messages?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`Message history failed (${res.status})`);
  const data = await res.json();
  return data.messages;
}

export async function fetchInterventionHistory(
  classroomId: string, limit = 20, signal?: AbortSignal,
): Promise<InterventionRecord[]> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/interventions?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`Intervention history failed (${res.status})`);
  const data = await res.json();
  return data.interventions;
}

export async function fetchPatternHistory(
  classroomId: string, limit = 5, signal?: AbortSignal,
): Promise<SupportPatternReport[]> {
  const res = await fetch(`${API_BASE}/classrooms/${classroomId}/patterns?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`Pattern history failed (${res.status})`);
  const data = await res.json();
  return data.patterns;
}
