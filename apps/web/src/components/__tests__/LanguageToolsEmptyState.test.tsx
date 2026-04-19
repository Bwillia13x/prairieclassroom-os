import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LanguageToolsEmptyState from "../LanguageToolsEmptyState";

describe("LanguageToolsEmptyState", () => {
  it("renders a simplify-mode sample with before/after text", () => {
    render(
      <LanguageToolsEmptyState
        mode="simplify"
        ealStudents={4}
        topLanguages={["Arabic", "Spanish"]}
      />,
    );
    expect(screen.getByText(/before/i)).toBeInTheDocument();
    expect(screen.getByText(/after/i)).toBeInTheDocument();
    expect(screen.getByText(/4 eal/i)).toBeInTheDocument();
  });

  it("renders a vocab-mode sample with a bilingual term", () => {
    render(
      <LanguageToolsEmptyState
        mode="vocab"
        ealStudents={4}
        topLanguages={["Arabic"]}
      />,
    );
    // "community" appears in both the term and the definition/example text.
    expect(screen.getAllByText(/community/i).length).toBeGreaterThan(0);
    // "Arabic" appears in both the summary and the card translation label.
    expect(screen.getAllByText(/arabic/i).length).toBeGreaterThan(0);
  });
});
