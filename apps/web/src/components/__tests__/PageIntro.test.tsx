import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PageIntro from "../PageIntro";

describe("PageIntro section header (audit Workstream C)", () => {
  it("renders the 2-family / 3-size header — section label, title, description", () => {
    const { container } = render(
      <PageIntro
        eyebrow="Prep Workspace"
        title="Build Lesson Variants"
        description="Bring one lesson artifact into the system."
        sectionTone="sage"
      />,
    );
    const eyebrow = container.querySelector(".page-intro__eyebrow");
    expect(eyebrow?.textContent).toBe("Prep Workspace");
    expect(screen.getByRole("heading", { name: "Build Lesson Variants" })).toBeInTheDocument();
    expect(screen.getByText(/lesson artifact/i)).toBeInTheDocument();
  });

  it("does NOT render legacy `badges` (static chip row removed per audit)", () => {
    const { container } = render(
      <PageIntro
        eyebrow="Prep"
        title="Build Lesson Variants"
        description="Test"
        sectionTone="sage"
        badges={[
          { label: "Grade 3-4", tone: "live" },
          { label: "Artifact-led", tone: "muted" },
        ]}
      />,
    );
    expect(container.querySelector(".status-chip-row")).toBeNull();
    expect(screen.queryByText("Grade 3-4")).toBeNull();
    expect(screen.queryByText("Artifact-led")).toBeNull();
  });

  it("renders dynamicContext chips when provided (live tone fires onClick)", () => {
    const onClick = vi.fn();
    render(
      <PageIntro
        eyebrow="Prep"
        title="Build Lesson Variants"
        description="Test"
        sectionTone="sage"
        dynamicContext={[
          { label: "Pinned to Alberta Curriculum Grade 4 ELA", tone: "live", icon: "📍", onClick },
          { label: "Differentiated for 4 students", tone: "muted" },
        ]}
      />,
    );
    const btn = screen.getByRole("button", { name: /pinned to alberta/i });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText("Differentiated for 4 students")).toBeInTheDocument();
  });

  it("renders nothing for the chip row when dynamicContext is omitted or empty", () => {
    const { container, rerender } = render(
      <PageIntro
        eyebrow="Prep"
        title="Build Lesson Variants"
        description="Test"
      />,
    );
    expect(container.querySelector(".status-chip-row")).toBeNull();

    rerender(
      <PageIntro
        eyebrow="Prep"
        title="Build Lesson Variants"
        description="Test"
        dynamicContext={[]}
      />,
    );
    expect(container.querySelector(".status-chip-row")).toBeNull();
  });
});
