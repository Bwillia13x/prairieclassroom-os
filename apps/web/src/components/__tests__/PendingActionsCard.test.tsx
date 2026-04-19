import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingActionsCard from "../PendingActionsCard";
import SectionIcon from "../SectionIcon";

describe("PendingActionsCard", () => {
  const items = [
    {
      key: "unapproved_message",
      label: "unapproved messages",
      count: 2,
      targetTab: "family-message" as const,
      icon: <SectionIcon name="mail" />,
    },
  ];

  it("does not render the legacy 'Open {cta}' primary action button", () => {
    render(
      <PendingActionsCard
        items={items}
        totalCount={2}
        studentsToCheckFirst={[]}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /^open /i }),
    ).not.toBeInTheDocument();
  });

  it("invokes onItemClick when a triage row is pressed", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(
      <PendingActionsCard
        items={items}
        totalCount={2}
        studentsToCheckFirst={[]}
        onItemClick={onItemClick}
      />,
    );
    await user.click(screen.getByRole("button", { name: /unapproved messages/i }));
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it("shows a contextual benchmark caption when previousTotal is supplied", () => {
    render(
      <PendingActionsCard
        items={items}
        totalCount={35}
        previousTotal={28}
        studentsToCheckFirst={[]}
      />,
    );
    const caption = screen.getByTestId("pending-actions-benchmark");
    expect(caption).toHaveTextContent(/up 7 from last check/i);
  });

  it("renders 'same as last check' when totals are equal", () => {
    render(
      <PendingActionsCard
        items={items}
        totalCount={5}
        previousTotal={5}
        studentsToCheckFirst={[]}
      />,
    );
    expect(screen.getByTestId("pending-actions-benchmark")).toHaveTextContent(
      /same as last check/i,
    );
  });

  it("omits benchmark caption when previousTotal is absent", () => {
    render(
      <PendingActionsCard
        items={items}
        totalCount={35}
        studentsToCheckFirst={[]}
      />,
    );
    expect(screen.queryByTestId("pending-actions-benchmark")).toBeNull();
  });

  it("exposes a title tooltip on the student chip when a reason is supplied", () => {
    const reasons: Record<string, string> = { Hannah: "Stale math follow-up (4 days)" };
    render(
      <PendingActionsCard
        items={items}
        totalCount={2}
        studentsToCheckFirst={["Hannah", "Liam"]}
        studentReasons={reasons}
      />,
    );
    const chip = screen.getByRole("button", { name: /Hannah/ });
    expect(chip).toHaveAttribute("title", "Stale math follow-up (4 days)");
  });
});
