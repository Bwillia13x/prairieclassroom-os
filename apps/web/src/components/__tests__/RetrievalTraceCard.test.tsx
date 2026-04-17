import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RetrievalTraceCard from "../RetrievalTraceCard";
import type { RetrievalTrace } from "../../types";

const sampleTrace: RetrievalTrace = {
  citations: [
    {
      source_type: "plan",
      record_id: "plan-demo-003",
      created_at: "2026-04-15T08:00:00Z",
      excerpt: "Differentiate fractions for three readiness bands",
    },
    {
      source_type: "intervention",
      record_id: "int-demo-042",
      created_at: "2026-04-16T13:00:00Z",
      excerpt: "Brody — calm corner before group work",
    },
    {
      source_type: "pattern_report",
      record_id: "pat-demo-001",
      created_at: "2026-04-10T00:00:00Z",
      excerpt: "Theme: Post-lunch transition difficulty",
    },
  ],
  total_records_considered: 8,
};

describe("RetrievalTraceCard", () => {
  it("renders nothing when trace is undefined", () => {
    const { container } = render(<RetrievalTraceCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an honest empty state when zero records were pulled", () => {
    render(
      <RetrievalTraceCard
        trace={{ citations: [], total_records_considered: 0 }}
      />,
    );
    expect(
      screen.getByText(/No classroom memory records were pulled/i),
    ).toBeInTheDocument();
  });

  it("collapses by default and surfaces the count in the summary", () => {
    render(<RetrievalTraceCard trace={sampleTrace} />);
    const summary = screen.getByRole("button", { name: /3 records pulled/i });
    expect(summary).toHaveAttribute("aria-expanded", "false");
    // Detail content is not yet rendered.
    expect(screen.queryByText(/plan-demo-003/)).not.toBeInTheDocument();
  });

  it("expands on click to reveal each citation with its source type, id, and excerpt", async () => {
    const user = userEvent.setup();
    render(<RetrievalTraceCard trace={sampleTrace} />);
    await user.click(screen.getByRole("button", { name: /3 records pulled/i }));

    expect(screen.getByText("plan-demo-003")).toBeInTheDocument();
    expect(screen.getByText("int-demo-042")).toBeInTheDocument();
    expect(screen.getByText("pat-demo-001")).toBeInTheDocument();
    expect(screen.getByText(/Brody — calm corner/)).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Intervention")).toBeInTheDocument();
    expect(screen.getByText("Pattern report")).toBeInTheDocument();
  });

  it("disambiguates retrieved-vs-considered when the model received a subset", async () => {
    const user = userEvent.setup();
    render(<RetrievalTraceCard trace={sampleTrace} />);
    await user.click(screen.getByRole("button", { name: /3 records pulled/i }));
    expect(
      screen.getByText(/5 additional record\(s\) were considered but not pulled/i),
    ).toBeInTheDocument();
  });

  it("does not claim the model used the records — only that they were retrieved", async () => {
    const user = userEvent.setup();
    render(<RetrievalTraceCard trace={sampleTrace} />);
    await user.click(screen.getByRole("button", { name: /3 records pulled/i }));
    expect(
      screen.getByText(/what was retrieved — not what the model actually used/i),
    ).toBeInTheDocument();
  });
});
