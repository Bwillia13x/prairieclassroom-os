# Cards & Buttons — Letterpress Tactility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the aesthetic and tactility of cards and buttons across the PrairieClassroom OS web UI to match the editorial letterpress metaphor — kill bouncy button transforms and hardcoded glow shadows, add the missing interaction states (`:focus-visible`, `:active`, loading, icon-only, reduced-motion), introduce a general-purpose `Card` component and `IconButton`, and migrate three reference panels.

**Architecture:** Two-layer refactor. **Layer A (CSS primitives):** `apps/web/src/styles/primitives.css` gets new tokens consumed, scale transforms removed, new variants/modifiers/states added, backdrop blur removed, reduced-motion media query added. Changes propagate automatically to all 20+ unmigrated panels. **Layer B (React shared components):** `ActionButton` expands to full variant/size/loading surface and internally emits the `.btn--*` primitive classes (deleting `ActionButton.css`); new `Card` and `IconButton` components join the `components/shared/` library; `StatusCard` internally composes `Card`; three reference panels (Today, Differentiate, InterventionLogger) migrate to use the components.

**Tech Stack:** Vite + React 18 + TypeScript (Vanilla CSS with CSS custom properties, `light-dark()` function, `color-mix()`), Vitest + @testing-library/react for component tests, `scripts/check-contrast.mjs` for contrast gating.

**Spec reference:** `docs/superpowers/specs/2026-04-12-cards-buttons-letterpress-tactility-design.md`

**Sibling spec:** `docs/superpowers/specs/2026-04-12-light-palette-editorial-letterpress-design.md` (color layer — this plan extends its metaphor into interaction primitives; no dependency on that spec landing first)

---

## File Structure

### New files
- `apps/web/src/components/shared/Card.tsx` — general-purpose structural card with variants, tones, and composition API (`Card.Header`, `Card.Body`, `Card.Footer`)
- `apps/web/src/components/shared/Card.css` — variant and tone rules; reduced-motion fallback
- `apps/web/src/components/shared/IconButton.tsx` — typed icon-only button enforcing `aria-label`
- `apps/web/src/components/shared/__tests__/Card.test.tsx` — unit tests
- `apps/web/src/components/shared/__tests__/IconButton.test.tsx` — unit tests

### Modified files
- `apps/web/src/styles/tokens.css` — append motion, shadow-xs, focus-ring tokens
- `apps/web/src/tokens.css` — append `--ds-*` aliases
- `apps/web/src/styles/primitives.css` — `.btn` base, `.btn--primary/approve/ghost/soft`, `.surface-panel`, `.form-panel`, `.field :focus`, `.language-tool-toggle__btn--active`; new `.btn--danger`, `.btn--link`, `.btn--sm`, `.btn--lg`, `.btn--icon-only`, `.btn--loading`, `.btn__spinner`, `@keyframes btn-spin`, `@media (prefers-reduced-motion: reduce)`
- `apps/web/src/components/shared/ActionButton.tsx` — expand props, switch internal rendering to `.btn--*` classes, remove `./ActionButton.css` import
- `apps/web/src/components/shared/StatusCard.tsx` — compose `Card` for wrapper
- `apps/web/src/components/shared/StatusCard.css` — remove wrapper rules, keep `__skeleton`, `__error`, `__header`, `__body` internals
- `apps/web/src/components/shared/index.ts` — export `Card`, `IconButton`
- `apps/web/src/components/shared/__tests__/ActionButton.test.tsx` — update class assertions and loading behavior
- `apps/web/src/panels/TodayPanel.tsx` — migrate raw classes to components
- `apps/web/src/panels/DifferentiatePanel.tsx` — migrate
- `apps/web/src/components/InterventionLogger.tsx` — migrate
- `docs/decision-log.md` — append 2026-04-12 entry
- `docs/dark-mode-contract.md` — append shadow-derivation note

### Deleted files
- `apps/web/src/components/shared/ActionButton.css` — all rules retired to `primitives.css`

---

## Task 1: Add design tokens

**Files:**
- Modify: `apps/web/src/styles/tokens.css` (append inside `:root`)
- Modify: `apps/web/src/tokens.css` (append inside `:root`)

- [ ] **Step 1: Add motion, shadow-xs, and focus-ring tokens to `styles/tokens.css`**

Open `apps/web/src/styles/tokens.css`. Find the `/* Motion */` section (around line 162). After the existing `--ease-emphasis` declaration, BEFORE the closing `}` of `:root`, add:

```css
  /* Motion — letterpress */
  --motion-letterpress: 180ms;
  --ease-letterpress: cubic-bezier(0.16, 1, 0.3, 1);

  /* Shadow — press state */
  --shadow-xs: 0 1px 0 var(--_shadow-sm-a);

  /* Focus ring — shared between buttons, cards, and form fields */
  --focus-ring-outline: 3px solid color-mix(in srgb, var(--color-accent) 68%, white);
  --focus-ring-offset: 2px;
  --focus-ring-halo: 0 0 0 4px color-mix(in srgb, var(--color-accent) 12%, transparent);
```

- [ ] **Step 2: Add `--ds-*` aliases to `apps/web/src/tokens.css`**

Open `apps/web/src/tokens.css`. At the end of the `:root` block (after the `--ds-transition-normal` line), BEFORE the closing `}`, add:

```css
  /* ---- Motion — letterpress ---- */
  --ds-motion-letterpress:   var(--motion-letterpress);
  --ds-ease-letterpress:     var(--ease-letterpress);

  /* ---- Shadow — press state ---- */
  --ds-shadow-xs:            var(--shadow-xs);

  /* ---- Focus ring ---- */
  --ds-focus-ring-outline:   var(--focus-ring-outline);
  --ds-focus-ring-offset:    var(--focus-ring-offset);
  --ds-focus-ring-halo:      var(--focus-ring-halo);
```

- [ ] **Step 3: Verify contrast gate still passes**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run check:contrast`

Expected: Exit 0, zero failures. The new tokens aren't color values, so the report is unchanged. If the script fails for an unrelated reason, diagnose before proceeding.

- [ ] **Step 4: Verify TypeScript still compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`

Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/styles/tokens.css apps/web/src/tokens.css
git commit -m "$(cat <<'EOF'
feat(tokens): add letterpress motion, press shadow, and focus ring tokens

Additive token set for the cards-and-buttons letterpress tactility sprint.
- --motion-letterpress (180ms) and --ease-letterpress for button state transitions
- --shadow-xs for button :active press state
- --focus-ring-outline/offset/halo as shared tokens for buttons, cards, and form fields

All tokens flow through --ds-* aliases for shared-component consumption.
No existing token values changed.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Refactor button primitives in `primitives.css`

**Files:**
- Modify: `apps/web/src/styles/primitives.css` (lines 1–87 and beyond)

This task replaces the existing `.btn` base and variants with the letterpress-tuned versions, removes hardcoded rgba shadows, kills scale transforms, adds `:focus-visible` and `:active` states. It also adds the new variants (`.btn--danger`, `.btn--link`), size modifiers (`.btn--sm`, `.btn--lg`), icon-only modifier, loading state, and reduced-motion fallback.

- [ ] **Step 1: Replace `.btn` base, button variants, and add new classes**

Open `apps/web/src/styles/primitives.css`. Replace lines 1–87 (the entire button section, from `.btn {` through the end of `.btn--soft:hover:not(:disabled) { ... }`) with the following block:

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

.btn--tertiary {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: transparent;
  box-shadow: none;
}

.btn--tertiary:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg-muted);
}

.btn--tertiary:active:not(:disabled) {
  background: color-mix(in srgb, var(--color-bg-muted) 88%, black);
}

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
  min-height: 36px;
  min-width: 36px;
}

.btn--icon-only.btn--lg {
  min-height: 52px;
  min-width: 52px;
}

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

- [ ] **Step 2: Find and update `.language-tool-toggle__btn--active` (drift fix)**

In the same file, find `.language-tool-toggle__btn--active` (near line 738). The current rule has a hardcoded rgba shadow tied to the old accent hex. Replace the rule with:

```css
.language-tool-toggle__btn--active {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-sm);
}
```

- [ ] **Step 3: Add `prefers-reduced-motion` fallback**

Near the bottom of `primitives.css`, below the `@media (max-width: 600px)` block (around line 703) and before any remaining component-specific rules (or at the end of the file if none remain), add:

```css
@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn--primary,
  .btn--approve,
  .btn--ghost,
  .btn--tertiary,
  .btn--soft,
  .btn--danger,
  .btn--link {
    transition:
      background-color var(--motion-fast) linear,
      color var(--motion-fast) linear,
      border-color var(--motion-fast) linear;
  }

  .btn:hover,
  .btn:active {
    transform: none !important;
  }

  .btn__spinner {
    animation-duration: 1.4s;
  }
}
```

- [ ] **Step 4: Verify the file parses (no CSS syntax errors) via typecheck + lint**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck && npm run lint`

Expected: Exit 0 for both. CSS errors don't fail `typecheck` directly, but `lint` picks up CSS linting rules if configured. If lint fails for reasons unrelated to this change, note but don't fix them here.

- [ ] **Step 5: Run the dev server and visually verify no crash**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run dev`

Open `http://localhost:5173` in a browser. Verify the app loads without CSS errors in the DevTools console. Click a few buttons (primary, approve, ghost) and verify the hover/active states feel tactile and smaller than before. Close the dev server (`Ctrl+C`).

If the dev server does not start for environmental reasons (port conflict, etc.), skip the visual step and rely on `npm run test` in Task 10.

- [ ] **Step 6: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/styles/primitives.css
git commit -m "$(cat <<'EOF'
refactor(primitives): letterpress button states + new variants + reduced-motion

- Kill translateY(-2px) scale(1.02) bouncy hover — replace with translateY(-1px) only
- Replace hardcoded rgba glow shadows with derived --shadow-sm/md/xs tokens (buttons
  now track accent palette shifts automatically)
- Add .btn:focus-visible ring via --focus-ring-outline + --focus-ring-offset
- Add :active press state on primary/approve/ghost/soft/danger collapsing to --shadow-xs
- Add .btn--danger (canonical destructive variant)
- Add .btn--link (inline text-link action)
- Add .btn--sm / .btn--lg size modifiers
- Add .btn--icon-only (square 44x44, opt-in 36x36 and 52x52)
- Add .btn--loading with absolute .btn__spinner (visibility:hidden on children)
- Add prefers-reduced-motion fallback (color fades only, no transforms)
- Fix .language-tool-toggle__btn--active drifted rgba shadow to --shadow-sm

Transition duration moves from --motion-fast (140ms) to --motion-letterpress (180ms)
with --ease-letterpress (cubic-bezier(0.16, 1, 0.3, 1)) for a calm ink-settle feel.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Refactor card primitives and focus ring

**Files:**
- Modify: `apps/web/src/styles/primitives.css` (`.surface-panel`, `.form-panel`, `.field input:focus`)

- [ ] **Step 1: Replace `.surface-panel`**

In `apps/web/src/styles/primitives.css`, find `.surface-panel` (around line 89). Replace the rule with:

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

Note: `backdrop-filter: blur(8px)` is removed. The inset top-edge highlight replaces the depth cue.

- [ ] **Step 2: Replace `.form-panel`**

Find `.form-panel` (around line 103). Replace with:

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

- [ ] **Step 3: Refactor `.field` focus to use shared tokens**

Find `.field input:focus, .field textarea:focus, .field select:focus` (around line 159). Replace with:

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

- [ ] **Step 4: Run typecheck and lint**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck && npm run lint`

Expected: Exit 0 for both.

- [ ] **Step 5: Grep pass to verify no hardcoded button/card shadow rgba remain in primitives.css**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && grep -n "rgba(184" apps/web/src/styles/primitives.css; grep -n "rgba(74" apps/web/src/styles/primitives.css; grep -n "rgba(183" apps/web/src/styles/primitives.css; grep -n "backdrop-filter: blur" apps/web/src/styles/primitives.css`

Expected: The first three greps return empty (hardcoded shadow rgba gone). The `backdrop-filter` grep should only return results for `.empty-state` (line ~423) which intentionally keeps its blur as part of its own pattern. `.surface-panel` and `.form-panel` should NOT appear.

- [ ] **Step 6: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/styles/primitives.css
git commit -m "$(cat <<'EOF'
refactor(primitives): letterpress card surfaces and shared focus ring

- Kill backdrop-filter: blur(8px) on .surface-panel and .form-panel (frosted glass
  is not the letterpress metaphor; cards now sit on paper, not float on blur)
- Add inset 0 1px 0 warm-white top-edge highlight for the "ink pressed into paper"
  lift feel, composed with the existing --shadow-md elevation
- .field input/textarea/select focus now consumes the shared --focus-ring-outline
  and --focus-ring-halo tokens, making the form and button focus language identical

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create `Card` component (TDD)

**Files:**
- Create: `apps/web/src/components/shared/Card.tsx`
- Create: `apps/web/src/components/shared/Card.css`
- Create: `apps/web/src/components/shared/__tests__/Card.test.tsx`

- [ ] **Step 1: Write the failing test file**

Create `apps/web/src/components/shared/__tests__/Card.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "../Card";

describe("Card", () => {
  it("renders children inside a raised (default) card", () => {
    render(<Card>content</Card>);
    const card = screen.getByText("content").closest(".card");
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain("card--raised");
    expect(card?.className).toContain("card--tone-neutral");
  });

  it("applies the correct variant class", () => {
    render(<Card variant="flat">flat</Card>);
    const card = screen.getByText("flat").closest(".card");
    expect(card?.className).toContain("card--flat");
  });

  it("applies the correct tone class", () => {
    render(<Card tone="priority">p</Card>);
    const card = screen.getByText("p").closest(".card");
    expect(card?.className).toContain("card--tone-priority");
  });

  it("adds the accent-stripe modifier when accent=true", () => {
    render(<Card accent>accented</Card>);
    const card = screen.getByText("accented").closest(".card");
    expect(card?.className).toContain("card--accent");
  });

  it("renders as <button> when interactive + onClick provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        click me
      </Card>,
    );
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders as <div> by default and does not expose a button role", () => {
    render(<Card>no-click</Card>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders Card.Header, Card.Body, Card.Footer in composition", () => {
    render(
      <Card>
        <Card.Header>head</Card.Header>
        <Card.Body>body</Card.Body>
        <Card.Footer>foot</Card.Footer>
      </Card>,
    );
    expect(screen.getByText("head").className).toContain("card__header");
    expect(screen.getByText("body").className).toContain("card__body");
    expect(screen.getByText("foot").className).toContain("card__footer");
  });

  it("merges a user-provided className", () => {
    render(<Card className="custom-extra">x</Card>);
    const card = screen.getByText("x").closest(".card");
    expect(card?.className).toContain("custom-extra");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- Card.test.tsx`

Expected: FAIL — `Cannot find module '../Card'` or similar.

If the workspace test command syntax differs, use `cd apps/web && npx vitest run src/components/shared/__tests__/Card.test.tsx`.

- [ ] **Step 3: Create the `Card.tsx` component**

Create `apps/web/src/components/shared/Card.tsx` with:

```tsx
import type { MouseEvent, ReactNode } from "react";
import "./Card.css";

export type CardVariant = "flat" | "raised" | "floating" | "inset";

export type CardTone =
  | "neutral"
  | "sun"
  | "sage"
  | "slate"
  | "forest"
  | "priority"
  | "watchpoint"
  | "analysis"
  | "provenance";

export type CardAs = "div" | "article" | "section" | "button";

interface CardProps {
  variant?: CardVariant;
  tone?: CardTone;
  accent?: boolean;
  interactive?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  as?: CardAs;
  className?: string;
  children: ReactNode;
}

interface CardSlotProps {
  children: ReactNode;
  className?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function CardHeader({ children, className }: CardSlotProps) {
  return <div className={joinClassNames("card__header", className)}>{children}</div>;
}

function CardBody({ children, className }: CardSlotProps) {
  return <div className={joinClassNames("card__body", className)}>{children}</div>;
}

function CardFooter({ children, className }: CardSlotProps) {
  return <div className={joinClassNames("card__footer", className)}>{children}</div>;
}

function Card({
  variant = "raised",
  tone = "neutral",
  accent = false,
  interactive = false,
  onClick,
  as,
  className,
  children,
}: CardProps) {
  const classes = joinClassNames(
    "card",
    `card--${variant}`,
    `card--tone-${tone}`,
    accent && "card--accent",
    interactive && "card--interactive",
    className,
  );

  const Component = (as ?? (interactive && onClick ? "button" : "div")) as CardAs;

  if (Component === "button") {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <Component className={classes} onClick={onClick}>
      {children}
    </Component>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
```

- [ ] **Step 4: Create the `Card.css` styles**

Create `apps/web/src/components/shared/Card.css` with:

```css
.card {
  display: block;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  box-sizing: border-box;
  text-align: left;
  transition:
    background-color var(--motion-letterpress) var(--ease-letterpress),
    border-color var(--motion-letterpress) var(--ease-letterpress),
    box-shadow var(--motion-letterpress) var(--ease-letterpress),
    transform var(--motion-letterpress) var(--ease-letterpress);
}

/* Variants */

.card--flat {
  box-shadow: none;
}

.card--raised {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface-elevated) 42%, transparent) 0%, color-mix(in srgb, var(--color-surface-elevated) 8%, transparent) 100%),
    linear-gradient(180deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-surface-elevated) 85%, white),
    var(--shadow-md);
}

.card--floating {
  background: var(--color-surface-elevated);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-surface-elevated) 85%, white),
    var(--shadow-lg);
}

.card--inset {
  background: var(--color-surface-muted);
  box-shadow: inset 0 1px 2px var(--_shadow-sm-a);
  border-color: var(--color-border);
}

/* Tones (tint the card surface by family) */

.card--tone-neutral {
  /* no tint overrides */
}

.card--tone-sun {
  background: var(--color-bg-sun);
  border-color: var(--color-border-sun);
  color: var(--color-text-sun);
}

.card--tone-sage {
  background: var(--color-bg-sage);
  border-color: var(--color-border-sage);
  color: var(--color-text-sage);
}

.card--tone-slate {
  background: var(--color-bg-slate);
  border-color: var(--color-border-slate);
  color: var(--color-text-slate);
}

.card--tone-forest {
  background: var(--color-bg-forest);
  border-color: var(--color-border-forest);
  color: var(--color-text-forest);
}

.card--tone-priority {
  background: color-mix(in srgb, var(--color-section-priority) 10%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-section-priority) 40%, var(--color-border));
}

.card--tone-watchpoint {
  background: var(--color-bg-warning);
  border-color: var(--color-border-warning);
  color: var(--color-text-warning);
}

.card--tone-analysis {
  background: var(--color-bg-analysis);
  border-color: var(--color-border-analysis);
  color: var(--color-text-analysis);
}

.card--tone-provenance {
  background: var(--color-bg-provenance);
  border-color: var(--color-border-provenance);
  color: var(--color-text-provenance);
}

/* Accent stripe — left margin rule */

.card--accent {
  position: relative;
  padding-left: calc(var(--space-4) + 3px);
}

.card--accent::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--color-accent);
  border-top-left-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-lg);
}

.card--tone-priority.card--accent::before    { background: var(--color-section-priority); }
.card--tone-watchpoint.card--accent::before  { background: var(--color-section-watchpoint); }
.card--tone-sun.card--accent::before         { background: var(--color-border-sun); }
.card--tone-sage.card--accent::before        { background: var(--color-border-sage); }
.card--tone-slate.card--accent::before       { background: var(--color-border-slate); }
.card--tone-forest.card--accent::before      { background: var(--color-border-forest); }

/* Interactive affordance */

.card--interactive {
  cursor: pointer;
  font: inherit;
  text-align: inherit;
}

.card--interactive:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-surface-elevated) 85%, white),
    var(--shadow-lg);
}

.card--interactive:active {
  transform: translateY(0);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-surface-elevated) 85%, white),
    var(--shadow-sm);
}

.card--interactive:focus-visible {
  outline: var(--focus-ring-outline);
  outline-offset: var(--focus-ring-offset);
}

/* Slots */

.card__header {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.card__body {
  padding: var(--space-4);
}

.card__footer {
  padding: 0 var(--space-4) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* Reduced motion */

@media (prefers-reduced-motion: reduce) {
  .card {
    transition:
      background-color var(--motion-fast) linear,
      border-color var(--motion-fast) linear;
  }

  .card--interactive:hover,
  .card--interactive:active {
    transform: none !important;
  }
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- Card.test.tsx`

Expected: PASS — all 8 test cases green.

If any test fails, read the assertion, inspect `Card.tsx`, fix the component (not the test). Rerun.

- [ ] **Step 6: Run the full typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`

Expected: Exit 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/components/shared/Card.tsx apps/web/src/components/shared/Card.css apps/web/src/components/shared/__tests__/Card.test.tsx
git commit -m "$(cat <<'EOF'
feat(shared): Card component with variants, tones, and composition API

Adds the first general-purpose structural card primitive to the shared library.
Variants: flat, raised (default), floating, inset.
Tones: neutral, sun, sage, slate, forest, priority, watchpoint, analysis, provenance.
Accent stripe prop adds a 3px left margin rule in the tone color.
Interactive prop turns the card into a keyboard/SR-focusable <button> when
onClick is provided, with hover/active/focus-visible states following the
letterpress button language.

Composition via static members: Card.Header, Card.Body, Card.Footer.

Reduced-motion media query removes transforms and shortens transitions.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create `IconButton` component (TDD)

**Files:**
- Create: `apps/web/src/components/shared/IconButton.tsx`
- Create: `apps/web/src/components/shared/__tests__/IconButton.test.tsx`

- [ ] **Step 1: Write the failing test file**

Create `apps/web/src/components/shared/__tests__/IconButton.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IconButton from "../IconButton";

describe("IconButton", () => {
  it("renders an accessible button with the given aria-label", () => {
    render(
      <IconButton aria-label="Print" onClick={() => {}}>
        <svg data-testid="print-icon" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Print" });
    expect(btn).toBeInTheDocument();
    expect(screen.getByTestId("print-icon")).toBeInTheDocument();
  });

  it("applies the icon-only and default primary classes", () => {
    render(
      <IconButton aria-label="Open" onClick={() => {}}>
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Open" });
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn--primary");
    expect(btn.className).toContain("btn--icon-only");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Close" onClick={onClick}>
        <svg />
      </IconButton>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("honors size and variant props", () => {
    render(
      <IconButton aria-label="Delete" variant="danger" size="sm" onClick={() => {}}>
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("btn--danger");
    expect(btn.className).toContain("btn--sm");
  });

  it("disables onClick when loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Load" loading onClick={onClick}>
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Load" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- IconButton.test.tsx`

Expected: FAIL — `Cannot find module '../IconButton'`.

- [ ] **Step 3: Create `IconButton.tsx`**

Create `apps/web/src/components/shared/IconButton.tsx` with:

```tsx
import type { MouseEvent, ReactNode } from "react";

export type IconButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "approve"
  | "soft"
  | "tertiary"
  | "ghost";

export type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps {
  "aria-label": string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const DEFAULT_VARIANT: IconButtonVariant = "primary";

export default function IconButton({
  "aria-label": ariaLabel,
  children,
  variant = DEFAULT_VARIANT,
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  className,
}: IconButtonProps) {
  const variantClass = variant === "secondary" ? "btn--ghost" : `btn--${variant}`;
  const classes = joinClassNames(
    "btn",
    variantClass,
    size !== "md" && `btn--${size}`,
    "btn--icon-only",
    loading && "btn--loading",
    className,
  );

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading ? "true" : undefined}
      disabled={isDisabled}
      className={classes}
      onClick={onClick}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- IconButton.test.tsx`

Expected: PASS — all 5 test cases green.

- [ ] **Step 5: Run typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`

Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/components/shared/IconButton.tsx apps/web/src/components/shared/__tests__/IconButton.test.tsx
git commit -m "$(cat <<'EOF'
feat(shared): IconButton component enforcing aria-label at the type level

Thin composition over the .btn primitive classes. Required aria-label prop
means TypeScript refuses compilation if a developer forgets accessibility
labeling on an icon-only button.

Variants: primary, secondary (maps to ghost), danger, approve, soft, tertiary, ghost.
Sizes: sm (36x36), md (44x44 default), lg (52x52).
Loading state reuses the .btn--loading + .btn__spinner primitives.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Expand `ActionButton` and delete `ActionButton.css`

**Files:**
- Modify: `apps/web/src/components/shared/ActionButton.tsx`
- Delete: `apps/web/src/components/shared/ActionButton.css`
- Modify: `apps/web/src/components/shared/__tests__/ActionButton.test.tsx`

- [ ] **Step 1: Update `ActionButton.test.tsx` to match the new class names**

Replace the entire contents of `apps/web/src/components/shared/__tests__/ActionButton.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionButton from "../ActionButton";

describe("ActionButton", () => {
  it("renders children and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ActionButton onClick={onClick}>Save</ActionButton>);

    const btn = screen.getByRole("button", { name: /save/i });
    expect(btn).toBeEnabled();

    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies the correct variant class", () => {
    render(
      <ActionButton variant="danger" onClick={() => {}}>
        Delete
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn--danger");
  });

  it("defaults to primary variant", () => {
    render(<ActionButton onClick={() => {}}>Go</ActionButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--primary");
  });

  it("maps secondary variant to ghost class", () => {
    render(
      <ActionButton variant="secondary" onClick={() => {}}>
        Sec
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--ghost");
  });

  it("supports the new approve, soft, tertiary, and link variants", () => {
    const { rerender } = render(
      <ActionButton variant="approve" onClick={() => {}}>
        A
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--approve");
    rerender(
      <ActionButton variant="soft" onClick={() => {}}>
        S
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--soft");
    rerender(
      <ActionButton variant="tertiary" onClick={() => {}}>
        T
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--tertiary");
    rerender(
      <ActionButton variant="link" onClick={() => {}}>
        L
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--link");
  });

  it("applies size modifiers", () => {
    const { rerender } = render(
      <ActionButton size="sm" onClick={() => {}}>
        S
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--sm");
    rerender(
      <ActionButton size="lg" onClick={() => {}}>
        L
      </ActionButton>,
    );
    expect(screen.getByRole("button").className).toContain("btn--lg");
  });

  it("disables the button when disabled prop is true", () => {
    render(
      <ActionButton disabled onClick={() => {}}>
        Nope
      </ActionButton>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables button and sets aria-busy when loading", () => {
    render(
      <ActionButton loading onClick={() => {}}>
        Loading
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn.className).toContain("btn--loading");
  });

  it("renders a .btn__spinner element when loading", () => {
    const { container } = render(
      <ActionButton loading onClick={() => {}}>
        Wait
      </ActionButton>,
    );
    expect(container.querySelector(".btn__spinner")).toBeInTheDocument();
  });

  it("does not fire onClick when loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ActionButton loading onClick={onClick}>
        Click
      </ActionButton>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("honors the fullWidth prop via an explicit class", () => {
    render(
      <ActionButton fullWidth onClick={() => {}}>
        Wide
      </ActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--full-width");
  });
});
```

- [ ] **Step 2: Run the test file to confirm it fails against the old component**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- ActionButton.test.tsx`

Expected: Several tests fail (class name assertions no longer match `action-button--*`, new variant/size assertions unrecognized props).

- [ ] **Step 3: Rewrite `ActionButton.tsx` with the new API**

Replace the entire contents of `apps/web/src/components/shared/ActionButton.tsx` with:

```tsx
import type { MouseEvent, ReactNode } from "react";

export type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "approve"
  | "soft"
  | "tertiary"
  | "ghost"
  | "link";

export type ActionButtonSize = "sm" | "md" | "lg";

interface ActionButtonProps {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function resolveVariantClass(variant: ActionButtonVariant): string {
  if (variant === "secondary") return "btn--ghost";
  return `btn--${variant}`;
}

export default function ActionButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  onClick,
  children,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;

  const classes = joinClassNames(
    "btn",
    resolveVariantClass(variant),
    size !== "md" && `btn--${size}`,
    loading && "btn--loading",
    fullWidth && "btn--full-width",
    className,
  );

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onClick={onClick}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {leadingIcon && <span className="btn__leading-icon" aria-hidden="true">{leadingIcon}</span>}
      <span className="btn__label">{children}</span>
      {trailingIcon && <span className="btn__trailing-icon" aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
}
```

- [ ] **Step 4: Add `.btn--full-width` to `primitives.css`**

Open `apps/web/src/styles/primitives.css`. Below the `.btn--icon-only.btn--lg` block (around the new sizes area), add:

```css
.btn--full-width {
  width: 100%;
}
```

Also find the existing `@media (max-width: 600px)` block (around line 688) which currently force-sets `width: 100%` on primary/approve/ghost/soft. Leave it as-is — it complements `.btn--full-width` for mobile defaults.

- [ ] **Step 5: Delete `ActionButton.css`**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && git rm apps/web/src/components/shared/ActionButton.css`

Expected: The file is staged for deletion.

- [ ] **Step 6: Run the ActionButton test and verify it passes**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- ActionButton.test.tsx`

Expected: PASS — all assertions green.

- [ ] **Step 7: Run full workspace test**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run test`

Expected: All tests pass. If any unrelated test fails for a pre-existing reason, note it but don't fix it here.

- [ ] **Step 8: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/components/shared/ActionButton.tsx apps/web/src/components/shared/__tests__/ActionButton.test.tsx apps/web/src/styles/primitives.css
git commit -m "$(cat <<'EOF'
refactor(shared): ActionButton consumes .btn primitives; retire ActionButton.css

Expanded API:
- variant: primary | secondary | danger | approve | soft | tertiary | ghost | link
  (secondary maps to .btn--ghost internally for backwards compat)
- size: sm | md (default) | lg
- leadingIcon / trailingIcon slots
- fullWidth prop
- aria-label and aria-describedby passthrough

The component now emits the .btn + .btn--<variant> + size/loading/full-width
classes from primitives.css instead of defining its own .action-button styles.
Removes the hardcoded #9a4225 / #b87055 danger-hover hexes that would have
drifted with future palette refinements.

Loading behavior changes from spinner+faded-label to spinner-only
(.btn--loading hides children via visibility:hidden).

ActionButton.css deleted.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Refactor `StatusCard` internals to compose `Card`

**Files:**
- Modify: `apps/web/src/components/shared/StatusCard.tsx`
- Modify: `apps/web/src/components/shared/StatusCard.css`

- [ ] **Step 1: Read the existing StatusCard test to know what assertions to preserve**

Run: `cat /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web/src/components/shared/__tests__/StatusCard.test.tsx`

Take note of which class names and DOM structure the tests query. The internal refactor must preserve these or the tests must be updated.

- [ ] **Step 2: Update `StatusCard.tsx` to wrap `Card`**

Replace the contents of `apps/web/src/components/shared/StatusCard.tsx` with:

```tsx
import type { ReactNode } from "react";
import Card from "./Card";
import EmptyState from "./EmptyState";
import "./StatusCard.css";

type Status = "idle" | "loading" | "success" | "error" | "empty";

interface EmptyAction {
  label: string;
  onClick: () => void;
}

interface StatusCardProps {
  title: string;
  status: Status;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyAction;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

function SkeletonLines() {
  return (
    <div className="status-card__skeleton" aria-hidden="true">
      <div className="status-card__skeleton-line status-card__skeleton-line--long" />
      <div className="status-card__skeleton-line status-card__skeleton-line--medium" />
      <div className="status-card__skeleton-line status-card__skeleton-line--short" />
    </div>
  );
}

export default function StatusCard({
  title,
  status,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyAction,
  actions,
  className,
  children,
}: StatusCardProps) {
  const wrapperClassName = [
    "status-card",
    status === "error" && "status-card--error",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card
      variant="raised"
      tone={status === "error" ? "watchpoint" : "neutral"}
      className={wrapperClassName}
    >
      <div aria-busy={status === "loading" ? "true" : undefined}>
        <div className="status-card__header">
          <h3 className="status-card__title">{title}</h3>
          {actions && <div className="status-card__actions">{actions}</div>}
        </div>

        <div className="status-card__body">
          {status === "loading" && <SkeletonLines />}

          {status === "error" && (
            <p className="status-card__error" role="alert">
              {errorMessage ?? "Something went wrong."}
            </p>
          )}

          {status === "empty" && (
            <EmptyState
              title={emptyTitle ?? "No data"}
              description={emptyDescription ?? "Nothing to display yet."}
              action={emptyAction}
            />
          )}

          {(status === "idle" || status === "success") && children}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Shrink `StatusCard.css`**

Replace the contents of `apps/web/src/components/shared/StatusCard.css` with:

```css
/* ============================================================
   StatusCard — status-specific internals only.
   Surface, border, radius, and shadow are provided by <Card>.
   ============================================================ */

.status-card--error {
  /* Card gets tone="watchpoint" from the component; this class is kept
     for test queries and for any future error-specific overrides. */
}

.status-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ds-space-4) var(--ds-space-4) 0;
}

.status-card__title {
  margin: 0;
  font-family: var(--ds-font-sans);
  font-size: var(--ds-text-base);
  font-weight: 600;
  color: var(--ds-text);
}

.status-card__actions {
  display: flex;
  gap: var(--ds-space-2);
}

.status-card__body {
  padding: var(--ds-space-4);
}

.status-card__error {
  margin: 0;
  padding: var(--ds-space-3);
  background: var(--ds-danger-soft);
  color: var(--ds-danger);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-sm);
}

/* ---- Skeleton lines ---- */

.status-card__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.status-card__skeleton-line {
  height: 0.75rem;
  background: var(--ds-surface-muted);
  border-radius: var(--ds-radius-sm);
  animation: status-card-pulse 1.5s ease-in-out infinite;
}

.status-card__skeleton-line--long   { width: 85%; }
.status-card__skeleton-line--medium { width: 60%; }
.status-card__skeleton-line--short  { width: 40%; }

@keyframes status-card-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
```

- [ ] **Step 4: Run the StatusCard tests**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm --workspace apps/web test -- StatusCard.test.tsx`

Expected: PASS. If any assertion queries the outer `.status-card` wrapper class and fails because it's now deeper in the DOM (wrapped by `<Card>`), either update the test to query via `closest(".status-card")` or adjust the StatusCard DOM to emit `.status-card` on the outermost element (by passing it via `Card`'s `className`, which the new implementation already does).

- [ ] **Step 5: Run the full test suite**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run test`

Expected: All pass. Card and IconButton tests from prior tasks stay green.

- [ ] **Step 6: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/components/shared/StatusCard.tsx apps/web/src/components/shared/StatusCard.css
git commit -m "$(cat <<'EOF'
refactor(shared): StatusCard wraps Card for consistent surface language

StatusCard now composes <Card variant="raised"> for its surface, border,
radius, and shadow instead of duplicating those rules in StatusCard.css.
Error status maps to Card's watchpoint tone. Internals (header, body,
skeleton lines, error pill) stay as co-located .status-card__* rules.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update shared library barrel exports

**Files:**
- Modify: `apps/web/src/components/shared/index.ts`

- [ ] **Step 1: Add Card and IconButton to the barrel**

Replace the contents of `apps/web/src/components/shared/index.ts` with:

```ts
/* Barrel export — shared component library */

export { default as EmptyState } from "./EmptyState";
export { default as ActionButton } from "./ActionButton";
export { default as IconButton } from "./IconButton";
export { default as Card } from "./Card";
export { default as StatusCard } from "./StatusCard";
export { default as FormSection } from "./FormSection";
export { Sparkline, TrendIndicator, HealthDot, ProgressBar } from "./DataViz";
export { default as ResultDisplay } from "./ResultDisplay";
export { default as SessionBanner } from "./SessionBanner";
export { default as FeedbackCollector } from "./FeedbackCollector";
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/components/shared/index.ts
git commit -m "$(cat <<'EOF'
chore(shared): export Card and IconButton from barrel

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Migrate `TodayPanel` to use components

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx`

- [ ] **Step 1: Read `TodayPanel.tsx` in full**

Run: `cat /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web/src/panels/TodayPanel.tsx`

Identify:
- Every `<button className="btn btn--...">` usage (candidate for `ActionButton`)
- Every `<div className="surface-panel">` or `className="form-panel"` usage (candidate for `<Card>`)
- Any "priority"-flavored card that should use `<Card tone="priority" accent>`
- Any icon-only buttons (e.g., dismiss, refresh) that should use `<IconButton>`

- [ ] **Step 2: Import the shared components at the top of the file**

Add at the top of `TodayPanel.tsx` (near the existing imports):

```tsx
import Card from "../components/shared/Card";
import ActionButton from "../components/shared/ActionButton";
import IconButton from "../components/shared/IconButton";
```

(Or use the barrel import `import { Card, ActionButton, IconButton } from "../components/shared";` if the file already imports from the barrel for another component.)

- [ ] **Step 3: Replace `<div className="surface-panel">` with `<Card>`**

For each occurrence of `<div className="surface-panel surface-panel--padded">...</div>`, replace with:

```tsx
<Card variant="raised">
  <Card.Body>
    ...
  </Card.Body>
</Card>
```

If the old card had additional classes (`surface-panel--padded` adds padding), map to `Card.Body` which provides `var(--space-4)` padding. If the old card had custom padding, use `className="some-custom-class"` on `<Card>` to preserve it or migrate the padding to a parent grid.

For priority cards (where the content is about the teacher needing to act — e.g., "3 students need attention"), use:

```tsx
<Card variant="raised" tone="priority" accent>
  <Card.Body>
    ...
  </Card.Body>
</Card>
```

- [ ] **Step 4: Replace `<button className="btn btn--...">` with `<ActionButton>`**

For each occurrence of a raw button, replace with `<ActionButton variant="..."`. Map the variant:

| Old class | New variant |
|---|---|
| `btn btn--primary` | `variant="primary"` |
| `btn btn--approve` | `variant="approve"` |
| `btn btn--ghost` | `variant="ghost"` |
| `btn btn--tertiary` | `variant="tertiary"` |
| `btn btn--soft` | `variant="soft"` |

Preserve `onClick`, `disabled`, and `aria-label` props. For any button that has an async handler, add `loading={isPending}` (where `isPending` is the relevant state).

- [ ] **Step 5: Replace icon-only buttons with `<IconButton>`**

For each icon-only action (dismiss X, refresh, expand), replace with:

```tsx
<IconButton aria-label="Dismiss" variant="tertiary" size="sm" onClick={handleDismiss}>
  <XIcon />
</IconButton>
```

- [ ] **Step 6: Verify the panel renders and tests pass**

Run:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
npm run typecheck
npm run test
```

Expected: Exit 0 for both. If a test for TodayPanel fails because of a DOM structure change, update the test query to the new structure (prefer queries by role/name over by className).

- [ ] **Step 7: Run the dev server and manually verify**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run dev`

Open `http://localhost:5173`. Navigate to the Today tab. Verify:
- Cards render with the right surface look (no visual regression)
- Priority cards show the left accent stripe
- Buttons hover/press tactilely (no bounce)
- Focus ring visible on Tab-navigation
- No console errors

Close the dev server (`Ctrl+C`).

- [ ] **Step 8: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/panels/TodayPanel.tsx
git commit -m "$(cat <<'EOF'
refactor(today): migrate TodayPanel to Card + ActionButton + IconButton

Replaces raw .surface-panel and .btn--* usages with the shared component
library. Priority cards adopt Card tone="priority" with accent stripe.
Async action buttons expose loading state for the first time.

Reference implementation for the letterpress tactility migration pattern.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Migrate `DifferentiatePanel` to use components

**Files:**
- Modify: `apps/web/src/panels/DifferentiatePanel.tsx`

- [ ] **Step 1: Read `DifferentiatePanel.tsx` in full**

Run: `cat /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web/src/panels/DifferentiatePanel.tsx`

This panel is the highest-click-count panel (generate, copy, print, regenerate). Identify:
- Generate button (the primary async CTA)
- Copy and print buttons
- Any result container using `.surface-panel`
- Form container using `.form-panel`

- [ ] **Step 2: Import shared components**

Add:

```tsx
import Card from "../components/shared/Card";
import ActionButton from "../components/shared/ActionButton";
import IconButton from "../components/shared/IconButton";
```

- [ ] **Step 3: Migrate surface containers**

Replace every `<div className="surface-panel ...">...</div>` and `<section className="form-panel">...</section>` with `<Card variant="raised"><Card.Body>...</Card.Body></Card>`.

Preserve any classes that are unique to content layout (e.g., `workspace-rail`, `workspace-canvas`) on the containing elements outside the Card.

- [ ] **Step 4: Migrate the Generate button to ActionButton with loading**

Find the primary `Generate` button. Replace:

```tsx
<button
  className="btn btn--primary"
  onClick={handleGenerate}
  disabled={isGenerating}
>
  {isGenerating ? "Generating…" : "Generate"}
</button>
```

With:

```tsx
<ActionButton
  variant="primary"
  size="lg"
  loading={isGenerating}
  onClick={handleGenerate}
>
  Generate
</ActionButton>
```

The loading spinner + `aria-busy` are handled by the component. Remove any now-redundant ad-hoc spinner span in the button.

- [ ] **Step 5: Migrate Copy and Print buttons**

Copy button → `<ActionButton variant="ghost" size="sm" onClick={handleCopy}>Copy</ActionButton>`.

Print button → if it's currently an icon-only element, use `<IconButton aria-label="Print" variant="ghost" size="sm" onClick={handlePrint}><PrinterIcon /></IconButton>`. Otherwise use `<ActionButton variant="ghost" size="sm">`.

Regenerate button → `<ActionButton variant="soft" size="sm" onClick={handleRegenerate}>Regenerate</ActionButton>`.

- [ ] **Step 6: Verify**

Run:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
npm run typecheck
npm run test
```

Expected: Exit 0 for both. Update any test that queries old class names.

- [ ] **Step 7: Visual smoke test**

Run the dev server, navigate to the Differentiate tab, generate a sample output, verify the loading state looks right (button contents hidden, spinner visible), and verify copy/print/regenerate work. Close the dev server.

- [ ] **Step 8: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/panels/DifferentiatePanel.tsx
git commit -m "$(cat <<'EOF'
refactor(differentiate): migrate DifferentiatePanel to shared components

Generate button becomes ActionButton with canonical loading state
(spinner + aria-busy + visibility-hidden children). Copy, print, and
regenerate buttons migrate to ActionButton/IconButton variants.
Result containers and form panel wrap in <Card>.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Migrate `InterventionLogger` to use components

**Files:**
- Modify: `apps/web/src/components/InterventionLogger.tsx`

- [ ] **Step 1: Read `InterventionLogger.tsx` in full**

Run: `cat /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web/src/components/InterventionLogger.tsx`

This is the most sensitive form. Identify:
- Form wrapper (should wrap in `<Card variant="raised">` with `<Card.Body>`)
- Save button (primary, may have loading)
- Delete/remove button (should become `ActionButton variant="danger"`)
- Any other interactive elements

- [ ] **Step 2: Import shared components**

Add:

```tsx
import Card from "./shared/Card";
import ActionButton from "./shared/ActionButton";
```

(Note: `InterventionLogger.tsx` is in `components/`, not `panels/`, so the import path is different.)

- [ ] **Step 3: Wrap the form in `<Card>`**

Replace the outermost container (typically `<section className="form-panel">` or `<div className="surface-panel">`) with:

```tsx
<Card variant="raised">
  <Card.Body>
    {/* existing form content */}
  </Card.Body>
</Card>
```

- [ ] **Step 4: Migrate buttons**

Save button → `<ActionButton variant="primary" loading={isSaving} onClick={handleSave}>Save</ActionButton>`.

Delete/remove button → `<ActionButton variant="danger" onClick={handleDelete}>Delete</ActionButton>`.

Any secondary "Cancel" or "Close" button → `<ActionButton variant="tertiary" onClick={handleCancel}>Cancel</ActionButton>`.

- [ ] **Step 5: Verify**

Run:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
npm run typecheck
npm run test
```

Expected: Exit 0. Update any test assertions that queried the old classes.

- [ ] **Step 6: Visual smoke test**

Run the dev server, navigate to the Log Intervention tab, fill out the form, save it, verify the save button shows the loading state, verify the delete button is visually distinct (terra-cotta) from the save button. Close the dev server.

- [ ] **Step 7: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add apps/web/src/components/InterventionLogger.tsx
git commit -m "$(cat <<'EOF'
refactor(intervention): migrate InterventionLogger to shared components

Form container wraps in Card. Save button uses ActionButton loading state.
Delete button adopts the new .btn--danger variant with distinct terra-cotta
hue, separating destructive actions from primary CTAs.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Validation pass and documentation

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/dark-mode-contract.md`

- [ ] **Step 1: Run the full validation sweep**

Run, in order, and stop at the first failure:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
npm run check:contrast
npm run typecheck
npm run lint
npm run test
npm run release:gate
```

Expected: All exit 0. The release gate runs a structural end-to-end check. If `release:gate` fails for a non-CSS reason (inference lane, eval case), investigate whether it's a pre-existing failure unrelated to this sprint.

- [ ] **Step 2: Grep pass for obsolete button shadow rgba**

Run:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
grep -rn "rgba(184, 131, 49" apps/web/src
grep -rn "rgba(74, 112, 66" apps/web/src
grep -rn "rgba(183, 128, 45" apps/web/src
grep -rn "#9a4225" apps/web/src
grep -rn "#b87055" apps/web/src
```

Expected: Zero hits from all five greps. If any return results, that code path was missed during the refactor — fix it inline (replace the hardcoded value with a `--shadow-*` or `color-mix(var(--color-*), ...)` token reference).

- [ ] **Step 3: Grep pass for `backdrop-filter: blur` on card surfaces**

Run:
```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
grep -n "backdrop-filter: blur" apps/web/src/styles/primitives.css
```

Expected: Only `.empty-state` matches (intentional pattern language). `.surface-panel` and `.form-panel` should NOT appear in the results.

- [ ] **Step 4: Manual tab-walk across all 12 panels**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run dev`

Open `http://localhost:5173`. For each of the 12 tabs (Today, Differentiate, Language Tools, Tomorrow Plan, EA Briefing, EA Load, Forecast, Log Intervention, Sub Packet, Family Message, Support Patterns, Usage Insights):

1. Navigate to the tab.
2. Tab through every interactive element with keyboard — verify focus ring is visible on every button and interactive card.
3. Hover over a few buttons — verify the hover is a small settle (not a zoom).
4. Click a button that has a press state — verify the `:active` state resolves the lift.
5. Verify cards visually lift off the page without frosted blur.
6. Toggle the theme between light and dark (`ThemeToggle` button) — verify both modes look coherent.
7. Note any visual regressions.

Close the dev server.

- [ ] **Step 5: Reduced-motion emulation test**

Run the dev server again. Open DevTools → Rendering panel → Emulate CSS media feature → `prefers-reduced-motion: reduce`. Hover over buttons on the Today tab — verify NO `translateY` lift. Verify the spinner (on a loading generate button or similar) rotates more slowly. Close the dev server.

- [ ] **Step 6: Add decision-log entry**

Open `docs/decision-log.md`. Find the most recent date's section (or the top of the log). Add a new entry for 2026-04-12:

```markdown
## 2026-04-12 — Letterpress Tactility for cards and buttons

**Context:** The light-palette editorial-letterpress sprint (see
`docs/superpowers/specs/2026-04-12-light-palette-editorial-letterpress-design.md`)
committed the color system to a paper-and-ink metaphor. Cards and buttons,
however, still carried generic SaaS dashboard interaction patterns — bouncy
`translateY(-2px) scale(1.02)` hover transforms, hardcoded accent-tied glow
shadows that silently drifted when the palette was refined, frosted glass
blur on `.surface-panel`, missing `:focus-visible` and `:active` states, and
no shared component primitive for structured cards.

**Decision:** Introduce a "Letterpress Tactility" direction. Kill bouncy
transforms (translateY max 1px, no scale). Replace hardcoded rgba button
shadows with derived `--shadow-sm/md/xs` tokens so future palette shifts
track automatically. Add `:focus-visible` (shared token with form fields),
`:active` press states, `prefers-reduced-motion` fallback, `.btn--danger`
and `.btn--link` variants, size modifiers, icon-only, loading with absolute
spinner, and a general-purpose `<Card>` React primitive with variants,
tones, composition API, and accent stripe. Kill `backdrop-filter: blur` on
`.surface-panel` and `.form-panel` (frosted glass is not letterpress);
replace depth cue with an inset top-edge warm-white highlight.

**Scope:** `apps/web/src/styles/primitives.css`,
`apps/web/src/styles/tokens.css`, `apps/web/src/tokens.css`,
`apps/web/src/components/shared/{ActionButton,StatusCard,Card,IconButton,index}.{tsx,ts,css}`,
three reference panel migrations (Today, Differentiate, InterventionLogger).
The remaining panels benefit passively from the CSS primitives refresh —
explicit component-level migration is deferred as opportunistic future work.

**Justification for killing `backdrop-filter: blur`:** Frosted glass is a
Material 3 / visionOS idiom; the letterpress metaphor requires cards that
sit on paper, not float on blur. The inset top-edge highlight combined with
the existing warm shadow ladder delivers the "ink pressed into paper" lift
without the compositing cost or the conflict with
`prefers-reduced-transparency: reduce`.

**Non-goals:** No new animation framework, no shadcn-style rewrite, no
palette changes, no global migration of all 20+ raw-class call sites.
```

- [ ] **Step 7: Add shadow-derivation note to dark-mode-contract.md**

Open `docs/dark-mode-contract.md`. Find the section that talks about shadow
tokens or the derivation rules (if §6 from the sibling spec has landed).
Add the following paragraph in the most appropriate section (or append it at
the end of the shadow section):

```markdown
**Button and card `box-shadow` values MUST derive from the `--shadow-*` tokens**
(`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`). Never hardcode
`rgba(...)` values with a specific color channel keyed to the accent hex.
The shadow primitive tokens (`--_shadow-*-a`) already handle the warm-shadow
ladder and track palette refinements via `light-dark()`. Raw rgba values
silently drift when the accent color shifts — this was the anti-pattern
fixed by the 2026-04-12 letterpress tactility sprint. See
`docs/superpowers/specs/2026-04-12-cards-buttons-letterpress-tactility-design.md`.
```

- [ ] **Step 8: Final validation**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run check:contrast && npm run typecheck && npm run lint && npm run test`

Expected: Exit 0 for all.

- [ ] **Step 9: Commit**

```bash
cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev
git add docs/decision-log.md docs/dark-mode-contract.md
git commit -m "$(cat <<'EOF'
docs: record Letterpress Tactility decision and shadow-derivation rule

- decision-log: append 2026-04-12 entry capturing the cards/buttons refinement
  direction, the scope, the justification for killing backdrop-filter blur, and
  the non-goals.
- dark-mode-contract: add the rule that button/card box-shadow values must
  derive from --shadow-* tokens rather than hardcoded rgba — codifies the
  anti-pattern the sprint fixed.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

Checked against the spec:

| Spec section | Covered by task(s) |
|---|---|
| Token additions (motion, shadow-xs, focus-ring) | Task 1 |
| `.btn` base, variants, `:focus-visible`, `:active`, reduced-motion | Task 2 |
| `.btn--danger`, `.btn--link`, sizes, icon-only, loading, spinner | Task 2 |
| `.surface-panel` / `.form-panel` blur removal + inset highlight | Task 3 |
| `.field :focus` → shared tokens | Task 3 |
| `.language-tool-toggle__btn--active` drift fix | Task 2 Step 2 |
| `Card` component (variants, tones, composition, interactive) | Task 4 |
| `IconButton` component (typed aria-label) | Task 5 |
| `ActionButton` expansion + `.css` deletion | Task 6 |
| `StatusCard` internal refactor to compose `Card` | Task 7 |
| Barrel export update | Task 8 |
| `TodayPanel` migration | Task 9 |
| `DifferentiatePanel` migration | Task 10 |
| `InterventionLogger` migration | Task 11 |
| Validation sweep, grep passes, manual walk, reduced-motion test | Task 12 Steps 1–5 |
| `docs/decision-log.md` entry | Task 12 Step 6 |
| `docs/dark-mode-contract.md` shadow rule | Task 12 Step 7 |

**Placeholder scan:** No TBDs, TODOs, or "similar to above" references. Every code block contains the actual code. Every command is exact with expected output.

**Type consistency:** `ActionButtonVariant` and `IconButtonVariant` share the same value set where they overlap (`primary | secondary | danger | approve | soft | tertiary | ghost`). `IconButtonVariant` excludes `link` because a link is not icon-only semantically. `ActionButton` includes `link`. Size type `sm | md | lg` is consistent across both.

**Method signatures:** `Card.Header`, `Card.Body`, `Card.Footer` are module-level functions attached as static members, consistent with `rerender-no-inline-components`. `joinClassNames` is a module-level helper duplicated across `Card.tsx`, `IconButton.tsx`, and `ActionButton.tsx` — this is intentional YAGNI (3 tiny helpers, no shared utility file needed) and keeps each component self-contained. If the pattern proliferates, a future sprint can extract it to `utils/classNames.ts`.

**Scope:** 12 tasks, 6 core commits + 3 migration commits + 1 barrel commit + 1 docs commit + 1 token commit = **12 commits**. Single sprint, one developer or one subagent chain.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-12-cards-buttons-letterpress-tactility.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
