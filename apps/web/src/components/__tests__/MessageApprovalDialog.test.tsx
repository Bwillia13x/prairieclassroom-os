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

  it("dialog shows recipient count and preview when open", () => {
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
    expect(screen.getByText(/good day at school/i)).toBeInTheDocument();
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

  it("Approve & Copy button calls onConfirm", async () => {
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
});
