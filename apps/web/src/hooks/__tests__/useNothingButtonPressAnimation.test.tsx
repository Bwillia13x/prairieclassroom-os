import { renderHook, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTHING_PRESS_ATTRIBUTE,
  NOTHING_PRESS_DURATION_MS,
  useNothingButtonPressAnimation,
} from "../useNothingButtonPressAnimation";

describe("useNothingButtonPressAnimation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("adds and clears the pressed attribute for matching pointer interactions", () => {
    renderHook(() => useNothingButtonPressAnimation());

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--ghost";
    const label = document.createElement("span");
    label.textContent = "Generate plan";
    button.append(label);
    document.body.append(button);

    fireEvent.pointerDown(label, { button: 0 });

    expect(button).toHaveAttribute(NOTHING_PRESS_ATTRIBUTE, "true");

    act(() => {
      vi.advanceTimersByTime(NOTHING_PRESS_DURATION_MS);
    });

    expect(button).not.toHaveAttribute(NOTHING_PRESS_ATTRIBUTE);
  });

  it("supports keyboard-triggered presses and ignores disabled buttons", () => {
    renderHook(() => useNothingButtonPressAnimation());

    const disabledButton = document.createElement("button");
    disabledButton.type = "button";
    disabledButton.className = "btn btn--primary";
    disabledButton.disabled = true;
    document.body.append(disabledButton);

    fireEvent.pointerDown(disabledButton, { button: 0 });
    expect(disabledButton).not.toHaveAttribute(NOTHING_PRESS_ATTRIBUTE);

    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "page-intro-info__trigger";
    document.body.append(infoButton);

    fireEvent.keyDown(infoButton, { key: "Enter" });
    expect(infoButton).toHaveAttribute(NOTHING_PRESS_ATTRIBUTE, "true");

    act(() => {
      vi.advanceTimersByTime(NOTHING_PRESS_DURATION_MS);
    });

    expect(infoButton).not.toHaveAttribute(NOTHING_PRESS_ATTRIBUTE);
  });

  it("clears the pressed attribute when the press animation finishes", () => {
    renderHook(() => useNothingButtonPressAnimation());

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--ghost";
    document.body.append(button);

    fireEvent.pointerDown(button, { button: 0 });
    expect(button).toHaveAttribute(NOTHING_PRESS_ATTRIBUTE, "true");

    fireEvent.animationEnd(button, { animationName: "nothing-button-press" });

    expect(button).not.toHaveAttribute(NOTHING_PRESS_ATTRIBUTE);
  });
});