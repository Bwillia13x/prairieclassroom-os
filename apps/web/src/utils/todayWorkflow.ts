/**
 * todayWorkflow.ts — Single source of truth for Today panel decision priority.
 *
 * Consolidates debt-category priority, recommended-action selection,
 * student-first triage ordering, and peak-block extraction so that
 * TodayPanel, TodayHero, TimeSuggestion, and the command palette all
 * share the same precedence logic.
 */

import type { ActiveTab, ClassroomRole } from "../appReducer";
import type { TodayHeroAction } from "../components/TodayHero";
import { getContextualSuggestion, type Suggestion } from "../components/TimeSuggestion";
import type {
  ComplexityBlock,
  ComplexityForecast,
  TodaySnapshot,
  ClassroomHealth,
} from "../types";

// ─── Shared priority constants ───

export const DEBT_CATEGORY_PRIORITY: Record<string, number> = {
  unapproved_message: 0,
  stale_followup: 1,
  unaddressed_pattern: 2,
  approaching_review: 3,
};

// ─── Primary action (recommended next move) ───

export function getTodayPrimaryAction(
  snapshot: TodaySnapshot,
  _role?: ClassroomRole,
): TodayHeroAction {
  const makeAction = (
    description: string,
    tab: ActiveTab,
    cta: string,
    label: string,
    tone: TodayHeroAction["tone"],
  ): TodayHeroAction => ({ description, tab, cta, label, tone });

  const counts = snapshot.debt_register.item_count_by_category;

  if ((counts.unapproved_message ?? 0) > 0) {
    return makeAction(
      "There are family messages waiting for teacher approval before they can be copied out.",
      "family-message",
      "Family Message",
      "Approval queue",
      "pending",
    );
  }
  if ((counts.stale_followup ?? 0) > 0) {
    return makeAction(
      "Follow-up debt is the highest operational risk right now. Log the next intervention while context is still recent.",
      "log-intervention",
      "Intervention Log",
      "Follow-up needed",
      "warning",
    );
  }
  if ((counts.unaddressed_pattern ?? 0) > 0) {
    return makeAction(
      "Support patterns need review before they quietly become the default classroom routine.",
      "support-patterns",
      "Support Patterns",
      "Pattern review",
      "analysis",
    );
  }
  if ((counts.approaching_review ?? 0) > 0) {
    return makeAction(
      "Several supports are approaching their review window. Tighten the pattern record before it goes stale.",
      "support-patterns",
      "Support Patterns",
      "Review due",
      "analysis",
    );
  }
  if (!snapshot.latest_plan) {
    return makeAction(
      "There is no current plan on record. Capture today's signal so tomorrow starts with clear priorities.",
      "tomorrow-plan",
      "Tomorrow Plan",
      "Plan missing",
      "analysis",
    );
  }
  if (!snapshot.latest_forecast) {
    return makeAction(
      "The planning record exists, but tomorrow's block-by-block complexity outlook has not been generated yet.",
      "complexity-forecast",
      "Forecast",
      "Forecast missing",
      "provenance",
    );
  }
  return makeAction(
    "Core planning is up to date. Use the prep suite to build differentiated material for the next lesson artifact.",
    "differentiate",
    "Differentiate",
    "Prep ready",
    "success",
  );
}

// ─── Contextual suggestion (re-export with identical signature) ───

export function getTodayContextualSuggestion(input: {
  hour: number;
  snapshot: TodaySnapshot | null;
  health?: ClassroomHealth | null;
  role?: ClassroomRole;
}): Suggestion | null {
  return getContextualSuggestion(input);
}

// ─── Student-first triage ordering ───

export function getStudentsToCheckFirst(
  snapshot: TodaySnapshot | null,
  limit = 5,
): string[] {
  if (!snapshot) return [];

  const seen = new Set<string>();
  const ordered: string[] = [];
  const prioritizedItems = [...snapshot.debt_register.items].sort((a, b) => {
    const aRank = DEBT_CATEGORY_PRIORITY[a.category] ?? Number.MAX_SAFE_INTEGER;
    const bRank = DEBT_CATEGORY_PRIORITY[b.category] ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return b.age_days - a.age_days;
  });

  for (const item of prioritizedItems) {
    for (const studentRef of item.student_refs) {
      if (!studentRef || seen.has(studentRef)) continue;
      seen.add(studentRef);
      ordered.push(studentRef);
      if (ordered.length === limit) return ordered;
    }
  }

  return ordered;
}

// ─── Peak block extraction ───

const FORECAST_LEVEL_RANK: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function getPeakBlock(
  forecast: ComplexityForecast | null | undefined,
): ComplexityBlock | null {
  if (!forecast) return null;

  const blocks = forecast.blocks;
  const declaredPeakIndex = blocks.findIndex(
    (block) => block.time_slot === forecast.highest_risk_block,
  );
  const highestRank = blocks.reduce(
    (rank, block) => Math.max(rank, FORECAST_LEVEL_RANK[block.level] ?? 0),
    -1,
  );
  const fallbackPeakIndex = blocks.findIndex(
    (block) => (FORECAST_LEVEL_RANK[block.level] ?? 0) === highestRank,
  );
  const peakIndex = declaredPeakIndex >= 0 ? declaredPeakIndex : fallbackPeakIndex;
  return peakIndex >= 0 ? blocks[peakIndex] : null;
}
