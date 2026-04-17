import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TomorrowChip from "../TomorrowChip";
import type { TomorrowNote } from "../../types";

const NOTE_A: TomorrowNote = {
  id: "a",
  sourcePanel: "differentiate",
  sourceType: "differentiate_material",
  summary: "Variants for Lesson 3.2",
  createdAt: "2026-04-16T10:00:00Z",
};
const NOTE_B: TomorrowNote = { ...NOTE_A, id: "b", summary: "EA brief draft", sourcePanel: "ea-briefing" };

describe("TomorrowChip", () => {
  it("renders nothing when notes empty", () => {
    const { container } = render(
      <TomorrowChip notes={[]} onRemove={() => {}} onReviewAll={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows count of queued notes", () => {
    render(<TomorrowChip notes={[NOTE_A, NOTE_B]} onRemove={() => {}} onReviewAll={() => {}} />);
    expect(screen.getByRole("button", { name: /tomorrow.*2/i })).toBeInTheDocument();
  });

  it("opens popover and lists summaries on click", () => {
    render(<TomorrowChip notes={[NOTE_A, NOTE_B]} onRemove={() => {}} onReviewAll={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /tomorrow/i }));
    expect(screen.getByText("Variants for Lesson 3.2")).toBeInTheDocument();
    expect(screen.getByText("EA brief draft")).toBeInTheDocument();
  });

  it("calls onRemove when a × button is clicked", () => {
    const onRemove = vi.fn();
    render(<TomorrowChip notes={[NOTE_A]} onRemove={onRemove} onReviewAll={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /tomorrow/i }));
    fireEvent.click(screen.getByRole("button", { name: /remove.*variants/i }));
    expect(onRemove).toHaveBeenCalledWith("a");
  });

  it("calls onReviewAll and closes popover", () => {
    const onReviewAll = vi.fn();
    render(<TomorrowChip notes={[NOTE_A]} onRemove={() => {}} onReviewAll={onReviewAll} />);
    fireEvent.click(screen.getByRole("button", { name: /tomorrow/i }));
    fireEvent.click(screen.getByRole("button", { name: /review all/i }));
    expect(onReviewAll).toHaveBeenCalledOnce();
  });
});
