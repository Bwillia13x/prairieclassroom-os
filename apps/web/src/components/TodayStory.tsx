/**
 * TodayStory.tsx — Typographic narrative ribbon
 *
 * Reads the same dashboard data the visualizations render and
 * names the day's story in one serif line. Deterministic template
 * synthesis — no model call, no API dependency.
 */

import { useMemo } from "react";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
} from "../types";
import "./TodayStory.css";

interface Props {
  snapshot: TodaySnapshot | null;
  health: ClassroomHealth | null;
  students: StudentSummary[];
}

interface Composed {
  lede: string;
  sub: string | null;
  tone: "focus" | "calm" | "watch" | "empty";
}

export default function TodayStory({ snapshot, health, students }: Props) {
  const story = useMemo<Composed>(
    () => composeStory({ snapshot, health, students }),
    [snapshot, health, students],
  );

  return (
    <section
      className={`today-story today-story--${story.tone}`}
      aria-label="Today's story"
    >
      <span className="today-story__glyph" aria-hidden="true" />
      <div className="today-story__text">
        <h1 className="today-story__lede">{story.lede}</h1>
        {story.sub && <p className="today-story__sub">{story.sub}</p>}
      </div>
    </section>
  );
}

export function composeStory({
  snapshot,
  health,
  students,
}: Props): Composed {
  if (!snapshot) {
    return {
      lede: "The first plan will set this dashboard in motion.",
      sub: null,
      tone: "empty",
    };
  }

  const debtCount = snapshot.debt_register.items.length;
  const forecast = snapshot.latest_forecast;
  // Prefer the block named in `highest_risk_block`; if that name doesn't
  // match any block (data drift) or the named block isn't actually high,
  // fall back to the first block whose level is "high". This protects the
  // narrative from silently degrading on malformed highest_risk_block values.
  const hasHighBlock =
    forecast?.blocks.some((b) => b.level === "high") ?? false;
  const namedPeak = forecast?.blocks.find(
    (b) => b.time_slot === forecast.highest_risk_block,
  );
  const firstHighBlock = forecast?.blocks.find((b) => b.level === "high");
  const peakBlock =
    namedPeak?.level === "high" ? namedPeak : (firstHighBlock ?? null);
  const streak = health?.streak_days ?? 0;
  const planToday = health?.plans_last_7?.[0] ?? false;

  const priorityStudent = pickPriorityStudent(snapshot, students);

  if (debtCount > 3 && hasHighBlock && peakBlock) {
    return {
      lede: `${formatSlot(peakBlock.time_slot)} is today's real test.`,
      sub: priorityStudent
        ? `${priorityStudent} enters with unfinished threads — meet them first.`
        : `${debtCount} unresolved threads will shadow the ${peakBlock.activity.toLowerCase()} window.`,
      tone: "focus",
    };
  }

  if (debtCount > 0 && hasHighBlock && peakBlock) {
    return {
      lede: priorityStudent
        ? `Focus finds ${priorityStudent} first today.`
        : `A handful of threads need you before the first block.`,
      sub: `The ${formatSlot(peakBlock.time_slot)} ${peakBlock.activity.toLowerCase()} window is where complexity peaks.`,
      tone: "focus",
    };
  }

  if (debtCount > 0) {
    const lede =
      debtCount === 1
        ? "One thread still needs you before the day starts."
        : `${debtCount} threads still need you before the day starts.`;
    return {
      lede,
      sub: priorityStudent
        ? `${priorityStudent} is the first conversation.`
        : "Clear the queue, then build what's next.",
      tone: "watch",
    };
  }

  if (hasHighBlock && peakBlock) {
    return {
      lede: `The queue is clear, but ${formatSlot(peakBlock.time_slot)} carries weight.`,
      sub: `Stage the ${peakBlock.activity.toLowerCase()} window now — the mitigation is already drafted.`,
      tone: "watch",
    };
  }

  if (streak >= 3 && planToday) {
    return {
      lede: "Today should breathe.",
      sub: `${streak}-day streak, today's plan is in place, the shape is steady.`,
      tone: "calm",
    };
  }

  if (streak >= 1) {
    return {
      lede: "A quiet queue.",
      sub: `${streak}-day streak held — use the prep lane while the room is still.`,
      tone: "calm",
    };
  }

  return {
    lede: "A quiet queue.",
    sub: "Build the next plan while the room is still.",
    tone: "calm",
  };
}

function pickPriorityStudent(
  snapshot: TodaySnapshot,
  students: StudentSummary[],
): string | null {
  const categoryOrder: Record<string, number> = {
    unapproved_message: 0,
    stale_followup: 1,
    unaddressed_pattern: 2,
    approaching_review: 3,
  };

  const sortedItems = [...snapshot.debt_register.items].sort((a, b) => {
    const rankA = categoryOrder[a.category] ?? 9;
    const rankB = categoryOrder[b.category] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    return b.age_days - a.age_days;
  });

  for (const item of sortedItems) {
    const first = item.student_refs.find((s) => s && s.length > 0);
    if (first) return first;
  }

  const urgent = students
    .filter((s) => s.pending_action_count > 0)
    .sort(
      (a, b) =>
        b.pending_action_count - a.pending_action_count ||
        (b.last_intervention_days ?? 0) - (a.last_intervention_days ?? 0),
    )[0];
  return urgent?.alias ?? null;
}

function formatSlot(slot: string): string {
  const start = slot.split("-")[0]?.trim() ?? slot;
  return start.replace(/^0/, "");
}
