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
});
