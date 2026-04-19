import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PageIntro from "../PageIntro";

describe("PageIntro muted + live badges", () => {
  it("renders a muted descriptive badge without button semantics", () => {
    render(
      <PageIntro
        eyebrow="Prep"
        title="Build Lesson Variants"
        description="Test"
        sectionTone="sage"
        badges={[{ label: "Artifact-led workflow", tone: "muted" }]}
      />,
    );
    const badge = screen.getByText("Artifact-led workflow");
    const chip = badge.closest(".status-chip") as HTMLElement | null;
    expect(chip).not.toBeNull();
    expect(chip!.tagName).toBe("SPAN");
  });

  it("renders a live badge as a button and fires onClick", () => {
    const onClick = vi.fn();
    render(
      <PageIntro
        eyebrow="Prep"
        title="Build Lesson Variants"
        description="Test"
        sectionTone="sage"
        badges={[{ label: "Grade 3-4", tone: "live", onClick }]}
      />,
    );
    const btn = screen.getByRole("button", { name: /grade 3-4/i });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
});
