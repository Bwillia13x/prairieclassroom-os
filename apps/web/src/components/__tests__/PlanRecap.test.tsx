import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import PlanRecap from "../PlanRecap";
import type { TomorrowPlan } from "../../types";

function makePlan(overrides: Partial<TomorrowPlan> = {}): TomorrowPlan {
  return {
    plan_id: "plan-1",
    classroom_id: "demo",
    source_artifact_ids: [],
    transition_watchpoints: [],
    support_priorities: [],
    ea_actions: [],
    prep_checklist: [],
    family_followups: [],
    schema_version: "1.0.0",
    ...overrides,
  };
}

describe("PlanRecap — audit #24/#25/#26", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders every prep-checklist item (no +N more truncation, audit #25)", () => {
    const plan = makePlan({
      prep_checklist: Array.from({ length: 6 }, (_, i) => `Item ${i + 1}`),
    });
    render(<PlanRecap plan={plan} classroomId="demo" />);
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Item ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/\+\d+ more items/i)).toBeNull();
  });

  it("marks a prep item complete on checkbox click and persists via localStorage (audit #24)", async () => {
    const user = userEvent.setup();
    const plan = makePlan({ prep_checklist: ["Set out timer"] });
    const { unmount } = render(<PlanRecap plan={plan} classroomId="demo" />);
    const box = screen.getByLabelText("Set out timer");
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(screen.getByLabelText("Set out timer")).toBeChecked();
    // Persisted across re-mount (same classroom + date).
    unmount();
    render(<PlanRecap plan={plan} classroomId="demo" />);
    expect(screen.getByLabelText("Set out timer")).toBeChecked();
  });

  it("scopes prep state to classroom+date", async () => {
    const user = userEvent.setup();
    const plan = makePlan({ prep_checklist: ["Do the thing"] });
    const { rerender } = render(<PlanRecap plan={plan} classroomId="classA" />);
    await user.click(screen.getByLabelText("Do the thing"));
    expect(screen.getByLabelText("Do the thing")).toBeChecked();
    rerender(<PlanRecap plan={plan} classroomId="classB" />);
    expect(screen.getByLabelText("Do the thing")).not.toBeChecked();
  });

  it("deep-links the family follow-up row to the message composer (audit #26)", async () => {
    const user = userEvent.setup();
    const onMessagePrefill = vi.fn();
    const plan = makePlan({
      family_followups: [
        { student_ref: "Amira", message_type: "praise", reason: "Math reasoning" },
      ],
    });
    render(
      <PlanRecap
        plan={plan}
        classroomId="demo"
        onMessagePrefill={onMessagePrefill}
      />,
    );
    await user.click(screen.getByRole("button", { name: /draft amira/i }));
    expect(onMessagePrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        student_ref: "Amira",
        message_type: "praise",
        reason: "Math reasoning",
      }),
    );
  });

  it("omits the Draft button when no onMessagePrefill is provided", () => {
    const plan = makePlan({
      family_followups: [
        { student_ref: "Amira", message_type: "praise", reason: "" },
      ],
    });
    render(<PlanRecap plan={plan} classroomId="demo" />);
    expect(screen.queryByRole("button", { name: /draft amira/i })).toBeNull();
  });
});
