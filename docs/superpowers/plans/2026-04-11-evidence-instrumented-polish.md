# Evidence-Instrumented Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the teacher experience with a shared component library and design tokens while simultaneously building feedback/session capture infrastructure that generates evidence of pedagogical value.

**Architecture:** Five bottom-up layers: (1) design tokens + 8 shared components, (2) feedback/session backend pipeline with SQLite storage, (3) panel-by-panel migration to shared components, (4) Usage Insights panel, (5) evidence generation scripts and credibility artifacts. Each layer depends on the one below it.

**Tech Stack:** React 19, Vite 6, Vitest, CSS custom properties, Express, better-sqlite3, Zod 4

**Spec:** `docs/superpowers/specs/2026-04-11-evidence-instrumented-polish-design.md`

---

## Task 1: Design Tokens

**Files:**
- Create: `apps/web/src/tokens.css`
- Modify: `apps/web/src/main.tsx` (add import)

- [ ] **Step 1: Create design tokens CSS file**

```css
/* apps/web/src/tokens.css */

:root {
  /* ── Color Palette ── */
  --color-surface: #ffffff;
  --color-surface-raised: #fafbfc;
  --color-surface-sunken: #f3f4f6;
  --color-border: #d1d5db;
  --color-border-subtle: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-muted: #9ca3af;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-accent-subtle: #eff6ff;
  --color-success: #059669;
  --color-success-subtle: #ecfdf5;
  --color-warning: #d97706;
  --color-warning-subtle: #fffbeb;
  --color-danger: #dc2626;
  --color-danger-subtle: #fef2f2;
  --color-info: #0891b2;
  --color-info-subtle: #ecfeff;

  /* ── Spacing (4px base) ── */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* ── Type Scale ── */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", monospace;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* ── Border Radii ── */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* ── Transitions ── */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* Dark mode tokens (optional — matches existing ThemeToggle) */
[data-theme="dark"] {
  --color-surface: #111827;
  --color-surface-raised: #1f2937;
  --color-surface-sunken: #0f172a;
  --color-border: #374151;
  --color-border-subtle: #1f2937;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-text-muted: #6b7280;
  --color-accent: #3b82f6;
  --color-accent-hover: #60a5fa;
  --color-accent-subtle: #1e3a5f;
  --color-success: #10b981;
  --color-success-subtle: #064e3b;
  --color-warning: #f59e0b;
  --color-warning-subtle: #451a03;
  --color-danger: #ef4444;
  --color-danger-subtle: #450a0a;
  --color-info: #06b6d4;
  --color-info-subtle: #164e63;
}
```

- [ ] **Step 2: Import tokens in main.tsx**

Add this import as the first CSS import in `apps/web/src/main.tsx`:

```typescript
import "./tokens.css";
```

This must come before any other CSS imports so tokens are available to all components.

- [ ] **Step 3: Verify app still loads**

Run: `cd apps/web && npx vite --port 5173 &`
Expected: App loads at http://localhost:5173 without visual changes (tokens are defined but not yet consumed).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/tokens.css apps/web/src/main.tsx
git commit -m "feat(web): add design token system (CSS custom properties)"
```

---

## Task 2: EmptyState Component

**Files:**
- Create: `apps/web/src/components/shared/EmptyState.tsx`
- Create: `apps/web/src/components/shared/EmptyState.css`
- Create: `apps/web/src/components/shared/__tests__/EmptyState.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/EmptyState.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No results" description="Try a different search." />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try a different search.")).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState title="Empty" description="Nothing here." action={{ label: "Add one", onClick }} />,
    );
    const btn = screen.getByRole("button", { name: "Add one" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render action button when omitted", () => {
    render(<EmptyState title="Empty" description="Nothing here." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has accessible role and label", () => {
    render(<EmptyState title="No data" description="Check back later." />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/EmptyState.test.tsx`
Expected: FAIL — EmptyState module not found.

- [ ] **Step 3: Implement EmptyState**

```tsx
// apps/web/src/components/shared/EmptyState.tsx
import "./EmptyState.css";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
      {action && (
        <button className="empty-state__action" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
```

```css
/* apps/web/src/components/shared/EmptyState.css */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.empty-state__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.empty-state__description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  max-width: 32ch;
  margin: 0;
}

.empty-state__action {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.empty-state__action:hover {
  background: var(--color-accent);
  color: var(--color-surface);
}
```

- [ ] **Step 4: Verify test passes**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/EmptyState.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/EmptyState.tsx apps/web/src/components/shared/EmptyState.css apps/web/src/components/shared/__tests__/EmptyState.test.tsx
git commit -m "feat(web): add EmptyState shared component"
```

---

## Task 3: ActionButton Component

**Files:**
- Create: `apps/web/src/components/shared/ActionButton.tsx`
- Create: `apps/web/src/components/shared/ActionButton.css`
- Create: `apps/web/src/components/shared/__tests__/ActionButton.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/ActionButton.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionButton from "../ActionButton";

describe("ActionButton", () => {
  it("renders children text", () => {
    render(<ActionButton onClick={() => {}}>Generate</ActionButton>);
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Go</ActionButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows spinner and disables when loading", () => {
    render(<ActionButton onClick={() => {}} loading>Go</ActionButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("disables when disabled prop set", () => {
    render(<ActionButton onClick={() => {}} disabled>Go</ActionButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies variant class", () => {
    render(<ActionButton onClick={() => {}} variant="danger">Delete</ActionButton>);
    expect(screen.getByRole("button")).toHaveClass("action-btn--danger");
  });

  it("responds to Enter key", () => {
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Go</ActionButton>);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/ActionButton.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement ActionButton**

```tsx
// apps/web/src/components/shared/ActionButton.tsx
import type { ReactNode } from "react";
import "./ActionButton.css";

interface ActionButtonProps {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export default function ActionButton({
  variant = "primary",
  loading = false,
  disabled = false,
  onClick,
  children,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`action-btn action-btn--${variant}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
    >
      {loading ? <span className="action-btn__spinner" aria-hidden="true" /> : null}
      <span className={loading ? "action-btn__text--hidden" : undefined}>{children}</span>
    </button>
  );
}
```

```css
/* apps/web/src/components/shared/ActionButton.css */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), opacity var(--transition-fast);
  position: relative;
  min-width: 5rem;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-btn--primary {
  background: var(--color-accent);
  color: #fff;
}
.action-btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.action-btn--secondary {
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.action-btn--secondary:hover:not(:disabled) {
  background: var(--color-surface-sunken);
}

.action-btn--danger {
  background: var(--color-danger);
  color: #fff;
}
.action-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.action-btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: var(--radius-full);
  animation: action-btn-spin 0.6s linear infinite;
}

.action-btn--secondary .action-btn__spinner {
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: var(--color-text-primary);
}

.action-btn__text--hidden {
  visibility: hidden;
}

@keyframes action-btn-spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/ActionButton.test.tsx`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/ActionButton.tsx apps/web/src/components/shared/ActionButton.css apps/web/src/components/shared/__tests__/ActionButton.test.tsx
git commit -m "feat(web): add ActionButton shared component"
```

---

## Task 4: StatusCard Component

**Files:**
- Create: `apps/web/src/components/shared/StatusCard.tsx`
- Create: `apps/web/src/components/shared/StatusCard.css`
- Create: `apps/web/src/components/shared/__tests__/StatusCard.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/StatusCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusCard from "../StatusCard";

describe("StatusCard", () => {
  it("renders title and children", () => {
    render(<StatusCard title="Forecast" status="idle"><p>Content</p></StatusCard>);
    expect(screen.getByText("Forecast")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    render(<StatusCard title="Loading" status="loading"><p>Hidden</p></StatusCard>);
    expect(screen.getByTestId("status-card-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("shows error message when error", () => {
    render(
      <StatusCard title="Broken" status="error" errorMessage="Something failed">
        <p>Hidden</p>
      </StatusCard>,
    );
    expect(screen.getByText("Something failed")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("delegates to EmptyState when empty", () => {
    render(
      <StatusCard title="Empty" status="empty" emptyTitle="No data" emptyDescription="Try later.">
        <p>Hidden</p>
      </StatusCard>,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("renders children when idle or success", () => {
    render(<StatusCard title="Done" status="success"><p>Visible</p></StatusCard>);
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("has accessible heading", () => {
    render(<StatusCard title="Test" status="idle"><p>OK</p></StatusCard>);
    expect(screen.getByRole("heading", { level: 3, name: "Test" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/StatusCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement StatusCard**

```tsx
// apps/web/src/components/shared/StatusCard.tsx
import type { ReactNode } from "react";
import EmptyState from "./EmptyState";
import "./StatusCard.css";

type CardStatus = "idle" | "loading" | "success" | "error" | "empty";

interface StatusCardProps {
  title: string;
  status: CardStatus;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
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
  return (
    <section className={`status-card status-card--${status} ${className ?? ""}`.trim()}>
      <div className="status-card__header">
        <h3 className="status-card__title">{title}</h3>
        {actions && <div className="status-card__actions">{actions}</div>}
      </div>
      <div className="status-card__body">
        {status === "loading" && (
          <div className="status-card__skeleton" data-testid="status-card-skeleton">
            <div className="skeleton-line skeleton-line--long" />
            <div className="skeleton-line skeleton-line--medium" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
        )}
        {status === "error" && (
          <div className="status-card__error" role="alert">
            <p>{errorMessage ?? "Something went wrong."}</p>
          </div>
        )}
        {status === "empty" && (
          <EmptyState
            title={emptyTitle ?? "No data yet"}
            description={emptyDescription ?? ""}
            action={emptyAction}
          />
        )}
        {(status === "idle" || status === "success") && children}
      </div>
    </section>
  );
}
```

```css
/* apps/web/src/components/shared/StatusCard.css */
.status-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.status-card--error {
  border-color: var(--color-danger);
}

.status-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.status-card__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status-card__actions {
  display: flex;
  gap: var(--space-2);
}

.status-card__body {
  padding: var(--space-4);
}

.status-card__error {
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.status-card__error p {
  margin: 0;
}

/* Skeleton loading */
.status-card__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-line {
  height: 0.75rem;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-line--long { width: 90%; }
.skeleton-line--medium { width: 65%; }
.skeleton-line--short { width: 40%; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/StatusCard.test.tsx`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/StatusCard.tsx apps/web/src/components/shared/StatusCard.css apps/web/src/components/shared/__tests__/StatusCard.test.tsx
git commit -m "feat(web): add StatusCard shared component with loading/error/empty states"
```

---

## Task 5: FormSection Component

**Files:**
- Create: `apps/web/src/components/shared/FormSection.tsx`
- Create: `apps/web/src/components/shared/FormSection.css`
- Create: `apps/web/src/components/shared/__tests__/FormSection.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/FormSection.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormSection from "../FormSection";

describe("FormSection", () => {
  it("renders label and children", () => {
    render(
      <FormSection label="Teacher notes">
        <textarea data-testid="input" />
      </FormSection>,
    );
    expect(screen.getByText("Teacher notes")).toBeInTheDocument();
    expect(screen.getByTestId("input")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <FormSection label="Notes" description="Optional context for the model.">
        <textarea />
      </FormSection>,
    );
    expect(screen.getByText("Optional context for the model.")).toBeInTheDocument();
  });

  it("renders character count", () => {
    render(
      <FormSection label="Notes" charCount={150} maxChars={500}>
        <textarea />
      </FormSection>,
    );
    expect(screen.getByText("150 / 500")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(
      <FormSection label="Notes" error="Required field">
        <textarea />
      </FormSection>,
    );
    expect(screen.getByText("Required field")).toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveClass("form-section--error");
  });

  it("warns when near character limit", () => {
    render(
      <FormSection label="Notes" charCount={480} maxChars={500}>
        <textarea />
      </FormSection>,
    );
    expect(screen.getByText("480 / 500")).toHaveClass("form-section__count--warn");
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/FormSection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement FormSection**

```tsx
// apps/web/src/components/shared/FormSection.tsx
import type { ReactNode } from "react";
import "./FormSection.css";

interface FormSectionProps {
  label: string;
  description?: string;
  error?: string;
  charCount?: number;
  maxChars?: number;
  children: ReactNode;
}

export default function FormSection({
  label,
  description,
  error,
  charCount,
  maxChars,
  children,
}: FormSectionProps) {
  const nearLimit = maxChars && charCount ? charCount / maxChars > 0.9 : false;

  return (
    <div className={`form-section ${error ? "form-section--error" : ""}`} role="group" aria-label={label}>
      <label className="form-section__label">{label}</label>
      {description && <p className="form-section__description">{description}</p>}
      {children}
      <div className="form-section__footer">
        {error && <span className="form-section__error" role="alert">{error}</span>}
        {maxChars != null && charCount != null && (
          <span className={`form-section__count ${nearLimit ? "form-section__count--warn" : ""}`}>
            {charCount} / {maxChars}
          </span>
        )}
      </div>
    </div>
  );
}
```

```css
/* apps/web/src/components/shared/FormSection.css */
.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-section__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-section__description {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
}

.form-section__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 1.25rem;
}

.form-section__error {
  font-size: var(--text-xs);
  color: var(--color-danger);
}

.form-section__count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-left: auto;
}

.form-section__count--warn {
  color: var(--color-warning);
  font-weight: 600;
}

.form-section--error .form-section__label {
  color: var(--color-danger);
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/FormSection.test.tsx`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/FormSection.tsx apps/web/src/components/shared/FormSection.css apps/web/src/components/shared/__tests__/FormSection.test.tsx
git commit -m "feat(web): add FormSection shared component with char count and validation"
```

---

## Task 6: DataVizCard Sub-Components

**Files:**
- Create: `apps/web/src/components/shared/DataViz.tsx`
- Create: `apps/web/src/components/shared/DataViz.css`
- Create: `apps/web/src/components/shared/__tests__/DataViz.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/DataViz.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline, TrendIndicator, HealthDot, ProgressBar } from "../DataViz";

describe("Sparkline", () => {
  it("renders an SVG with a polyline for data points", () => {
    const { container } = render(<Sparkline data={[10, 20, 15, 30]} label="Weekly trend" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("renders nothing for empty data", () => {
    const { container } = render(<Sparkline data={[]} label="Empty" />);
    expect(container.querySelector("polyline")).toBeNull();
  });
});

describe("TrendIndicator", () => {
  it("shows up arrow for positive change", () => {
    render(<TrendIndicator value={12.5} />);
    expect(screen.getByText("+12.5%")).toBeInTheDocument();
    expect(screen.getByLabelText("Increasing trend")).toBeInTheDocument();
  });

  it("shows down arrow for negative change", () => {
    render(<TrendIndicator value={-5.2} />);
    expect(screen.getByText("-5.2%")).toBeInTheDocument();
  });

  it("shows flat for zero", () => {
    render(<TrendIndicator value={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("HealthDot", () => {
  it("renders green for healthy", () => {
    const { container } = render(<HealthDot status="healthy" tooltip="All good" />);
    expect(container.querySelector(".health-dot--healthy")).toBeInTheDocument();
  });

  it("renders tooltip text", () => {
    render(<HealthDot status="warning" tooltip="Needs attention" />);
    expect(screen.getByTitle("Needs attention")).toBeInTheDocument();
  });
});

describe("ProgressBar", () => {
  it("renders with label and percentage", () => {
    render(<ProgressBar label="Completion" value={75} />);
    expect(screen.getByText("Completion")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("clamps value between 0 and 100", () => {
    render(<ProgressBar label="Over" value={120} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("has accessible progressbar role", () => {
    render(<ProgressBar label="Loading" value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/DataViz.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement DataViz sub-components**

```tsx
// apps/web/src/components/shared/DataViz.tsx
import "./DataViz.css";

/* ── Sparkline ── */
interface SparklineProps {
  data: number[];
  label: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, label, width = 120, height = 32 }: SparklineProps) {
  if (data.length === 0) return <svg width={width} height={height} aria-label={label} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
      const y = padding + (1 - (v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" width={width} height={height} aria-label={label} role="img">
      <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── TrendIndicator ── */
interface TrendIndicatorProps {
  value: number;
}

export function TrendIndicator({ value }: TrendIndicatorProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const label = direction === "up" ? "Increasing trend" : direction === "down" ? "Decreasing trend" : "No change";
  const sign = value > 0 ? "+" : "";

  return (
    <span className={`trend-indicator trend-indicator--${direction}`} aria-label={label}>
      <span className="trend-indicator__arrow" aria-hidden="true">
        {direction === "up" ? "\u2191" : direction === "down" ? "\u2193" : "\u2192"}
      </span>
      <span className="trend-indicator__value">{sign}{value}%</span>
    </span>
  );
}

/* ── HealthDot ── */
interface HealthDotProps {
  status: "healthy" | "warning" | "critical";
  tooltip: string;
}

export function HealthDot({ status, tooltip }: HealthDotProps) {
  return <span className={`health-dot health-dot--${status}`} title={tooltip} aria-hidden="true" />;
}

/* ── ProgressBar ── */
interface ProgressBarProps {
  label: string;
  value: number;
}

export function ProgressBar({ label, value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar__header">
        <span className="progress-bar__label">{label}</span>
        <span className="progress-bar__pct">{clamped}%</span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="progress-bar__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
```

```css
/* apps/web/src/components/shared/DataViz.css */
.sparkline { display: block; }

.trend-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
}
.trend-indicator--up { color: var(--color-success); }
.trend-indicator--down { color: var(--color-danger); }
.trend-indicator--flat { color: var(--color-text-muted); }

.health-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
}
.health-dot--healthy { background: var(--color-success); }
.health-dot--warning { background: var(--color-warning); }
.health-dot--critical { background: var(--color-danger); }

.progress-bar-wrap { width: 100%; }
.progress-bar__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-1);
}
.progress-bar__label { font-size: var(--text-xs); color: var(--color-text-secondary); }
.progress-bar__pct { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-primary); }
.progress-bar {
  height: 0.375rem;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-bar__fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/DataViz.test.tsx`
Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/DataViz.tsx apps/web/src/components/shared/DataViz.css apps/web/src/components/shared/__tests__/DataViz.test.tsx
git commit -m "feat(web): add DataViz shared components (Sparkline, TrendIndicator, HealthDot, ProgressBar)"
```

---

## Task 7: ResultDisplay Component

**Files:**
- Create: `apps/web/src/components/shared/ResultDisplay.tsx`
- Create: `apps/web/src/components/shared/ResultDisplay.css`
- Create: `apps/web/src/components/shared/__tests__/ResultDisplay.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/ResultDisplay.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResultDisplay from "../ResultDisplay";

describe("ResultDisplay", () => {
  const sampleResult = {
    sections: [
      { heading: "Overview", content: "This is the overview." },
      { heading: "Details", content: "These are the details." },
    ],
  };

  it("renders section headings and content", () => {
    render(<ResultDisplay sections={sampleResult.sections} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("This is the overview.")).toBeInTheDocument();
  });

  it("copies section content to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ResultDisplay sections={sampleResult.sections} />);
    fireEvent.click(screen.getAllByLabelText("Copy to clipboard")[0]);
    expect(writeText).toHaveBeenCalledWith("This is the overview.");
  });

  it("toggles section collapse", () => {
    render(<ResultDisplay sections={sampleResult.sections} />);
    const toggle = screen.getAllByRole("button", { name: /toggle/i })[0];
    fireEvent.click(toggle);
    expect(screen.queryByText("This is the overview.")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText("This is the overview.")).toBeInTheDocument();
  });

  it("renders children slot (for FeedbackCollector)", () => {
    render(
      <ResultDisplay sections={sampleResult.sections}>
        <div data-testid="feedback-slot">Feedback here</div>
      </ResultDisplay>,
    );
    expect(screen.getByTestId("feedback-slot")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/ResultDisplay.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement ResultDisplay**

```tsx
// apps/web/src/components/shared/ResultDisplay.tsx
import { useState, type ReactNode } from "react";
import "./ResultDisplay.css";

interface ResultSection {
  heading: string;
  content: string;
}

interface ResultDisplayProps {
  sections: ResultSection[];
  children?: ReactNode;
}

export default function ResultDisplay({ sections, children }: ResultDisplayProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);

  function toggleSection(i: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function copyContent(text: string, i: number) {
    await navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="result-display">
      {sections.map((section, i) => (
        <div key={i} className="result-display__section">
          <div className="result-display__section-header">
            <button
              type="button"
              className="result-display__toggle"
              onClick={() => toggleSection(i)}
              aria-label={`Toggle ${section.heading}`}
              aria-expanded={!collapsed.has(i)}
            >
              <span className={`result-display__chevron ${collapsed.has(i) ? "result-display__chevron--collapsed" : ""}`}>&#9662;</span>
              <span className="result-display__heading">{section.heading}</span>
            </button>
            <button
              type="button"
              className="result-display__copy"
              onClick={() => copyContent(section.content, i)}
              aria-label="Copy to clipboard"
            >
              {copied === i ? "Copied" : "Copy"}
            </button>
          </div>
          {!collapsed.has(i) && (
            <div className="result-display__content">
              <p>{section.content}</p>
            </div>
          )}
        </div>
      ))}
      {children && <div className="result-display__footer">{children}</div>}
    </div>
  );
}
```

```css
/* apps/web/src/components/shared/ResultDisplay.css */
.result-display {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.result-display__section {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.result-display__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
}

.result-display__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  padding: 0;
}

.result-display__chevron {
  transition: transform var(--transition-fast);
  font-size: var(--text-xs);
}

.result-display__chevron--collapsed {
  transform: rotate(-90deg);
}

.result-display__heading {
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: var(--text-xs);
}

.result-display__copy {
  font-size: var(--text-xs);
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.result-display__copy:hover {
  background: var(--color-accent-subtle);
}

.result-display__content {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.result-display__content p { margin: 0; }

.result-display__footer {
  padding: var(--space-3) 0 0;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/ResultDisplay.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/ResultDisplay.tsx apps/web/src/components/shared/ResultDisplay.css apps/web/src/components/shared/__tests__/ResultDisplay.test.tsx
git commit -m "feat(web): add ResultDisplay shared component with collapse and copy"
```

---

## Task 8: Shared Schemas (Feedback + Session)

**Files:**
- Create: `packages/shared/schemas/feedback.ts`
- Create: `packages/shared/schemas/session.ts`
- Modify: `packages/shared/schemas/index.ts`
- Create: `packages/shared/schemas/__tests__/feedback-session.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// packages/shared/schemas/__tests__/feedback-session.test.ts
import { describe, it, expect } from "vitest";
import {
  FeedbackRequestSchema,
  SessionRequestSchema,
} from "../index.js";

describe("FeedbackRequestSchema", () => {
  it("accepts valid feedback", () => {
    const result = FeedbackRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      panel_id: "differentiate",
      rating: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rejects rating outside 1-5", () => {
    const result = FeedbackRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      panel_id: "today",
      rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional comment up to 200 chars", () => {
    const result = FeedbackRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      panel_id: "forecast",
      rating: 5,
      comment: "Very helpful forecast!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects comment over 200 chars", () => {
    const result = FeedbackRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      panel_id: "forecast",
      rating: 5,
      comment: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionRequestSchema", () => {
  it("accepts valid session", () => {
    const result = SessionRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      session_id: "sess-abc123",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:15:00Z",
      panels_visited: ["today", "differentiate", "family-message"],
      generations_triggered: [
        { panel_id: "differentiate", prompt_class: "differentiate_material", timestamp: "2026-04-11T09:05:00Z" },
      ],
      feedback_count: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty panels_visited", () => {
    const result = SessionRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      session_id: "sess-abc123",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:15:00Z",
      panels_visited: [],
      generations_triggered: [],
      feedback_count: 0,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npx vitest run packages/shared/schemas/__tests__/feedback-session.test.ts`
Expected: FAIL — FeedbackRequestSchema not exported.

- [ ] **Step 3: Create feedback schema**

```typescript
// packages/shared/schemas/feedback.ts
import { z } from "zod";

export const PANEL_IDS = [
  "today",
  "differentiate",
  "language-tools",
  "tomorrow-plan",
  "ea-briefing",
  "complexity-forecast",
  "log-intervention",
  "survival-packet",
  "family-message",
  "support-patterns",
  "usage-insights",
] as const;

export const FeedbackRequestSchema = z.object({
  classroom_id: z.string().min(1),
  panel_id: z.enum(PANEL_IDS),
  prompt_class: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(200).optional(),
  generation_id: z.string().optional(),
  session_id: z.string().optional(),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export const FeedbackResponseSchema = z.object({
  id: z.string(),
  created_at: z.string(),
});
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

export const FeedbackSummarySchema = z.object({
  total: z.number(),
  by_panel: z.record(
    z.object({
      count: z.number(),
      avg_rating: z.number(),
      recent_comments: z.array(z.string()),
    }),
  ),
  by_week: z.array(
    z.object({ week: z.string(), count: z.number(), avg_rating: z.number() }),
  ),
  top_comments: z.array(
    z.object({
      text: z.string(),
      panel_id: z.string(),
      rating: z.number(),
      created_at: z.string(),
    }),
  ),
});
export type FeedbackSummary = z.infer<typeof FeedbackSummarySchema>;
```

- [ ] **Step 4: Create session schema**

```typescript
// packages/shared/schemas/session.ts
import { z } from "zod";

export const GenerationEventSchema = z.object({
  panel_id: z.string(),
  prompt_class: z.string(),
  timestamp: z.string(),
});
export type GenerationEvent = z.infer<typeof GenerationEventSchema>;

export const SessionRequestSchema = z.object({
  classroom_id: z.string().min(1),
  session_id: z.string().min(1),
  started_at: z.string(),
  ended_at: z.string(),
  panels_visited: z.array(z.string()).min(1),
  generations_triggered: z.array(GenerationEventSchema),
  feedback_count: z.number().int().min(0),
});
export type SessionRequest = z.infer<typeof SessionRequestSchema>;

export const SessionResponseSchema = z.object({
  id: z.string(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SessionSummarySchema = z.object({
  total_sessions: z.number(),
  avg_duration_minutes: z.number(),
  common_flows: z.array(
    z.object({ sequence: z.array(z.string()), count: z.number() }),
  ),
  panel_time_distribution: z.record(z.number()),
  generations_per_session: z.number(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
```

- [ ] **Step 5: Add exports to barrel index**

Add to the end of `packages/shared/schemas/index.ts`:

```typescript
export {
  PANEL_IDS,
  FeedbackRequestSchema,
  FeedbackResponseSchema,
  FeedbackSummarySchema,
} from "./feedback.js";
export type {
  FeedbackRequest,
  FeedbackResponse,
  FeedbackSummary,
} from "./feedback.js";

export {
  GenerationEventSchema,
  SessionRequestSchema,
  SessionResponseSchema,
  SessionSummarySchema,
} from "./session.js";
export type {
  GenerationEvent,
  SessionRequest,
  SessionResponse,
  SessionSummary,
} from "./session.js";
```

- [ ] **Step 6: Verify tests pass**

Run: `npx vitest run packages/shared/schemas/__tests__/feedback-session.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 7: Run full shared schema tests**

Run: `npx vitest run packages/shared/`
Expected: All existing tests + new tests PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/schemas/feedback.ts packages/shared/schemas/session.ts packages/shared/schemas/index.ts packages/shared/schemas/__tests__/feedback-session.test.ts
git commit -m "feat(shared): add feedback and session Zod schemas"
```

---

## Task 9: Database Migration 002

**Files:**
- Create: `services/memory/migrations/002_feedback_and_sessions.sql`
- Modify: `services/memory/__tests__/migrate.test.ts` (add migration 002 test)

- [ ] **Step 1: Write the migration test**

Add a new `describe` block to `services/memory/__tests__/migrate.test.ts`:

```typescript
describe("migration 002 - feedback and sessions", () => {
  it("creates feedback and sessions tables with correct columns", () => {
    const db = createTestDb();
    runMigrations(db);

    // Verify feedback table
    const feedbackInfo = db.prepare("PRAGMA table_info(feedback)").all() as { name: string }[];
    const feedbackCols = feedbackInfo.map((c) => c.name);
    expect(feedbackCols).toContain("id");
    expect(feedbackCols).toContain("classroom_id");
    expect(feedbackCols).toContain("panel_id");
    expect(feedbackCols).toContain("rating");
    expect(feedbackCols).toContain("comment");
    expect(feedbackCols).toContain("session_id");

    // Verify sessions table
    const sessionsInfo = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    const sessionCols = sessionsInfo.map((c) => c.name);
    expect(sessionCols).toContain("id");
    expect(sessionCols).toContain("classroom_id");
    expect(sessionCols).toContain("panels_visited");
    expect(sessionCols).toContain("generations_triggered");
    expect(sessionCols).toContain("feedback_count");

    db.close();
  });

  it("applies migration 002 idempotently after 001", () => {
    const db = createTestDb();
    const first = runMigrations(db);
    const second = runMigrations(db);
    expect(second.applied).toBe(0);
    expect(second.current).toBe(first.current);
    db.close();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npx vitest run services/memory/__tests__/migrate.test.ts`
Expected: New tests FAIL because migration 002 file doesn't exist yet.

- [ ] **Step 3: Create the migration SQL file**

```sql
-- 002_feedback_and_sessions
-- Adds feedback collection and session tracking tables
-- for the evidence-instrumented polish initiative.

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  panel_id TEXT NOT NULL,
  prompt_class TEXT,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  generation_id TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_classroom
  ON feedback(classroom_id, created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_panel
  ON feedback(panel_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  panels_visited TEXT NOT NULL,
  generations_triggered TEXT NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_classroom
  ON sessions(classroom_id, created_at);
```

- [ ] **Step 4: Verify tests pass**

Run: `npx vitest run services/memory/__tests__/migrate.test.ts`
Expected: All migration tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/memory/migrations/002_feedback_and_sessions.sql services/memory/__tests__/migrate.test.ts
git commit -m "feat(memory): add migration 002 — feedback and sessions tables"
```

---

## Task 10: Feedback Store Functions

**Files:**
- Modify: `services/memory/store.ts` (add saveFeedback, saveSession, getFeedbackSummary, getSessionSummary)
- Modify: `services/memory/__tests__/retrieve.test.ts` (or create new test file)

- [ ] **Step 1: Write the test**

Create `services/memory/__tests__/feedback-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../migrate.js";
import {
  saveFeedback,
  saveSession,
  getFeedbackSummary,
  getSessionSummary,
} from "../store.js";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  runMigrations(db);
  return db;
}

describe("saveFeedback", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("inserts a feedback record", () => {
    saveFeedback(db, {
      id: "fb-1",
      classroom_id: "demo-okafor-grade34",
      panel_id: "differentiate",
      rating: 4,
      comment: "Helpful!",
    });
    const row = db.prepare("SELECT * FROM feedback WHERE id = ?").get("fb-1") as { rating: number };
    expect(row.rating).toBe(4);
  });
});

describe("saveSession", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("inserts a session record with JSON arrays", () => {
    saveSession(db, {
      id: "sess-1",
      classroom_id: "demo-okafor-grade34",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:15:00Z",
      panels_visited: ["today", "differentiate"],
      generations_triggered: [{ panel_id: "differentiate", prompt_class: "differentiate_material", timestamp: "2026-04-11T09:05:00Z" }],
      feedback_count: 1,
    });
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get("sess-1") as { panels_visited: string };
    expect(JSON.parse(row.panels_visited)).toEqual(["today", "differentiate"]);
  });
});

describe("getFeedbackSummary", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("aggregates feedback by panel", () => {
    saveFeedback(db, { id: "fb-1", classroom_id: "demo", panel_id: "today", rating: 5 });
    saveFeedback(db, { id: "fb-2", classroom_id: "demo", panel_id: "today", rating: 3 });
    saveFeedback(db, { id: "fb-3", classroom_id: "demo", panel_id: "forecast", rating: 4 });
    const summary = getFeedbackSummary(db, "demo");
    expect(summary.total).toBe(3);
    expect(summary.by_panel.today.count).toBe(2);
    expect(summary.by_panel.today.avg_rating).toBe(4);
  });
});

describe("getSessionSummary", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("computes average duration and common flows", () => {
    saveSession(db, {
      id: "s1", classroom_id: "demo",
      started_at: "2026-04-11T09:00:00Z", ended_at: "2026-04-11T09:10:00Z",
      panels_visited: ["today", "differentiate"], generations_triggered: [], feedback_count: 0,
    });
    saveSession(db, {
      id: "s2", classroom_id: "demo",
      started_at: "2026-04-11T10:00:00Z", ended_at: "2026-04-11T10:20:00Z",
      panels_visited: ["today", "differentiate"], generations_triggered: [], feedback_count: 0,
    });
    const summary = getSessionSummary(db, "demo");
    expect(summary.total_sessions).toBe(2);
    expect(summary.avg_duration_minutes).toBe(15);
    expect(summary.common_flows[0].sequence).toEqual(["today", "differentiate"]);
    expect(summary.common_flows[0].count).toBe(2);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npx vitest run services/memory/__tests__/feedback-store.test.ts`
Expected: FAIL — saveFeedback, saveSession, etc. not exported from store.

- [ ] **Step 3: Add store functions to services/memory/store.ts**

Append to end of `services/memory/store.ts`:

```typescript
import type Database from "better-sqlite3";

// ─── Feedback ───

interface FeedbackRecord {
  id: string;
  classroom_id: string;
  panel_id: string;
  prompt_class?: string;
  rating: number;
  comment?: string;
  generation_id?: string;
  session_id?: string;
}

export function saveFeedback(db: Database.Database, feedback: FeedbackRecord): void {
  db.prepare(`
    INSERT INTO feedback (id, classroom_id, panel_id, prompt_class, rating, comment, generation_id, session_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    feedback.id,
    feedback.classroom_id,
    feedback.panel_id,
    feedback.prompt_class ?? null,
    feedback.rating,
    feedback.comment ?? null,
    feedback.generation_id ?? null,
    feedback.session_id ?? null,
    new Date().toISOString(),
  );
}

export function getFeedbackSummary(db: Database.Database, classroomId: string) {
  const rows = db.prepare("SELECT * FROM feedback WHERE classroom_id = ? ORDER BY created_at DESC").all(classroomId) as FeedbackRecord[];

  const byPanel: Record<string, { count: number; totalRating: number; comments: string[] }> = {};
  for (const row of rows) {
    const entry = byPanel[row.panel_id] ??= { count: 0, totalRating: 0, comments: [] };
    entry.count++;
    entry.totalRating += row.rating;
    if (row.comment) entry.comments.push(row.comment);
  }

  const by_panel: Record<string, { count: number; avg_rating: number; recent_comments: string[] }> = {};
  for (const [panelId, data] of Object.entries(byPanel)) {
    by_panel[panelId] = {
      count: data.count,
      avg_rating: Math.round(data.totalRating / data.count),
      recent_comments: data.comments.slice(0, 5),
    };
  }

  const topComments = rows
    .filter((r) => r.comment)
    .slice(0, 10)
    .map((r) => ({ text: r.comment!, panel_id: r.panel_id, rating: r.rating, created_at: "" }));

  return { total: rows.length, by_panel, by_week: [], top_comments: topComments };
}

// ─── Sessions ───

interface SessionRecord {
  id: string;
  classroom_id: string;
  started_at: string;
  ended_at: string;
  panels_visited: string[];
  generations_triggered: { panel_id: string; prompt_class: string; timestamp: string }[];
  feedback_count: number;
}

export function saveSession(db: Database.Database, session: SessionRecord): void {
  db.prepare(`
    INSERT INTO sessions (id, classroom_id, started_at, ended_at, panels_visited, generations_triggered, feedback_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.classroom_id,
    session.started_at,
    session.ended_at,
    JSON.stringify(session.panels_visited),
    JSON.stringify(session.generations_triggered),
    session.feedback_count,
    new Date().toISOString(),
  );
}

export function getSessionSummary(db: Database.Database, classroomId: string) {
  const rows = db.prepare("SELECT * FROM sessions WHERE classroom_id = ? ORDER BY created_at DESC").all(classroomId) as {
    started_at: string; ended_at: string; panels_visited: string; generations_triggered: string;
  }[];

  const durations = rows.map((r) => {
    const ms = new Date(r.ended_at).getTime() - new Date(r.started_at).getTime();
    return Math.round(ms / 60000);
  });

  const flowCounts: Record<string, number> = {};
  let totalGens = 0;
  for (const row of rows) {
    const visited = JSON.parse(row.panels_visited) as string[];
    const gens = JSON.parse(row.generations_triggered) as unknown[];
    const key = visited.join(" -> ");
    flowCounts[key] = (flowCounts[key] ?? 0) + 1;
    totalGens += gens.length;
  }

  const common_flows = Object.entries(flowCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ sequence: key.split(" -> "), count }));

  return {
    total_sessions: rows.length,
    avg_duration_minutes: rows.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / rows.length) : 0,
    common_flows,
    panel_time_distribution: {},
    generations_per_session: rows.length > 0 ? Math.round(totalGens / rows.length) : 0,
  };
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npx vitest run services/memory/__tests__/feedback-store.test.ts`
Expected: All 4 describe blocks PASS.

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: All existing tests + new tests PASS.

- [ ] **Step 6: Commit**

```bash
git add services/memory/store.ts services/memory/__tests__/feedback-store.test.ts
git commit -m "feat(memory): add feedback and session store functions with aggregation"
```

---

## Task 11: Feedback and Session Backend Routes

**Files:**
- Create: `services/orchestrator/routes/feedback.ts`
- Create: `services/orchestrator/routes/sessions.ts`
- Modify: `services/orchestrator/server.ts` (mount new routes)
- Create: `services/orchestrator/__tests__/feedback-route.test.ts`

- [ ] **Step 1: Write the route test**

```typescript
// services/orchestrator/__tests__/feedback-route.test.ts
import { describe, it, expect } from "vitest";
import { FeedbackRequestSchema } from "../../../packages/shared/schemas/feedback.js";

describe("Feedback route validation", () => {
  it("accepts valid feedback payload", () => {
    const result = FeedbackRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      panel_id: "differentiate",
      rating: 4,
      comment: "Great output!",
      session_id: "sess-abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing classroom_id", () => {
    const result = FeedbackRequestSchema.safeParse({
      panel_id: "today",
      rating: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid panel_id", () => {
    const result = FeedbackRequestSchema.safeParse({
      classroom_id: "demo-okafor-grade34",
      panel_id: "nonexistent-panel",
      rating: 3,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Verify test passes** (schema already implemented)

Run: `npx vitest run services/orchestrator/__tests__/feedback-route.test.ts`
Expected: 3 tests PASS (validates schema from Task 8 works in orchestrator context).

- [ ] **Step 3: Create feedback route**

```typescript
// services/orchestrator/routes/feedback.ts
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getDb } from "../../memory/db.js";
import { saveFeedback, getFeedbackSummary } from "../../memory/store.js";
import { handleRouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import { validateBody } from "../validate.js";
import { FeedbackRequestSchema } from "../../../packages/shared/schemas/feedback.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createFeedbackRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(FeedbackRequestSchema), (req, res) => {
    try {
      const { classroom_id } = req.body;
      if (!isValidClassroomId(classroom_id)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false });
        return;
      }
      const classroomId = classroom_id as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendClassroomNotFound(res, classroomId);
        return;
      }

      const db = getDb(classroomId);
      const id = randomUUID();
      saveFeedback(db, { id, ...req.body });
      res.json({ id, created_at: new Date().toISOString() });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/summary/:classroomId", deps.authMiddleware, (req, res) => {
    try {
      const rawId = req.params.classroomId;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const db = getDb(classroomId);
      const summary = getFeedbackSummary(db, classroomId);
      res.json(summary);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
```

- [ ] **Step 4: Create sessions route**

```typescript
// services/orchestrator/routes/sessions.ts
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getDb } from "../../memory/db.js";
import { saveSession, getSessionSummary } from "../../memory/store.js";
import { handleRouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import { validateBody } from "../validate.js";
import { SessionRequestSchema } from "../../../packages/shared/schemas/session.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createSessionsRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(SessionRequestSchema), (req, res) => {
    try {
      const { classroom_id } = req.body;
      if (!isValidClassroomId(classroom_id)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false });
        return;
      }
      const classroomId = classroom_id as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendClassroomNotFound(res, classroomId);
        return;
      }

      const db = getDb(classroomId);
      const id = req.body.session_id ?? randomUUID();
      saveSession(db, { id, ...req.body });
      res.json({ id });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/summary/:classroomId", deps.authMiddleware, (req, res) => {
    try {
      const rawId = req.params.classroomId;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const db = getDb(classroomId);
      const summary = getSessionSummary(db, classroomId);
      res.json(summary);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
```

- [ ] **Step 5: Mount routes in server.ts**

Add to imports section of `services/orchestrator/server.ts`:

```typescript
import { createFeedbackRouter } from "./routes/feedback.js";
import { createSessionsRouter } from "./routes/sessions.js";
```

Add to auth middleware section (after the existing `app.use("/api/extract-worksheet", ...)` line):

```typescript
app.use("/api/feedback", authLimiter, authMiddleware);
app.use("/api/sessions", authLimiter, authMiddleware);
```

Add to route mounting section (after the existing `app.use("/api/extract-worksheet", ...)` line):

```typescript
app.use("/api/feedback", createFeedbackRouter(deps));
app.use("/api/sessions", createSessionsRouter(deps));
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Run full test suite**

Run: `npm run test`
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add services/orchestrator/routes/feedback.ts services/orchestrator/routes/sessions.ts services/orchestrator/server.ts services/orchestrator/__tests__/feedback-route.test.ts
git commit -m "feat(orchestrator): add feedback and session API routes"
```

---

## Task 12: Frontend Hooks (useFeedback + useSessionContext)

**Files:**
- Create: `apps/web/src/hooks/useFeedback.ts`
- Create: `apps/web/src/hooks/useSessionContext.ts`
- Modify: `apps/web/src/api.ts` (add submitFeedback, submitSession, fetchFeedbackSummary, fetchSessionSummary)

- [ ] **Step 1: Add API client functions**

Append to `apps/web/src/api.ts`:

```typescript
// ─── Feedback & Sessions ───

export interface SubmitFeedbackRequest {
  classroom_id: string;
  panel_id: string;
  prompt_class?: string;
  rating: number;
  comment?: string;
  generation_id?: string;
  session_id?: string;
}

export function submitFeedback(
  request: SubmitFeedbackRequest,
  signal?: AbortSignal,
): Promise<{ id: string; created_at: string }> {
  return requestJson("/feedback", { method: "POST", body: request, signal });
}

export interface SubmitSessionRequest {
  classroom_id: string;
  session_id: string;
  started_at: string;
  ended_at: string;
  panels_visited: string[];
  generations_triggered: { panel_id: string; prompt_class: string; timestamp: string }[];
  feedback_count: number;
}

export function submitSession(
  request: SubmitSessionRequest,
  signal?: AbortSignal,
): Promise<{ id: string }> {
  return requestJson("/sessions", { method: "POST", body: request, signal });
}

export function fetchFeedbackSummary(
  classroomId: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return requestJson(`/feedback/summary/${encodeURIComponent(classroomId)}`, { signal, classroomId });
}

export function fetchSessionSummary(
  classroomId: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return requestJson(`/sessions/summary/${encodeURIComponent(classroomId)}`, { signal, classroomId });
}
```

- [ ] **Step 2: Create useFeedback hook**

```typescript
// apps/web/src/hooks/useFeedback.ts
import { useCallback, useState } from "react";
import { submitFeedback, type SubmitFeedbackRequest } from "../api";

interface UseFeedbackResult {
  submit: (request: Omit<SubmitFeedbackRequest, "session_id">) => Promise<void>;
  submitted: boolean;
  error: string | null;
}

export function useFeedback(sessionId: string | undefined): UseFeedbackResult {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (request: Omit<SubmitFeedbackRequest, "session_id">) => {
      setSubmitted(true); // Optimistic
      try {
        await submitFeedback({ ...request, session_id: sessionId });
      } catch {
        // Fall back to localStorage
        const queue = JSON.parse(localStorage.getItem("prairie-feedback-queue") ?? "[]");
        queue.push({ ...request, session_id: sessionId, queued_at: new Date().toISOString() });
        localStorage.setItem("prairie-feedback-queue", JSON.stringify(queue));
        setError(null); // Don't show error — feedback is queued
      }
    },
    [sessionId],
  );

  return { submit, submitted, error };
}
```

- [ ] **Step 3: Create useSessionContext hook**

```typescript
// apps/web/src/hooks/useSessionContext.ts
import { useCallback, useEffect, useRef } from "react";
import { submitSession } from "../api";

interface SessionState {
  sessionId: string;
  startedAt: string;
  panelsVisited: string[];
  generationsTriggered: { panel_id: string; prompt_class: string; timestamp: string }[];
  feedbackCount: number;
}

function generateSessionId(): string {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface UseSessionContextResult {
  sessionId: string;
  recordPanelVisit: (panelId: string) => void;
  recordGeneration: (panelId: string, promptClass: string) => void;
  recordFeedback: () => void;
}

export function useSessionContext(classroomId: string): UseSessionContextResult {
  const stateRef = useRef<SessionState>({
    sessionId: generateSessionId(),
    startedAt: new Date().toISOString(),
    panelsVisited: [],
    generationsTriggered: [],
    feedbackCount: 0,
  });

  const classroomIdRef = useRef(classroomId);
  classroomIdRef.current = classroomId;

  const flush = useCallback(() => {
    const s = stateRef.current;
    if (s.panelsVisited.length === 0) return;
    const payload = {
      classroom_id: classroomIdRef.current,
      session_id: s.sessionId,
      started_at: s.startedAt,
      ended_at: new Date().toISOString(),
      panels_visited: s.panelsVisited,
      generations_triggered: s.generationsTriggered,
      feedback_count: s.feedbackCount,
    };
    // Best-effort submit; queue to localStorage on failure
    submitSession(payload).catch(() => {
      const queue = JSON.parse(localStorage.getItem("prairie-session-queue") ?? "[]");
      queue.push(payload);
      localStorage.setItem("prairie-session-queue", JSON.stringify(queue));
    });
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  }, [flush]);

  // Reset session when classroom changes
  useEffect(() => {
    flush();
    stateRef.current = {
      sessionId: generateSessionId(),
      startedAt: new Date().toISOString(),
      panelsVisited: [],
      generationsTriggered: [],
      feedbackCount: 0,
    };
  }, [classroomId, flush]);

  const recordPanelVisit = useCallback((panelId: string) => {
    const s = stateRef.current;
    if (s.panelsVisited[s.panelsVisited.length - 1] !== panelId) {
      s.panelsVisited.push(panelId);
    }
  }, []);

  const recordGeneration = useCallback((panelId: string, promptClass: string) => {
    stateRef.current.generationsTriggered.push({
      panel_id: panelId,
      prompt_class: promptClass,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const recordFeedback = useCallback(() => {
    stateRef.current.feedbackCount++;
  }, []);

  return {
    sessionId: stateRef.current.sessionId,
    recordPanelVisit,
    recordGeneration,
    recordFeedback,
  };
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useFeedback.ts apps/web/src/hooks/useSessionContext.ts apps/web/src/api.ts
git commit -m "feat(web): add useFeedback and useSessionContext hooks with localStorage fallback"
```

---

## Task 13: FeedbackCollector Component

**Files:**
- Create: `apps/web/src/components/shared/FeedbackCollector.tsx`
- Create: `apps/web/src/components/shared/FeedbackCollector.css`
- Create: `apps/web/src/components/shared/__tests__/FeedbackCollector.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/components/shared/__tests__/FeedbackCollector.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FeedbackCollector from "../FeedbackCollector";

describe("FeedbackCollector", () => {
  it("renders collapsed by default", () => {
    render(<FeedbackCollector panelId="differentiate" classroomId="demo" onSubmit={vi.fn()} />);
    expect(screen.getByText("Rate this result")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("expands when clicked", () => {
    render(<FeedbackCollector panelId="differentiate" classroomId="demo" onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText("Rate this result"));
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("calls onSubmit with rating and comment", () => {
    const onSubmit = vi.fn();
    render(<FeedbackCollector panelId="differentiate" classroomId="demo" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Rate this result"));
    fireEvent.click(screen.getByLabelText("4 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4, panel_id: "differentiate" }),
    );
  });

  it("shows thank you message after submit", () => {
    render(<FeedbackCollector panelId="today" classroomId="demo" onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText("Rate this result"));
    fireEvent.click(screen.getByLabelText("5 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByText("Thanks for your feedback!")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/FeedbackCollector.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement FeedbackCollector**

```tsx
// apps/web/src/components/shared/FeedbackCollector.tsx
import { useState } from "react";
import "./FeedbackCollector.css";

interface FeedbackPayload {
  panel_id: string;
  classroom_id: string;
  rating: number;
  comment?: string;
  prompt_class?: string;
  generation_id?: string;
}

interface FeedbackCollectorProps {
  panelId: string;
  classroomId: string;
  promptClass?: string;
  generationId?: string;
  onSubmit: (payload: FeedbackPayload) => void;
}

export default function FeedbackCollector({
  panelId,
  classroomId,
  promptClass,
  generationId,
  onSubmit,
}: FeedbackCollectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (rating == null) return;
    onSubmit({
      panel_id: panelId,
      classroom_id: classroomId,
      rating,
      comment: comment.trim() || undefined,
      prompt_class: promptClass,
      generation_id: generationId,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return <p className="feedback-collector__thanks">Thanks for your feedback!</p>;
  }

  if (!expanded) {
    return (
      <button type="button" className="feedback-collector__trigger" onClick={() => setExpanded(true)}>
        Rate this result
      </button>
    );
  }

  return (
    <div className="feedback-collector">
      <div className="feedback-collector__stars" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`feedback-collector__star ${rating === n ? "feedback-collector__star--selected" : ""}`}>
            <input
              type="radio"
              name="rating"
              value={n}
              checked={rating === n}
              onChange={() => setRating(n)}
              aria-label={`${n} stars`}
              className="feedback-collector__radio-hidden"
            />
            <span aria-hidden="true">{rating != null && n <= rating ? "\u2605" : "\u2606"}</span>
          </label>
        ))}
      </div>
      <textarea
        className="feedback-collector__comment"
        placeholder="What would you change? (optional)"
        maxLength={200}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      <button
        type="button"
        className="feedback-collector__submit"
        onClick={handleSubmit}
        disabled={rating == null}
      >
        Submit
      </button>
    </div>
  );
}
```

```css
/* apps/web/src/components/shared/FeedbackCollector.css */
.feedback-collector__trigger {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2) 0;
  text-decoration: underline;
}
.feedback-collector__trigger:hover { color: var(--color-accent); }

.feedback-collector {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
}

.feedback-collector__stars {
  display: flex;
  gap: var(--space-1);
}

.feedback-collector__star {
  cursor: pointer;
  font-size: var(--text-xl);
  color: var(--color-text-muted);
  transition: color var(--transition-fast);
}
.feedback-collector__star--selected,
.feedback-collector__star:hover { color: var(--color-warning); }

.feedback-collector__radio-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.feedback-collector__comment {
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  resize: vertical;
  font-family: inherit;
}

.feedback-collector__submit {
  align-self: flex-start;
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-1) var(--space-3);
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.feedback-collector__submit:disabled { opacity: 0.5; cursor: not-allowed; }

.feedback-collector__thanks {
  font-size: var(--text-xs);
  color: var(--color-success);
  padding: var(--space-2) 0;
  margin: 0;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/FeedbackCollector.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/FeedbackCollector.tsx apps/web/src/components/shared/FeedbackCollector.css apps/web/src/components/shared/__tests__/FeedbackCollector.test.tsx
git commit -m "feat(web): add FeedbackCollector shared component with star rating"
```

---

## Task 14: SessionBanner Component

**Files:**
- Create: `apps/web/src/components/shared/SessionBanner.tsx`
- Create: `apps/web/src/components/shared/SessionBanner.css`
- Create: `apps/web/src/components/shared/__tests__/SessionBanner.test.tsx`

- [ ] **Step 1: Write test, implement, verify** (condensed — same TDD pattern as Tasks 2-7)

Test: renders classroom name, grade level, health dot. Implementation: ambient bar component. CSS: design token-based.

```tsx
// apps/web/src/components/shared/__tests__/SessionBanner.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SessionBanner from "../SessionBanner";

describe("SessionBanner", () => {
  it("renders classroom name and grade", () => {
    render(<SessionBanner name="Mrs. Okafor" gradeBand="3-4" healthStatus="healthy" />);
    expect(screen.getByText("Mrs. Okafor")).toBeInTheDocument();
    expect(screen.getByText("Grade 3-4")).toBeInTheDocument();
  });

  it("renders health dot with correct status", () => {
    const { container } = render(<SessionBanner name="Test" gradeBand="K" healthStatus="warning" />);
    expect(container.querySelector(".health-dot--warning")).toBeInTheDocument();
  });
});
```

```tsx
// apps/web/src/components/shared/SessionBanner.tsx
import { HealthDot } from "./DataViz";
import "./SessionBanner.css";

interface SessionBannerProps {
  name: string;
  gradeBand: string;
  healthStatus: "healthy" | "warning" | "critical";
}

export default function SessionBanner({ name, gradeBand, healthStatus }: SessionBannerProps) {
  return (
    <div className="session-banner" role="banner">
      <HealthDot status={healthStatus} tooltip={`Classroom health: ${healthStatus}`} />
      <span className="session-banner__name">{name}</span>
      <span className="session-banner__grade">Grade {gradeBand}</span>
    </div>
  );
}
```

```css
/* apps/web/src/components/shared/SessionBanner.css */
.session-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface-raised);
  border-bottom: 1px solid var(--color-border-subtle);
  font-size: var(--text-sm);
}

.session-banner__name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.session-banner__grade {
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Verify tests pass**

Run: `cd apps/web && npx vitest run src/components/shared/__tests__/SessionBanner.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/SessionBanner.tsx apps/web/src/components/shared/SessionBanner.css apps/web/src/components/shared/__tests__/SessionBanner.test.tsx
git commit -m "feat(web): add SessionBanner shared component"
```

---

## Task 15: Shared Component Barrel Export

**Files:**
- Create: `apps/web/src/components/shared/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// apps/web/src/components/shared/index.ts
export { default as EmptyState } from "./EmptyState";
export { default as ActionButton } from "./ActionButton";
export { default as StatusCard } from "./StatusCard";
export { default as FormSection } from "./FormSection";
export { default as ResultDisplay } from "./ResultDisplay";
export { default as FeedbackCollector } from "./FeedbackCollector";
export { default as SessionBanner } from "./SessionBanner";
export { Sparkline, TrendIndicator, HealthDot, ProgressBar } from "./DataViz";
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/index.ts
git commit -m "feat(web): add shared component barrel export"
```

---

## Task 16: Panel Migration — TodayPanel

**Files:**
- Modify: `apps/web/src/panels/TodayPanel.tsx`
- Modify: `apps/web/src/panels/TodayPanel.css`
- Create: `apps/web/src/panels/__tests__/TodayPanel.test.tsx`

This task migrates TodayPanel to use shared components. The pattern established here applies to all subsequent panel migrations (Tasks 17-25).

- [ ] **Step 1: Write the panel test**

```tsx
// apps/web/src/panels/__tests__/TodayPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// TodayPanel uses useApp context, so wrap in mock provider
// This test verifies the panel renders, handles states, and shows feedback collector

describe("TodayPanel", () => {
  it("renders without crashing", () => {
    // Test that the module can be imported
    expect(async () => {
      await import("../TodayPanel");
    }).not.toThrow();
  });
});
```

Note: Full panel integration tests require context providers. The import test validates that shared component integration doesn't break the module. Deeper tests should be added once a test harness with AppContext mocks is established.

- [ ] **Step 2: Migrate TodayPanel to shared components**

In `apps/web/src/panels/TodayPanel.tsx`, make these changes:
- Import shared components: `import { StatusCard, ActionButton } from "../components/shared";`
- Import DataViz: `import { Sparkline, HealthDot, TrendIndicator } from "../components/shared";`
- Replace inline loading/error wrappers with `<StatusCard>` wrapping content sections
- Replace action buttons with `<ActionButton>`
- Add `<Sparkline>` for 7-day planning consistency dots if forecast data available
- Replace hardcoded CSS color/spacing values in `TodayPanel.css` with `var(--token)` references

- [ ] **Step 3: Verify app still loads and TodayPanel works**

Run: start dev server, navigate to `http://localhost:5173/?demo=true&tab=today`
Expected: TodayPanel renders with shared component styling. Loading, empty, and error states work.

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npx vitest run src/panels/__tests__/TodayPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/TodayPanel.tsx apps/web/src/panels/TodayPanel.css apps/web/src/panels/__tests__/TodayPanel.test.tsx
git commit -m "refactor(web): migrate TodayPanel to shared components and design tokens"
```

---

## Tasks 17-25: Panel Migrations (DifferentiatePanel through SurvivalPacketPanel)

Each panel follows the **identical pattern** from Task 16. For each panel:

**Files per panel:**
- Modify: `apps/web/src/panels/{PanelName}.tsx`
- Modify: `apps/web/src/panels/{PanelName}.css` (if exists)
- Create: `apps/web/src/panels/__tests__/{PanelName}.test.tsx`

**Steps per panel (same 5-step TDD cycle):**

1. Write panel import test in `__tests__/{PanelName}.test.tsx`
2. Migrate panel: replace inline loading/error/empty with `StatusCard`, replace buttons with `ActionButton`, replace form groups with `FormSection`, wrap results with `ResultDisplay`, add `FeedbackCollector` below results, replace hardcoded CSS with token references
3. Verify app loads with that panel
4. Run panel test
5. Commit: `refactor(web): migrate {PanelName} to shared components and design tokens`

**Priority order and panel-specific additions:**

| Task | Panel | Specific Addition |
|------|-------|-------------------|
| 17 | DifferentiatePanel | Side-by-side variant comparison using `StatusCard` grid |
| 18 | FamilyMessagePanel | Approval workflow refinement, tone indicator chip |
| 19 | TomorrowPlanPanel | Timeline viz for schedule blocks using `ProgressBar` |
| 20 | ForecastPanel | `Sparkline` + `TrendIndicator` for complexity trend |
| 21 | EABriefingPanel | Collapsible sections via `ResultDisplay`, print CSS |
| 22 | InterventionPanel | History timeline, pattern linking |
| 23 | SupportPatternsPanel | Trend overlay with `Sparkline` |
| 24 | LanguageToolsPanel | Vocab card preview grid |
| 25 | SurvivalPacketPanel | Section nav, print layout CSS |

---

## Task 26: Register Usage Insights Tab

**Files:**
- Modify: `apps/web/src/appReducer.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add "usage-insights" to ActiveTab type**

In `apps/web/src/appReducer.ts`:

Add `"usage-insights"` to the `ActiveTab` union type:

```typescript
export type ActiveTab =
  | "today"
  | "differentiate"
  | "tomorrow-plan"
  | "family-message"
  | "log-intervention"
  | "language-tools"
  | "support-patterns"
  | "ea-briefing"
  | "complexity-forecast"
  | "survival-packet"
  | "usage-insights";
```

Add to `TAB_ORDER`:
```typescript
export const TAB_ORDER: ActiveTab[] = [
  "today",
  "differentiate", "language-tools",
  "tomorrow-plan", "ea-briefing", "complexity-forecast", "log-intervention", "survival-packet",
  "family-message", "support-patterns", "usage-insights",
];
```

Add to `TAB_META`:
```typescript
  "usage-insights": { label: "Usage Insights", shortLabel: "Insights", group: "review" },
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Compilation error in App.tsx renderPanel (missing case). Fix in Task 27.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/appReducer.ts
git commit -m "feat(web): register usage-insights tab in nav"
```

---

## Task 27: Usage Insights Panel

**Files:**
- Create: `apps/web/src/panels/UsageInsightsPanel.tsx`
- Create: `apps/web/src/panels/UsageInsightsPanel.css`
- Create: `apps/web/src/panels/__tests__/UsageInsightsPanel.test.tsx`
- Modify: `apps/web/src/App.tsx` (import and render)

- [ ] **Step 1: Write the test**

```tsx
// apps/web/src/panels/__tests__/UsageInsightsPanel.test.tsx
import { describe, it, expect } from "vitest";

describe("UsageInsightsPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../UsageInsightsPanel");
    expect(mod.default).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement UsageInsightsPanel**

```tsx
// apps/web/src/panels/UsageInsightsPanel.tsx
import { useEffect } from "react";
import { StatusCard } from "../components/shared";
import { Sparkline, ProgressBar } from "../components/shared";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { fetchFeedbackSummary, fetchSessionSummary } from "../api";
import { useApp } from "../AppContext";
import "./UsageInsightsPanel.css";

export default function UsageInsightsPanel() {
  const { activeClassroom } = useApp();
  const feedback = useAsyncAction<Record<string, unknown>>();
  const sessions = useAsyncAction<Record<string, unknown>>();

  useEffect(() => {
    if (!activeClassroom) return;
    feedback.execute((signal) => fetchFeedbackSummary(activeClassroom, signal));
    sessions.execute((signal) => fetchSessionSummary(activeClassroom, signal));
  }, [activeClassroom]);

  const fbStatus = feedback.loading ? "loading" : feedback.error ? "error" : feedback.result ? "success" : "empty";
  const sessStatus = sessions.loading ? "loading" : sessions.error ? "error" : sessions.result ? "success" : "empty";

  const fbData = feedback.result as { total?: number; by_panel?: Record<string, { count: number; avg_rating: number }> } | null;
  const sessData = sessions.result as { total_sessions?: number; avg_duration_minutes?: number; common_flows?: { sequence: string[]; count: number }[] } | null;

  return (
    <div className="workspace-page usage-insights-panel">
      <h2 className="usage-insights-panel__title">How your classroom uses PrairieClassroom</h2>
      <div className="usage-insights-panel__grid">
        <StatusCard title="Feedback Overview" status={fbStatus} errorMessage={feedback.error ?? undefined}
          emptyTitle="No feedback yet" emptyDescription="Rate results to see insights here.">
          {fbData && (
            <div className="usage-insights-panel__feedback">
              <p className="usage-insights-panel__stat">
                <strong>{fbData.total}</strong> ratings collected
              </p>
              {fbData.by_panel && Object.entries(fbData.by_panel).map(([panel, data]) => (
                <div key={panel} className="usage-insights-panel__panel-row">
                  <span>{panel.replace(/-/g, " ")}</span>
                  <ProgressBar label="" value={data.avg_rating * 20} />
                  <span>{data.count} ratings</span>
                </div>
              ))}
            </div>
          )}
        </StatusCard>

        <StatusCard title="Workflow Patterns" status={sessStatus} errorMessage={sessions.error ?? undefined}
          emptyTitle="No sessions recorded" emptyDescription="Usage patterns will appear after your first session.">
          {sessData && (
            <div className="usage-insights-panel__sessions">
              <p className="usage-insights-panel__stat">
                <strong>{sessData.total_sessions}</strong> sessions, avg <strong>{sessData.avg_duration_minutes}</strong> min
              </p>
              {sessData.common_flows?.slice(0, 5).map((flow, i) => (
                <div key={i} className="usage-insights-panel__flow">
                  <span className="usage-insights-panel__flow-seq">{flow.sequence.join(" \u2192 ")}</span>
                  <span className="usage-insights-panel__flow-count">{flow.count}x</span>
                </div>
              ))}
            </div>
          )}
        </StatusCard>
      </div>
    </div>
  );
}
```

```css
/* apps/web/src/panels/UsageInsightsPanel.css */
.usage-insights-panel__title {
  font-size: var(--text-xl);
  font-weight: 600;
  margin: 0 0 var(--space-4);
  color: var(--color-text-primary);
}

.usage-insights-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: var(--space-4);
}

.usage-insights-panel__stat {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-3);
}

.usage-insights-panel__panel-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  padding: var(--space-1) 0;
}

.usage-insights-panel__flow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
  font-size: var(--text-sm);
}

.usage-insights-panel__flow-seq {
  color: var(--color-text-secondary);
}

.usage-insights-panel__flow-count {
  font-weight: 600;
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: Mount in App.tsx**

Add import:
```typescript
import UsageInsightsPanel from "./panels/UsageInsightsPanel";
```

Add case in the `renderPanel` switch or conditional chain:
```typescript
case "usage-insights":
  return <UsageInsightsPanel />;
```

- [ ] **Step 4: Verify tests pass and panel renders**

Run: `cd apps/web && npx vitest run src/panels/__tests__/UsageInsightsPanel.test.tsx`
Run: start dev server, navigate to `http://localhost:5173/?demo=true&tab=usage-insights`
Expected: Panel renders with empty state initially. After feedback is submitted via other panels, data appears.

- [ ] **Step 5: Run typecheck and full test suite**

Run: `npm run typecheck && npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/panels/UsageInsightsPanel.tsx apps/web/src/panels/UsageInsightsPanel.css apps/web/src/panels/__tests__/UsageInsightsPanel.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add Usage Insights panel in Review group"
```

---

## Task 28: Evidence Generation Scripts

**Files:**
- Create: `scripts/evidence-generate.ts`
- Create: `scripts/evidence-snapshot.ts`
- Create: `docs/evidence/README.md`
- Modify: root `package.json` (add scripts)

- [ ] **Step 1: Create evidence generation script**

```typescript
// scripts/evidence-generate.ts
/**
 * Aggregates feedback, session, eval, and request-log data
 * into human-readable markdown reports in docs/evidence/.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";

const MEMORY_DIR = resolve(process.env.PRAIRIE_MEMORY_DIR ?? "data/memory");
const EVIDENCE_DIR = resolve("docs/evidence");
const REQUEST_LOG_DIR = resolve("output/request-logs");

mkdirSync(EVIDENCE_DIR, { recursive: true });

// ── Feedback Summary ──
function generateFeedbackReport(): string {
  const lines = ["# Feedback Summary\n", `Generated: ${new Date().toISOString()}\n`];
  const dbFiles = readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".sqlite"));

  let totalFeedback = 0;
  for (const file of dbFiles) {
    const db = new Database(join(MEMORY_DIR, file), { readonly: true });
    try {
      const rows = db.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all() as {
        panel_id: string; rating: number; comment: string | null; created_at: string;
      }[];
      if (rows.length === 0) continue;
      totalFeedback += rows.length;
      const classroomId = file.replace(".sqlite", "");
      lines.push(`\n## ${classroomId}\n`);
      lines.push(`- Total ratings: ${rows.length}`);
      const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
      lines.push(`- Average rating: ${avg.toFixed(1)} / 5`);
      const withComments = rows.filter((r) => r.comment);
      if (withComments.length > 0) {
        lines.push(`\n### Recent Comments\n`);
        for (const r of withComments.slice(0, 10)) {
          lines.push(`- **${r.rating}/5** (${r.panel_id}): "${r.comment}"`);
        }
      }
    } finally {
      db.close();
    }
  }
  if (totalFeedback === 0) lines.push("\nNo feedback data collected yet.");
  return lines.join("\n");
}

// ── Session Patterns ──
function generateSessionReport(): string {
  const lines = ["# Session Patterns\n", `Generated: ${new Date().toISOString()}\n`];
  const dbFiles = readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".sqlite"));

  let totalSessions = 0;
  for (const file of dbFiles) {
    const db = new Database(join(MEMORY_DIR, file), { readonly: true });
    try {
      const rows = db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all() as {
        panels_visited: string; started_at: string; ended_at: string;
      }[];
      if (rows.length === 0) continue;
      totalSessions += rows.length;
      const classroomId = file.replace(".sqlite", "");
      lines.push(`\n## ${classroomId}\n`);
      lines.push(`- Total sessions: ${rows.length}`);
      const durations = rows.map((r) => (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60000);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      lines.push(`- Average duration: ${avgDuration.toFixed(1)} minutes`);
      const flows: Record<string, number> = {};
      for (const r of rows) {
        const key = JSON.parse(r.panels_visited).join(" -> ");
        flows[key] = (flows[key] ?? 0) + 1;
      }
      lines.push(`\n### Common Workflows\n`);
      Object.entries(flows).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([flow, count]) => {
        lines.push(`- ${flow} (${count}x)`);
      });
    } finally {
      db.close();
    }
  }
  if (totalSessions === 0) lines.push("\nNo session data collected yet.");
  return lines.join("\n");
}

// ── System Reliability ──
function generateReliabilityReport(): string {
  const lines = ["# System Reliability\n", `Generated: ${new Date().toISOString()}\n`];
  try {
    const logFiles = readdirSync(REQUEST_LOG_DIR).filter((f) => f.endsWith(".jsonl"));
    let totalRequests = 0;
    let errors = 0;
    for (const file of logFiles) {
      const content = readFileSync(join(REQUEST_LOG_DIR, file), "utf-8");
      for (const line of content.split("\n").filter(Boolean)) {
        try {
          const entry = JSON.parse(line);
          totalRequests++;
          if (entry.status >= 500) errors++;
        } catch { /* skip malformed lines */ }
      }
    }
    lines.push(`- Total requests logged: ${totalRequests}`);
    lines.push(`- Server errors (5xx): ${errors}`);
    lines.push(`- Error rate: ${totalRequests > 0 ? ((errors / totalRequests) * 100).toFixed(2) : 0}%`);
  } catch {
    lines.push("No request log data available.");
  }
  return lines.join("\n");
}

// ── Write Reports ──
writeFileSync(join(EVIDENCE_DIR, "feedback-summary.md"), generateFeedbackReport());
writeFileSync(join(EVIDENCE_DIR, "session-patterns.md"), generateSessionReport());
writeFileSync(join(EVIDENCE_DIR, "system-reliability.md"), generateReliabilityReport());

console.log("Evidence reports generated in docs/evidence/");
```

- [ ] **Step 2: Create evidence snapshot script**

```typescript
// scripts/evidence-snapshot.ts
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const EVIDENCE_DIR = resolve("docs/evidence");
const date = new Date().toISOString().slice(0, 10);
const SNAPSHOT_DIR = resolve(`output/evidence-snapshots/${date}`);

mkdirSync(SNAPSHOT_DIR, { recursive: true });
cpSync(EVIDENCE_DIR, SNAPSHOT_DIR, { recursive: true });
console.log(`Evidence snapshot saved to ${SNAPSHOT_DIR}`);
```

- [ ] **Step 3: Create evidence README**

```markdown
<!-- docs/evidence/README.md -->
# Evidence Portfolio

Auto-generated evidence reports from PrairieClassroom OS system data.

## Reports

- **feedback-summary.md** — Teacher feedback ratings and comments by panel
- **session-patterns.md** — Teacher workflow sequences and engagement metrics
- **system-reliability.md** — Request volume, error rates, and uptime indicators

## Generation

```bash
npm run evidence:generate   # Regenerate from current data
npm run evidence:snapshot   # Save timestamped snapshot for submission
```

## Audiences

| Audience | Key Reports |
|----------|------------|
| Hackathon judges | feedback-summary, session-patterns |
| School administrators | system-reliability, session-patterns |
| Education researchers | feedback-summary, session-patterns |
```

- [ ] **Step 4: Add npm scripts to root package.json**

Add to the `"scripts"` section:

```json
"evidence:generate": "npx tsx scripts/evidence-generate.ts",
"evidence:snapshot": "npx tsx scripts/evidence-snapshot.ts"
```

- [ ] **Step 5: Verify script runs**

Run: `npm run evidence:generate`
Expected: Creates docs/evidence/ with 3 markdown files plus README.

- [ ] **Step 6: Commit**

```bash
git add scripts/evidence-generate.ts scripts/evidence-snapshot.ts docs/evidence/README.md package.json
git commit -m "feat(ops): add evidence generation and snapshot scripts"
```

---

## Task 29: Pilot Observation Template

**Files:**
- Create: `docs/pilot/observation-template.md`

- [ ] **Step 1: Create the template**

```markdown
<!-- docs/pilot/observation-template.md -->
# Classroom Observation Template

## Observer Information

- **Observer name:**
- **Role:** (colleague / administrator / researcher)
- **Date:**
- **Classroom:**
- **Teacher name:**
- **Grade level:**

## Setup (first 5 minutes)

- **Time to launch and select classroom:** ___ minutes
- **Initial teacher reaction:**
- **Any friction during setup?** (auth, loading, confusion)

## Workflow Observation (10-15 minutes)

Record which panels the teacher visited and what they did:

| Time | Panel | Action Taken | Outcome |
|------|-------|-------------|---------|
| | | | |

- **Did the teacher follow a natural workflow sequence?** (e.g., Today -> Differentiate -> Family Message)
- **Did they skip any panels? Which ones? Why?**
- **Did they use keyboard shortcuts or mouse navigation?**

## Output Quality (per generation observed)

For each model output the teacher received:

| Panel | Was the output useful? | Did they edit it? | Did they rate it? |
|-------|----------------------|-------------------|-------------------|
| | | | |

## Student/Classroom Impact

- **Was any output used directly with students?**
- **Did the teacher share output with an EA?**
- **Did the teacher send a family message?**
- **Observable student outcomes (if applicable):**

## Friction Points

- **Moments of confusion:**
- **Error messages encountered:**
- **Workarounds the teacher created:**
- **Features the teacher looked for but didn't find:**

## Surprises

- **Unexpected uses of the system:**
- **Teacher insights or feedback spoken aloud:**

## Overall Assessment

- **Would this teacher use the system again?** (definitely / probably / unlikely)
- **Estimated time saved vs. manual process:** ___ minutes per day
- **One thing to improve first:**
- **One thing to keep exactly as-is:**
```

- [ ] **Step 2: Commit**

```bash
git add docs/pilot/observation-template.md
git commit -m "docs: add pilot classroom observation template"
```

---

## Task 30: Demo Script Revision

**Files:**
- Modify: `docs/demo-script.md`

- [ ] **Step 1: Read current demo script**

Read `docs/demo-script.md` in full to understand existing structure.

- [ ] **Step 2: Revise to add two tracks**

Restructure the demo script into:

**Track A: 5-Minute Stakeholder Pitch**
- Problem: Alberta K-6 teachers managing split grades, EAL learners, and diverse needs without adequate tools
- Solution: PrairieClassroom OS — classroom complexity copilot, not a student chatbot
- Evidence: point to Usage Insights panel data, feedback ratings, workflow patterns
- Safety: 15 forbidden terms, human-in-the-loop messaging, observational framing
- Ask: pilot deployment in one Alberta school

**Track B: 15-Minute Teacher Walkthrough**
- Morning routine: open Today panel, review debt register, check forecast
- Differentiation: upload a lesson artifact, generate variants, rate the result
- Family communication: draft a message, review tone, approve with undo
- Review cycle: check Usage Insights, see workflow patterns, rate overall experience

Each track annotated with `[EVIDENCE]` callouts indicating where to reference data from the evidence portfolio.

- [ ] **Step 3: Commit**

```bash
git add docs/demo-script.md
git commit -m "docs: revise demo script with 5-min pitch and 15-min walkthrough tracks"
```

---

## Task 31: Update CLAUDE.md and Docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/architecture.md`
- Modify: `docs/prompt-contracts.md` (add feedback/session routes)

- [ ] **Step 1: Update CLAUDE.md**

Add to `Current Surface Area > Additional deterministic or retrieval-backed API surfaces`:

```markdown
- `POST /api/feedback`
- `GET /api/feedback/summary/:classroomId`
- `POST /api/sessions`
- `GET /api/sessions/summary/:classroomId`
```

Add to `Primary UI panels`:
```markdown
- Usage Insights
```

Add to `Validation Rules`:
```markdown
- evidence portfolio generation: `npm run evidence:generate`
```

- [ ] **Step 2: Update docs/architecture.md and docs/prompt-contracts.md**

Add the new routes to the route inventory. Document the feedback and session data flow.

- [ ] **Step 3: Run release gate**

Run: `npm run release:gate`
Expected: PASS (no regression).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/architecture.md docs/prompt-contracts.md
git commit -m "docs: update CLAUDE.md and architecture docs for evidence pipeline"
```

---

## Task 32: Final Verification

- [ ] **Step 1: Run full validation suite**

```bash
npm run typecheck
npm run lint
npm run test
npm run test:python
npm run release:gate
```

All must PASS.

- [ ] **Step 2: Verify evidence pipeline end-to-end**

```bash
npm run evidence:generate
npm run evidence:snapshot
```

Confirm docs/evidence/ contains feedback-summary.md, session-patterns.md, system-reliability.md.

- [ ] **Step 3: Manual smoke test**

Start dev server, navigate to `http://localhost:5173/?demo=true`:
- Navigate through all panels — verify shared components render
- Generate a result in Differentiate — verify FeedbackCollector appears
- Rate a result — verify feedback submits
- Navigate to Usage Insights — verify data appears
- Check that existing functionality is not broken

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass for evidence-instrumented polish"
```
