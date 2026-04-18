# Sizing Contract

**Status:** Canonical. Last updated 2026-04-18 (UI sizing uniformity sweep).
**Scope:** `apps/web` — all component CSS, panel CSS, primitives, and shell styles.

This document is the single source of truth for how interactive controls, icons, chips, and typographic caption tiers are sized. When you touch anything in `apps/web/src/styles/tokens.css`, `apps/web/src/styles/primitives.css`, or any component CSS that defines `min-height` / `height` / `padding` / `font-size` on a UI control, read this first.

The companion document for color, material hierarchy, and theme switching is [`dark-mode-contract.md`](./dark-mode-contract.md).

## 1. Why this contract exists

A 2026-04-18 audit of the web app found that atomic tokens (colors, type scale, spacing) were strong but the primitive and component layers were leaking. Interactive controls had drifted across **ten distinct heights** (26 / 28 / 32 / 34 / 36 / 38 / 40 / 44 / 48 / 52 px) — a new file would pick whichever literal felt right, and the next file would pick a neighbor. The visual effect was subtle misalignment between chips, pills, buttons, and inputs on the same row.

The sweep collapsed those ten heights into a **four-tier canonical scale**, added paired horizontal and vertical padding tokens, introduced a canonical icon scale, and added a missing 12 px spacing step and 11 px caption type tier.

Contributors must snap to one of the four control heights. If a new design calls for a fifth size, open a decision-log entry before adding a new token.

## 2. The four-tier control scale

Every interactive element in the app — buttons, pills, chips, tag badges, toggle rows, input rows, selectable list rows, nav tabs — snaps to one of these heights.

| Tier | Token | Height | Typical use |
|---|---|---|---|
| xs | `--control-h-xs` | 28 px | chip, pill, tag, eyebrow, status badge, micro-action |
| sm | `--control-h-sm` | 36 px | dense button, secondary input, toggle pill, nav tab, small icon button |
| md | `--control-h-md` | 44 px | default button, primary input, touch-target control, `.btn` default |
| lg | `--control-h-lg` | 52 px | prominent CTA, generous field input, hero search, `.btn--lg` |

Width tokens for icon-only controls use the same values (`min-width: var(--control-h-sm)` etc.) so a square icon button lands on the same scale.

### Rules

- **Do not use literal pixels or rems for control height.** Use `var(--control-h-{xs,sm,md,lg})`.
- **Do not introduce a fifth tier.** If a design needs a height between `sm` and `md`, pick one. If the intermediate size is justified, open a decision-log entry first.
- **Touch targets stay ≥ 44 px** on anything a teacher may tap with a finger on a Chromebook or iPad: primary action buttons, classroom-switcher pills, form submits. Prefer `md` or `lg`.
- **Chips are `xs` by default.** Status chips, eyebrows, tag badges, metric deltas, debt counters, shortcut pills — all snap to 28 px.

## 3. Paired control paddings

Horizontal and vertical paddings are paired with each height so a caller rarely has to think about the math.

| Tier | `--control-px-*` | `--control-py-*` |
|---|---|---|
| xs | `--space-2-5` (12 px) | `--space-1` (4 px) |
| sm | `--space-3` (16 px) | `--space-2` (8 px) |
| md | `--space-4` (24 px) | `--space-2-5` (12 px) |
| lg | `--space-4` (24 px) | `--space-3` (16 px) |

Buttons typically only need horizontal padding because `min-height` + centered line-height handles the vertical rhythm. Non-centered controls (textarea, multi-line rows) use the matching `--control-py-*` value.

## 4. Icon sizing

Icons scale with their host control. Place one of these on any `<svg>` or icon box:

| Token | Size | Use |
|---|---|---|
| `--icon-xs` | 12 px (0.75 rem) | inline text glyph, small chip leading |
| `--icon-sm` | 14 px (0.875 rem) | status chip, eyebrow, xs/sm control icon |
| `--icon-md` | 16 px (1 rem) | default button, nav tab, md control icon |
| `--icon-lg` | 20 px (1.25 rem) | section header, bottom nav, lg control icon |
| `--icon-xl` | 24 px (1.5 rem) | panel title, drawer header, empty-state lead |
| `--icon-display` | 40 px (2.5 rem) | empty-state mark, error-boundary glyph |
| `--icon-hero` | 56 px (3.5 rem) | branded loading mark, full-bleed empty state |

### Rules

- **Pair the icon tier with the control tier.** A `status-chip` (xs) gets `--icon-sm`. A default `.btn` (md) gets `--icon-md`. A `.btn--lg` gets `--icon-lg`.
- **Data-viz internals are exempt.** DayArc bars, HealthBar fills, StreamingIndicator dots, ForecastTimeline rails, and chart tick marks use pixel-exact literal sizes. These are intentional and should not be converted to icon tokens.
- **Decorative rails, dividers, and 1–3 px borders stay as literals.** `--icon-*` is for icon-sized glyphs only.

## 5. Spacing scale

The spacing scale is the same progression documented elsewhere, with one addition:

| Token | Value |
|---|---|
| `--space-1` | 4 px |
| `--space-2` | 8 px |
| **`--space-2-5`** | **12 px** — added 2026-04-18 |
| `--space-3` | 16 px |
| `--space-4` | 24 px |
| `--space-5` | 32 px |
| `--space-6` | 40 px |
| `--space-7` | 48 px |
| `--space-8` | 64 px |
| `--space-9` | 80 px |

**`--space-2-5` (12 px) is canonical chip and row padding.** Before it existed, callers backfilled `0.75rem` as a literal in ~40 locations. Use the token.

## 6. Typography scale

The body and display type scales are unchanged. One caption tier was added:

| Token | Size | Use |
|---|---|---|
| **`--text-2xs`** | **11 px (0.6875 rem)** — added 2026-04-18 | eyebrow, metric label, breadcrumb, dense caption, micro-badge |
| `--text-xs` | 12 px | small body, chip, badge |
| `--text-sm` | 14 px | secondary body, form labels, dense rows |
| `--text-base` | 16 px | default body |
| `--text-md` | 17 px | emphasized body, field input |
| `--text-lg` | 18 px | subheading |
| `--text-xl` | 22 px | card title |
| `--text-2xl` | 28 px | section title |
| `--text-3xl` | 36 px | page title |

Display scale (`--text-display-sm/md/lg`) remains reserved for hero titles and metric figures. See `tokens.css` comments for the full display block.

### Rules

- **Do not use literal rems for font-size.** Use `var(--text-*)`.
- **`--text-2xs` is for ALL-CAPS eyebrows and dense captions only.** Do not use it for body copy or running text — it fails secondary readability at long measures.
- **Small-text contrast.** `--text-2xs` (11 px) remains within WCAG AA when paired with the canonical `--color-text-tertiary` / `--color-text-secondary` tokens on canonical surfaces. If you apply `--text-2xs` to a non-standard background, run `npm run check:contrast` to verify.

## 7. What to leave alone

The following are intentionally not governed by this contract:

- **Data-viz internals.** DayArc, HealthBar, StreamingIndicator, ForecastTimeline, SectionSkeleton, DataVisualizations. Charts need pixel-exact tick/dot/fill sizes.
- **Layout containers.** `max-width`, `max-height`, `width` on modals, drawers, scroll regions, and app-shell containers. These are layout constraints, not control sizing.
- **Decorative rails and dividers.** 1 / 1.5 / 2 / 3 px borders, side accent rails, rules.
- **Keyframe animations and transforms.** `@keyframes` position values and `translate()` offsets.
- **`clamp()` fluid expressions.** Intentional responsive sizing on display titles and hero marks.
- **Brand mark aspect ratios.** The logo mark in `BrandMark` and `branded-loading__mark` uses a specific width-to-height ratio — preserve that ratio even when tokenizing the width.

## 8. When you change a token

- Update `apps/web/src/styles/tokens.css`.
- Verify primitives in `apps/web/src/styles/primitives.css` still consume the token cleanly.
- Run `npm run typecheck`, `npm run lint`, `npm run check:contrast`, and `npm run test`.
- If the change affects `--text-2xs`, `--control-h-xs`, or any font-size in a chip / eyebrow / caption context, re-run `check:contrast` specifically.
- Update this document and `docs/decision-log.md` with rationale for any new tier.

## 9. Related documents

- [Theme / color contract](./dark-mode-contract.md)
- [Architecture overview](./architecture.md)
- [Decision log](./decision-log.md) — 2026-04-18 entry for the sizing sweep
