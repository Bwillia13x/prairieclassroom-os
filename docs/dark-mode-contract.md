# Dark Mode Contract

**Status:** Canonical. Last updated 2026-04-17 (round 2 — material hierarchy).
**Scope:** `apps/web` — the teacher-facing PrairieClassroom UI.

This document is the single source of truth for the light/dark color system. When you touch anything in `apps/web/src/styles/tokens.css`, `apps/web/src/tokens.css`, or any component CSS that defines color, read this first.

## 1. Brand identity: three-layer material hierarchy on a desaturated Alberta-navy primary

**2026-04-17 repositioning.** The prior warm-cream + cognac identity was retired in favor of an institutional neutral canvas with an Alberta-navy primary accent. The classroom-ops product sits in front of Alberta K-6 teachers, principals, and Learning Services reviewers; its visual register must read as *trusted education software* (alberta.ca, PowerSchool, Edsby, LearnAlberta), not *editorial lifestyle brand*.

**2026-04-17 round 2 — material hierarchy.** The first pass reached the right *register* but still felt blocky and cartoony because content cards floated directly on the page canvas with no mediating surface between them. Round 2 introduces a third layer: every page now renders on a `canvas → workspace → surface` stack, with tonal steps that create material depth. The navy accent was also desaturated for a more mature, "considered" feel. Full rationale and alternatives considered: `docs/decision-log.md` 2026-04-17 entries (both rounds).

### Material hierarchy

| Layer | Token | Light | Dark | Selector |
|---|---|---|---|---|
| 0 — page canvas | `--color-bg` | `#e8ebf0` | `#070a0f` | `body` |
| 1 — application workspace | `--color-workspace` | `#f4f6fa` | `#12161e` | `.app-main` |
| 2 — content surface (cards) | `--color-surface` | `#ffffff` | `#1c212a` | `.card`, `.empty-state`, etc. |
| 2a — elevated / modal surface | `--color-surface-elevated` | `#ffffff` | `#222832` | `.card--raised`, dialogs |
| 2b — inset / muted surface | `--color-surface-muted` | `#eef1f5` | `#151a22` | nested panels, `.empty-state-steps` |

The tonal steps are ~10 RGB units per tier in light mode, producing depth that reads as *material* rather than *color banding*. Contributors **must not** put content cards directly on `--color-bg`; the workspace surface is the semantic home for app content. If a surface genuinely needs to sit on the canvas (full-bleed marketing, error walls, launch overlays) it should be styled explicitly with that intent documented in the component CSS.

### Primary accent

| Role | Light | Dark |
|---|---|---|
| `--color-accent` | `#1b4b80` (desaturated Alberta navy) | `#7aa7d9` (lifted desaturated navy) |
| `--color-accent-hover` | `#143a65` | `#91b9e3` |
| `--color-accent-soft` / `--color-bg-accent` | `#e7ecf4` | `#101827` |
| `--color-brand-highlight` | `#ae671a` (Prairie cognac, legacy brand) | `#d4a15c` (lifted cognac) |

The accent was desaturated from the round-1 value (`#0f4c9e`) to reduce the "generic app blue" feel of the fully-saturated hue. Contributors: if you feel pressure to bring back cream surfaces, re-saturate the navy, or collapse the three-layer stack back to two, push back, or bring the case to `docs/decision-log.md` first.

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
2. Lift the *lower-contrast* side (usually the foreground) by adjusting **lightness** within the same hue family (neutral-grey for canvas tokens, Alberta-navy for accent tokens, semantic hue for status families) — **never shift the hue** to fix contrast
3. Re-run `npm run check:contrast` until clean
4. Smoke-test visually in `npm run dev` — make sure the lifted value still feels like the institutional palette

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

The `body::before` film-grain texture is suppressed in dark mode regardless of `prefers-reduced-transparency`. On the neutral dark canvas, the grain reads as noise rather than texture and hurts legibility.

### Body background (2026-04-17 round 2)

The body is now a flat `background: var(--color-bg)` with no gradient. All visual framing is provided by the `.app-main` Layer-1 workspace, which sits on the canvas with `box-shadow: var(--shadow-lg)` and `border-radius: var(--radius-xl)`. The prior linear-gradient top-fade was retired because the three-layer stack provides better material separation than any single-surface gradient can.

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
- **Near-black, not true AMOLED black.** The base bg `#0e1116` is a cool near-black, not pure `#000000`. This avoids OLED smearing artifacts while still reading as decisively dark.
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
