# Teacher QoL Pass — Tier 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four additive teacher quality-of-life features — shortcut cheat-sheet, Tomorrow Plan cart chip, visible draft-restore affordance, and a command palette — that cut navigation cost and "where was I?" friction inside the existing 12-panel surface.

**Architecture:** Pure UI additions on top of existing `AppContext` + `appReducer`. No new API endpoints, no shared schema changes, no dependency additions. Every feature composes existing infrastructure: `TAB_META`/`TAB_ORDER`, `useFormPersistence`, `appendTomorrowNote`, the keyboard-handler at `App.tsx:411`, and the existing focus-trap / toast / prefill plumbing.

**Tech Stack:** React 18, TypeScript (strict), Vite, Vitest + React Testing Library, CSS custom properties (tokens.css). No new runtime deps.

**Reference spec:** `docs/specs/2026-04-16-teacher-qol-pass-tier1-design.md`

**Ship order (independent, smallest → largest):**
1. Part A — Shortcut Sheet (Tasks 1–3)
2. Part B — Tomorrow Chip (Tasks 4–7)
3. Part C — Draft Restore Visibility (Tasks 8–10)
4. Part D — Command Palette (Tasks 11–16)

---

## File Structure

Files created or modified across the plan:

**New files**
- `apps/web/src/components/ShortcutSheet.tsx` — keyboard cheat-sheet dialog
- `apps/web/src/components/ShortcutSheet.css`
- `apps/web/src/components/__tests__/ShortcutSheet.test.tsx`
- `apps/web/src/components/TomorrowChip.tsx` — header chip + popover
- `apps/web/src/components/TomorrowChip.css`
- `apps/web/src/components/__tests__/TomorrowChip.test.tsx`
- `apps/web/src/components/DraftRestoreChip.tsx` — "Resume your draft?" UI
- `apps/web/src/components/DraftRestoreChip.css`
- `apps/web/src/components/__tests__/DraftRestoreChip.test.tsx`
- `apps/web/src/components/CommandPalette.tsx` — palette dialog + results
- `apps/web/src/components/CommandPalette.css`
- `apps/web/src/components/__tests__/CommandPalette.test.tsx`
- `apps/web/src/hooks/usePaletteEntries.ts` — memoizes palette data from context
- `apps/web/src/hooks/__tests__/usePaletteEntries.test.tsx`
- `apps/web/src/hooks/__tests__/useFormPersistence.test.tsx` — extend existing

**Modified files**
- `apps/web/src/App.tsx` — keydown extension for `?` and `Cmd/Ctrl+K`, mount three new dialogs, mount chip
- `apps/web/src/appReducer.ts` — add `REMOVE_TOMORROW_NOTE` action + case
- `apps/web/src/AppContext.tsx` — expose `removeTomorrowNote`
- `apps/web/src/components/AppFooter.tsx` — `?` trigger icon
- `apps/web/src/hooks/useFormPersistence.ts` — add timestamp + content-threshold + `hasPendingDraft`
- `apps/web/src/components/MessageComposer.tsx` — wire DraftRestoreChip to hook
- `apps/web/src/components/InterventionLogger.tsx` — wire DraftRestoreChip to hook
- `apps/web/src/components/ArtifactUpload.tsx` — wire DraftRestoreChip to hook
- `apps/web/src/components/TeacherReflection.tsx` — wire DraftRestoreChip to hook
- `apps/web/src/__tests__/appReducer.tomorrowNotes.test.ts` — add remove coverage

---

# Part A — Shortcut Sheet

Smallest feature. Validates the keyboard-handler extension pattern for later parts.

## Task 1: ShortcutSheet component

**Files:**
- Create: `apps/web/src/components/ShortcutSheet.tsx`
- Create: `apps/web/src/components/ShortcutSheet.css`
- Create: `apps/web/src/components/__tests__/ShortcutSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/ShortcutSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShortcutSheet from "../ShortcutSheet";

describe("ShortcutSheet", () => {
  it("renders nothing when closed", () => {
    render(<ShortcutSheet open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders shortcut rows when open", () => {
    render(<ShortcutSheet open={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText(/jump to panel/i)).toBeInTheDocument();
    expect(screen.getByText(/command palette/i)).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<ShortcutSheet open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<ShortcutSheet open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("shortcut-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/__tests__/ShortcutSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/src/components/ShortcutSheet.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./ShortcutSheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  label: string;
}

const ROWS: ShortcutRow[] = [
  { keys: ["1", "–", "9", ",", "0"], label: "Jump to panel (1–9 primary, 0 for tenth)" },
  { keys: ["⌘", "K"], label: "Command palette" },
  { keys: ["?"], label: "Show this keyboard shortcut sheet" },
  { keys: ["Esc"], label: "Close any open dialog or overlay" },
];

export default function ShortcutSheet({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(cardRef, open);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="shortcut-sheet__backdrop"
      data-testid="shortcut-sheet-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="shortcut-sheet__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcut-sheet-title" className="shortcut-sheet__title">Keyboard shortcuts</h2>
        <p className="shortcut-sheet__subtitle">Press <kbd>Esc</kbd> to close.</p>
        <dl className="shortcut-sheet__list">
          {ROWS.map((row, i) => (
            <div key={i} className="shortcut-sheet__row">
              <dt className="shortcut-sheet__keys">
                {row.keys.map((k, j) => (
                  k === "–" || k === "," ? (
                    <span key={j} className="shortcut-sheet__sep">{k === "–" ? "–" : ", "}</span>
                  ) : (
                    <kbd key={j}>{k}</kbd>
                  )
                ))}
              </dt>
              <dd className="shortcut-sheet__label">{row.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
```

Create `apps/web/src/components/ShortcutSheet.css`:

```css
.shortcut-sheet__backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--color-surface-0) 60%, transparent);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 1000;
  animation: shortcut-sheet-fade 160ms ease-out;
}

.shortcut-sheet__card {
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  min-width: 360px;
  max-width: 520px;
  box-shadow: var(--shadow-overlay);
}

.shortcut-sheet__title {
  font-family: var(--font-display);
  font-size: 20px;
  margin: 0 0 4px;
}

.shortcut-sheet__subtitle {
  color: var(--color-text-secondary);
  font-size: 13px;
  margin: 0 0 20px;
}

.shortcut-sheet__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
}

.shortcut-sheet__row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 16px;
  align-items: center;
}

.shortcut-sheet__keys {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin: 0;
}

.shortcut-sheet__keys kbd {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
  padding: 2px 8px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  color: var(--color-text-primary);
  box-shadow: inset 0 -1px 0 var(--color-border-subtle);
}

.shortcut-sheet__sep {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.shortcut-sheet__label {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

@keyframes shortcut-sheet-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run src/components/__tests__/ShortcutSheet.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ShortcutSheet.tsx apps/web/src/components/ShortcutSheet.css apps/web/src/components/__tests__/ShortcutSheet.test.tsx
git commit -m "feat(web): add ShortcutSheet component for keyboard cheat-sheet"
```

## Task 2: Wire `?` key + input-focus skip + mount in App

**Files:**
- Modify: `apps/web/src/App.tsx:410-432` (extend existing handleKeydown)
- Test: covered by ShortcutSheet unit test + manual smoke

- [ ] **Step 1: Add ShortcutSheet import and state**

In `apps/web/src/App.tsx`, after the existing component imports (~line 38), add:

```tsx
import ShortcutSheet from "./components/ShortcutSheet";
```

Inside the `App` component, alongside `classroomMenuOpen` (~line 99), add:

```tsx
const [shortcutSheetOpen, setShortcutSheetOpen] = useState(false);
```

- [ ] **Step 2: Extend the existing keydown handler**

Locate `handleKeydown` in `App.tsx` at line 411. The current handler short-circuits on input/textarea/select focus. Extend it to handle `?`:

Replace the body of `handleKeydown` with:

```tsx
function handleKeydown(e: KeyboardEvent) {
  const el = document.activeElement;
  const tag = (el?.tagName ?? "").toLowerCase();
  const isEditable = tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement)?.isContentEditable;

  // "?" → open shortcut sheet (not when typing)
  if (e.key === "?" && !isEditable) {
    e.preventDefault();
    setShortcutSheetOpen(true);
    return;
  }

  if (isEditable) return;

  // "1"–"9" → tabs 1–9; "0" → tab 10. Tabs 11–12 have no shortcut.
  if (e.key === "0" && TAB_ORDER.length >= 10) {
    e.preventDefault();
    setActiveTab(TAB_ORDER[9]);
    return;
  }
  const digit = Number.parseInt(e.key, 10);
  if (digit >= 1 && digit <= 9 && digit <= TAB_ORDER.length) {
    e.preventDefault();
    setActiveTab(TAB_ORDER[digit - 1]);
  }
}
```

- [ ] **Step 3: Mount the ShortcutSheet dialog**

Near the bottom of `App`'s returned JSX, alongside other dialogs (search for `<OnboardingOverlay` or `<ClassroomAccessDialog`), add:

```tsx
<ShortcutSheet open={shortcutSheetOpen} onClose={() => setShortcutSheetOpen(false)} />
```

- [ ] **Step 4: Verify with typecheck + lint + test**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

Run: `cd apps/web && npx vitest run`
Expected: all existing + new tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): wire ? key to open ShortcutSheet, skip when input focused"
```

## Task 3: Footer trigger button

**Files:**
- Modify: `apps/web/src/components/AppFooter.tsx`

- [ ] **Step 1: Read AppFooter to understand structure**

Open `apps/web/src/components/AppFooter.tsx`. Confirm it accepts props or is a simple presentational component.

- [ ] **Step 2: Lift shortcut-sheet state up via a prop**

If `AppFooter` currently takes no props, add one:

```tsx
interface Props {
  onOpenShortcuts?: () => void;
}

export default function AppFooter({ onOpenShortcuts }: Props) {
  // ... existing code
}
```

Render a subtle `?` icon button at the right of the footer, alongside any existing links:

```tsx
{onOpenShortcuts && (
  <button
    type="button"
    className="app-footer__shortcuts-btn"
    onClick={onOpenShortcuts}
    aria-label="Keyboard shortcuts"
    title="Keyboard shortcuts (press ?)"
  >
    ?
  </button>
)}
```

Add minimal styling in the same file's CSS (or inline with existing footer styles):

```css
.app-footer__shortcuts-btn {
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.app-footer__shortcuts-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
```

- [ ] **Step 3: Pass callback from App.tsx**

In `App.tsx`, find the `<AppFooter ...` invocation. Update it to:

```tsx
<AppFooter onOpenShortcuts={() => setShortcutSheetOpen(true)} />
```

- [ ] **Step 4: Verify**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/AppFooter.tsx apps/web/src/App.tsx
git commit -m "feat(web): add footer ? button to open ShortcutSheet for mouse users"
```

---

# Part B — Tomorrow Plan Cart Chip

## Task 4: Add `REMOVE_TOMORROW_NOTE` reducer action

**Files:**
- Modify: `apps/web/src/appReducer.ts:234, 502-512`
- Modify: `apps/web/src/__tests__/appReducer.tomorrowNotes.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/src/__tests__/appReducer.tomorrowNotes.test.ts`:

```ts
describe("appReducer REMOVE_TOMORROW_NOTE", () => {
  beforeEach(() => { localStorage.clear(); });

  it("removes a note by id", () => {
    const state = createInitialState();
    const stateWithNote = appReducer(state, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    const afterRemove = appReducer(stateWithNote, { type: "REMOVE_TOMORROW_NOTE", id: "note-1" });
    expect(afterRemove.tomorrowNotes).toEqual([]);
  });

  it("is a no-op when id is not found", () => {
    const state = createInitialState();
    const stateWithNote = appReducer(state, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    const afterRemove = appReducer(stateWithNote, { type: "REMOVE_TOMORROW_NOTE", id: "does-not-exist" });
    expect(afterRemove.tomorrowNotes).toEqual([SAMPLE_NOTE]);
  });

  it("persists remaining notes to localStorage", () => {
    const note2 = { ...SAMPLE_NOTE, id: "note-2", summary: "another" };
    const state = createInitialState();
    const s1 = appReducer(state, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    const s2 = appReducer(s1, { type: "APPEND_TOMORROW_NOTE", note: note2 });
    appReducer(s2, { type: "REMOVE_TOMORROW_NOTE", id: "note-1" });
    const stored = JSON.parse(localStorage.getItem("prairie-tomorrow-notes") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("note-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/appReducer.tomorrowNotes.test.ts`
Expected: FAIL — action type `REMOVE_TOMORROW_NOTE` does not exist.

- [ ] **Step 3: Add the action type**

In `apps/web/src/appReducer.ts`, extend the `AppAction` union (around line 234):

```ts
  | { type: "APPEND_TOMORROW_NOTE"; note: TomorrowNote }
  | { type: "REMOVE_TOMORROW_NOTE"; id: string }
  | { type: "CLEAR_TOMORROW_NOTES" };
```

Add the case in the reducer, after `APPEND_TOMORROW_NOTE` (around line 508):

```ts
    case "REMOVE_TOMORROW_NOTE": {
      const tomorrowNotes = state.tomorrowNotes.filter((n) => n.id !== action.id);
      try { localStorage.setItem("prairie-tomorrow-notes", JSON.stringify(tomorrowNotes)); } catch { /* noop */ }
      return { ...state, tomorrowNotes };
    }
```

- [ ] **Step 4: Run the test**

Run: `cd apps/web && npx vitest run src/__tests__/appReducer.tomorrowNotes.test.ts`
Expected: PASS (all existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/appReducer.ts apps/web/src/__tests__/appReducer.tomorrowNotes.test.ts
git commit -m "feat(web): add REMOVE_TOMORROW_NOTE reducer action"
```

## Task 5: Expose `removeTomorrowNote` on AppContext

**Files:**
- Modify: `apps/web/src/AppContext.tsx:44-47`
- Modify: `apps/web/src/App.tsx` — wire provider value

- [ ] **Step 1: Extend AppContextValue**

In `apps/web/src/AppContext.tsx`, after the `appendTomorrowNote` line:

```ts
  /** Append a tomorrow note (auto-generates id and createdAt) */
  appendTomorrowNote: (note: Omit<TomorrowNote, "id" | "createdAt">) => void;
  /** Remove a tomorrow note by id */
  removeTomorrowNote: (id: string) => void;
}
```

- [ ] **Step 2: Implement in App.tsx**

In `App.tsx`, locate where `appendTomorrowNote` is defined in the context value (search for `appendTomorrowNote:`). Add a sibling `removeTomorrowNote`:

```tsx
const removeTomorrowNote = useCallback((id: string) => {
  dispatch({ type: "REMOVE_TOMORROW_NOTE", id });
}, []);
```

Then include it in the context value object:

```tsx
removeTomorrowNote,
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/AppContext.tsx apps/web/src/App.tsx
git commit -m "feat(web): expose removeTomorrowNote on AppContext"
```

## Task 6: TomorrowChip component + popover

**Files:**
- Create: `apps/web/src/components/TomorrowChip.tsx`
- Create: `apps/web/src/components/TomorrowChip.css`
- Create: `apps/web/src/components/__tests__/TomorrowChip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/TomorrowChip.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TomorrowChip from "../TomorrowChip";
import type { TomorrowNote } from "../../types";

const NOTE_A: TomorrowNote = {
  id: "a",
  sourcePanel: "differentiate",
  sourceType: "differentiate_material",
  summary: "Variants for Lesson 3.2",
  createdAt: "2026-04-16T10:00:00Z",
};
const NOTE_B: TomorrowNote = { ...NOTE_A, id: "b", summary: "EA brief draft", sourcePanel: "ea-briefing" };

describe("TomorrowChip", () => {
  it("renders nothing when notes empty", () => {
    const { container } = render(
      <TomorrowChip notes={[]} onRemove={() => {}} onReviewAll={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows count of queued notes", () => {
    render(<TomorrowChip notes={[NOTE_A, NOTE_B]} onRemove={() => {}} onReviewAll={() => {}} />);
    expect(screen.getByRole("button", { name: /tomorrow.*2/i })).toBeInTheDocument();
  });

  it("opens popover and lists summaries on click", () => {
    render(<TomorrowChip notes={[NOTE_A, NOTE_B]} onRemove={() => {}} onReviewAll={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /tomorrow/i }));
    expect(screen.getByText("Variants for Lesson 3.2")).toBeInTheDocument();
    expect(screen.getByText("EA brief draft")).toBeInTheDocument();
  });

  it("calls onRemove when a × button is clicked", () => {
    const onRemove = vi.fn();
    render(<TomorrowChip notes={[NOTE_A]} onRemove={onRemove} onReviewAll={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /tomorrow/i }));
    fireEvent.click(screen.getByRole("button", { name: /remove.*variants/i }));
    expect(onRemove).toHaveBeenCalledWith("a");
  });

  it("calls onReviewAll and closes popover", () => {
    const onReviewAll = vi.fn();
    render(<TomorrowChip notes={[NOTE_A]} onRemove={() => {}} onReviewAll={onReviewAll} />);
    fireEvent.click(screen.getByRole("button", { name: /tomorrow/i }));
    fireEvent.click(screen.getByRole("button", { name: /review all/i }));
    expect(onReviewAll).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/__tests__/TomorrowChip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/src/components/TomorrowChip.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import type { TomorrowNote } from "../types";
import "./TomorrowChip.css";

interface Props {
  notes: TomorrowNote[];
  onRemove: (id: string) => void;
  onReviewAll: () => void;
}

export default function TomorrowChip({ notes, onRemove, onReviewAll }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (notes.length === 0) return null;

  function handleReviewAll() {
    setOpen(false);
    onReviewAll();
  }

  return (
    <div className="tomorrow-chip" ref={rootRef}>
      <button
        type="button"
        className="tomorrow-chip__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Tomorrow Plan has ${notes.length} queued ${notes.length === 1 ? "item" : "items"}`}
      >
        <span className="tomorrow-chip__label">Tomorrow</span>
        <span className="tomorrow-chip__count">{notes.length}</span>
      </button>
      {open && (
        <div className="tomorrow-chip__popover" role="dialog" aria-label="Queued for Tomorrow Plan">
          <h3 className="tomorrow-chip__title">Queued for Tomorrow</h3>
          <ul className="tomorrow-chip__list">
            {notes.map((n) => (
              <li key={n.id} className="tomorrow-chip__item">
                <div className="tomorrow-chip__item-body">
                  <span className="tomorrow-chip__item-source">{n.sourcePanel.replace(/-/g, " ")}</span>
                  <span className="tomorrow-chip__item-summary">{n.summary}</span>
                </div>
                <button
                  type="button"
                  className="tomorrow-chip__remove"
                  onClick={() => onRemove(n.id)}
                  aria-label={`Remove ${n.summary} from Tomorrow Plan`}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="tomorrow-chip__review" onClick={handleReviewAll}>
            Review all →
          </button>
        </div>
      )}
    </div>
  );
}
```

Create `apps/web/src/components/TomorrowChip.css`:

```css
.tomorrow-chip {
  position: relative;
}

.tomorrow-chip__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: 999px;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms;
}
.tomorrow-chip__trigger:hover,
.tomorrow-chip__trigger[aria-expanded="true"] {
  background: var(--color-surface-3);
}

.tomorrow-chip__count {
  background: var(--color-accent);
  color: var(--color-accent-contrast, #fff);
  border-radius: 999px;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.tomorrow-chip__popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 280px;
  max-width: 360px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-overlay);
  padding: 12px;
  z-index: 900;
}

.tomorrow-chip__title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-tertiary);
  margin: 0 0 8px;
}

.tomorrow-chip__list {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.tomorrow-chip__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: var(--radius-sm);
}
.tomorrow-chip__item:hover {
  background: var(--color-surface-2);
}

.tomorrow-chip__item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.tomorrow-chip__item-source {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-tertiary);
}

.tomorrow-chip__item-summary {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.35;
  word-break: break-word;
}

.tomorrow-chip__remove {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  font-size: 16px;
  cursor: pointer;
  padding: 0 6px;
  line-height: 1;
  flex-shrink: 0;
}
.tomorrow-chip__remove:hover {
  color: var(--color-text-primary);
}

.tomorrow-chip__review {
  width: 100%;
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 13px;
  padding: 6px 10px;
  cursor: pointer;
  text-align: center;
}
.tomorrow-chip__review:hover {
  background: var(--color-surface-2);
}

@media (max-width: 760px) {
  .tomorrow-chip__label { display: none; }
  .tomorrow-chip__trigger { padding: 4px 8px; }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run src/components/__tests__/TomorrowChip.test.tsx`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TomorrowChip.tsx apps/web/src/components/TomorrowChip.css apps/web/src/components/__tests__/TomorrowChip.test.tsx
git commit -m "feat(web): add TomorrowChip header component with popover"
```

## Task 7: Mount TomorrowChip in App header

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Import and wire**

In `App.tsx` imports, add:

```tsx
import TomorrowChip from "./components/TomorrowChip";
```

Find where `StatusChip` or `RoleContextPill` is rendered in the header (search for `<RoleContextPill`). Alongside those, render:

```tsx
<TomorrowChip
  notes={state.tomorrowNotes}
  onRemove={(id) => dispatch({ type: "REMOVE_TOMORROW_NOTE", id })}
  onReviewAll={() => setActiveTab("tomorrow-plan")}
/>
```

- [ ] **Step 2: Typecheck + test**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: all pass.

- [ ] **Step 3: Manual smoke (optional, for reviewer)**

Start the dev server: `cd apps/web && npm run dev`
- Load demo classroom
- Go to Differentiate, run a generation, click "Save to Tomorrow"
- Verify chip appears in header with `1`
- Click chip; popover shows the item
- Click `×`; item removed; chip hides when list empty

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): mount TomorrowChip in app header for ambient queue visibility"
```

---

# Part C — Draft Restore Visibility

The `useFormPersistence` hook already restores silently on mount. This part adds smart surfacing — a visible "Resume your draft?" chip that only appears when a substantive draft exists from a real earlier session.

## Task 8: Extend `useFormPersistence` with timestamp + threshold

**Files:**
- Modify: `apps/web/src/hooks/useFormPersistence.ts`
- Create: `apps/web/src/hooks/__tests__/useFormPersistence.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/hooks/__tests__/useFormPersistence.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormPersistence } from "../useFormPersistence";

function makeSessionStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

describe("useFormPersistence", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", makeSessionStorageMock());
    vi.useFakeTimers();
  });

  it("returns hasPendingDraft=false when no stored value", () => {
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20 })
    );
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("returns hasPendingDraft=true when stored draft >= minChars and age < maxAgeMs", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() - 60_000 };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20, maxAgeMs: 12 * 3600 * 1000, autoRestore: false })
    );
    expect(result.current.hasPendingDraft).toBe(true);
  });

  it("returns hasPendingDraft=false when stored draft age exceeds maxAgeMs", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() - 13 * 3600 * 1000 };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20, maxAgeMs: 12 * 3600 * 1000, autoRestore: false })
    );
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("returns hasPendingDraft=false when total chars < minChars", () => {
    const saved = { text: "short", __ts: Date.now() };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20, autoRestore: false })
    );
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("restore() applies the saved draft when called", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { autoRestore: false })
    );
    act(() => result.current.restore());
    expect(setter).toHaveBeenCalledWith(expect.objectContaining({ text: "a".repeat(25) }));
  });

  it("dismiss() clears stored value and sets hasPendingDraft=false", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { autoRestore: false })
    );
    act(() => result.current.dismiss());
    expect(sessionStorage.getItem("test-key")).toBeNull();
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("remains backward compatible — autoRestore default preserves existing behavior", () => {
    const saved = { text: "hello world" };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    renderHook(() => useFormPersistence("test-key", { text: "" }, setter));
    expect(setter).toHaveBeenCalledWith({ text: "hello world" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/hooks/__tests__/useFormPersistence.test.tsx`
Expected: FAIL — options argument / `hasPendingDraft` / `restore` / `dismiss` not implemented.

- [ ] **Step 3: Extend the hook**

Replace `apps/web/src/hooks/useFormPersistence.ts` with:

```ts
import { useEffect, useRef, useCallback, useState } from "react";

const DEBOUNCE_MS = 500;

export interface FormPersistenceOptions {
  /** If false, do not auto-apply the stored draft on mount. Default: true (backward compat). */
  autoRestore?: boolean;
  /** Minimum total character count across stored fields to surface hasPendingDraft. Default: 0. */
  minChars?: number;
  /** Maximum age in ms of a stored draft before it's considered expired. Default: Infinity. */
  maxAgeMs?: number;
}

interface StoredShape {
  [key: string]: unknown;
  __ts?: number;
}

export function useFormPersistence<T extends Record<string, unknown>>(
  key: string,
  values: T,
  setValues: (saved: Partial<T>) => void,
  options: FormPersistenceOptions = {},
) {
  const { autoRestore = true, minChars = 0, maxAgeMs = Infinity } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const setValuesRef = useRef(setValues);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const savedRef = useRef<Partial<T> | null>(null);

  // Keep setter ref current so we don't re-run restore on every render
  useEffect(() => { setValuesRef.current = setValues; }, [setValues]);

  // On mount: read stored value, decide whether to auto-restore or surface chip
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredShape;
      const ts = typeof parsed.__ts === "number" ? parsed.__ts : 0;
      const ageMs = Date.now() - ts;
      if (ageMs > maxAgeMs) {
        sessionStorage.removeItem(key);
        return;
      }
      // Strip __ts before handing back to caller
      const { __ts: _ts, ...rest } = parsed;
      void _ts;
      const restored = rest as Partial<T>;

      // Compute total chars across string-valued fields
      const totalChars = Object.values(restored).reduce<number>((acc, v) => {
        return acc + (typeof v === "string" ? v.length : 0);
      }, 0);

      if (autoRestore) {
        setValuesRef.current(restored);
      } else if (totalChars >= minChars) {
        savedRef.current = restored;
        setHasPendingDraft(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, [key, autoRestore, minChars, maxAgeMs]);

  // Debounce-save values + timestamp
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const totalChars = Object.values(values).reduce<number>(
          (acc, v) => acc + (typeof v === "string" ? v.length : 0),
          0,
        );
        // Do not persist empty drafts
        if (totalChars === 0) {
          sessionStorage.removeItem(key);
          return;
        }
        const toStore: StoredShape = { ...values, __ts: Date.now() };
        sessionStorage.setItem(key, JSON.stringify(toStore));
      } catch {
        // Storage full or other — ignore
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, values]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
    setHasPendingDraft(false);
    savedRef.current = null;
  }, [key]);

  const restore = useCallback(() => {
    if (!savedRef.current) return;
    setValuesRef.current(savedRef.current);
    setHasPendingDraft(false);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.removeItem(key);
    setHasPendingDraft(false);
    savedRef.current = null;
  }, [key]);

  return { clear, restore, dismiss, hasPendingDraft };
}
```

- [ ] **Step 4: Run the tests**

Run: `cd apps/web && npx vitest run src/hooks/__tests__/useFormPersistence.test.tsx`
Expected: PASS (7/7).

Also run all web tests to confirm no regression in existing useFormPersistence consumers:

Run: `cd apps/web && npx vitest run`
Expected: all pass. (The four existing call sites in MessageComposer, InterventionLogger, TeacherReflection, ArtifactUpload do not pass `options`, so `autoRestore` defaults to true and behavior is preserved.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useFormPersistence.ts apps/web/src/hooks/__tests__/useFormPersistence.test.tsx
git commit -m "feat(web): extend useFormPersistence with timestamp, minChars, maxAgeMs, manual restore/dismiss"
```

## Task 9: DraftRestoreChip component

**Files:**
- Create: `apps/web/src/components/DraftRestoreChip.tsx`
- Create: `apps/web/src/components/DraftRestoreChip.css`
- Create: `apps/web/src/components/__tests__/DraftRestoreChip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/DraftRestoreChip.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DraftRestoreChip from "../DraftRestoreChip";

describe("DraftRestoreChip", () => {
  it("renders nothing when show=false", () => {
    const { container } = render(
      <DraftRestoreChip show={false} onRestore={() => {}} onDismiss={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders prompt when show=true", () => {
    render(<DraftRestoreChip show={true} onRestore={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText(/resume your draft/i)).toBeInTheDocument();
  });

  it("calls onRestore when Resume is clicked", () => {
    const onRestore = vi.fn();
    render(<DraftRestoreChip show={true} onRestore={onRestore} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when Discard is clicked", () => {
    const onDismiss = vi.fn();
    render(<DraftRestoreChip show={true} onRestore={() => {}} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/__tests__/DraftRestoreChip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/src/components/DraftRestoreChip.tsx`:

```tsx
import "./DraftRestoreChip.css";

interface Props {
  show: boolean;
  onRestore: () => void;
  onDismiss: () => void;
  label?: string;
}

export default function DraftRestoreChip({ show, onRestore, onDismiss, label }: Props) {
  if (!show) return null;
  return (
    <div className="draft-restore" role="status" aria-live="polite">
      <span className="draft-restore__text">
        {label ?? "Resume your draft from earlier?"}
      </span>
      <div className="draft-restore__actions">
        <button type="button" className="draft-restore__btn draft-restore__btn--primary" onClick={onRestore}>
          Resume
        </button>
        <button type="button" className="draft-restore__btn" onClick={onDismiss}>
          Discard
        </button>
      </div>
    </div>
  );
}
```

Create `apps/web/src/components/DraftRestoreChip.css`:

```css
.draft-restore {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin: 0 0 12px;
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-1));
  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.draft-restore__text { color: var(--color-text-primary); }

.draft-restore__actions { display: flex; gap: 6px; flex-shrink: 0; }

.draft-restore__btn {
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 12px;
  color: var(--color-text-primary);
  cursor: pointer;
}
.draft-restore__btn:hover { background: var(--color-surface-2); }

.draft-restore__btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-contrast, #fff);
}
.draft-restore__btn--primary:hover {
  background: color-mix(in srgb, var(--color-accent) 85%, black);
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npx vitest run src/components/__tests__/DraftRestoreChip.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/DraftRestoreChip.tsx apps/web/src/components/DraftRestoreChip.css apps/web/src/components/__tests__/DraftRestoreChip.test.tsx
git commit -m "feat(web): add DraftRestoreChip component for visible resume affordance"
```

## Task 10: Wire DraftRestoreChip into four existing form components

**Files:**
- Modify: `apps/web/src/components/MessageComposer.tsx:65-71`
- Modify: `apps/web/src/components/InterventionLogger.tsx`
- Modify: `apps/web/src/components/ArtifactUpload.tsx`
- Modify: `apps/web/src/components/TeacherReflection.tsx`

For each of the four components, we:
1. Swap the `useFormPersistence` call to pass `{ autoRestore: false, minChars: 20, maxAgeMs: 12 * 3600 * 1000 }`.
2. Capture `restore`, `dismiss`, `hasPendingDraft`.
3. Render `<DraftRestoreChip show={hasPendingDraft} onRestore={restore} onDismiss={dismiss} />` at the top of the form.

- [ ] **Step 1: MessageComposer**

In `apps/web/src/components/MessageComposer.tsx` line 2, add import:

```tsx
import DraftRestoreChip from "./DraftRestoreChip";
```

Replace the `useFormPersistence` call (lines 65–71):

```tsx
const { clear: clearDraft, restore: restoreDraft, dismiss: dismissDraft, hasPendingDraft } = useFormPersistence(
  `prairie-message-${selectedClassroom}`,
  { context },
  useCallback((saved: Partial<{ context: string }>) => {
    if (saved.context !== undefined) setContext(saved.context);
  }, []),
  { autoRestore: false, minChars: 20, maxAgeMs: 12 * 60 * 60 * 1000 },
);
```

At the top of the returned `<form>` JSX (around line 111, immediately inside `<form>`), render:

```tsx
<DraftRestoreChip
  show={hasPendingDraft}
  onRestore={restoreDraft}
  onDismiss={dismissDraft}
  label="You had an unsent message drafted. Resume it?"
/>
```

- [ ] **Step 2: InterventionLogger**

In `apps/web/src/components/InterventionLogger.tsx`, locate the `useFormPersistence` call. Apply the same three changes:

1. `import DraftRestoreChip from "./DraftRestoreChip";`
2. Add `{ autoRestore: false, minChars: 20, maxAgeMs: 12 * 60 * 60 * 1000 }` as the fourth argument.
3. Destructure `restore`, `dismiss`, `hasPendingDraft` from the hook and render `<DraftRestoreChip show={hasPendingDraft} onRestore={...} onDismiss={...} label="Pick up your intervention note where you left off?" />` inside the form.

- [ ] **Step 3: ArtifactUpload**

Same three changes. Label: `"Resume the lesson artifact you were setting up?"`.

- [ ] **Step 4: TeacherReflection**

Same three changes. Label: `"Continue the reflection you started earlier?"`.

- [ ] **Step 5: Verify all tests pass**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: all existing + new tests pass. Existing snapshot/RTL tests of these components may need updated assertions if they interact with the now-optional chip — if any test fails, inspect the failure and add `queryByText(/resume/i)` guards or similar. No existing test in the codebase asserts the *absence* of chips, so passing scenarios should be unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/MessageComposer.tsx apps/web/src/components/InterventionLogger.tsx apps/web/src/components/ArtifactUpload.tsx apps/web/src/components/TeacherReflection.tsx
git commit -m "feat(web): surface DraftRestoreChip on four form components using extended useFormPersistence"
```

---

# Part D — Command Palette

Largest feature. Depends only on `AppContext` state and `TAB_META`.

## Task 11: `usePaletteEntries` hook

**Files:**
- Create: `apps/web/src/hooks/usePaletteEntries.ts`
- Create: `apps/web/src/hooks/__tests__/usePaletteEntries.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/hooks/__tests__/usePaletteEntries.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePaletteEntries } from "../usePaletteEntries";
import type { ClassroomProfile } from "../../types";

const CLASSROOM: ClassroomProfile = {
  classroom_id: "demo-okafor-grade34",
  grade_band: "3-4",
  subject_focus: "literacy_numeracy",
  students: [{ alias: "Amara", family_language: "en" }],
} as unknown as ClassroomProfile;

describe("usePaletteEntries", () => {
  it("produces a panel entry for every TAB_ORDER entry", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null })
    );
    const panelEntries = result.current.filter((e) => e.kind === "panel");
    expect(panelEntries.length).toBeGreaterThanOrEqual(12);
  });

  it("produces a classroom entry for every classroom", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null })
    );
    const classroomEntries = result.current.filter((e) => e.kind === "classroom");
    expect(classroomEntries).toHaveLength(1);
    expect(classroomEntries[0].label).toMatch(/grade 3-4/i);
  });

  it("produces an action entry for Draft family message", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null })
    );
    expect(result.current.some((e) => e.kind === "action" && /draft family message/i.test(e.label))).toBe(true);
  });

  it("includes per-student actions when debtRegister has flagged students", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({
        classrooms: [CLASSROOM],
        activeClassroom: CLASSROOM.classroom_id,
        debtRegister: { items: [{ category: "unapproved_message", student_refs: ["Amara"], age_days: 1 }] } as any,
      })
    );
    expect(result.current.some((e) => e.kind === "action" && /amara/i.test(e.label))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/hooks/__tests__/usePaletteEntries.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/hooks/usePaletteEntries.ts`:

```ts
import { useMemo } from "react";
import { TAB_META, TAB_ORDER, type ActiveTab } from "../appReducer";
import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill } from "../types";

export type PaletteEntryKind = "panel" | "classroom" | "action";

export interface PaletteEntry {
  kind: PaletteEntryKind;
  id: string;
  label: string;
  group?: string;
  keywords: string;
  onSelect: () => void;
}

interface DebtItem {
  category: string;
  student_refs: string[];
  age_days: number;
}

interface DebtRegister {
  items: DebtItem[];
}

interface Input {
  classrooms: ClassroomProfile[];
  activeClassroom: string;
  debtRegister: DebtRegister | null;
  onNavigate?: (tab: ActiveTab) => void;
  onSwitchClassroom?: (id: string) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
}

export function usePaletteEntries({
  classrooms,
  activeClassroom,
  debtRegister,
  onNavigate,
  onSwitchClassroom,
  onMessagePrefill,
  onInterventionPrefill,
}: Input): PaletteEntry[] {
  return useMemo(() => {
    const entries: PaletteEntry[] = [];

    // Panels
    for (const tab of TAB_ORDER) {
      const meta = TAB_META[tab];
      entries.push({
        kind: "panel",
        id: `panel:${tab}`,
        label: meta.label,
        group: meta.group,
        keywords: [meta.label, meta.shortLabel, meta.group, tab].join(" ").toLowerCase(),
        onSelect: () => onNavigate?.(tab),
      });
    }

    // Classrooms
    for (const c of classrooms) {
      if (c.classroom_id === activeClassroom) continue;
      const label = `Grade ${c.grade_band} — ${c.subject_focus.replace(/_/g, " ")}`;
      entries.push({
        kind: "classroom",
        id: `classroom:${c.classroom_id}`,
        label,
        keywords: [label, c.classroom_id].join(" ").toLowerCase(),
        onSelect: () => onSwitchClassroom?.(c.classroom_id),
      });
    }

    // Static action verbs
    const actions: Array<{ label: string; tab: ActiveTab; keywords: string }> = [
      { label: "Draft family message", tab: "family-message", keywords: "message family parent send" },
      { label: "Log intervention", tab: "log-intervention", keywords: "log intervention note behavior" },
      { label: "Differentiate a lesson", tab: "differentiate", keywords: "differentiate variant adapt lesson" },
      { label: "Forecast tomorrow's complexity", tab: "complexity-forecast", keywords: "forecast tomorrow complexity" },
      { label: "Brief the EA", tab: "ea-briefing", keywords: "ea briefing assistant" },
      { label: "Balance EA load", tab: "ea-load", keywords: "ea load balance schedule" },
      { label: "Build a sub packet", tab: "survival-packet", keywords: "sub substitute packet survival" },
      { label: "Simplify text for a student", tab: "language-tools", keywords: "simplify language vocab translate" },
    ];
    for (const a of actions) {
      entries.push({
        kind: "action",
        id: `action:${a.tab}:${a.label}`,
        label: a.label,
        keywords: [a.label, a.keywords, TAB_META[a.tab].group].join(" ").toLowerCase(),
        onSelect: () => onNavigate?.(a.tab),
      });
    }

    // Per-flagged-student actions
    if (debtRegister) {
      const seen = new Set<string>();
      for (const item of debtRegister.items) {
        for (const ref of item.student_refs) {
          if (!ref || seen.has(`${item.category}:${ref}`)) continue;
          seen.add(`${item.category}:${ref}`);
          if (item.category === "unapproved_message") {
            entries.push({
              kind: "action",
              id: `action:message:${ref}`,
              label: `Draft family message for ${ref}`,
              keywords: `message family ${ref}`.toLowerCase(),
              onSelect: () => {
                onMessagePrefill?.({ student_ref: ref, reason: "", message_type: "routine_update" });
              },
            });
          }
          if (item.category === "stale_followup") {
            entries.push({
              kind: "action",
              id: `action:log:${ref}`,
              label: `Log follow-up for ${ref}`,
              keywords: `log follow-up intervention ${ref}`.toLowerCase(),
              onSelect: () => {
                onInterventionPrefill?.({ student_ref: ref, kind: "follow_up" } as InterventionPrefill);
              },
            });
          }
        }
      }
    }

    return entries;
  }, [classrooms, activeClassroom, debtRegister, onNavigate, onSwitchClassroom, onMessagePrefill, onInterventionPrefill]);
}
```

Note: the exact shape of `FamilyMessagePrefill` and `InterventionPrefill` is defined in `apps/web/src/types.ts`. If the `{ student_ref, reason, message_type }` shape above does not match, adjust the payload to match the existing `InterventionPrefill` / `FamilyMessagePrefill` types — this is a 1-line fix and the types will guide you.

- [ ] **Step 4: Run test**

Run: `cd apps/web && npx vitest run src/hooks/__tests__/usePaletteEntries.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/usePaletteEntries.ts apps/web/src/hooks/__tests__/usePaletteEntries.test.tsx
git commit -m "feat(web): add usePaletteEntries hook producing panel/classroom/action entries"
```

## Task 12: CommandPalette component — shell + filtering

**Files:**
- Create: `apps/web/src/components/CommandPalette.tsx`
- Create: `apps/web/src/components/CommandPalette.css`
- Create: `apps/web/src/components/__tests__/CommandPalette.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommandPalette from "../CommandPalette";
import type { PaletteEntry } from "../../hooks/usePaletteEntries";

function makeEntries(): PaletteEntry[] {
  return [
    { kind: "panel", id: "p1", label: "Today", group: "today", keywords: "today", onSelect: vi.fn() },
    { kind: "panel", id: "p2", label: "Family Message", group: "review", keywords: "family message review", onSelect: vi.fn() },
    { kind: "action", id: "a1", label: "Draft family message", keywords: "draft message family", onSelect: vi.fn() },
  ];
}

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    render(<CommandPalette open={false} onClose={() => {}} entries={makeEntries()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders input and full entry list when open", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Family Message")).toBeInTheDocument();
    expect(screen.getByText("Draft family message")).toBeInTheDocument();
  });

  it("filters by substring match across label + keywords", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fam" } });
    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.getByText("Family Message")).toBeInTheDocument();
    expect(screen.getByText("Draft family message")).toBeInTheDocument();
  });

  it("fires onSelect and onClose when an entry is clicked", () => {
    const onClose = vi.fn();
    const entries = makeEntries();
    render(<CommandPalette open={true} onClose={onClose} entries={entries} />);
    fireEvent.click(screen.getByText("Family Message"));
    expect(entries[1].onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ArrowDown moves active entry, Enter selects it", () => {
    const onClose = vi.fn();
    const entries = makeEntries();
    render(<CommandPalette open={true} onClose={onClose} entries={entries} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(entries[1].onSelect).toHaveBeenCalledOnce();
  });

  it("Escape closes", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} entries={makeEntries()} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows 'No matches' when query matches nothing", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "xyzzy" } });
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/__tests__/CommandPalette.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/src/components/CommandPalette.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { PaletteEntry } from "../hooks/usePaletteEntries";
import "./CommandPalette.css";

interface Props {
  open: boolean;
  onClose: () => void;
  entries: PaletteEntry[];
}

const RECENTS_KEY = "prairieclassroom.palette.recents";
const MAX_RECENTS = 5;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENTS) : [];
  } catch { return []; }
}

function saveRecent(id: string) {
  try {
    const prev = loadRecents();
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

export default function CommandPalette({ open, onClose, entries }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(cardRef, open);

  // Reset query + load recents whenever we open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setRecents(loadRecents());
      // Defer focus until the input is mounted
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // With no query, show recents first, then the rest
      const recentEntries = recents
        .map((id) => entries.find((e) => e.id === id))
        .filter((e): e is PaletteEntry => Boolean(e));
      const rest = entries.filter((e) => !recents.includes(e.id));
      return [...recentEntries, ...rest];
    }
    return entries.filter((e) => e.keywords.includes(q) || e.label.toLowerCase().includes(q));
  }, [entries, query, recents]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[activeIdx];
      if (entry) {
        entry.onSelect();
        saveRecent(entry.id);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="command-palette__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={cardRef}
        className="command-palette__card"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-results"
          aria-activedescendant={filtered[activeIdx] ? `cp-opt-${filtered[activeIdx].id}` : undefined}
          className="command-palette__input"
          placeholder="Jump to panel, classroom, or action…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <ul id="command-palette-results" className="command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <li className="command-palette__empty">No matches</li>
          ) : (
            filtered.slice(0, 40).map((entry, i) => (
              <li
                key={entry.id}
                id={`cp-opt-${entry.id}`}
                role="option"
                aria-selected={i === activeIdx}
                className={`command-palette__item command-palette__item--${entry.kind}${i === activeIdx ? " command-palette__item--active" : ""}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => {
                  entry.onSelect();
                  saveRecent(entry.id);
                  onClose();
                }}
              >
                <span className="command-palette__kind">{entry.kind}</span>
                <span className="command-palette__label">{entry.label}</span>
                {entry.group && <span className="command-palette__group">{entry.group}</span>}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
```

Create `apps/web/src/components/CommandPalette.css`:

```css
.command-palette__backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--color-surface-0) 65%, transparent);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  z-index: 1100;
  animation: cp-fade 140ms ease-out;
}

.command-palette__card {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-overlay);
  width: min(580px, 92vw);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.command-palette__input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-size: 16px;
  padding: 16px 18px;
  outline: none;
  font-family: var(--font-body);
}
.command-palette__input::placeholder {
  color: var(--color-text-tertiary);
}

.command-palette__list {
  list-style: none;
  padding: 6px;
  margin: 0;
  overflow-y: auto;
}

.command-palette__item {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-primary);
}

.command-palette__item--active {
  background: var(--color-surface-2);
}

.command-palette__kind {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
}

.command-palette__label {
  font-size: 14px;
}

.command-palette__group {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.command-palette__empty {
  padding: 20px;
  color: var(--color-text-tertiary);
  text-align: center;
  font-size: 13px;
}

@keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npx vitest run src/components/__tests__/CommandPalette.test.tsx`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CommandPalette.tsx apps/web/src/components/CommandPalette.css apps/web/src/components/__tests__/CommandPalette.test.tsx
git commit -m "feat(web): add CommandPalette component with fuzzy filter, keyboard nav, recents"
```

## Task 13: Wire `Cmd/Ctrl+K` + mount palette in App

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add imports + state**

In `App.tsx` imports:

```tsx
import CommandPalette from "./components/CommandPalette";
import { usePaletteEntries } from "./hooks/usePaletteEntries";
```

Inside the `App` component, alongside `shortcutSheetOpen`:

```tsx
const [paletteOpen, setPaletteOpen] = useState(false);
```

- [ ] **Step 2: Build palette entries via the hook**

After `state` is destructured and `setActiveTab` is defined, add:

```tsx
const paletteEntries = usePaletteEntries({
  classrooms: state.classrooms,
  activeClassroom: state.activeClassroom,
  debtRegister: null, // TODO: plumb in debt register when available at App level; initially null is fine
  onNavigate: (tab) => { setActiveTab(tab); setPaletteOpen(false); },
  onSwitchClassroom: (id) => { dispatch({ type: "SET_ACTIVE_CLASSROOM", classroomId: id }); setPaletteOpen(false); },
  onMessagePrefill: (prefill) => { dispatch({ type: "SET_MESSAGE_PREFILL", prefill }); setActiveTab("family-message"); },
  onInterventionPrefill: (prefill) => { dispatch({ type: "SET_INTERVENTION_PREFILL", prefill }); setActiveTab("log-intervention"); },
});
```

Note: the `// TODO:` for `debtRegister` is intentional — Today panel owns the fetch currently. Plumbing debt counts up is a follow-up. With `debtRegister: null`, the palette still ships full panel/classroom/action coverage; per-student actions enable later with a single-line change.

- [ ] **Step 3: Extend keydown handler for Cmd/Ctrl+K**

In the same `handleKeydown` you modified in Task 2, add above the `?` block:

```tsx
// Cmd+K / Ctrl+K → command palette
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
  e.preventDefault();
  setPaletteOpen(true);
  return;
}
```

The palette should open even when an input is focused, because teachers will typically invoke it from anywhere. Place this check BEFORE the `isEditable` short-circuit.

- [ ] **Step 4: Gate palette when another modal is open**

Above the palette open-logic in the keydown, guard against opening over another dialog:

```tsx
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
  e.preventDefault();
  if (state.authPrompt || state.rolePrompt || state.showOnboarding || shortcutSheetOpen) return;
  setPaletteOpen(true);
  return;
}
```

- [ ] **Step 5: Mount the palette near the other dialogs**

```tsx
<CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />
```

- [ ] **Step 6: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): wire Cmd/Ctrl+K to open command palette with dialog-gating"
```

## Task 14: Header trigger button for mouse users

**Files:**
- Modify: `apps/web/src/App.tsx` (header area)

- [ ] **Step 1: Add a subtle header trigger**

In the App header, alongside `<TomorrowChip>` or `<RoleContextPill>`, add:

```tsx
<button
  type="button"
  className="app-header__palette-btn"
  onClick={() => setPaletteOpen(true)}
  aria-label="Open command palette"
  title="Command palette (⌘K)"
>
  <span aria-hidden="true">⌘K</span>
</button>
```

Inline styles in the existing header CSS (search for `.app-header` or similar) — adopt the neutral button pattern already in use. If no existing spot fits, add a minimal inline style:

```css
.app-header__palette-btn {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-size: 11px;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.app-header__palette-btn:hover {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Verify**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): add header ⌘K button for discoverability"
```

## Task 15: Manual smoke + regression sweep

- [ ] **Step 1: Run the full web test suite**

Run: `cd apps/web && npx vitest run`
Expected: all tests pass. Record the count in the commit message of Task 16.

- [ ] **Step 2: Run typecheck and lint at the repo root**

Run: `npm run typecheck` and `npm run lint`
Expected: both pass with zero errors.

- [ ] **Step 3: Run the orchestrator/shared test suite**

Run: `npm run test`
Expected: all pass. This catches any cross-workspace regression, though changes are web-only.

- [ ] **Step 4: Manual smoke — golden-path teacher walkthrough**

Start the dev server: `cd apps/web && npm run dev`. With the demo classroom loaded:

1. Press `?` — shortcut sheet opens.
2. Press `Esc` — closes.
3. Click footer `?` — opens.
4. Press `Cmd+K` — palette opens.
5. Type `fam` — Family Message + "Draft family message" action visible.
6. Press `ArrowDown` twice + `Enter` — lands on selected entry.
7. Re-open palette — recents show Family Message first.
8. Go to Differentiate, save a result to Tomorrow. Chip appears in header with `1`.
9. Click chip, popover shows item. Click `×`, chip hides.
10. Start typing a family message, reload the page. Chip surfaces "Resume your draft?". Click Resume — text restores. Click Discard in a fresh session after typing 25+ chars — disappears.
11. Verify dark mode — toggle theme, repeat 1 + 4 + 9.

- [ ] **Step 5: Run the release gate (mock)**

Per CLAUDE.md, cross-cutting UX changes should pass the no-cost release gate:

Run: `npm run release:gate`
Expected: passes in mock mode.

If it fails, inspect `output/release-gate/` artifacts and fix before commit.

## Task 16: Final commit and plan-level PR

- [ ] **Step 1: Summarize the sprint in a single amend-free commit chain**

The eight commits already produced (one per task) form the PR. No squashing needed.

- [ ] **Step 2: Update `docs/decision-log.md` only if a convention was introduced**

The palette introduces:
- `prairieclassroom.palette.recents` localStorage key (new namespace prefix `prairieclassroom.` — worth a one-line entry if this is the first use of that prefix in the codebase).

If that prefix is already used elsewhere (check with `grep -r "prairieclassroom\." apps/web/src`), skip the log entry. If it's new, add to `docs/decision-log.md`:

```markdown
## 2026-04-16 — Teacher QoL Tier 1 sprint

- Added `prairieclassroom.palette.recents` localStorage namespace for CommandPalette recents. Other palette-owned state (if added later) should reuse this prefix.
- Extended `useFormPersistence` with timestamp, `minChars`, `maxAgeMs`, and explicit `restore`/`dismiss`/`hasPendingDraft`. Existing call sites default to `autoRestore: true` and remain unchanged.
- Introduced `REMOVE_TOMORROW_NOTE` reducer action (complements `APPEND_TOMORROW_NOTE` / `CLEAR_TOMORROW_NOTES`).
```

- [ ] **Step 3: Final verification**

Run in parallel where possible:
- `cd apps/web && npx vitest run` — all pass
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run test` — all pass

- [ ] **Step 4: Commit any decision-log change (if added)**

```bash
git add docs/decision-log.md
git commit -m "docs: log Tier 1 teacher QoL conventions (palette namespace, form-persistence extension)"
```

---

## Self-Review — spec coverage

| Spec item | Implemented in |
|---|---|
| Command palette `Cmd/Ctrl+K` | Tasks 11–14 |
| Palette indexes panels, classrooms, actions | Task 11 |
| Palette recents via localStorage | Task 12 |
| Palette prefill handoff for student actions | Task 11 + 13 (`onMessagePrefill`/`onInterventionPrefill`) |
| Palette gated when other modals open | Task 13 |
| Palette header trigger button | Task 14 |
| Tomorrow chip persistent in header | Task 7 |
| Tomorrow chip popover with per-item remove | Task 6 |
| `REMOVE_TOMORROW_NOTE` action | Task 4 |
| Chip hidden when notes empty | Task 6 (test asserts) |
| Chip collapses below 760px | Task 6 CSS |
| Draft restore 12h TTL | Task 8 (`maxAgeMs: 12 * 3600 * 1000`) |
| Draft restore 20-char threshold | Task 8 (`minChars: 20`) |
| Draft restore per-classroom scoping | Task 10 (keys include `${selectedClassroom}` — unchanged from existing code) |
| "Resume your draft?" chip | Tasks 9–10 |
| Shortcut sheet on `?` | Tasks 1–3 |
| Shortcut sheet skips when input focused | Task 2 |
| Shortcut sheet footer trigger | Task 3 |

No gaps.

## Self-Review — placeholder scan

Searched the plan for forbidden patterns. One `// TODO:` survives intentionally in Task 13 step 2 for `debtRegister: null` — this is documented as a deliberate phased choice (the palette ships without per-student entries; plumbing is a one-line follow-up). No other TBDs, vague "add validation", or "similar to Task N" references.

## Self-Review — type consistency

- `PaletteEntry` shape defined in Task 11 and consumed unchanged in Task 12.
- `useFormPersistence` fourth-arg `options` introduced in Task 8 and used identically in Task 10's four call sites.
- `REMOVE_TOMORROW_NOTE` action shape (Task 4) matches `dispatch` payload in Task 7 (`{ type, id }`).
- `removeTomorrowNote(id: string)` in `AppContextValue` (Task 5) matches the chip's `onRemove: (id: string) => void` prop (Task 6).

No inconsistencies.

## Validation commands summary

Per CLAUDE.md validation matrix, these commands cover all risks introduced:

- `npx tsc --noEmit` (web) — TypeScript + shared schema
- `npx vitest run` (web) — all web unit tests
- `npm run typecheck` (root) — cross-workspace types
- `npm run lint` (root) — lint-sensitive changes
- `npm run test` (root) — orchestrator/shared logic (guards against accidental breakage)
- `npm run release:gate` (root, mock) — cross-service smoke

No `npm run test:python`, no `npm run memory:admin`, no `npm run check:contrast`, no `npm run system:inventory:check` — this sprint touches none of those surfaces.
