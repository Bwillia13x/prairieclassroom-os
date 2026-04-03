import type { DifferentiateRequest, DifferentiateResponse, ClassroomProfile, TomorrowPlanRequest, TomorrowPlanResponse } from "./types";

const API_BASE = "/api";

export async function differentiate(
  request: DifferentiateRequest,
): Promise<DifferentiateResponse> {
  const res = await fetch(`${API_BASE}/differentiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
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
): Promise<TomorrowPlanResponse> {
  const res = await fetch(`${API_BASE}/tomorrow-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tomorrow plan failed (${res.status}): ${body}`);
  }
  return res.json();
}
