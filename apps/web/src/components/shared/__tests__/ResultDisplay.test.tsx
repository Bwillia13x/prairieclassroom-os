import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultDisplay from "../ResultDisplay";

describe("ResultDisplay", () => {
  const writeTextSpy = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeTextSpy.mockClear();
    // Stub the clipboard globally so the component's handleCopy can reach it.
    // jsdom may define navigator.clipboard as a readonly accessor, so we
    // reconfigure it with defineProperty.
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    });
  });

  const sections = [
    { heading: "Summary", content: "This is the summary." },
    { heading: "Details", content: "These are the details." },
  ];

  it("renders all section headings", () => {
    render(<ResultDisplay sections={sections} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("renders section content (expanded by default)", () => {
    render(<ResultDisplay sections={sections} />);
    expect(screen.getByText("This is the summary.")).toBeInTheDocument();
    expect(screen.getByText("These are the details.")).toBeInTheDocument();
  });

  it("collapses a section when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<ResultDisplay sections={sections} />);

    const toggles = screen.getAllByRole("button", { expanded: true });
    await user.click(toggles[0]);

    expect(screen.queryByText("This is the summary.")).not.toBeInTheDocument();
    expect(screen.getByText("These are the details.")).toBeInTheDocument();
  });

  it("re-expands a collapsed section", async () => {
    const user = userEvent.setup();
    render(<ResultDisplay sections={sections} />);

    const toggles = screen.getAllByRole("button", { expanded: true });
    await user.click(toggles[0]); // collapse
    const collapsed = screen.getByRole("button", { expanded: false });
    await user.click(collapsed); // expand

    expect(screen.getByText("This is the summary.")).toBeInTheDocument();
  });

  it("copies content to clipboard when copy button is clicked", async () => {
    render(<ResultDisplay sections={[sections[0]]} />);

    const copyBtn = screen.getByRole("button", { name: /copy summary/i });
    // Use fireEvent instead of userEvent to avoid userEvent's own clipboard
    // interception layer which can shadow our mock.
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith("This is the summary.");
    });
  });

  it("renders children slot for FeedbackCollector", () => {
    render(
      <ResultDisplay sections={sections}>
        <div data-testid="feedback">Feedback here</div>
      </ResultDisplay>,
    );
    expect(screen.getByTestId("feedback")).toBeInTheDocument();
  });
});
