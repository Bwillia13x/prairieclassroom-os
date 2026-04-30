import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Phase α regression — Typography cascade rescue (2026-04-28).
 *
 * The prior universal-descendant `.app-shell *, … { letter-spacing: 0 !important }`
 * reset in nothing-theme.css silently overrode the project's 7-step tracking
 * scale on every hero, eyebrow, and section marker. This test asserts the
 * cascade-poisoning shape stays gone and the underlying tracking tokens
 * remain defined.
 *
 * Why a source-text test rather than a getComputedStyle assertion:
 * jsdom (the test environment for component tests) does not parse imported
 * CSS files into the cascade, so getComputedStyle returns initial values
 * regardless of whether the bug is fixed. Source-text regression captures
 * the exact pattern that caused the bug and is impossible to false-pass.
 */

const stylesDir = resolve(__dirname, "..");

function stripCssComments(source: string): string {
  // Strip /* … */ blocks so regression checks aren't confused by historical
  // diagnoses preserved in inline comments (e.g., the Phase α tombstone).
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

const nothingTheme = stripCssComments(readFileSync(resolve(stylesDir, "nothing-theme.css"), "utf8"));
const nothingThemeRaw = readFileSync(resolve(stylesDir, "nothing-theme.css"), "utf8");
const tokens = readFileSync(resolve(stylesDir, "tokens.css"), "utf8");

describe("Typography cascade — Phase α regression", () => {
  it("does not contain a universal-descendant letter-spacing reset under .app-shell", () => {
    // The poisoned shape was: `.app-shell *, .toast-queue *, … { letter-spacing: 0 !important; }`.
    // Any future PR that re-introduces a `<root> * { letter-spacing: … !important }`
    // rule should fail this test. `[^{}]*` keeps the match inside one rule.
    const universalLetterSpacingReset = /\.app-shell\s*\*[^{}]*\{[^}]*letter-spacing\s*:\s*0[^}]*!important/;
    expect(nothingTheme).not.toMatch(universalLetterSpacingReset);
  });

  it("does not contain any universal-descendant !important letter-spacing override on overlay roots", () => {
    // Wider net — catches the same anti-pattern on toast-queue, command-palette,
    // shortcut-sheet, access-dialog, role-prompt-dialog, onboarding-card,
    // drilldown-drawer (the prior reset's seven sibling roots).
    const overlayRoots = [
      "toast-queue",
      "command-palette",
      "shortcut-sheet",
      "access-dialog",
      "role-prompt-dialog",
      "onboarding-card",
      "drilldown-drawer",
    ];
    for (const root of overlayRoots) {
      const shape = new RegExp(`\\.${root}\\s*\\*[^{}]*\\{[^}]*letter-spacing\\s*:\\s*0[^}]*!important`);
      expect(nothingTheme, `overlay root .${root} must not carry a universal letter-spacing reset`).not.toMatch(shape);
    }
  });

  it("keeps the accessible proof-trace font roles readable-first", () => {
    expect(tokens).toMatch(/--font-reading\s*:\s*"Atkinson Hyperlegible"/);
    expect(tokens).toMatch(/--font-sans\s*:\s*var\(--font-reading\)/);
    expect(tokens).toMatch(/--font-display\s*:\s*var\(--font-reading\)/);
    expect(tokens).toMatch(/--font-dot\s*:\s*"Doto",\s*var\(--font-mono\)/);
  });

  it("keeps tracking neutral for readable headings and labels", () => {
    // The accessible proof-trace migration keeps Doto as accent texture
    // and avoids negative or wide tracking on real workflow text.
    expect(tokens).toMatch(/--tracking-display\s*:\s*0/);
    expect(tokens).toMatch(/--tracking-display-tight\s*:\s*0/);
    expect(tokens).toMatch(/--tracking-eyebrow\s*:\s*0/);
  });

  it("retains the .t-mono-untracked opt-in escape hatch", () => {
    // The replacement for the universal reset — any element that genuinely
    // needs zero tracking can apply this class explicitly. Removing it is
    // fine if no one uses it, but losing it accidentally would silently
    // remove the documented escape hatch. Use the raw source so the rule
    // matches even if a future maintainer wraps the class in a comment.
    expect(nothingThemeRaw).toMatch(/\.t-mono-untracked\s*\{[^}]*letter-spacing\s*:\s*0/);
  });

  it("wraps the kitchen-sink __eyebrow rule in :where() so per-context overrides win", () => {
    // Phase 1 follow-up (2026-04-28): the broad-pattern eyebrow rule
    // previously scored (0,2,0) and silently overrode any per-context
    // `.page-hero--classroom .page-hero__eyebrow` (also 0,2,0) on source
    // order. Wrapping `.workspace-page` in `:where()` drops the rule to
    // (0,0,1) so single-class per-component overrides win cleanly. The
    // bare form (without `:where()`) is the regression to catch.
    expect(nothingThemeRaw).toMatch(/:where\(\.workspace-page\)\s+\[class\*="__eyebrow"\]/);
    // The bare form must NOT exist — anywhere in source — including any
    // place a future maintainer might re-introduce the high-specificity
    // shape. Use the comment-stripped source so the historical comment
    // describing the prior shape doesn't false-positive.
    expect(nothingTheme).not.toMatch(/(^|[^:])\.workspace-page\s+\[class\*="__eyebrow"\]/);
  });
});
