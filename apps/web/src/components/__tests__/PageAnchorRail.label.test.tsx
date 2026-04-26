import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PageAnchorRail from "../PageAnchorRail";
import { PAGE_ANCHORS } from "../../pageAnchors";

describe("PageAnchorRail labels", () => {
  it("classroom rail has no single-word label longer than 10 characters", () => {
    const longest = PAGE_ANCHORS.classroom.anchors
      .map((a) => a.label)
      .filter((l) => !l.includes(" "))
      .reduce((max, l) => (l.length > max.length ? l : max), "");
    expect(longest.length, `single-word label "${longest}" risks mid-word wrap at the 11rem rail`)
      .toBeLessThanOrEqual(10);
  });

  it("renders the classroom rail with no label containing a soft hyphen or zero-width space", () => {
    render(
      <PageAnchorRail
        anchors={PAGE_ANCHORS.classroom.anchors}
        topAnchorId={PAGE_ANCHORS.classroom.topAnchorId}
        label={PAGE_ANCHORS.classroom.label}
      />
    );
    PAGE_ANCHORS.classroom.anchors.forEach((a) => {
      const el = screen.getByText(a.label);
      expect(el.textContent).not.toMatch(/[­​]/);
    });
  });
});
