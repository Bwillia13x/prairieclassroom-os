import { useEffect } from "react";

export const NOTHING_PRESS_ATTRIBUTE = "data-nothing-pressed";
export const NOTHING_PRESS_DURATION_MS = 220;
export const NOTHING_PRESS_SELECTOR = [
  ".btn:not(.btn--link)",
  ".shell-bar__palette-btn",
  ".role-pill",
  ".shell-classroom-pill",
  ".tomorrow-chip__trigger",
  ".tomorrow-chip__review",
  ".tomorrow-chip__remove",
  ".output-action-bar__btn",
  ".draft-restore__btn",
  ".time-suggestion-btn",
  ".output-feedback-submit",
  ".output-feedback-btn",
  ".page-intro-info__trigger",
  ".contextual-hint-dismiss",
  ".contextual-hint-restore",
  ".status-chip--live",
  ".app-footer__toggle",
  ".app-footer__shortcuts-btn",
  ".mobile-nav-group",
  ".mobile-nav-subtab",
].join(", ");

function findNothingPressTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const button = target.closest(NOTHING_PRESS_SELECTOR);
  if (!(button instanceof HTMLElement)) return null;
  if (button.matches(":disabled") || button.getAttribute("aria-disabled") === "true") {
    return null;
  }
  return button;
}

export function useNothingButtonPressAnimation() {
  useEffect(() => {
    const activeTimers = new Map<HTMLElement, number>();

    function clearPress(button: HTMLElement) {
      const timer = activeTimers.get(button);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        activeTimers.delete(button);
      }
      button.removeAttribute(NOTHING_PRESS_ATTRIBUTE);
    }

    function triggerPress(button: HTMLElement) {
      clearPress(button);
      void button.offsetWidth;
      button.setAttribute(NOTHING_PRESS_ATTRIBUTE, "true");
      const timer = window.setTimeout(() => {
        clearPress(button);
      }, NOTHING_PRESS_DURATION_MS);
      activeTimers.set(button, timer);
    }

    function handleAnimationEnd(event: AnimationEvent) {
      if (event.pseudoElement) return;
      const button = findNothingPressTarget(event.target);
      if (!button || event.target !== button) return;
      if (!button || !button.hasAttribute(NOTHING_PRESS_ATTRIBUTE)) return;
      clearPress(button);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      const button = findNothingPressTarget(event.target);
      if (!button) return;
      triggerPress(button);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const button = findNothingPressTarget(event.target);
      if (!button) return;
      triggerPress(button);
    }

    function handleClick(event: MouseEvent) {
      const button = findNothingPressTarget(event.target);
      if (!button || button.hasAttribute(NOTHING_PRESS_ATTRIBUTE)) return;
      triggerPress(button);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("animationend", handleAnimationEnd, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("animationend", handleAnimationEnd, true);
      for (const [button, timer] of activeTimers) {
        window.clearTimeout(timer);
        button.removeAttribute(NOTHING_PRESS_ATTRIBUTE);
      }
      activeTimers.clear();
    };
  }, []);
}