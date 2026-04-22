import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionAtlas } from "../TriageSurfaces";
import type { TodaySnapshot } from "../../types";

function makeSnapshot(): TodaySnapshot {
  return {
    debt_register: {
      register_id: "reg-1",
      classroom_id: "demo-classroom",
      items: [
        {
          category: "unapproved_message",
          student_refs: ["Amira"],
          description: "Message waiting",
          source_record_id: "msg-1",
          age_days: 1,
          suggested_action: "Approve",
        },
        {
          category: "stale_followup",
          student_refs: ["Brody"],
          description: "Log follow-up",
          source_record_id: "log-1",
          age_days: 6,
          suggested_action: "Log follow-up",
        },
      ],
      item_count_by_category: { unapproved_message: 1, stale_followup: 1 },
      generated_at: "2026-04-21T12:00:00.000Z",
      schema_version: "1.0",
    },
    latest_plan: null,
    latest_forecast: null,
    student_count: 2,
    last_activity_at: "2026-04-21T12:00:00.000Z",
    panel_statuses: [
      {
        panel_id: "family-message",
        label: "Family Message",
        state: "needs_action",
        dependency_state: "ready",
        pending_count: 1,
        detail: "One family draft needs approval",
        last_run_at: "2026-04-21T12:00:00.000Z",
      },
    ],
    student_threads: [
      {
        alias: "Amira",
        priority_reason: "Family message waiting",
        last_intervention_days: 8,
        pending_action_count: 1,
        pending_message_count: 1,
        active_pattern_count: 0,
        thread_count: 2,
        eal_flag: true,
        family_language: "Arabic",
        support_tags: ["vocabulary"],
        actions: [
          {
            category: "unapproved_message",
            label: "Approve family message",
            count: 1,
            target_tab: "family-message",
            state: "needs_action",
          },
        ],
      },
    ],
  } as TodaySnapshot;
}

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
}

describe("ActionAtlas", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("shows a compact mobile summary that routes focus and check-first actions", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const onOpenContext = vi.fn();

    render(
      <ActionAtlas
        snapshot={makeSnapshot()}
        activeRole="teacher"
        onTabChange={onTabChange}
        onOpenContext={onOpenContext}
      />,
    );

    const compact = screen.getByTestId("action-atlas-compact");
    expect(compact).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recommended now/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/open classroom threads/i)).not.toBeInTheDocument();

    const focusCard = within(compact).getByTestId("action-atlas-focus-card");
    expect(focusCard).toHaveTextContent("Focus now");
    expect(focusCard).toHaveTextContent("Family Message");
    expect(focusCard).toHaveTextContent("One family draft needs approval");
    await user.click(focusCard);
    expect(onTabChange).toHaveBeenCalledWith("family-message");

    const checkFirstCard = within(compact).getByTestId("action-atlas-check-first-card");
    expect(checkFirstCard).toHaveTextContent("Check first");
    expect(checkFirstCard).toHaveTextContent("Amira");
    await user.click(checkFirstCard);
    expect(onOpenContext).toHaveBeenCalledWith(expect.objectContaining({ type: "student-thread" }));

    expect(within(compact).getByText("Open threads")).toBeInTheDocument();
    expect(within(compact).getByText("Students active")).toBeInTheDocument();
  });
});