import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecentRunsChipRow from "../RecentRunsChipRow";

describe("RecentRunsChipRow", () => {
  it("renders nothing when runs is empty", () => {
    const { container } = render(<RecentRunsChipRow runs={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one chip per run with a RECENT label", () => {
    render(
      <RecentRunsChipRow
        runs={[
          { id: "a", label: "Fractions worksheet", at: Date.now() },
          { id: "b", label: "Plant life cycle", at: Date.now() },
        ]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/recent/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fractions worksheet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plant life cycle/i })).toBeInTheDocument();
  });

  it("calls onSelect with the run id when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <RecentRunsChipRow
        runs={[{ id: "a", label: "Fractions", at: Date.now() }]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /fractions/i }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });
});
