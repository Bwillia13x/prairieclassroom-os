import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageApprovalDialog from "../MessageApprovalDialog";
import type { FamilyMessageDraft } from "../../types";

// Polyfill HTMLDialogElement for jsdom if not present
beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

const DRAFT: FamilyMessageDraft = {
  draft_id: "d1",
  classroom_id: "c1",
  student_refs: ["Ari", "Bea"],
  target_language: "English",
  message_type: "routine_update",
  plain_language_text: "Your child had a good day at school.",
  simplified_student_text: undefined,
  teacher_approved: false,
  schema_version: "1",
};

describe("MessageApprovalDialog", () => {
  it("dialog is not open when open=false", () => {
    render(
      <MessageApprovalDialog
        open={false}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).not.toHaveAttribute("open");
  });

  it("dialog shows recipient count and editable draft text when open", () => {
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );
    expect(screen.getByText(/2 recipients/i)).toBeInTheDocument();
    // The draft text is now in an editable textarea, not a static <p>.
    expect(screen.getByDisplayValue(/good day at school/i)).toBeInTheDocument();
  });

  it("Cancel button calls onCancel", async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={spy}
        copyStatus="idle"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Approve & Copy button calls onConfirm with the unmodified draft text", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={spy}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );
    await user.click(screen.getByRole("button", { name: /Approve & Copy/i }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(DRAFT.plain_language_text);
  });

  it("teacher edits flow through onConfirm — F12 human-in-the-loop guarantee", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={spy}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );

    const textarea = screen.getByDisplayValue(/good day at school/i);
    await user.clear(textarea);
    await user.type(textarea, "Edited family note from the teacher.");

    await user.click(screen.getByRole("button", { name: /Approve & Copy/i }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Edited family note from the teacher.");
  });

  it("shows an Edited badge once the textarea diverges from the draft", async () => {
    const user = userEvent.setup();
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );

    expect(screen.queryByText(/^Edited$/)).not.toBeInTheDocument();

    const textarea = screen.getByDisplayValue(/good day at school/i);
    await user.type(textarea, " More context.");

    expect(screen.getByText(/^Edited$/)).toBeInTheDocument();
  });

  it("Approve & Copy is disabled when the teacher empties the textarea", async () => {
    const user = userEvent.setup();
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );

    const textarea = screen.getByDisplayValue(/good day at school/i);
    await user.clear(textarea);

    expect(screen.getByRole("button", { name: /Approve & Copy/i })).toBeDisabled();
  });

  it("resets the textarea when a new draft (different draft_id) is loaded", () => {
    const { rerender } = render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );

    const newDraft: FamilyMessageDraft = {
      ...DRAFT,
      draft_id: "d2",
      plain_language_text: "A different message about a class field trip.",
    };
    rerender(
      <MessageApprovalDialog
        open={true}
        draft={newDraft}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );

    expect(screen.getByDisplayValue(/different message about a class field trip/i)).toBeInTheDocument();
  });

  it("shows 'Approving...' label when copyStatus is 'copying'", () => {
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="copying"
      />,
    );
    expect(screen.getByRole("button", { name: /Approving/i })).toBeInTheDocument();
  });

  it("renders exactly one secondary action and one primary action", () => {
    render(
      <MessageApprovalDialog
        open={true}
        draft={DRAFT}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        copyStatus="idle"
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve & Copy/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /reject message approval/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve and copy family message/i })).not.toBeInTheDocument();
  });
});
