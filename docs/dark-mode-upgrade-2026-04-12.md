# Dark Mode Color System Upgrade — Design

**Date:** 2026-04-12
**Owner:** Frontend / design system
**Status:** In progress (pre-authorized to apply)

## Goal

Tighten correctness, accessibility, and consistency of the dark mode color system **without** changing the warm Prairie brand identity.

## Context

`apps/web` already has a mature, modern dark mode foundation:

- `styles/tokens.css` and `tokens.css` use the CSS `light-dark()` function 86 times across two files
- `:root { color-scheme: light dark; }` plus `:root[data-theme="light|dark"]` overrides
- Three-state `ThemeToggle` component (`system | light | dark`) with `localStorage` persistence
- Comprehensive semantic palette: 12 families (info, success, warning, danger, accent, analysis, provenance, pending, sun, sage, slate, forest) each with bg / border / text triples
- Shared `--ds-*` aliases that inherit cleanly from canonical Prairie tokens
- Shadow primitives that switch warm-orange (light) → black-alpha (dark)

The system is *architecturally healthy*. This upgrade fixes a small number of correctness bugs, verifies WCAG contrast empirically rather than by inspection, adds accessibility primitives the system doesn't yet support, and documents the dark mode contract.

## Non-Goals

- No rebranding or palette redesign
- No AMOLED / true-black mode
- No theme toggle UX redesign
- No changes to non-color tokens (spacing, type, motion, layout)
- No new component CSS unless required by a specific fix

The warm-brown dark palette has been replaced (2026-04-13) with a near-black base (`#0c0c0a` bg, `#151412` surface) that uses warm beige accents (`#3a3126` borders, `#d4a15c` accent) to carry the prairie identity. The base is dark, the accents are warm.

## Audit Findings

| Finding | Location | Severity |
|---|---|---|
| 3 hardcoded warm-orange shadows that don't switch in dark mode | `styles/shell.css:115,126,348` | P0 bug |
| Hardcoded `::selection` color | `styles/base.css:80-82` | P0 bug |
| 45 hardcoded color values bypassing the token system | 12 component CSS files | P0 audit + fix |
| Unverified WCAG contrast across foreground/background pairs | `styles/tokens.css` | P1 |
| Suspected AA failure: `--color-text-tertiary` dark on bg (≈4.1:1) | `styles/tokens.css:14` | P1 |
| No `prefers-contrast: more` support | system-wide | P2 |
| No `prefers-reduced-transparency: reduce` support | system-wide | P2 |
| Always-on grain texture compounds visible noise in dark mode | `styles/base.css:163-172` | P2 |
| No documented dark-mode contract for new contributors | docs | P3 |

## Worst hardcoded-color offenders

| File | Count |
|---|---|
| `SurvivalPacket.css` | 18 (likely print-only) |
| `EABriefing.css` | 8 |
| `MessageDraft.css` | 5 |
| `shared/ActionButton.css` | 4 |
| `TimeSuggestion.css`, `OnboardingOverlay.css` | 2 each |
| `ClassroomAccessDialog.css`, `DrillDownDrawer.css`, `MobileNav.css`, `ForecastViewer.css`, `ArtifactUpload.css`, `shared/EmptyState.css` | 1 each |

## Plan

### P0 — Correctness bugs

1. Replace `styles/shell.css` lines 115, 126, 348 hardcoded shadows with the appropriate `var(--shadow-*)` token. The shadows should match the elevation level the existing values were trying to express.
2. Replace `styles/base.css` `::selection` with `color-mix(in srgb, var(--color-accent) 24%, transparent)` so it adapts automatically.
3. Audit all 45 hardcoded color values across 12 component CSS files. For each occurrence, apply one of three treatments:
   - **Replace with token** if the intent is semantic (e.g. surface, border, text, accent)
   - **Wrap in `light-dark(lightValue, darkValue)`** if the value is intentional but only correct in light mode and a dark variant is needed
   - **Scope to `@media print`** if the value is print-only (this catches most of `SurvivalPacket.css`)

### P1 — Verified contrast

4. New `scripts/check-contrast.mjs`:
   - Parses `apps/web/src/styles/tokens.css`
   - Extracts every `light-dark(<lightValue>, <darkValue>)` declaration
   - Builds a list of declared semantic foreground/background relationships (text on bg, text on surface, text-secondary/tertiary on bg, text-* on bg-* same family, accent on bg, etc.)
   - Computes WCAG 2.1 relative luminance and contrast ratios for both modes
   - Emits a markdown report to `output/contrast-report.md` showing every pair, ratio, and AA pass/fail
   - Exits non-zero if any small-text foreground/background fails 4.5:1 (or 3:1 for declared large-text-only pairs)
5. Add an npm script: `"check:contrast": "node scripts/check-contrast.mjs"`
6. Lift any failing tokens in `styles/tokens.css`. Lifts must stay within the warm Prairie hue family — adjust lightness, not hue. Re-run `check:contrast` until clean.
7. Document the contrast targets in the dark-mode contract doc (P3).

### P2 — Accessibility primitives

8. Add `@media (prefers-contrast: more)` block at the top of `styles/tokens.css` that strengthens borders, lifts tertiary text further, and increases accent saturation. Both modes get a contrast bump.
9. Add `@media (prefers-reduced-transparency: reduce)` block that:
   - Drops `--color-surface-glass` to opaque surface
   - Removes the body radial-gradient overlay
   - Removes the `body::before` grain texture
10. Add `:root[data-theme="dark"] body::before { display: none; }` (or equivalent) to suppress the grain in dark mode regardless of reduced-transparency preference.

### P3 — Documentation

11. New `docs/dark-mode-contract.md` documenting:
   - The warm Prairie palette decision and why dark mode uses brown, not gray
   - Contrast targets (WCAG 2.1 AA: 4.5:1 small text, 3:1 large text and UI components)
   - Switching mechanism: `light-dark()` + `color-scheme` + `data-theme` override + `localStorage`
   - Browser support: `light-dark()` requires Safari 16.4+, Chrome 123+, Firefox 120+
   - How to add new color tokens correctly (always use `light-dark()`, never raw hex outside `tokens.css`)
   - When component CSS may legitimately bypass tokens (`@media print` only)
   - How to run `npm run check:contrast` and what to do when it fails
12. Update `CLAUDE.md` "Documentation Rules" section: add one bullet pointing at `docs/dark-mode-contract.md` for any token-touching change.

## Validation

After all changes:

- `npm run typecheck`
- `npm run lint`
- `npm run check:contrast` — must pass with zero AA failures
- `npm run test` — catches any CSS module regressions
- Manual: `npm run dev`, toggle all three modes (`system`, `light`, `dark`), walk Today / Prep / Ops / Review tabs, verify nothing visually regressed

## Risk Assessment

| Phase | Risk | Mitigation |
|---|---|---|
| P0 #1 (shell shadows) | Trivial | Pure token substitution |
| P0 #2 (selection) | Trivial | `color-mix` is universally supported in target browsers |
| P0 #3 (component audit) | Low | Subagent works file-by-file with explicit treatment rules |
| P1 (contrast script + lifts) | Low-medium | Script provides regression gate; lifts stay within hue family |
| P2 (a11y primitives) | Low-medium | `@media` overrides at `:root` level minimize specificity surprises |
| P3 (docs) | Zero | Additive |

## Rollout

Single sprint, no flags, no migration. The token system is the unit of deployment — once `styles/tokens.css` is updated, every consumer picks up the changes automatically through `var(--color-*)`.

## Out-of-scope follow-ups for a future sprint

- Sepia / reading-mode third theme variant
- High-contrast variant palette (separate from `prefers-contrast`)
- Per-classroom theme overrides (would require server-side persistence)
- Token rename to align with `--color-*` and `--ds-*` conventions (cosmetic only)
