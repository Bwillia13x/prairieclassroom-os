import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormSection from "../FormSection";

describe("FormSection", () => {
  it("renders label and children with group role", () => {
    render(
      <FormSection label="Name">
        <input />
      </FormSection>,
    );

    expect(screen.getByRole("group", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <FormSection label="Bio" description="Tell us about yourself.">
        <textarea />
      </FormSection>,
    );
    expect(screen.getByText("Tell us about yourself.")).toBeInTheDocument();
  });

  it("renders error with alert role", () => {
    render(
      <FormSection label="Email" error="Invalid email.">
        <input />
      </FormSection>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email.");
  });

  it("adds error styling class when error is present", () => {
    const { container } = render(
      <FormSection label="Field" error="Required.">
        <input />
      </FormSection>,
    );
    expect(container.querySelector(".form-section--error")).toBeInTheDocument();
  });

  it("shows character counter when maxChars is provided", () => {
    render(
      <FormSection label="Message" charCount={42} maxChars={100}>
        <textarea />
      </FormSection>,
    );
    expect(screen.getByText("42 / 100")).toBeInTheDocument();
  });

  it("shows warning styling when charCount exceeds 90% of maxChars", () => {
    const { container } = render(
      <FormSection label="Message" charCount={92} maxChars={100}>
        <textarea />
      </FormSection>,
    );
    expect(container.querySelector(".form-section__counter--warn")).toBeInTheDocument();
  });

  it("shows over-limit styling when charCount exceeds maxChars", () => {
    const { container } = render(
      <FormSection label="Message" charCount={105} maxChars={100}>
        <textarea />
      </FormSection>,
    );
    expect(container.querySelector(".form-section__counter--over")).toBeInTheDocument();
  });

  it("defaults charCount to 0 when not provided but maxChars is set", () => {
    render(
      <FormSection label="Field" maxChars={50}>
        <input />
      </FormSection>,
    );
    expect(screen.getByText("0 / 50")).toBeInTheDocument();
  });
});
