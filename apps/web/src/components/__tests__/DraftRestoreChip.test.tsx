import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DraftRestoreChip from "../DraftRestoreChip";

describe("DraftRestoreChip", () => {
  it("renders nothing when show=false", () => {
    const { container } = render(
      <DraftRestoreChip show={false} onRestore={() => {}} onDismiss={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders prompt when show=true", () => {
    render(<DraftRestoreChip show={true} onRestore={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText(/resume your draft/i)).toBeInTheDocument();
  });

  it("calls onRestore when Resume is clicked", () => {
    const onRestore = vi.fn();
    render(<DraftRestoreChip show={true} onRestore={onRestore} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when Discard is clicked", () => {
    const onDismiss = vi.fn();
    render(<DraftRestoreChip show={true} onRestore={() => {}} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
