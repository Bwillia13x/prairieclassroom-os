# Dark Mode Contract

**Status:** Canonical. Last updated 2026-04-12.
**Scope:** `apps/web` — the teacher-facing PrairieClassroom UI.

This document is the single source of truth for the dark mode color system. When you touch anything in `apps/web/src/styles/tokens.css`, `apps/web/src/tokens.css`, or any component CSS that defines color, read this first.

## 1. Brand identity: warm, not gray

Prairie dark mode uses a **warm-brown** palette, not a neutral-gray palette. This is a brand decision, not a bug.

| Role | Light | Dark |
|---|---|---|
| `--color-bg` | `#f7f1e5` (cream) | `#1a1610` (deep warm brown) |
| `--color-surface` | `#fdfaf5` (soft cream) | `#231d16` (warm brown) |
| `--color-surface-elevated` | `#fffdf9` | `#2b241c` |
| `--color-text` | `#30251a` (warm near-black) | `#f5ecdf` (warm near-white) |
| `--color-accent` | `#c07624` (prairie sun) | `#d4a15c` (lifted sun) |

The warm palette reflects Prairie's pedagogical story — the copilot is a classroom companion, not a surveillance dashboard. If you ever feel pressure to neutralize the palette "for modern look," push back, or bring the case to `docs/decision-log.md` first.

## 2. Switching mechanism

Dark mode is implemented with three coordinated pieces:

1. **`light-dark()` CSS function.** `styles/tokens.css` declares every color as `light-dark(<light-value>, <dark-value>)`. The browser picks the right side based on the inherited `color-scheme`.
2. **`color-scheme: light dark`.** `:root` opts into both schemes by default, so `light-dark()` follows the user's OS preference out of the box.
3. **`data-theme` attribute override.** The `ThemeToggle` component writes `data-theme="light"` or `data-theme="dark"` to `<html>` and persists the choice in `localStorage`. The CSS then sets `color-scheme: light` or `color-scheme: dark` on that selector, which in turn flips every `light-dark()` value. `data-theme="system"` removes the attribute and defers to the OS.

This means you **never** write two parallel selectors for light/dark mode. You write one token with both values, and every consumer picks up the switch for free.

### Browser support

`light-dark()` requires:
- Safari 16.4+ (March 2023)
- Chrome 123+ (March 2024)
- Firefox 120+ (November 2023)

Edge follows Chrome. This is within Prairie's target matrix; we do not ship a polyfill.

## 3. Contrast targets (WCAG 2.1 AA)

| Content | Minimum ratio |
|---|---|
| Small body text | **4.5:1** |
| Large text (≥ 18pt, or ≥ 14pt bold) | **3.0:1** |
| UI component affordance (form input borders, button outlines, focus rings) | **3.0:1** |
| Decorative dividers and card borders | *no required ratio* (see §5) |

Targets apply to **both** light and dark mode. The `scripts/check-contrast.mjs` script enforces them.

## 4. Running the contrast gate

```bash
npm run check:contrast
```

- Parses the first `:root {}` block of `apps/web/src/styles/tokens.css`
- Extracts every `light-dark(<light>, <dark>)` declaration
- Computes WCAG 2.1 relative luminance and contrast ratios for both modes
- Writes a full report to `output/contrast-report.md`
- Exits non-zero if any required pair fails

Run it whenever you change a color token. It is also expected to run as part of release gating.

### When it fails

1. Open `output/contrast-report.md` to see the exact ratio and target for the failing pair
2. Lift the *lower-contrast* side (usually the foreground) by adjusting **lightness** within the warm Prairie hue family — **never shift the hue** to fix contrast
3. Re-run `npm run check:contrast` until clean
4. Smoke-test visually in `npm run dev` — make sure the lifted value still feels like the Prairie palette

### Adding a new pair to the check

Pairs are defined in the top of `scripts/check-contrast.mjs` as objects with `{ fg, bg, target, kind, advisory? }`. Add a new object when you introduce a new text-on-tinted-background family or a new UI affordance token.

## 5. Decorative borders vs UI component borders

Prairie has **two** border tokens with different contrast requirements:

- **`--color-border` and `--color-border-strong`** — decorative dividers for cards, panels, pill hovers, and ambient separation. Intentionally soft. They are reported by the contrast script as **advisories** and do not block the gate. Rationale: these borders are not the sole identifying affordance for any interactive control; the cards and panels they wrap are identified by surface background, label placement, and iconography.
- **`--color-border-input`** — form input borders. Required to meet **3.0:1** against both `--color-bg` and `--color-surface`. Used by `input`, `select`, and `textarea` in `base.css`. This is the border a sighted user relies on to identify an unfocused form field, so it is subject to WCAG 2.1 SC 1.4.11.

If you introduce a new interactive control whose border is its primary affordance, point it at `--color-border-input` (or add a new dedicated token, tested in the contrast script).

## 6. Accessibility preference overrides

`styles/tokens.css` declares two `@media` preference overrides at the end of the file:

### `@media (prefers-contrast: more)`

Bumps secondary/tertiary text, border tokens, and accent tokens to higher-contrast variants in both modes. Users who have enabled the OS "Increase Contrast" preference see a stronger version of the Prairie palette without leaving the brand.

### `@media (prefers-reduced-transparency: reduce)`

- Collapses `--color-surface-glass` to opaque surface
- Removes the body radial-gradient overlay
- Removes the `body::before` grain texture

This respects users who have disabled transparency at the OS level (typically for visual focus or photosensitivity reasons).

### Dark-mode grain suppression

The `body::before` film-grain texture is suppressed in dark mode regardless of `prefers-reduced-transparency`. On the warm-brown dark palette, the same pattern that reads as analog warmth in light mode compounds visible noise and hurts legibility.

## 7. Derivation rules for new tokens

Introduced in the **2026-04-12 light-palette editorial-letterpress sprint** (see `docs/superpowers/specs/2026-04-12-light-palette-editorial-letterpress-design.md`).

When adding a **new** semantic family (e.g., a new status color, a new section theme) or any individual token that needs to compose into the existing system, follow this hierarchy:

1. **Pick the `--color-<family>` base in OKLCH**, not sRGB. OKLCH lightness steps are perceptually uniform; sRGB steps are not. The base value is the UI indicator color (the one used for borders, dots, icons) and should land in the **~6:1 contrast** range on `--color-bg`.
2. **Derive `--color-bg-<family>`** at roughly 10% mix with `--color-bg` in OKLCH space. Either compute the concrete hex from the OKLCH blend or use `color-mix(in oklch, var(--color-<family>) 10%, var(--color-bg))` directly in the token declaration.
3. **Derive `--color-border-<family>`** at roughly 28% mix with `--color-bg`.
4. **Derive `--color-text-<family>`** as the OKLCH-lifted base that hits **≥4.5:1** on `--color-bg-<family>`. Aim for **≥4.7:1** so the token has real headroom against display variation.
5. **Register the new pair(s)** in `scripts/check-contrast.mjs` (see §4 "Adding a new pair to the check").
6. **Run `npm run check:contrast`.** Do not ship without a clean report.

### Existing tokens stay explicit for now

The 2026-04-12 sprint did **not** refactor every existing `--color-bg-*`, `--color-border-*`, and `--color-text-*` token to `color-mix()` derivation. Existing values stay as explicit hex literals in `styles/tokens.css`, and those hex literals were tuned in the same sprint for perceptual cohesion on the new bg. A full `color-mix()` refactor is out-of-scope follow-up work.

This means **new tokens should prefer `color-mix(in oklch, ...)`**, but **existing tokens are not required to migrate**. When you touch an existing family for other reasons, you may convert it to `color-mix()` if it helps — but it is not a blocker.

### Why OKLCH and not sRGB

`light-dark()` picks the right side at render time, but the values on both sides still have to be picked by a human. The Prairie palette was originally picked by eye in sRGB, which is why the `bg → surface → surface-elevated` ladder felt numerically uneven (bg and surface were barely distinguishable on some displays). OKLCH is the color space in which *equal numeric steps look equal to the eye*, which makes derivation and laddering mechanical rather than aesthetic guessing.

## 8. Rules for contributors

When you change anything that touches color:

1. **Always use tokens.** Component CSS must reference `var(--color-*)` or `var(--ds-*)`. Raw hex, `rgb()`, `rgba()`, and `hsl()` values are forbidden outside of `tokens.css` with two exceptions:
   - Inside `@media print` blocks (print is light-only and token switching is irrelevant)
   - Pure neutral modal overlays like `rgba(0, 0, 0, 0.3)` that read the same in both modes
2. **Never write `@media (prefers-color-scheme: dark)` overrides in component CSS.** The switching is centralized in `tokens.css` via `light-dark()`. If you need a dark-only value, wrap it in `light-dark(<light>, <dark>)` at the token level.
3. **Always run `npm run check:contrast`** after any change to `styles/tokens.css`. A green gate is the minimum bar.
4. **Update this document** if you change the switching mechanism, introduce a new accessibility override, or change the decorative-vs-affordance border distinction.
5. **Follow `docs/decision-log.md`** for brand-level decisions that affect the palette.

## 9. Known trade-offs documented here

- **Decorative borders read below 3:1.** Accepted for aesthetic reasons (see §5). Mitigated by routing all form affordances through `--color-border-input`.
- **No AMOLED / true-black variant.** Out of scope; the warm-brown palette is non-negotiable as a brand anchor.
- **`::selection` uses `color-mix`.** Requires modern browsers; fallback is not provided because Prairie's target matrix already requires `light-dark()` support.
- **Grain texture is suppressed in dark mode.** Non-configurable. If a future design wants grain in dark mode, design a new dark-tuned noise pattern rather than reusing the light one.

## 10. Related files

- `apps/web/src/styles/tokens.css` — canonical palette + `@media` preference blocks
- `apps/web/src/tokens.css` — `--ds-*` alias layer for the shared component library
- `apps/web/src/styles/base.css` — selection color, form-input chrome, grain texture
- `apps/web/src/styles/shell.css` — app shell elevation and nav chrome
- `apps/web/src/components/ThemeToggle.tsx` — three-state toggle component
- `scripts/check-contrast.mjs` — contrast verification script
- `output/contrast-report.md` — last generated contrast report (git-ignored)
- `docs/dark-mode-upgrade-2026-04-12.md` — the dark-mode side of the 2026-04-12 sprint
- `docs/superpowers/specs/2026-04-12-light-palette-editorial-letterpress-design.md` — the light-mode side of the 2026-04-12 sprint, where §7 derivation rules were introduced
- `docs/decision-log.md` — record of brand-level and architectural decisions
