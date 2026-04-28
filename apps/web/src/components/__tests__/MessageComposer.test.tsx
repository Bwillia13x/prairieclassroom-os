import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MessageComposer from "../MessageComposer";

describe("MessageComposer", () => {
  it("submits the selected student from an explicit toggle control", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <MessageComposer
        students={[{ alias: "Amira", family_language: "pa" }, { alias: "Brody" }]}
        selectedClassroom="demo-okafor-grade34"
        onSubmit={onSubmit}
        loading={false}
      />,
    );

    const amiraChip = screen.getByTestId("message-student-chip-Amira");
    expect(amiraChip).toHaveAttribute("aria-pressed", "false");
    await user.click(amiraChip);
    expect(amiraChip).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText(/context/i), "Amira had a strong reading check-in.");
    await user.click(screen.getByRole("button", { name: "Draft family message" }));

    expect(onSubmit).toHaveBeenCalledWith(
      "demo-okafor-grade34",
      ["Amira"],
      "routine_update",
      "pa",
      "Amira had a strong reading check-in.",
    );
  });

  it("submits from the context field on Ctrl+Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <MessageComposer
        students={[{ alias: "Amira" }]}
        selectedClassroom="demo-okafor-grade34"
        onSubmit={onSubmit}
        loading={false}
        prefill={{ student_ref: "Amira", reason: "Follow up with family", message_type: "routine_update" }}
      />,
    );

    await user.clear(screen.getByLabelText(/context/i));
    await user.type(screen.getByLabelText(/context/i), "Amira had a strong reading check-in.{Control>}{Enter}{/Control}");

    expect(onSubmit).toHaveBeenCalledWith(
      "demo-okafor-grade34",
      ["Amira"],
      "routine_update",
      "en",
      "Amira had a strong reading check-in.",
    );
  });
});
