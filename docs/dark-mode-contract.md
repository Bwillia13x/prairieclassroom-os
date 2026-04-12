# Dark Mode Contract

This document codifies the rules for authoring tokens, components, and CSS
that must render correctly in both light and dark color schemes.

## §1. Color tokens only

All color values in component CSS must reference `var(--color-*)` tokens. Never
use raw hex, `rgb()`, or `rgba()` color literals in component stylesheets.
Token values are defined once in `apps/web/src/styles/tokens.css` using
`light-dark()` so they automatically resolve to the correct scheme value.

## §2. The `light-dark()` primitive is the source of truth

Token definitions in `tokens.css` use `light-dark(light-value, dark-value)`.
The active scheme is controlled by `color-scheme` on `:root`. Do not override
`color-scheme` on individual components — it breaks the inherited resolution
for all descendants.

## §3. Surface hierarchy

| Token | Semantic use |
|-------|-------------|
| `--color-bg` | Page background |
| `--color-surface` | Raised panel / card surface |
| `--color-surface-raised` | Elevated card (hover state, drawers) |
| `--color-surface-glass` | Intentional frosted-glass surfaces (shell, dialogs, mobile nav) |

Components that want "raised card" depth should use `--color-surface` and the
shadow ladder, not `backdrop-filter: blur`. Glass surfaces are reserved for the
shell chrome, drawers, and dialogs only.

## §4. Shadow tokens

The warm shadow ladder is defined as:

```
--shadow-xs   very subtle lift (icon buttons)
--shadow-sm   default card resting shadow
--shadow-md   hovered / active card, pill hover
--shadow-lg   open pill, elevated modal
```

Internal alpha values are stored in `--_shadow-*-a` primitives and derive from
the accent warm channel via `light-dark()`. Do not reach into these internal
tokens from component CSS.

**Button and card `box-shadow` values MUST derive from the `--shadow-*`
tokens** (`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`).
Never hardcode `rgba(...)` values with a specific color channel keyed
to the accent or warning hex. The shadow primitive tokens
(`--_shadow-*-a`) already handle the warm-shadow ladder and track
palette refinements via `light-dark()`. Raw rgba values silently drift
when the accent color shifts — this was the anti-pattern fixed by the
2026-04-12 letterpress tactility sprint. See
`docs/superpowers/specs/2026-04-12-cards-buttons-letterpress-tactility-design.md`.

## §5. Focus ring token

`:focus-visible` outlines must use `var(--focus-ring-color)` and
`var(--focus-ring-width)` so the ring is visible in both schemes without
authoring scheme-conditional overrides per component.

## §6. Derivation rules for new tokens

When adding a new semantic token:

1. Define it in `tokens.css` with `light-dark(light-value, dark-value)`.
2. Use only existing palette primitives (`--_color-*`) as inputs to the new
   token — never raw hex.
3. Run `npm run check:contrast` after any palette change to confirm the
   baseline failure count has not increased.
4. Document the semantic intent in a comment above the token definition.

**Button and card `box-shadow` values MUST derive from the `--shadow-*`
tokens** (`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`).
Never hardcode `rgba(...)` values with a specific color channel keyed
to the accent or warning hex. The shadow primitive tokens
(`--_shadow-*-a`) already handle the warm-shadow ladder and track
palette refinements via `light-dark()`. Raw rgba values silently drift
when the accent color shifts — this was the anti-pattern fixed by the
2026-04-12 letterpress tactility sprint. See
`docs/superpowers/specs/2026-04-12-cards-buttons-letterpress-tactility-design.md`.
