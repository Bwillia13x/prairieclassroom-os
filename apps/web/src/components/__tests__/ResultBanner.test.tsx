import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ResultBanner from "../ResultBanner";

describe("ResultBanner", () => {
  it("formats fractional millisecond latency as a teacher-readable value", () => {
    render(<ResultBanner label="Plan generated" latencyMs={6.683250000060576} />);

    expect(screen.getByText("7 ms")).toBeInTheDocument();
    expect(screen.queryByText(/6\.683250000060576ms/)).not.toBeInTheDocument();
  });

  it("formats second-scale latency with one decimal place", () => {
    render(<ResultBanner label="Plan generated" latencyMs={1530} />);

    expect(screen.getByText("1.5 s")).toBeInTheDocument();
  });
});
