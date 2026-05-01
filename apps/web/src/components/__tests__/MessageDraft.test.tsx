import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MessageDraft from "../MessageDraft";
import type { FamilyMessageDraft } from "../../types";

const BASE_DRAFT: FamilyMessageDraft = {
  draft_id: "d1",
  classroom_id: "demo-okafor-grade34",
  student_refs: ["Amira"],
  target_language: "tl",
  message_type: "routine_update",
  plain_language_text: "Kumusta. Amira had a steady reading check-in today.",
  simplified_student_text: undefined,
  teacher_approved: false,
  schema_version: "1",
};

describe("MessageDraft", () => {
  it("shows readable language names instead of opaque language codes", () => {
    render(<MessageDraft draft={BASE_DRAFT} onApprove={vi.fn()} />);

    expect(screen.getByText(/routine update · Tagalog/i)).toBeInTheDocument();
    expect(screen.queryByText(/routine update · tl/i)).not.toBeInTheDocument();
  });
});
