function debugPromptsEnabled(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.PRAIRIE_DEBUG_PROMPTS ?? "").trim().toLowerCase());
}

export function maybeExposeThinkingSummary(summary: string | null | undefined): string | null {
  if (!debugPromptsEnabled()) {
    return null;
  }
  return summary ?? null;
}
