import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InterventionLogger from "../InterventionLogger";

const STUDENTS = [{ alias: "Amira" }, { alias: "Brody" }, { alias: "Farid" }];

function renderOpsLogger(onSubmit = vi.fn()) {
  render(
    <InterventionLogger
      students={STUDENTS}
      selectedClassroom="demo-okafor-grade34"
      onSubmit={onSubmit}
      loading={false}
      variant="ops-workflow"
    />,
  );
  return onSubmit;
}

describe("InterventionLogger", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("explains why the Ops save action is disabled until student and note are present", async () => {
    const user = userEvent.setup();
    renderOpsLogger();

    const saveButton = screen.getByRole("button", { name: /save note & continue/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/select at least one student and add an evidence note to save/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /brody/i }));
    expect(screen.getByText(/add an evidence note to save/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByLabelText(/evidence note/i), "Used calm corner before joining group; settled in 6 minutes.");
    expect(screen.getByText(/ready to save to classroom memory/i)).toBeInTheDocument();
    expect(saveButton).toBeEnabled();
  });

  it("submits the selected students, evidence note, and coordination context", async () => {
    const user = userEvent.setup();
    const onSubmit = renderOpsLogger();

    await user.click(screen.getByRole("checkbox", { name: /brody/i }));
    await user.type(screen.getByLabelText(/evidence note/i), "Used calm corner before joining group; settled in 6 minutes.");
    await user.click(screen.getByRole("button", { name: /save note & continue/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      "demo-okafor-grade34",
      ["Brody"],
      "Used calm corner before joining group; settled in 6 minutes.",
      expect.stringContaining("Memory destination: Classroom + student thread"),
    );
  });
});
