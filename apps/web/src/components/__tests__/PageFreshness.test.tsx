import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PageFreshness from "../PageFreshness";

describe("PageFreshness", () => {
  it("renders a Space-Mono timestamp caption", () => {
    render(<PageFreshness generatedAt="2026-04-18T08:47:00-06:00" kind="ai" />);
    const el = screen.getByTestId("page-freshness");
    expect(el).toHaveTextContent(/LAST UPDATED/i);
    expect(el).toHaveTextContent(/AI SNAPSHOT/i);
  });

  it("renders a record tag when kind=record", () => {
    render(<PageFreshness generatedAt="2026-04-18T08:47:00-06:00" kind="record" />);
    expect(screen.getByTestId("page-freshness")).toHaveTextContent(/RECORD/i);
  });

  it("falls back to 'not yet generated' when generatedAt is null", () => {
    render(<PageFreshness generatedAt={null} kind="ai" />);
    expect(screen.getByTestId("page-freshness")).toHaveTextContent(/NOT YET GENERATED/i);
  });
});
