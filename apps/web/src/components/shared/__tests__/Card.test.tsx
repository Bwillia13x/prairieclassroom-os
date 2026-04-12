import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "../Card";

describe("Card", () => {
  it("renders children inside a raised (default) card", () => {
    render(<Card>content</Card>);
    const card = screen.getByText("content").closest(".card");
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain("card--raised");
    expect(card?.className).toContain("card--tone-neutral");
  });

  it("applies the correct variant class", () => {
    render(<Card variant="flat">flat</Card>);
    const card = screen.getByText("flat").closest(".card");
    expect(card?.className).toContain("card--flat");
  });

  it("applies the correct tone class", () => {
    render(<Card tone="priority">p</Card>);
    const card = screen.getByText("p").closest(".card");
    expect(card?.className).toContain("card--tone-priority");
  });

  it("adds the accent-stripe modifier when accent=true", () => {
    render(<Card accent>accented</Card>);
    const card = screen.getByText("accented").closest(".card");
    expect(card?.className).toContain("card--accent");
  });

  it("renders as <button> when interactive + onClick provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        click me
      </Card>,
    );
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders as <div> by default and does not expose a button role", () => {
    render(<Card>no-click</Card>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders Card.Header, Card.Body, Card.Footer in composition", () => {
    render(
      <Card>
        <Card.Header>head</Card.Header>
        <Card.Body>body</Card.Body>
        <Card.Footer>foot</Card.Footer>
      </Card>,
    );
    expect(screen.getByText("head").className).toContain("card__header");
    expect(screen.getByText("body").className).toContain("card__body");
    expect(screen.getByText("foot").className).toContain("card__footer");
  });

  it("merges a user-provided className", () => {
    render(<Card className="custom-extra">x</Card>);
    const card = screen.getByText("x").closest(".card");
    expect(card?.className).toContain("custom-extra");
  });
});
