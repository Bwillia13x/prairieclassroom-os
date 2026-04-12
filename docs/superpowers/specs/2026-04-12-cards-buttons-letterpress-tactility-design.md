# Cards & Buttons — Letterpress Tactility Refinement — Design

**Date:** 2026-04-12
**Owner:** Frontend / design system
**Status:** Draft — user delegated full authority; proceeding to implementation plan without explicit approval gate
**Sibling spec:** `2026-04-12-light-palette-editorial-letterpress-design.md` (color layer — this spec extends its metaphor into interaction primitives)

## Goal

Refine the aesthetic and tactility of **cards** and **buttons** across the PrairieClassroom OS web UI so they read as *editorial letterpress* — the paper-and-ink metaphor already established by the light-palette refinement — instead of the generic SaaS dashboard idiom the current primitives still carry (bouncy hover transforms, hardcoded glow shadows, missing focus states). Add the missing variants and states that the existing primitives don't express (`:focus-visible`, `:active`, loading, icon-only, reduced-motion, destructive, size, composition) while preserving every existing usage site.

## Context

As of 2026-04-12 the web UI has a mature design system:

- **Color layer:** Editorial letterpress palette in `apps/web/src/styles/tokens.css` — warm Prairie brand, `light-dark()` function, ~100 tokens, WCAG AA gated by `npm run check:contrast`. Just polished in the sibling spec.
- **Token alias layer:** `apps/web/src/tokens.css` maps `--ds-*` shared-component aliases onto canonical `--color-*`/`--space-*`/etc. Shared components consume `--ds-*`; global primitives consume `--color-*`/`--space-*`.
- **Global CSS primitives:** `apps/web/src/styles/primitives.css` defines `.btn`, `.btn--primary`, `.btn--approve`, `.btn--ghost`, `.btn--tertiary`, `.btn--soft`, `.surface-panel`, `.form-panel`, `.empty-state`, `.error-banner`, `.skeleton-*`, `.loading-indicator`, and more. These classes are used in ~23 files for buttons and ~13 files for surface panels.
- **Shared components:** `apps/web/src/components/shared/` exposes `ActionButton` (variants: `primary | secondary | danger`, with `loading` + spinner), `StatusCard` (status states: `idle | loading | success | error | empty`), `EmptyState`, `FormSection`, `DataViz`, `ResultDisplay`, `SessionBanner`, `FeedbackCollector`, barrel-exported from `index.ts`.
- **Motion tokens:** `--motion-fast` (140ms), `--motion-base` (220ms), `--motion-slow` (360ms), `--ease-standard`, `--ease-emphasis`.
- **Accessibility overrides:** `prefers-contrast: more` and `prefers-reduced-transparency: reduce` already wired in `tokens.css`. `prefers-reduced-motion` is **not** yet wired.
- **Governance docs:** `docs/dark-mode-contract.md` defines the token discipline. `docs/decision-log.md` is the durable record for architectural choices.

### Observed aesthetic mismatches

1. **Button hover is bouncy.** `.btn--primary:hover` does `translateY(-2px) scale(1.02)` with a 140ms all-property transition. Scale transforms read as "push-button app," not "editorial." Paper does not zoom.
2. **Button shadows are hardcoded.** `.btn--primary` defines `box-shadow: 0 10px 20px rgba(184, 131, 49, 0.22)` and hover adds `0 14px 28px rgba(184, 131, 49, 0.28), 0 0 12px rgba(184, 131, 49, 0.15)` — a literal glow layer. The alpha-rgba value is tied to the **old** accent hex (`#c07624`); the palette refinement shifted accent to `#ae671a` but the shadow silently drifted. Future refinements will drift again. Buttons should consume `--shadow-sm`/`--shadow-md`/`--shadow-lg` from `tokens.css` instead (those tokens derive from `--_shadow-*-a` primitives that already track light/dark and the new palette).
3. **`.surface-panel` uses `backdrop-filter: blur(8px)`.** Frosted glass is a Material 3 / visionOS idiom, not letterpress. On a paper-and-ink metaphor, cards should sit on paper, not float on blur. (It also fails silently under `prefers-reduced-transparency: reduce` — the override zeros `--color-surface-glass` but the `.surface-panel` background isn't using `--color-surface-glass`, so the blur stays.)
4. **No `:focus-visible` ring on buttons.** Form fields have a polished focus treatment (3px `color-mix(in srgb, var(--color-accent) 68%, white)` outline + 4px `color-mix(...12%...)` soft halo). Buttons rely on browser default outline, which is jarring on the warm palette and inconsistent with form affordances. This is both an accessibility gap and a style gap.
5. **No `:active` press state on buttons.** Buttons lift on hover but don't visibly press on click. The tactile "ink-to-paper" arc is half-drawn.
6. **No `prefers-reduced-motion` handling on buttons.** Transform/scale hover states ignore the user's reduced-motion preference.
7. **Missing button variants.** No `danger` (terra-cotta destructive), no `link` (underlined inline action), no size scale (`sm | md | lg`), no `iconOnly` pattern (square 44×44 with required `aria-label`), no `loading` on the raw `.btn--*` classes. `ActionButton` has `loading` + `danger` but lacks `ghost`, `tertiary`, `approve`, `soft`, `link`, sizes, icon-only — so teams reaching for those drop down to raw `<button className="btn btn--ghost">`.
8. **No general-purpose `Card` component.** `StatusCard` is status-scoped (title + status slot); `.surface-panel` and `.form-panel` are raw classes with no React composition. Panels that want "a styled container around arbitrary content" must reach for raw classes, which means no variant/tone/accent discipline at the component level.
9. **Inconsistent button call sites.** ~23 files use raw `.btn--*`; others use `ActionButton`; others still use unstyled `<button>` for tertiary actions. No single source of truth.
10. **`ActionButton` CSS does not match the new palette sync story.** Its `.action-button--danger:hover` hardcodes `light-dark(#9a4225, #b87055)` — same anti-pattern as the raw primitives, will drift when the palette moves again.

### Non-mismatches (keep as-is)

- `--radius-lg` (28px) for cards — the letterpress paper-rounded-corner feel is right.
- `--radius-pill` for buttons — the pill shape IS the shape, don't box-button this.
- Two-layer warm shadow structure (`--shadow-sm`/`md`/`lg`) — already calibrated in the color sprint.
- Serif headings inside cards via `--font-serif`.
- The overall surface-elevated → surface → bg ladder — the color sprint just OKLCH-tuned this and it's the load-bearing "lift off paper" language.

## Direction — Letterpress Tactility

One direction. Four principles.

1. **Paper doesn't bounce.** Replace the `translateY(-2px) scale(1.02)` hover idiom with a **one-step translation** (≤1px) and **shadow depth change** that uses the canonical `--shadow-*` tokens. No scale. No glow. The impression is "ink settling a fraction deeper into paper" — a confident, small motion.
2. **Press presses.** Add `:active` that collapses `translateY` back to `0` and drops shadow to `--shadow-sm`. Without this the hover/press arc is incomplete — teachers get a lift but no resolution.
3. **Focus is ink-on-ink.** Reuse the form field focus treatment (3px accent outline + 4px soft halo) for buttons and interactive cards. Same language, same muscle memory — form fields and buttons become a single keyboard-navigable system.
4. **Quiet shadows, audible type.** Kill the button glow. Trust the shadow tokens. Let the serif headings and ink-black body text carry the visual weight; the card is the paper the words sit on.

This direction is **additive** to the sibling color sprint, not replacing anything. The color sprint set the palette values; this sprint sets the interaction primitives that those values animate through.

### Why not a heavier redesign

- A full React component library rewrite (shadcn-style) would mean migrating 20+ panels at once and replacing `ActionButton` and `StatusCard` — high blast radius, long sprint, and the product is already production-hardened.
- A pure CSS refinement with no component work leaves the missing states (`:focus-visible`, `:active`, loading, icon-only, size) unaddressed — the aesthetic improves but the accessibility and state-coverage gaps persist.
- A ground-up motion system (Framer Motion, spring physics) is more machinery than the problem needs. Two CSS transitions and one easing curve get us there.

The scoped middle path — fix the CSS primitives, expand the existing shared components, add the one missing component primitive (`Card`), migrate three reference panels — is decisive enough to ship a real aesthetic improvement without breaking ongoing work.

## Non-Goals

- No palette changes. The color sprint just did its work; tokens stay exactly as they are.
- No dark mode overrides. Everything flows through `light-dark()` tokens; nothing is light-specific.
- No migration of all 20+ button call sites. CSS changes to `.btn--*` propagate automatically; explicit migration to the React component is limited to three reference panels for proof. Remaining sites can migrate opportunistically in future sprints.
- No new animation framework. CSS transitions only. No Framer Motion, no spring physics, no GSAP.
- No breaking changes to `ActionButton` or `StatusCard` existing props. All current callers keep working. New props are additive, with sensible defaults.
- No new barrel-export patterns. The existing `components/shared/index.ts` barrel stays; new components are added to it.
- No changes to `--radius-*`, `--space-*`, `--text-*`, `--font-*`, or any other non-motion, non-shadow token family.
- No server components, `'use client'` directives, or Next.js patterns. This is a Vite SPA.
- No changes to panel layout, card content, or information architecture. Pure visual/interaction primitives.
- No icon library swap. Whatever the panels currently import stays.
- No new test framework. Existing unit test setup is used for new component tests.

## Current State Audit (reference)

**Button call sites (raw `.btn--*`):** 23 files — `App.tsx`, `ErrorBoundary.tsx`, `ForecastForm.tsx`, `SimplifiedViewer.tsx`, `PatternReport.tsx`, `TodayPanel.tsx`, `EmptyStateCard.tsx`, `DebtCategoryView.tsx`, `ThemeToggle.tsx`, `MessageDraft.tsx`, `OnboardingOverlay.tsx` (×3), `PrintButton.tsx`, `ArtifactUpload.tsx`, `DifferentiateEmptyState.tsx`, `EABriefing.tsx`, `TeacherReflection.tsx`, `StudentDetailView.tsx` (×2), `OutputFeedback.tsx`, `InterventionLogger.tsx`, `VocabCardGrid.tsx`.

**Surface panel call sites:** 13 files — `print.css`, `DifferentiatePanel.tsx`, `SurvivalPacketPanel.tsx`, `TodayPanel.tsx`, `PatternReport.tsx`, `ForecastForm.tsx`, `MessageComposer.tsx`, `DifferentiateEmptyState.tsx`, `TeacherReflection.tsx`, `styles/primitives.css`, `ArtifactUpload.tsx`, `InterventionLogger.tsx`, `EABriefing.tsx`.

**Shared component usage:** `ActionButton` is imported from `components/shared/` in some places but less than half the button sites use it. Raw `.btn--*` dominates.

## Token additions

Additive only. No existing token values touched.

### Motion tokens

```css
/* apps/web/src/styles/tokens.css — append to :root */
--motion-letterpress: 180ms;   /* between fast and base; the "ink-set" speed for button state transitions */
--ease-letterpress: cubic-bezier(0.16, 1, 0.3, 1); /* calm settle, no overshoot */
```

### Shadow tokens

```css
/* apps/web/src/styles/tokens.css — append to :root */
--shadow-xs: 0 1px 0 var(--_shadow-sm-a);  /* hairline press shadow */
```

### Focus ring token (DRY)

The form field focus treatment is hand-coded in `.field input:focus` (primitives.css:159–166). Extract it so buttons and cards can reuse it.

```css
/* apps/web/src/styles/tokens.css — append to :root */
--focus-ring-outline: 3px solid color-mix(in srgb, var(--color-accent) 68%, white);
--focus-ring-offset: 2px;
--focus-ring-halo: 0 0 0 4px color-mix(in srgb, var(--color-accent) 12%, transparent);
```

The existing `.field` rules get updated to consume these tokens in the same sprint — both for consistency and to validate the tokens work.

### `--ds-*` alias additions (optional)

The shared-component alias layer gets the corresponding aliases so `ActionButton`, `StatusCard`, and the new `Card` can consume them:

```css
/* apps/web/src/tokens.css — append to :root */
--ds-motion-letterpress:    var(--motion-letterpress);
--ds-ease-letterpress:      var(--ease-letterpress);
--ds-shadow-xs:             var(--shadow-xs);
--ds-focus-ring-outline:    var(--focus-ring-outline);
--ds-focus-ring-offset:     var(--focus-ring-offset);
--ds-focus-ring-halo:       var(--focus-ring-halo);
```

No token renames, no token deletions, no value changes to existing tokens.

## CSS primitives refactor — `apps/web/src/styles/primitives.css`

### `.btn` base (lines 1–24)

Replace the all-property transition with a scoped transition on the properties that actually change. Replace `--motion-fast` with `--motion-letterpress`. Replace `--ease-standard` with `--ease-letterpress`. Add reduced-motion fallback at the end of the rule.

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0.7rem 1.15rem;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  cursor: pointer;
  transition:
    background-color var(--motion-letterpress) var(--ease-letterpress),
    color var(--motion-letterpress) var(--ease-letterpress),
    border-color var(--motion-letterpress) var(--ease-letterpress),
    box-shadow var(--motion-letterpress) var(--ease-letterpress),
    transform var(--motion-letterpress) var(--ease-letterpress);
}

.btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn:focus-visible {
  outline: var(--focus-ring-outline);
  outline-offset: var(--focus-ring-offset);
}
```

**Focus ring rationale.** Buttons carry their own `box-shadow` for elevation, so the focus treatment is `outline` + `outline-offset` only — no halo. This avoids a multi-shadow conflict where the halo would erase the elevation shadow on focus. Form fields continue to use the full `outline` + `box-shadow: var(--focus-ring-halo)` pair because they have no competing elevation shadow.

### `.btn--primary` (lines 26–36)

Replace hardcoded rgba with derived shadow tokens. Kill scale transform. Add active state.

```css
.btn--primary {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-sm);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn--primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-xs);
}
```

### `.btn--approve` (lines 38–47)

Same treatment.

```css
.btn--approve {
  background: var(--color-approve);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-sm);
}

.btn--approve:hover:not(:disabled) {
  background: var(--color-approve-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn--approve:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-xs);
}
```

### `.btn--ghost` (lines 49–61)

Kill scale. Keep the rest — ghost button aesthetics are already appropriate.

```css
.btn--ghost {
  background: color-mix(in srgb, var(--color-surface-elevated) 55%, transparent);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.btn--ghost:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg-muted);
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn--ghost:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
```

### `.btn--tertiary` (lines 63–73) — no change

Tertiary is already quiet. Keep as-is.

### `.btn--soft` (lines 75–87)

Kill scale.

```css
.btn--soft {
  background: var(--color-bg-accent);
  color: var(--color-text-accent);
  border-color: var(--color-border-accent);
}

.btn--soft:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-bg-accent) 78%, white);
  border-color: var(--color-accent);
  color: var(--color-text);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn--soft:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
```

### New variant: `.btn--danger`

Destructive actions (remove intervention, delete schedule entry) currently fall back to raw `<button>` or `.btn--tertiary` with a red color. Add a canonical variant.

```css
.btn--danger {
  background: var(--color-danger);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-sm);
}

.btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-danger) 88%, black);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn--danger:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-xs);
}
```

### New variant: `.btn--link`

Inline text-link buttons (Show more, See history, Open reference) — underlined, no bg, no border, accent color.

```css
.btn--link {
  background: transparent;
  color: var(--color-text-accent);
  border-color: transparent;
  padding: 0.35rem 0.2rem;
  min-height: auto;
  border-radius: var(--radius-sm);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  box-shadow: none;
}

.btn--link:hover:not(:disabled) {
  color: var(--color-accent);
  text-decoration-thickness: 2px;
}

.btn--link:active:not(:disabled) {
  color: var(--color-accent-hover);
}
```

### New sizing modifiers

```css
.btn--sm {
  min-height: 36px;
  padding: 0.5rem 0.9rem;
  font-size: var(--text-xs);
}

.btn--lg {
  min-height: 52px;
  padding: 0.9rem 1.5rem;
  font-size: var(--text-base);
}

.btn--icon-only {
  min-height: 44px;
  min-width: 44px;
  padding: 0;
  border-radius: var(--radius-pill);
}

.btn--icon-only.btn--sm {
  min-width: 36px;
}

.btn--icon-only.btn--lg {
  min-width: 52px;
}
```

`.btn--icon-only` children must include an icon and have `aria-label` set on the `<button>`. The React `Button` component enforces this at the type level; raw usages are a developer responsibility (lint rule out of scope for this sprint).

### New: loading state

```css
.btn--loading {
  position: relative;
  cursor: wait;
}

.btn--loading > :not(.btn__spinner) {
  visibility: hidden;
}

.btn__spinner {
  position: absolute;
  width: 1.1em;
  height: 1.1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: btn-spin 0.7s linear infinite;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
```

### New: reduced-motion global fallback

```css
@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn--primary,
  .btn--approve,
  .btn--ghost,
  .btn--soft,
  .btn--danger {
    transition: background-color var(--motion-fast) linear, color var(--motion-fast) linear;
  }

  .btn:hover,
  .btn:active {
    transform: none !important;
  }

  .btn__spinner {
    animation-duration: 1.4s; /* visible but slower */
  }
}
```

### `.surface-panel` (lines 89–97)

Kill `backdrop-filter: blur(8px)`. Add an inset top-edge highlight to give the letterpress "ink pressed into paper" lift. Keep the two-layer gradient — it already does the "paper with texture" work.

```css
.surface-panel {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface-elevated) 42%, transparent) 0%, color-mix(in srgb, var(--color-surface-elevated) 8%, transparent) 100%),
    linear-gradient(180deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-surface-elevated) 85%, white),
    var(--shadow-md);
}
```

### `.form-panel` (lines 103–110)

Same treatment — kill blur, add inset highlight.

```css
.form-panel {
  background: linear-gradient(180deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--panel-padding);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-surface-elevated) 85%, white),
    var(--shadow-md);
}
```

### `.field input:focus` (lines 159–166)

Refactor to consume the new focus ring tokens. Behavior-identical, but now DRY with buttons.

```css
.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: var(--focus-ring-outline);
  outline-offset: var(--focus-ring-offset);
  border-color: var(--color-accent);
  box-shadow: var(--focus-ring-halo);
}
```

### `.language-tool-toggle__btn--active` (line 741)

Replace hardcoded rgba shadow with `--shadow-sm`.

```css
.language-tool-toggle__btn--active {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-sm);
}
```

## Shared component changes

### `components/shared/ActionButton.tsx` — expand API

**Current props:** `variant: "primary" | "secondary" | "danger"`, `loading`, `disabled`, `onClick`, `children`.

**New props (additive, all optional with defaults):**

```ts
type ActionButtonVariant =
  | "primary"
  | "secondary"   // existing — maps to .btn--ghost internally
  | "danger"
  | "approve"
  | "soft"
  | "tertiary"
  | "link";

type ActionButtonSize = "sm" | "md" | "lg";

interface ActionButtonProps {
  variant?: ActionButtonVariant;        // default "primary"
  size?: ActionButtonSize;               // default "md"
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset"; // default "button"
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;                    // for escape-hatch composition
  // Accessibility
  "aria-label"?: string;
  "aria-describedby"?: string;
}

// Icon-only is a separate component to enforce aria-label at the type level
interface IconButtonProps extends Omit<ActionButtonProps, "children" | "leadingIcon" | "trailingIcon" | "fullWidth"> {
  icon: ReactNode;
  "aria-label": string;  // required
}
```

**Implementation notes:**

- Internally emits the `.btn` + `.btn--<variant>` + optional `.btn--<size>` + `.btn--loading` + `.btn--icon-only` classes from `primitives.css`. No longer defines its own CSS.
- **Decision: delete `ActionButton.css` entirely.** The spinner animation (`btn-spin` keyframe) and spinner span (`.btn__spinner`) move into `primitives.css` as canonical class primitives. The hardcoded `#9a4225` / `#b87055` danger-hover hex in the old `ActionButton.css` is eliminated. Import of `./ActionButton.css` removed from `ActionButton.tsx`.
- `secondary` variant currently maps to a hand-rolled border+surface style in `ActionButton.css`; the new implementation maps it to `.btn--ghost` (the closest existing analog). Visual diff is minor: border is `--color-border` instead of `--ds-border` (same token aliased), hover adds a shadow lift. The old `secondary` had no hover shadow. Intentional — brings secondary in line with the rest of the button family.
- **Loading visual change (behavioral).** The current `ActionButton` shows `{spinner}{faded label}` side-by-side when loading (opacity 0.7 on label). The new implementation uses `.btn--loading` which hides children via `visibility: hidden` and overlays an absolutely-positioned `.btn__spinner`. Width is preserved (no jump). This is a contemporary-UI convention (Linear, GitHub, Vercel) and is cleaner for screen readers since `aria-busy="true"` already announces the state. Existing unit tests that assert on `.action-button__label--loading` need updating (logged in the test update task).
- `IconButton` is a new named export from `components/shared/IconButton.tsx`. It enforces `aria-label` via TypeScript (required prop). It composes `ActionButton` internally with `variant`, `size`, the icon as children, and `.btn--icon-only` applied via a dedicated internal flag.
- `ActionButton` continues to live at the same import path. No existing caller breaks at the API level.

### `components/shared/Card.tsx` — NEW

A general-purpose structural card primitive. Composition-first, with variants and tones.

```ts
import { type ReactNode, type MouseEvent } from "react";
import "./Card.css";

type CardVariant = "flat" | "raised" | "floating" | "inset";
type CardTone =
  | "neutral"
  | "sun"
  | "sage"
  | "slate"
  | "forest"
  | "priority"
  | "watchpoint"
  | "analysis"
  | "provenance";

interface CardProps {
  variant?: CardVariant;      // default "raised"
  tone?: CardTone;             // default "neutral"
  accent?: boolean;            // left accent stripe in tone color — default false
  interactive?: boolean;       // adds hover state and focus ring — default false
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  as?: "div" | "article" | "section"; // default "div", "button" when interactive+onClick
  className?: string;
  children: ReactNode;
}

function Card({ variant = "raised", tone = "neutral", accent = false, interactive = false, onClick, as, className, children }: CardProps) { ... }

// Module-level sub-components (per rerender-no-inline-components rule)
function CardHeader({ children, className }: { children: ReactNode; className?: string }) { ... }
function CardBody({ children, className }: { children: ReactNode; className?: string }) { ... }
function CardFooter({ children, className }: { children: ReactNode; className?: string }) { ... }

// Attach as static members for JSX composition: <Card.Header>, <Card.Body>, <Card.Footer>
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
```

**Variant semantics:**

- `flat` — subtle 1px border, no shadow. For nested cards or information groupings inside a raised card. Paper-on-paper.
- `raised` — default. The current `.surface-panel` feel (without the blur).
- `floating` — heavier `--shadow-lg`. For modals, drawers, hover previews.
- `inset` — no shadow, slightly darker background (`--color-surface-muted`), inset border. For "pushed in" content like quote blocks, code samples, or callout asides.

**Tone semantics:**

- `neutral` (default) — no tinting.
- `sun` / `sage` / `slate` / `forest` — family tints using existing `--color-bg-<family>` / `--color-border-<family>` / `--color-text-<family>` tokens. Used by panel-intro eyebrow styles already — this extends the family discipline to cards.
- `priority` / `watchpoint` — alert-semantic tones using `--color-section-priority` / `--color-section-watchpoint`. Priority is for "this needs attention" (soft), watchpoint is for "this is tracked" (amber).
- `analysis` / `provenance` — cognitive-role tones for analytical content vs. source-of-truth cards.

**`accent` prop:** Adds a 3px left border stripe in the tone color (or `--color-accent` if `tone="neutral"`). The letterpress equivalent of a printed margin rule. Used sparingly — priority cards in Today, support-pattern cards in the patterns panel.

**`interactive` prop:** When true, the card gets:
- `cursor: pointer`
- `:hover` shadow lift (`--shadow-md` → `--shadow-lg`)
- `:focus-visible` ring (same tokens as buttons)
- `:active` shadow drop
- Automatic `as="button"` when `onClick` is also provided (for keyboard + screen reader)
- `role="button"` when `as` is forced to `div`/`article` but `onClick` is set (escape hatch — warn in dev)

**Accessibility:** `interactive` cards that are clickable MUST be focusable and keyboard-operable. The component enforces this by rendering `<button>` when `interactive && onClick`. Developers can override with `as`, but then they own keyboard handling.

**CSS:** `apps/web/src/components/shared/Card.css` with rules that compose the `.surface-panel` / `.form-panel` primitives where possible, and define the new `flat` / `inset` / `accent` / `tone` / `interactive` variants at the `.card--*` namespace. Tones consume `--color-bg-<family>` / `--color-border-<family>` / `--color-text-<family>` — no new tokens.

**Reduced motion:** Interactive hover/active transforms wrapped in the same `@media (prefers-reduced-motion: reduce)` fallback as buttons.

### `components/shared/StatusCard.tsx` — minimal update

Keep the existing API. Internally compose `Card` instead of defining its own `.status-card` wrapper. Pass `variant="raised"` and optionally `tone="priority"` when `status === "error"` (replaces the current `border-color: var(--ds-danger)` hardcode).

The skeleton animation (`status-card-pulse`) stays in `StatusCard.css`. The wrapping surface styles move to `Card.css`. `StatusCard.css` shrinks by ~40 lines.

This is a pure internal refactor — `StatusCard`'s public API does not change.

### `components/shared/index.ts` — barrel update

Add the new exports.

```ts
// existing
export { default as EmptyState } from "./EmptyState";
export { default as ActionButton } from "./ActionButton";
export { default as StatusCard } from "./StatusCard";
export { default as FormSection } from "./FormSection";
export { Sparkline, TrendIndicator, HealthDot, ProgressBar } from "./DataViz";
export { default as ResultDisplay } from "./ResultDisplay";
export { default as SessionBanner } from "./SessionBanner";
export { default as FeedbackCollector } from "./FeedbackCollector";

// new
export { default as Card } from "./Card";
export { default as IconButton } from "./IconButton";
```

Per `bundle-barrel-imports`: for application code, prefer direct imports (`import Card from "components/shared/Card"`) to avoid the barrel pulling in the whole library. The barrel stays for ergonomic top-level imports where bundle impact is negligible. No change to the existing import convention; application imports are opportunistically fixable in future sprints.

## Migration — reference panels

Migrate three high-traffic panels to use `ActionButton` / `Card` / `IconButton` directly instead of raw `.btn--*` and `.surface-panel` classes. This proves the component API and gives future migrations a pattern to copy.

1. **TodayPanel** (`apps/web/src/panels/TodayPanel.tsx`) — highest visibility. Stat cards, priority cards, schedule cards. Map priority cards to `<Card variant="raised" tone="priority" accent>`. Map "pending actions" buttons to `ActionButton` with loading state when the action is async.

2. **DifferentiatePanel** (`apps/web/src/panels/DifferentiatePanel.tsx`) — most button clicks (generate, copy, print, regenerate). Every button becomes `ActionButton`. The generate button shows `loading` while the inference round-trip is in flight (replaces the current ad-hoc spinner logic).

3. **InterventionLogger** (`apps/web/src/components/InterventionLogger.tsx`) — most sensitive form. Form wraps in `<Card variant="raised">`. Save button is `ActionButton variant="primary"` with loading. Delete button is `ActionButton variant="danger"` with a confirm step (confirm dialog itself out of scope).

Each migration is an independent commit inside the sprint. Visual equivalence is verified by the manual tab-walk in validation.

## Accessibility

- **Focus visibility:** Every interactive element — button, interactive card, form field — consumes `--focus-ring-outline` + `--focus-ring-halo`. Verified by keyboard tab-walk across all three migrated panels.
- **Contrast:** Every new token pair runs through `npm run check:contrast`. The `--color-danger` on `--color-text-on-accent` pairing (new `.btn--danger`) must hit 4.5:1 for small text and ≥3.0:1 for UI. The link variant (`--color-text-accent` on `--color-bg`) must hit 4.5:1 (already does — 4.95:1 per sibling spec).
- **Reduced motion:** `prefers-reduced-motion: reduce` removes all `translateY` transforms and simplifies transitions to 140ms linear color fades. Verified via DevTools emulation.
- **Reduced transparency:** `prefers-reduced-transparency: reduce` is already wired in `tokens.css` for `--color-surface-glass`. Since we killed `backdrop-filter` on `.surface-panel`, there's nothing to override there. `--color-surface-glass` remains for opt-in glass surfaces.
- **Screen reader affordances:** `aria-busy="true"` on loading buttons (already in `ActionButton`). `IconButton` requires `aria-label` at the type level. `Card` with `interactive` + `onClick` renders as `<button>` for correct keyboard and SR semantics by default.
- **Tap target:** 44×44 minimum. `.btn--sm` is an exception (36×36) and should not be used on mobile-critical flows — documented in `Card.css` / `Button.md` comment.
- **Link variant text:** Underlined (not color-only) to distinguish from body text at sub-4.5:1 contrast scenarios. Underline thickness doubles on hover for affordance.

## Motion

- **Transition duration:** 180ms (`--motion-letterpress`).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — a calm settle with no overshoot. Starts slow, settles quickly. Reads as "ink absorbing into paper."
- **Properties animated:** `background-color`, `color`, `border-color`, `box-shadow`, `transform` — scoped, not `all`.
- **Hover transform:** `translateY(-1px)` max. No scale. No rotation.
- **Active transform:** `translateY(0)` — resolves the lift.
- **Focus transform:** None — focus is a ring, not a lift. The ring appears instantly on focus.
- **Loading spinner:** 0.7s linear rotation (standard), 1.4s under reduced motion (slower but visible).
- **Reduced motion:** 140ms linear color fades only, no transforms.
- **No GPU compositing tricks.** `will-change` not set; the transform/shadow changes are small enough that the browser handles them without manual compositing hints. Avoids `will-change` layer explosion on card-heavy panels.

## Validation

After implementation:

1. **`npm run check:contrast`** — zero AA failures, no required pair below 4.7:1 small text / 3.5:1 large text / UI (sibling spec's tightened floor). New pairs of interest: `.btn--danger` bg/text, `.btn--link` text on bg, focus ring halo contrast.
2. **`npm run typecheck`** — all new TS props compile. `ActionButton` expanded variants, `IconButton` required `aria-label`, `Card` composition types.
3. **`npm run lint`** — no regressions. Any ESLint rule about `no-unused-css-classes` may flag old `ActionButton.css` rules; delete or retain consciously.
4. **`npm run test`** — unit tests added for:
   - `ActionButton`: each variant renders with correct class, loading hides children, disabled blocks onClick, `iconOnly` enforces aria-label (TS-level + runtime dev warning).
   - `Card`: each variant/tone renders correct classes, `interactive + onClick` renders as `<button>`, `Card.Header` / `Body` / `Footer` compose correctly.
   - Existing `StatusCard` tests still pass after internal refactor.
5. **`npm run check:contrast` a second time** — after any adjustments.
6. **Manual tab-walk across all 12 panels** — `npm run dev`, toggle light + dark, tab through every panel's primary interactive elements. Verify focus ring visible on every button and interactive card. Verify no visual regressions on unmigrated panels (`.surface-panel` / `.btn--*` class changes propagate automatically; regressions in those are expected to be aesthetic-improvement-only, not layout breakage).
7. **Reduced-motion test** — DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Verify buttons don't translate on hover. Spinner rotates slowly. Card interactive hover has no lift.
8. **`npm run release:gate`** — end-to-end check. Cards/buttons are UI-only, but the release gate catches any CSS-module import errors or Tailwind-like breakage.
9. **Grep pass for obsolete rgba button shadows.** `grep -rn "rgba(184, 131, 49" apps/web/src` — expect zero hits after the sprint. Same for `rgba(74, 112, 66` (approve-hover) and `rgba(183, 128, 45" (language-tool-toggle).
10. **Grep pass for `backdrop-filter: blur`.** Remaining hits should only be `empty-state` and `form-panel` where the blur is intentional pattern language.
11. **Visual regression (optional manual).** Screenshot Today, Differentiate, Intervention Logger before/after via Playwright or browser DevTools. No automated VRT this sprint.

## Risk assessment

| Area | Risk | Mitigation |
|---|---|---|
| Visual regression on unmigrated panels | Medium | `.btn--*` and `.surface-panel` class changes propagate automatically; the changes are aesthetic refinements, not structural. Manual tab-walk across all 12 panels catches anything surprising. |
| `.surface-panel` blur removal changes perceived layering | Low | The inset top-edge highlight replaces the depth cue; manual walk verifies. If specific panels need blur back, they can opt in via a new `.surface-panel--glass` modifier (not in scope for this sprint). |
| `ActionButton` internal switch to `.btn--*` classes diverges from old look | Low-medium | The old `.action-button--primary` used `--ds-accent` = `var(--color-accent)`, same as `.btn--primary`. Visual diff is in hover behavior (no scale) and shadow tokens (derived). This is intentional. |
| `IconButton` adoption incomplete (existing icon-only sites keep raw `<button>`) | Low | This sprint adds the component; existing sites migrate in future sprints. The aesthetic uplift still lands via `.btn--icon-only` class for any raw `<button class="btn btn--icon-only">` adopters. |
| TypeScript strictness breaks existing `ActionButton` callers when new optional props are added | Very low | All new props are optional with defaults. Existing callers pass `variant`/`loading`/`disabled`/`onClick`/`children` — all still valid. |
| `Card` composition API (`Card.Header` etc.) pattern not lintable | Low | Static members on function components is a standard React pattern. No tooling warnings expected. |
| Reduced-motion fallback overly aggressive (breaks perceived feedback) | Low | Reduced-motion still has color fades; only transform is suppressed. Verified by emulation test. |
| Focus ring halo + existing form focus conflict | Very low | Form fields are refactored in this sprint to consume the same tokens. Behavior is identical; visual is identical. |
| Bundle-size impact of new `Card.tsx` | Very low | Card + IconButton add ≤3KB minified to the bundle. No heavy dependencies. |
| `.btn--danger` hue close to `.btn--primary` in warm palette | Low-medium | Light: danger `#a8502e` (terra-cotta), accent `#ae671a` (umber-orange), warning `#a86f08` (amber) — three distinct warm hues. Dark: danger `#cf8a69`, accent `#d4a15c` — terra-cotta vs. amber. Form placement (primary CTAs vs. destructive actions) reinforces intent. Manual tab-walk verifies side-by-side legibility in Today and Intervention Logger panels. |
| `ActionButton` loading visual change (spinner+faded-label → spinner-only) | Low | Internal, covered by test update. Users see a cleaner loading state; no API change. |
| Migration of three reference panels drags in unrelated changes | Medium | Each migration is its own commit. Review gate: diff should contain only `<button>` → `<ActionButton>` and `.surface-panel` → `<Card>` replacements, no content changes. |

## Rollout

Single sprint, three commits (plus the three migration commits = six commits total):

1. **Commit 1: Token additions.** `tokens.css` + alias layer. Pure additive. No behavior change. Passes `check:contrast`.
2. **Commit 2: `primitives.css` refactor.** Button and surface-panel class updates + new `.btn--danger`, `.btn--link`, size modifiers, `.btn--icon-only`, `.btn--loading`, reduced-motion media query. Passes `typecheck`, `lint`, `test`, manual tab-walk.
3. **Commit 3: Shared component updates.** Expanded `ActionButton`, new `Card`, new `IconButton`, internal `StatusCard` refactor, barrel update. Passes unit tests, `typecheck`, `lint`.
4. **Commit 4: TodayPanel migration.** Reference commit showing the pattern.
5. **Commit 5: DifferentiatePanel migration.**
6. **Commit 6: InterventionLogger migration.**

No feature flag. CSS changes are backward-compatible. Component changes are additive. Reversal is `git revert` in reverse order (migration commits first, then component commits, then primitives, then tokens).

No database, no API, no server changes. `apps/web` is the only touched surface.

## Documentation updates

Per CLAUDE.md §Documentation Rules:

- **`docs/decision-log.md`** — new entry: *2026-04-12 — Letterpress Tactility for cards and buttons*. Record the direction, the non-goal of full component library, the decision to migrate three reference panels, and the justification for killing `backdrop-filter` on `.surface-panel`.
- **`docs/dark-mode-contract.md`** — add a short note (new subsection or appended paragraph in the relevant section) stating that button and card `box-shadow` values must flow through `--shadow-*` primitives, never hardcoded rgba with a specific color channel. This codifies the anti-pattern this sprint fixes. If the sibling spec's proposed §6 "Derivation rules for new tokens" has landed by the time this sprint runs, the note goes into that section; otherwise it's appended to the closest existing section. Dependency on the sibling spec is **soft** — this spec does not block on it.
- **`docs/system-inventory.md` / `docs/api-surface.md`** — not applicable (no API or route changes). `npm run system:inventory` run is unnecessary for this sprint.

## Out-of-scope follow-ups

- **Migration of remaining 17 button call sites and 10 surface-panel call sites** to the shared components — future sprint. CSS aesthetic uplift lands in this sprint regardless.
- **Per-panel card composition conventions.** Some panels might want a standard `<Card tone="priority">` for their priority rail, etc. Pattern library documentation is future work.
- **Lint rule for raw `<button>` without `className`.** A custom ESLint rule to steer developers to `ActionButton` — future sprint.
- **Visual regression testing infrastructure.** Playwright screenshot diffing for cards/buttons. Future sprint.
- **Ripple effect or sound feedback on press.** Letterpress metaphor doesn't need it. Explicitly not pursued.
- **Dark mode shadow alpha tuning for the new inset top-edge highlight.** The `color-mix(..., white)` inset highlight is calibrated for light mode; dark mode gets a subtly different treatment. Check at manual walk and adjust if needed — this is a tuning task, not a scope-level question.
- **`.btn--primary:hover` filter-brightness alternative.** Considered and rejected — a filter on top of a `color-mix` bg doesn't play well with the token system and adds compositing cost.
- **Extending Card/tone system to chips, badges, banners.** Out of scope; they already have their own class primitives (`.status-chip`, etc.).

## Files touched

### New files

- `apps/web/src/components/shared/Card.tsx` — new component
- `apps/web/src/components/shared/Card.css` — new styles
- `apps/web/src/components/shared/IconButton.tsx` — new component (thin composition over `ActionButton`)
- `apps/web/src/components/shared/__tests__/Card.test.tsx` — new unit tests
- `apps/web/src/components/shared/__tests__/IconButton.test.tsx` — new unit tests

### Modified files

- `apps/web/src/styles/tokens.css` — add motion, shadow, focus-ring tokens
- `apps/web/src/tokens.css` — add corresponding `--ds-*` aliases
- `apps/web/src/styles/primitives.css` — refactor `.btn`/`.btn--*`/`.surface-panel`/`.form-panel`/`.field`/`.language-tool-toggle__btn--active`, add new `.btn--danger`/`.btn--link`/size modifiers/icon-only/loading/reduced-motion
- `apps/web/src/components/shared/ActionButton.tsx` — expand props, new variants and sizes, switch internal rendering to `.btn--*` classes, remove the `./ActionButton.css` import
- `apps/web/src/components/shared/StatusCard.tsx` — internal composition to use `Card` for the surface wrapper
- `apps/web/src/components/shared/StatusCard.css` — shrink (delete `.status-card` wrapper rules; keep `.status-card__*` internals)
- `apps/web/src/components/shared/index.ts` — add `Card`, `IconButton` exports
- `apps/web/src/components/shared/__tests__/ActionButton.test.tsx` — update existing assertions for new variants, sizes, and loading behavior (spinner-only vs. spinner+faded-label)
- `apps/web/src/components/shared/__tests__/StatusCard.test.tsx` — update if existing assertions query `.status-card` wrapper classes (internals-only tests keep passing)
- `apps/web/src/panels/TodayPanel.tsx` — migrate raw button/panel classes to components
- `apps/web/src/panels/DifferentiatePanel.tsx` — migrate
- `apps/web/src/components/InterventionLogger.tsx` — migrate
- `docs/decision-log.md` — add entry

### Deleted files

- `apps/web/src/components/shared/ActionButton.css` — all rules retired to `primitives.css` (`.btn`, `.btn--*`, `.btn__spinner`, `@keyframes btn-spin`)

### Not touched

- All other panels (10 of 12) — benefit passively from `primitives.css` class updates, no explicit migration
- All tokens in `tokens.css` are appended to; none are modified or removed
- No components outside `apps/web/src/components/shared/` and the three reference panels
- No tests outside `components/shared/__tests__/`
- No documentation outside `docs/decision-log.md` and the small note in `docs/dark-mode-contract.md`
- No orchestrator, inference, eval, or release-gate scripts
- No `package.json`, no `tsconfig`, no `vite.config`, no `tailwind.config`

## Success criteria

A teacher or developer looking at the UI after the sprint should feel:

1. **Buttons feel tactile but not bouncy.** Hover is a small settle, press resolves it, release returns it. No zoom, no glow.
2. **Focus is always visible.** Keyboard users can navigate the entire UI without losing their place.
3. **Cards look printed, not floating.** The blur is gone; the paper-on-paper layering is the depth cue.
4. **Danger is distinct from primary.** Destructive actions don't look like "another call to action."
5. **Loading is always obvious.** Every async button has a visible loading state; teachers know when to wait.
6. **Reduced-motion users get the same semantics.** No lift is fine; teachers with vestibular sensitivity don't get surprise animations.
7. **Developers reach for the shared component first.** Three reference panels show the pattern; future work follows.
