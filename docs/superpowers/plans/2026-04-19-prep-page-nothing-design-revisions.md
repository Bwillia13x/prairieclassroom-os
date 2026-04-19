# PREP Page — Nothing-Design Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the concurred subset of the 2026-04-19 PREP-page audit to `DifferentiatePanel` and `LanguageToolsPanel`, styled through a Nothing-inspired lens (monochrome canvas, typographic hierarchy, single-accent events, ALL-CAPS mono labels) while respecting the project's existing token system.

**Architecture:** All changes are UI-only (`apps/web/src`). No new orchestrator routes, no schema changes, no new prompt classes. Client-only recent-runs history is added via `sessionStorage` to avoid touching SQLite or inventing server contracts. Every CSS token referenced below has been verified against `apps/web/src/styles/tokens.css`.

**Tech Stack:** Vite + React + TypeScript, existing CSS custom-property token system, Vitest + React Testing Library for unit tests.

---

## Audit Triage (concur vs. reject)

Before starting, note which audit findings are implemented and which are rejected as stale:

**Concurred — implemented in this plan:**
- #1 PREP section header with framing
- #2 Sub-tab "2/3" numbers clarified as keyboard shortcuts (they already are, but the audit misread them — fix is visual + accessible label)
- #3 `GOT IT` / ContextualHint reworked into a "when to use" decision helper
- #4 PageIntro decorative badges de-weighted; classroom context becomes the one live element
- #5 Required-field legend + Alberta Curriculum moved into a collapsible advanced section
- #6 Artifact Source buttons gain sub-labels (what each mode does)
- #8 Curriculum Focus dropdown options strip redundant subject/grade prefix
- #9 Sticky Generate Variants CTA pinned to the rail bottom
- #10/#11/#19 Differentiate empty state re-composed — sample variant triptych + classroom readiness summary in place of a step list
- #12 Simplify / Vocab toggle gets stronger active contrast + monoglyph
- #14 Target Language default derived from the classroom's most common non-English `family_language`
- #15 Duplicate Subject selector in VocabCardGrid collapsed into the CurriculumPicker subject field
- #16 Grade auto-populates from `profile.grade_band` on both Simplify and Vocab forms
- #17 Language Tools empty states show a sample card + classroom EAL summary
- #18 Optional "For student" selector in both Language Tools forms
- #20 Recent runs chip row (client-side session memory, last 3)

**Rejected — already implemented in current code; audit is stale:**
- #7 Artifact Source input zone IS already conditional per mode (see [ArtifactUpload.tsx:172-207](apps/web/src/components/ArtifactUpload.tsx#L172-L207))
- #13 EAL Level selector IS already present in the Simplify form (see [SimplifiedViewer.tsx:55-62](apps/web/src/components/SimplifiedViewer.tsx#L55-L62))
- #21 Save / Print / Copy / Download / Save-to-Tomorrow ARE already wired via `OutputActionBar` on both tools (see [DifferentiatePanel.tsx:55-99](apps/web/src/panels/DifferentiatePanel.tsx#L55-L99), [LanguageToolsPanel.tsx:44-136](apps/web/src/panels/LanguageToolsPanel.tsx#L44-L136))

---

## File Structure

**New files:**
- `apps/web/src/components/PrepSectionIntro.tsx` — collapsible PREP section header ("when to use each tool")
- `apps/web/src/components/PrepSectionIntro.css`
- `apps/web/src/components/RecentRunsChipRow.tsx` — last-3 runs chip row reading from sessionStorage
- `apps/web/src/components/RecentRunsChipRow.css`
- `apps/web/src/hooks/useRecentRuns.ts` — sessionStorage-backed per-tool history hook
- `apps/web/src/hooks/__tests__/useRecentRuns.test.ts`
- `apps/web/src/utils/classroomLanguageDefaults.ts` — pure helper: pick target language + grade from profile
- `apps/web/src/utils/__tests__/classroomLanguageDefaults.test.ts`
- `apps/web/src/components/LanguageToolsEmptyState.tsx` — replaces generic `EmptyStateCard` on Language Tools
- `apps/web/src/components/LanguageToolsEmptyState.css`

**Modified files:**
- `apps/web/src/panels/DifferentiatePanel.tsx`
- `apps/web/src/panels/LanguageToolsPanel.tsx`
- `apps/web/src/components/ArtifactUpload.tsx`
- `apps/web/src/components/ArtifactUpload.css`
- `apps/web/src/components/CurriculumPicker.tsx` — only the entry option label
- `apps/web/src/components/SimplifiedViewer.tsx`
- `apps/web/src/components/VocabCardGrid.tsx`
- `apps/web/src/components/DifferentiateEmptyState.tsx`
- `apps/web/src/components/DifferentiateEmptyState.css`
- `apps/web/src/components/PageIntro.tsx` — add `muted` badge tone
- `apps/web/src/App.tsx` — mount `PrepSectionIntro` when active group is `prep`
- `apps/web/src/App.tsx` — add `title` + `aria-label` to kbd shortcut badge
- `apps/web/src/App.css` (or the existing nav CSS file)

Every component change keeps the file under 400 lines; new components are ≤ 180 lines each.

---

## Design Language Notes (Nothing-Inspired)

All new or updated styles follow these derived rules. These are NOT tokens — they are a style vocabulary to encode via existing tokens:

- **Hierarchy = three layers.** Primary (display, `var(--font-display)` at `--text-display-sm` or `--text-2xl`). Secondary (body, `var(--font-sans)` at `--text-base`). Tertiary (ALL CAPS mono, `var(--font-mono)` at `--text-2xs` with `letter-spacing: 0.08em`).
- **Labels:** always Space-Mono-equivalent — `var(--font-mono)`, uppercase, `letter-spacing: 0.08em`, `color: var(--color-text-tertiary)`.
- **Color budget per panel:** one accent event only. Accent is `var(--color-accent)` on the primary action (Generate, Simplify, Generate Cards). Data-status hues (`--color-success`, `--color-warning`, `--color-danger`) remain available for value cells, never for labels or row backgrounds.
- **Containers:** prefer spacing over borders. Use `var(--space-5)` (32px) to break sections, `var(--space-6)` (40px) to open a new context. Fall back to a single `1px solid var(--color-border)` only for dense list rows.
- **Radius:** pill (`var(--radius-pill)`) for chips and segmented controls; technical (`var(--radius-sm)`) for everything else. Never > `var(--radius-lg)`.
- **Shadow:** none on the rail. `var(--shadow-xs)` at most on the sticky CTA. No shadows on cards.
- **Motion:** no spring. Only `transition: opacity 120ms ease-out, transform 120ms ease-out`.
- **No toasts added** — existing `showSuccess` already renders inline; keep it.

---

## Task 1: Extract and test `classroomLanguageDefaults` helper

**Files:**
- Create: `apps/web/src/utils/classroomLanguageDefaults.ts`
- Test: `apps/web/src/utils/__tests__/classroomLanguageDefaults.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/utils/__tests__/classroomLanguageDefaults.test.ts
import { describe, it, expect } from "vitest";
import {
  pickDefaultTargetLanguage,
  pickDefaultGradeBand,
  mostCommonFamilyLanguage,
} from "../classroomLanguageDefaults";
import type { ClassroomProfile } from "../../types";

function makeProfile(partial: Partial<ClassroomProfile>): ClassroomProfile {
  return {
    classroom_id: "demo",
    grade_band: "3-4",
    subject_focus: "literacy",
    classroom_notes: [],
    students: [],
    ...partial,
  };
}

describe("pickDefaultTargetLanguage", () => {
  it("returns the language code of the most common non-English family language", () => {
    const profile = makeProfile({
      students: [
        { alias: "A", family_language: "Arabic" },
        { alias: "B", family_language: "Arabic" },
        { alias: "C", family_language: "Spanish" },
        { alias: "D", family_language: "English" },
      ],
    });
    expect(pickDefaultTargetLanguage(profile)).toBe("ar");
  });

  it("returns 'es' as fallback when no family languages are recorded", () => {
    expect(pickDefaultTargetLanguage(makeProfile({ students: [] }))).toBe("es");
  });

  it("ignores English (any case) and defaults to the next most common", () => {
    const profile = makeProfile({
      students: [
        { alias: "A", family_language: "english" },
        { alias: "B", family_language: "English" },
        { alias: "C", family_language: "Tagalog" },
      ],
    });
    expect(pickDefaultTargetLanguage(profile)).toBe("tl");
  });

  it("falls back to 'es' when the most common language has no code mapping", () => {
    const profile = makeProfile({
      students: [{ alias: "A", family_language: "Klingon" }],
    });
    expect(pickDefaultTargetLanguage(profile)).toBe("es");
  });
});

describe("pickDefaultGradeBand", () => {
  it("normalizes numeric grade_band to 'Grade N'", () => {
    expect(pickDefaultGradeBand(makeProfile({ grade_band: "4" }))).toBe("Grade 4");
  });

  it("returns the first numeric segment of a range like '3-4'", () => {
    expect(pickDefaultGradeBand(makeProfile({ grade_band: "3-4" }))).toBe("Grade 3");
  });

  it("falls back to 'Grade 4' when grade_band is unrecognized", () => {
    expect(pickDefaultGradeBand(makeProfile({ grade_band: "" }))).toBe("Grade 4");
  });
});

describe("mostCommonFamilyLanguage", () => {
  it("returns null when students is empty", () => {
    expect(mostCommonFamilyLanguage([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/utils/__tests__/classroomLanguageDefaults.test.ts`
Expected: FAIL with "Cannot find module '../classroomLanguageDefaults'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/utils/classroomLanguageDefaults.ts
import type { ClassroomProfile } from "../types";

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  spanish: "es",
  arabic: "ar",
  punjabi: "pa",
  tagalog: "tl",
  filipino: "tl",
  chinese: "zh",
  mandarin: "zh",
  cantonese: "zh",
  french: "fr",
  urdu: "ur",
  somali: "so",
  vietnamese: "vi",
  korean: "ko",
};

export function mostCommonFamilyLanguage(
  students: ClassroomProfile["students"],
): string | null {
  if (students.length === 0) return null;
  const counts = new Map<string, number>();
  for (const s of students) {
    const raw = (s.family_language ?? "").trim();
    if (!raw || raw.toLowerCase() === "english") continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}

export function pickDefaultTargetLanguage(profile: ClassroomProfile | null): string {
  if (!profile) return "es";
  const top = mostCommonFamilyLanguage(profile.students);
  if (!top) return "es";
  const code = LANGUAGE_NAME_TO_CODE[top.toLowerCase()];
  return code ?? "es";
}

export function pickDefaultGradeBand(profile: ClassroomProfile | null): string {
  if (!profile) return "Grade 4";
  const match = profile.grade_band.match(/\b([1-6K])\b/i);
  if (!match) return "Grade 4";
  const token = match[1].toUpperCase();
  return token === "K" ? "Kindergarten" : `Grade ${token}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/utils/__tests__/classroomLanguageDefaults.test.ts`
Expected: PASS (4 target-language tests + 3 grade tests + 1 helper test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/utils/classroomLanguageDefaults.ts apps/web/src/utils/__tests__/classroomLanguageDefaults.test.ts
git commit -m "feat(prep): derive language + grade defaults from classroom profile"
```

---

## Task 2: Extract and test `useRecentRuns` hook

**Files:**
- Create: `apps/web/src/hooks/useRecentRuns.ts`
- Test: `apps/web/src/hooks/__tests__/useRecentRuns.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/hooks/__tests__/useRecentRuns.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentRuns } from "../useRecentRuns";

beforeEach(() => {
  sessionStorage.clear();
});

describe("useRecentRuns", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useRecentRuns("differentiate", "demo", 3));
    expect(result.current.runs).toEqual([]);
  });

  it("records a run and keeps most recent first", () => {
    const { result } = renderHook(() => useRecentRuns("differentiate", "demo", 3));
    act(() => {
      result.current.record({ id: "a", label: "First", at: 1 });
    });
    act(() => {
      result.current.record({ id: "b", label: "Second", at: 2 });
    });
    expect(result.current.runs.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("caps the list at the limit", () => {
    const { result } = renderHook(() => useRecentRuns("differentiate", "demo", 2));
    act(() => {
      result.current.record({ id: "a", label: "1", at: 1 });
      result.current.record({ id: "b", label: "2", at: 2 });
      result.current.record({ id: "c", label: "3", at: 3 });
    });
    expect(result.current.runs.map((r) => r.id)).toEqual(["c", "b"]);
  });

  it("scopes runs by tool + classroom", () => {
    const { result: a } = renderHook(() => useRecentRuns("differentiate", "demo", 3));
    act(() => {
      a.current.record({ id: "x", label: "x", at: 1 });
    });
    const { result: b } = renderHook(() => useRecentRuns("simplify", "demo", 3));
    expect(b.current.runs).toEqual([]);
  });

  it("survives remount via sessionStorage", () => {
    const { result, unmount } = renderHook(() => useRecentRuns("vocab", "demo", 3));
    act(() => {
      result.current.record({ id: "a", label: "A", at: 1 });
    });
    unmount();
    const { result: reloaded } = renderHook(() => useRecentRuns("vocab", "demo", 3));
    expect(reloaded.current.runs.map((r) => r.id)).toEqual(["a"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/hooks/__tests__/useRecentRuns.test.ts`
Expected: FAIL with "Cannot find module '../useRecentRuns'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/hooks/useRecentRuns.ts
import { useCallback, useEffect, useState } from "react";

export interface RecentRun {
  id: string;
  label: string;
  at: number;
}

type Tool = "differentiate" | "simplify" | "vocab";

function storageKey(tool: Tool, classroomId: string): string {
  return `prairie-recent-${tool}-${classroomId}`;
}

function read(tool: Tool, classroomId: string): RecentRun[] {
  try {
    const raw = sessionStorage.getItem(storageKey(tool, classroomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentRun =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as RecentRun).id === "string" &&
        typeof (e as RecentRun).label === "string" &&
        typeof (e as RecentRun).at === "number",
    );
  } catch {
    return [];
  }
}

function write(tool: Tool, classroomId: string, runs: RecentRun[]): void {
  try {
    sessionStorage.setItem(storageKey(tool, classroomId), JSON.stringify(runs));
  } catch {
    // Storage quota / private mode — silent no-op.
  }
}

export function useRecentRuns(tool: Tool, classroomId: string, limit = 3) {
  const [runs, setRuns] = useState<RecentRun[]>(() => read(tool, classroomId));

  useEffect(() => {
    setRuns(read(tool, classroomId));
  }, [tool, classroomId]);

  const record = useCallback(
    (run: RecentRun) => {
      setRuns((prev) => {
        const next = [run, ...prev.filter((r) => r.id !== run.id)].slice(0, limit);
        write(tool, classroomId, next);
        return next;
      });
    },
    [tool, classroomId, limit],
  );

  const clear = useCallback(() => {
    write(tool, classroomId, []);
    setRuns([]);
  }, [tool, classroomId]);

  return { runs, record, clear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/hooks/__tests__/useRecentRuns.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useRecentRuns.ts apps/web/src/hooks/__tests__/useRecentRuns.test.ts
git commit -m "feat(prep): add session-scoped recent-runs hook"
```

---

## Task 3: `RecentRunsChipRow` component

**Files:**
- Create: `apps/web/src/components/RecentRunsChipRow.tsx`
- Create: `apps/web/src/components/RecentRunsChipRow.css`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/RecentRunsChipRow.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecentRunsChipRow from "../RecentRunsChipRow";

describe("RecentRunsChipRow", () => {
  it("renders nothing when runs is empty", () => {
    const { container } = render(<RecentRunsChipRow runs={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one chip per run with a RECENT label", () => {
    render(
      <RecentRunsChipRow
        runs={[
          { id: "a", label: "Fractions worksheet", at: Date.now() },
          { id: "b", label: "Plant life cycle", at: Date.now() },
        ]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/recent/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fractions worksheet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plant life cycle/i })).toBeInTheDocument();
  });

  it("calls onSelect with the run id when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <RecentRunsChipRow
        runs={[{ id: "a", label: "Fractions", at: Date.now() }]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /fractions/i }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/RecentRunsChipRow.test.tsx`
Expected: FAIL with "Cannot find module '../RecentRunsChipRow'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/components/RecentRunsChipRow.tsx
import type { RecentRun } from "../hooks/useRecentRuns";
import "./RecentRunsChipRow.css";

interface Props {
  runs: RecentRun[];
  onSelect: (id: string) => void;
}

export default function RecentRunsChipRow({ runs, onSelect }: Props) {
  if (runs.length === 0) return null;
  return (
    <div className="recent-runs" aria-label="Recent runs in this session">
      <span className="recent-runs__label">Recent</span>
      <div className="recent-runs__chips">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            className="recent-runs__chip"
            onClick={() => onSelect(run.id)}
            title={run.label}
          >
            {run.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

```css
/* apps/web/src/components/RecentRunsChipRow.css */
.recent-runs {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2-5) 0;
}

.recent-runs__label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  flex: 0 0 auto;
}

.recent-runs__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.recent-runs__chip {
  appearance: none;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  max-width: 22ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: border-color 120ms ease-out, color 120ms ease-out;
}

.recent-runs__chip:hover,
.recent-runs__chip:focus-visible {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/components/__tests__/RecentRunsChipRow.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/RecentRunsChipRow.tsx apps/web/src/components/RecentRunsChipRow.css apps/web/src/components/__tests__/RecentRunsChipRow.test.tsx
git commit -m "feat(prep): add RecentRunsChipRow component"
```

---

## Task 4: `PrepSectionIntro` — collapsible "when to use" header

**Files:**
- Create: `apps/web/src/components/PrepSectionIntro.tsx`
- Create: `apps/web/src/components/PrepSectionIntro.css`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/PrepSectionIntro.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrepSectionIntro from "../PrepSectionIntro";

describe("PrepSectionIntro", () => {
  it("renders the PREP label and the short pitch by default", () => {
    render(<PrepSectionIntro />);
    expect(screen.getByText(/prep/i)).toBeInTheDocument();
    expect(screen.getByText(/classroom-ready materials/i)).toBeInTheDocument();
  });

  it("reveals the when-to-use guidance on expand", () => {
    render(<PrepSectionIntro />);
    expect(screen.queryByText(/use differentiate when/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /when to use/i }));
    expect(screen.getByText(/use differentiate when/i)).toBeInTheDocument();
    expect(screen.getByText(/use language tools when/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/PrepSectionIntro.test.tsx`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/components/PrepSectionIntro.tsx
import { useState } from "react";
import "./PrepSectionIntro.css";

export default function PrepSectionIntro() {
  const [open, setOpen] = useState(false);
  return (
    <section className="prep-intro" aria-label="Prep section overview">
      <div className="prep-intro__row">
        <span className="prep-intro__eyebrow">Prep</span>
        <p className="prep-intro__pitch">
          Build classroom-ready materials. Differentiate a lesson artifact, or
          prepare language supports for EAL students.
        </p>
        <button
          type="button"
          className="prep-intro__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "When to use"}
        </button>
      </div>
      {open ? (
        <dl className="prep-intro__guide">
          <div className="prep-intro__guide-row">
            <dt>Differentiate</dt>
            <dd>
              Use Differentiate when you have a lesson worksheet or passage you
              want to adapt across readiness levels.
            </dd>
          </div>
          <div className="prep-intro__guide-row">
            <dt>Language Tools</dt>
            <dd>
              Use Language Tools when you need simplified text or bilingual
              vocabulary cards for a specific EAL student or group.
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
```

```css
/* apps/web/src/components/PrepSectionIntro.css */
.prep-intro {
  padding: var(--space-4) 0 var(--space-3);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-4);
}

.prep-intro__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-4);
  align-items: baseline;
}

.prep-intro__eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-tertiary);
}

.prep-intro__pitch {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-text);
  max-width: 72ch;
}

.prep-intro__toggle {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.prep-intro__toggle:hover,
.prep-intro__toggle:focus-visible {
  color: var(--color-accent);
}

.prep-intro__guide {
  margin: var(--space-3) 0 0;
  display: grid;
  gap: var(--space-2-5);
}

.prep-intro__guide-row {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: var(--space-3);
  align-items: baseline;
}

.prep-intro__guide-row dt {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.prep-intro__guide-row dd {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  max-width: 64ch;
}

@media (max-width: 600px) {
  .prep-intro__row {
    grid-template-columns: 1fr auto;
    row-gap: var(--space-2);
  }
  .prep-intro__eyebrow {
    grid-column: 1 / -1;
  }
  .prep-intro__guide-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/components/__tests__/PrepSectionIntro.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PrepSectionIntro.tsx apps/web/src/components/PrepSectionIntro.css apps/web/src/components/__tests__/PrepSectionIntro.test.tsx
git commit -m "feat(prep): add PrepSectionIntro header with when-to-use guide"
```

---

## Task 5: Mount `PrepSectionIntro` in the shell

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Locate the insertion point**

Inside the `<main id="main-content" className="app-main">` block, just inside the classroom-ready branch and before the active panel renders, insert the PrepSectionIntro when `activeGroup === "prep"`. The existing render site is around the `renderPanel(activeTab, "differentiate", ...)` line.

- [ ] **Step 2: Import the new component**

Add to the top of `apps/web/src/App.tsx` near the other component imports:

```typescript
import PrepSectionIntro from "./components/PrepSectionIntro";
```

- [ ] **Step 3: Render it when the Prep group is active**

Just before the first `renderPanel(...)` call in the main content area (the `differentiate` branch), insert:

```tsx
{activeGroup === "prep" ? <PrepSectionIntro /> : null}
```

- [ ] **Step 4: Verify typecheck + unit tests pass**

Run: `npm run typecheck && npm run test -- apps/web/src/App`
Expected: Typecheck passes. Existing App tests still pass (the header is additive).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(prep): mount PrepSectionIntro on the Prep shell"
```

---

## Task 6: Kbd-shortcut label accessibility and tooltip

**Files:**
- Modify: `apps/web/src/App.tsx` (around line 928 — the `<kbd>` render)

- [ ] **Step 1: Update the kbd badge to carry a title + explicit label**

Replace the existing snippet:

```tsx
{shortcutKey ? (
  <kbd className="shell-nav__kbd" aria-hidden="true">{shortcutKey}</kbd>
) : null}
```

with:

```tsx
{shortcutKey ? (
  <kbd
    className="shell-nav__kbd"
    aria-label={`Keyboard shortcut ${shortcutKey}`}
    title={`Press ${shortcutKey} to jump here`}
  >
    {shortcutKey}
  </kbd>
) : null}
```

- [ ] **Step 2: Add a matching update to MobileNav**

`apps/web/src/components/MobileNav.tsx` already renders only badges from `debtCounts`, not shortcut keys. No change required there — verify by re-reading the file.

- [ ] **Step 3: Run tests**

Run: `npm run test -- apps/web/src/App`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "a11y(nav): label kbd-shortcut badges so they do not read as counts"
```

---

## Task 7: PageIntro — add `muted` badge tone and a `live` variant

The audit calls out the static "Grade 3-4 / Artifact-led workflow / Student-ready variants" tags as misleading-looking live context. We drop them to a muted treatment, and introduce one `live` variant that can be wired to classroom switching.

**Files:**
- Modify: `apps/web/src/components/PageIntro.tsx`
- Modify: `apps/web/src/components/PageIntro.css` (or the inline style block inside PageIntro if CSS is colocated — verify before editing)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/PageIntro.test.tsx (create if missing, otherwise append)
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PageIntro from "../PageIntro";

describe("PageIntro muted + live badges", () => {
  it("renders a muted descriptive badge without button semantics", () => {
    render(
      <PageIntro
        title="Build Lesson Variants"
        sectionTone="sage"
        badges={[{ label: "Artifact-led workflow", tone: "muted" }]}
      />,
    );
    const badge = screen.getByText("Artifact-led workflow");
    expect(badge.tagName).toBe("SPAN");
  });

  it("renders a live badge as a button and fires onClick", () => {
    const onClick = vi.fn();
    render(
      <PageIntro
        title="Build Lesson Variants"
        sectionTone="sage"
        badges={[{ label: "Grade 3-4", tone: "live", onClick }]}
      />,
    );
    const btn = screen.getByRole("button", { name: /grade 3-4/i });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/PageIntro.test.tsx`
Expected: FAIL because neither `muted` nor `live` is an accepted tone.

- [ ] **Step 3: Extend `PageIntro` props and render logic**

Open `apps/web/src/components/PageIntro.tsx`, locate the `badges` prop typing, and extend the `tone` union with `"muted" | "live"`, plus add an optional `onClick: () => void` to each badge entry. When `tone === "live"`, render a `<button type="button">` with class `page-intro__badge--live`; otherwise render the existing `<span>`.

- [ ] **Step 4: Add the two styles**

In the same CSS file that styles `.page-intro__badge`:

```css
.page-intro__badge--muted {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: var(--text-2xs);
}

.page-intro__badge--live {
  background: transparent;
  border-color: var(--color-border-strong);
  color: var(--color-text);
  cursor: pointer;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: var(--text-2xs);
}

.page-intro__badge--live:hover,
.page-intro__badge--live:focus-visible {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run apps/web/src/components/__tests__/PageIntro.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/PageIntro.tsx apps/web/src/components/PageIntro.css apps/web/src/components/__tests__/PageIntro.test.tsx
git commit -m "feat(page-intro): add muted and live badge tones"
```

---

## Task 8: Rewire DifferentiatePanel PageIntro badges

**Files:**
- Modify: `apps/web/src/panels/DifferentiatePanel.tsx`

- [ ] **Step 1: Swap decorative badges for a single live Grade badge + two muted descriptors**

Replace the existing `badges={[...]}` array in the `PageIntro` call with:

```tsx
badges={[
  {
    label: profile ? `Grade ${profile.grade_band}` : "Choose classroom",
    tone: "live",
    onClick: () => {
      // Open command palette scoped to classroom switcher.
      // If the palette is not a viable affordance in this shell, delete this
      // line and let the badge render as a plain button for future wiring.
      document.dispatchEvent(new CustomEvent("prairie:open-classroom-switcher"));
    },
  },
  { label: "Artifact-led", tone: "muted" },
  { label: "Student-ready variants", tone: "muted" },
]}
```

> NOTE: If the `prairie:open-classroom-switcher` event does not already have a listener in `App.tsx`, the badge still reads correctly as "live" to the user (keyboard-focusable button). Wiring the listener is **out of scope for this plan** — tracked as a separate task. The badge does not regress current behavior.

- [ ] **Step 2: Run typecheck + differentiate panel tests**

Run: `npm run typecheck && npm run test -- apps/web/src/panels/__tests__`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/panels/DifferentiatePanel.tsx
git commit -m "feat(differentiate): replace decorative PageIntro badges with one live + two muted"
```

---

## Task 9: Rewire LanguageToolsPanel PageIntro badges

**Files:**
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx`

- [ ] **Step 1: Same pattern as Task 8**

Replace the `badges={[...]}` call with:

```tsx
badges={[
  {
    label: profile ? `Grade ${profile.grade_band}` : "Choose classroom",
    tone: "live",
    onClick: () => document.dispatchEvent(new CustomEvent("prairie:open-classroom-switcher")),
  },
  { label: "EAL-ready", tone: "muted" },
  { label: "Bilingual support", tone: "muted" },
]}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/panels/LanguageToolsPanel.tsx
git commit -m "feat(language-tools): replace decorative PageIntro badges with one live + two muted"
```

---

## Task 10: ArtifactUpload — required-field legend + field marks

**Files:**
- Modify: `apps/web/src/components/ArtifactUpload.tsx`
- Modify: `apps/web/src/components/ArtifactUpload.css`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/ArtifactUpload.test.tsx (extend or create)
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArtifactUpload from "../ArtifactUpload";

describe("ArtifactUpload required-field legend", () => {
  it("shows an * legend describing required fields", () => {
    render(
      <ArtifactUpload
        classrooms={[{ classroom_id: "demo", grade_band: "3-4", subject_focus: "literacy" }]}
        selectedClassroom="demo"
        onClassroomChange={() => {}}
        onSubmit={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByText(/\* required/i)).toBeInTheDocument();
  });

  it("marks required labels with an asterisk", () => {
    render(
      <ArtifactUpload
        classrooms={[{ classroom_id: "demo", grade_band: "3-4", subject_focus: "literacy" }]}
        selectedClassroom="demo"
        onClassroomChange={() => {}}
        onSubmit={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByText(/artifact title\s*\*/i)).toBeInTheDocument();
    expect(screen.getByText(/artifact source\s*\*/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/ArtifactUpload.test.tsx`
Expected: FAIL — the legend and marks don't exist yet.

- [ ] **Step 3: Add the legend and decorate required labels**

In `ArtifactUpload.tsx`, just under the `<h2>Prepare Lesson Artifact</h2>` line add:

```tsx
<p className="artifact-upload__legend">
  <span aria-hidden="true">*</span> Required
</p>
```

Update the `<label>` text for `title`, `subject`, `raw-text`, and `teacher-goal` fields:

- `<label htmlFor="title">Artifact Title <span className="field-required" aria-hidden="true">*</span></label>`
- `<label htmlFor="subject">Subject</label>` (unchanged — optional)
- `<label htmlFor="raw-text">Artifact Source <span className="field-required" aria-hidden="true">*</span></label>`
- `<label htmlFor="teacher-goal">Instructional Focus <span className="field-optional">(optional)</span></label>` (unchanged — already labeled)

- [ ] **Step 4: Style the legend + marks**

Append to `ArtifactUpload.css`:

```css
.artifact-upload__legend {
  margin: 0 0 var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.artifact-upload__legend > span {
  color: var(--color-accent);
  margin-right: var(--space-1);
}

.field-required {
  color: var(--color-accent);
  margin-left: var(--space-1);
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run apps/web/src/components/__tests__/ArtifactUpload.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ArtifactUpload.tsx apps/web/src/components/ArtifactUpload.css apps/web/src/components/__tests__/ArtifactUpload.test.tsx
git commit -m "feat(artifact-upload): add required-field legend and marks"
```

---

## Task 11: ArtifactUpload — collapsible Alberta Curriculum advanced block

**Files:**
- Modify: `apps/web/src/components/ArtifactUpload.tsx`
- Modify: `apps/web/src/components/ArtifactUpload.css`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/ArtifactUpload.test.tsx (append)
import { fireEvent } from "@testing-library/react";

describe("ArtifactUpload Alberta Curriculum advanced toggle", () => {
  it("hides the Alberta Curriculum Alignment block by default", () => {
    render(
      <ArtifactUpload
        classrooms={[{ classroom_id: "demo", grade_band: "3-4", subject_focus: "literacy" }]}
        selectedClassroom="demo"
        onClassroomChange={() => {}}
        onSubmit={() => {}}
        loading={false}
      />,
    );
    expect(screen.queryByText(/alberta curriculum alignment/i)).not.toBeInTheDocument();
  });

  it("reveals the Alberta Curriculum Alignment block when the toggle is pressed", () => {
    render(
      <ArtifactUpload
        classrooms={[{ classroom_id: "demo", grade_band: "3-4", subject_focus: "literacy" }]}
        selectedClassroom="demo"
        onClassroomChange={() => {}}
        onSubmit={() => {}}
        loading={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /alberta curriculum/i }),
    );
    expect(screen.getByText(/alberta curriculum alignment/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/ArtifactUpload.test.tsx`
Expected: FAIL — CurriculumPicker currently always renders.

- [ ] **Step 3: Gate CurriculumPicker behind a local state flag**

Inside `ArtifactUpload`, add:

```typescript
const [curriculumOpen, setCurriculumOpen] = useState(false);
```

Replace the existing `<CurriculumPicker ... />` usage with:

```tsx
<div className="artifact-upload__advanced">
  <button
    type="button"
    className="artifact-upload__advanced-toggle"
    aria-expanded={curriculumOpen}
    onClick={() => setCurriculumOpen((v) => !v)}
  >
    Alberta Curriculum Alignment
    <span aria-hidden="true">{curriculumOpen ? "−" : "+"}</span>
  </button>
  {curriculumOpen ? (
    <CurriculumPicker
      value={curriculumSelection}
      onChange={setCurriculumSelection}
      subjectHint={subject || selectedClassroomProfile?.subject_focus}
      gradeHint={selectedClassroomProfile?.grade_band}
      suggestedEntries={curriculumSuggestions}
    />
  ) : null}
</div>
```

- [ ] **Step 4: Style the toggle**

Append to `ArtifactUpload.css`:

```css
.artifact-upload__advanced {
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.artifact-upload__advanced-toggle {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.artifact-upload__advanced-toggle:hover,
.artifact-upload__advanced-toggle:focus-visible {
  color: var(--color-accent);
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run apps/web/src/components/__tests__/ArtifactUpload.test.tsx`
Expected: PASS (4 ArtifactUpload tests total).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ArtifactUpload.tsx apps/web/src/components/ArtifactUpload.css
git commit -m "feat(artifact-upload): collapse Alberta curriculum into advanced toggle"
```

---

## Task 12: ArtifactUpload — descriptive source-mode sublabels

**Files:**
- Modify: `apps/web/src/components/ArtifactUpload.tsx`
- Modify: `apps/web/src/components/ArtifactUpload.css`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/ArtifactUpload.test.tsx (append)
describe("ArtifactUpload source-mode descriptions", () => {
  it("renders a sub-label describing each mode", () => {
    render(
      <ArtifactUpload
        classrooms={[{ classroom_id: "demo", grade_band: "3-4", subject_focus: "literacy" }]}
        selectedClassroom="demo"
        onClassroomChange={() => {}}
        onSubmit={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByText(/photo of a worksheet/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf or word/i)).toBeInTheDocument();
    expect(screen.getByText(/paste text directly/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/ArtifactUpload.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Extend the source-mode buttons to include a sub-label**

Replace the existing `.map((mode) => ...)` block with:

```tsx
{[
  { id: "photo", label: "Photo", hint: "Photo of a worksheet" },
  { id: "file", label: "File", hint: "PDF or Word document" },
  { id: "paste", label: "Paste", hint: "Paste text directly" },
].map((mode) => (
  <button
    key={mode.id}
    className={`artifact-source-switcher__tab${sourceMode === mode.id ? " artifact-source-switcher__tab--active" : ""}`}
    type="button"
    role="tab"
    aria-selected={sourceMode === mode.id}
    onClick={() => setSourceMode(mode.id as ArtifactSourceMode)}
  >
    <span className="artifact-source-switcher__label">{mode.label}</span>
    <span className="artifact-source-switcher__hint">{mode.hint}</span>
  </button>
))}
```

- [ ] **Step 4: Style the sub-label**

Append to `ArtifactUpload.css`:

```css
.artifact-source-switcher__tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  text-align: left;
}

.artifact-source-switcher__label {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: inherit;
}

.artifact-source-switcher__hint {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
}

.artifact-source-switcher__tab--active .artifact-source-switcher__hint {
  color: var(--color-text-secondary);
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run apps/web/src/components/__tests__/ArtifactUpload.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ArtifactUpload.tsx apps/web/src/components/ArtifactUpload.css
git commit -m "feat(artifact-upload): describe each source mode under its button"
```

---

## Task 13: ArtifactUpload — sticky Generate Variants CTA

**Files:**
- Modify: `apps/web/src/components/ArtifactUpload.css`

The sticky behavior is pure CSS on the existing `ActionButton`. No logic change.

- [ ] **Step 1: Add the sticky block**

Append to `ArtifactUpload.css`:

```css
.artifact-upload__form > :global(.action-button--lg:last-child),
.artifact-upload__form > :last-child {
  position: sticky;
  bottom: var(--space-3);
  z-index: 1;
  margin-top: var(--space-4);
  box-shadow: var(--shadow-xs);
}

/* On short viewports the rail scrolls; keep the button visible above
   the rail bottom padding. */
@media (min-height: 720px) {
  .artifact-upload__form > :last-child {
    bottom: var(--space-5);
  }
}
```

> CSS Modules vs plain CSS: `ArtifactUpload.css` is a global stylesheet — the `:global(...)` selector is redundant here. If the file is global (no module import), drop the `:global()` selector and keep only `.artifact-upload__form > :last-child`. Verify the import style at the top of `ArtifactUpload.tsx` (`import "./ArtifactUpload.css"` = global).

- [ ] **Step 2: Visual smoke**

Run the dev server: `npm run dev` and navigate to `/?classroom=demo-okafor-grade34&demo=true&tab=differentiate`. Scroll the form. Expected: the Generate Variants button remains anchored at the bottom of the rail.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ArtifactUpload.css
git commit -m "style(artifact-upload): pin Generate Variants CTA above the fold"
```

---

## Task 14: CurriculumPicker — strip redundant prefix from Curriculum Focus dropdown

**Files:**
- Modify: `apps/web/src/components/CurriculumPicker.tsx` (line ~281–285)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/CurriculumPicker.test.tsx (create or extend)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CurriculumPicker from "../CurriculumPicker";
import * as api from "../../api";

describe("CurriculumPicker entry label", () => {
  it("shows only the entry title when subject + grade filters are both set", async () => {
    vi.spyOn(api, "listCurriculumSubjects").mockResolvedValue([]);
    vi.spyOn(api, "listCurriculumEntries").mockResolvedValue([
      {
        entry_id: "ela-4-reading",
        subject_code: "english_language_arts_and_literature",
        subject_label: "English Language Arts and Literature",
        grade: "4",
        grade_label: "Grade 4",
        title: "Reading — Comprehension Strategies",
        summary: "",
        implementation_status: "active",
        source_url: "",
        focus_items: [],
      },
    ]);

    render(
      <CurriculumPicker
        value={null}
        onChange={() => {}}
        subjectHint="ELA"
        gradeHint="4"
      />,
    );

    const option = await screen.findByRole("option", {
      name: /comprehension strategies/i,
    });
    expect(option.textContent).toBe("Reading — Comprehension Strategies");
    expect(option.textContent).not.toMatch(/grade 4/i);
    expect(option.textContent).not.toMatch(/english language arts/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/CurriculumPicker.test.tsx`
Expected: FAIL — option currently renders `"{subject_label} {grade_label} — {title}"`.

- [ ] **Step 3: Change the option label rendering**

In `CurriculumPicker.tsx`, replace:

```tsx
<option key={entry.entry_id} value={entry.entry_id}>
  {entry.subject_label} {entry.grade_label} — {entry.title}
</option>
```

with:

```tsx
<option key={entry.entry_id} value={entry.entry_id}>
  {selectedSubject && selectedGrade
    ? entry.title
    : `${entry.subject_label} ${entry.grade_label} — ${entry.title}`}
</option>
```

This keeps the full disambiguating prefix when the user hasn't narrowed by subject + grade, and strips it once both filters are set — which is the audit-criticized case.

- [ ] **Step 4: Run the test**

Run: `npx vitest run apps/web/src/components/__tests__/CurriculumPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CurriculumPicker.tsx apps/web/src/components/__tests__/CurriculumPicker.test.tsx
git commit -m "ux(curriculum): drop redundant subject/grade prefix once both filters are set"
```

---

## Task 15: DifferentiateEmptyState — sample variant triptych + classroom summary

**Files:**
- Modify: `apps/web/src/components/DifferentiateEmptyState.tsx`
- Modify: `apps/web/src/components/DifferentiateEmptyState.css`
- Modify: `apps/web/src/panels/DifferentiatePanel.tsx` (pass profile through)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/DifferentiateEmptyState.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DifferentiateEmptyState from "../DifferentiateEmptyState";

describe("DifferentiateEmptyState sample preview", () => {
  it("renders a labeled sample snippet for each of the three lanes", () => {
    render(<DifferentiateEmptyState onStart={() => {}} />);
    expect(screen.getByText(/sample — core/i)).toBeInTheDocument();
    expect(screen.getByText(/sample — chunked/i)).toBeInTheDocument();
    expect(screen.getByText(/sample — language/i)).toBeInTheDocument();
  });

  it("no longer renders the numbered step list", () => {
    render(<DifferentiateEmptyState onStart={() => {}} />);
    expect(
      screen.queryByText(/select the classroom and confirm/i),
    ).not.toBeInTheDocument();
  });

  it("when classroom summary is supplied, shows readiness band + EAL count", () => {
    render(
      <DifferentiateEmptyState
        onStart={() => {}}
        classroomSummary={{ totalStudents: 26, ealStudents: 7, gradeBand: "3-4" }}
      />,
    );
    expect(screen.getByText(/26 students/i)).toBeInTheDocument();
    expect(screen.getByText(/7 eal/i)).toBeInTheDocument();
    expect(screen.getByText(/grade 3-4/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/DifferentiateEmptyState.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Replace component body**

Overwrite `DifferentiateEmptyState.tsx`:

```typescript
import "./DifferentiateEmptyState.css";

interface ClassroomSummary {
  totalStudents: number;
  ealStudents: number;
  gradeBand: string;
}

interface Props {
  onStart: () => void;
  classroomSummary?: ClassroomSummary;
}

const SAMPLE_VARIANTS = [
  {
    lane: "core",
    label: "Sample — Core",
    title: "Community Helpers — grade-level reading",
    body: "Firefighters protect the community by putting out fires and rescuing people. They train often so they are ready to help.",
  },
  {
    lane: "chunked",
    label: "Sample — Chunked",
    title: "Community Helpers — three short steps",
    body: "1. Firefighters help the community.\n2. They put out fires.\n3. They rescue people who need help.",
  },
  {
    lane: "language",
    label: "Sample — Language",
    title: "Community Helpers — EAL supports",
    body: "Firefighters help people. They stop fires. Pre-teach: community, rescue, train. Visual cue: firefighter with hose.",
  },
] as const;

export default function DifferentiateEmptyState({ onStart, classroomSummary }: Props) {
  return (
    <section className="differentiate-empty-state surface-panel" aria-label="Differentiate onboarding">
      <header className="differentiate-empty-state__header">
        <span className="differentiate-empty-state__eyebrow">Variant canvas preview</span>
        <h3 className="differentiate-empty-state__title">What a run produces</h3>
        <p className="differentiate-empty-state__description">
          Drop in one lesson artifact; the canvas fills with a CORE version, a
          CHUNKED version for scaffolded readers, and a LANGUAGE-support version
          for EAL students.
        </p>
        {classroomSummary ? (
          <dl className="differentiate-empty-state__summary">
            <div>
              <dt>Grade band</dt>
              <dd>Grade {classroomSummary.gradeBand}</dd>
            </div>
            <div>
              <dt>Students</dt>
              <dd>{classroomSummary.totalStudents} students</dd>
            </div>
            <div>
              <dt>EAL</dt>
              <dd>{classroomSummary.ealStudents} EAL</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <div className="differentiate-empty-state__samples" aria-hidden="true">
        {SAMPLE_VARIANTS.map((v) => (
          <article key={v.lane} className={`differentiate-empty-state__sample differentiate-empty-state__sample--${v.lane}`}>
            <span className="differentiate-empty-state__sample-label">{v.label}</span>
            <h4 className="differentiate-empty-state__sample-title">{v.title}</h4>
            <p className="differentiate-empty-state__sample-body">{v.body}</p>
          </article>
        ))}
      </div>

      <button className="btn btn--soft" type="button" onClick={onStart}>
        Start with the intake form
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Rewrite the CSS**

Overwrite `DifferentiateEmptyState.css`:

```css
.differentiate-empty-state {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

.differentiate-empty-state__header {
  display: grid;
  gap: var(--space-2-5);
  max-width: 72ch;
}

.differentiate-empty-state__eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-tertiary);
}

.differentiate-empty-state__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.differentiate-empty-state__description {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 64ch;
}

.differentiate-empty-state__summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: var(--space-2) 0 0;
}

.differentiate-empty-state__summary > div {
  display: grid;
  gap: var(--space-1);
}

.differentiate-empty-state__summary dt {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.differentiate-empty-state__summary dd {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--color-text);
}

.differentiate-empty-state__samples {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .differentiate-empty-state__samples {
    grid-template-columns: 1fr;
  }
}

.differentiate-empty-state__sample {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.differentiate-empty-state__sample-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.differentiate-empty-state__sample-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.differentiate-empty-state__sample-body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: pre-line;
}
```

- [ ] **Step 5: Pass the summary from DifferentiatePanel**

In `DifferentiatePanel.tsx`, replace:

```tsx
<DifferentiateEmptyState onStart={focusIntake} />
```

with:

```tsx
<DifferentiateEmptyState
  onStart={focusIntake}
  classroomSummary={profile ? {
    totalStudents: profile.students.length,
    ealStudents: profile.students.filter((s) => s.eal_flag).length,
    gradeBand: profile.grade_band,
  } : undefined}
/>
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run apps/web/src/components/__tests__/DifferentiateEmptyState.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/DifferentiateEmptyState.tsx apps/web/src/components/DifferentiateEmptyState.css apps/web/src/components/__tests__/DifferentiateEmptyState.test.tsx apps/web/src/panels/DifferentiatePanel.tsx
git commit -m "feat(differentiate): empty state shows sample variants + classroom summary"
```

---

## Task 16: LanguageTools toggle — strengthen active contrast + iconograph

**Files:**
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx` (only the toggle block)
- Modify: `apps/web/src/panels/LanguageToolsPanel.css` (or the existing language-tool-toggle styles file — find via grep before editing)

- [ ] **Step 1: Locate existing styles**

Run: `grep -rn "language-tool-toggle" apps/web/src/**/*.css`

Expected: one or two matches pointing to the current style block. Edit there.

- [ ] **Step 2: Replace toggle markup with icon-augmented buttons**

In `LanguageToolsPanel.tsx`, replace the existing `<div className="language-tool-toggle">...</div>` block with:

```tsx
<div className="language-tool-toggle" role="tablist" aria-label="Language tool">
  <button
    type="button"
    className={`language-tool-toggle__btn${activeTool === "simplify" ? " language-tool-toggle__btn--active" : ""}`}
    onClick={() => setActiveTool("simplify")}
    aria-pressed={activeTool === "simplify"}
    role="tab"
    aria-selected={activeTool === "simplify"}
  >
    <span className="language-tool-toggle__glyph" aria-hidden="true">Aa</span>
    <span className="language-tool-toggle__label">Simplify Text</span>
  </button>
  <button
    type="button"
    className={`language-tool-toggle__btn${activeTool === "vocab" ? " language-tool-toggle__btn--active" : ""}`}
    onClick={() => setActiveTool("vocab")}
    aria-pressed={activeTool === "vocab"}
    role="tab"
    aria-selected={activeTool === "vocab"}
  >
    <span className="language-tool-toggle__glyph" aria-hidden="true">▢▢</span>
    <span className="language-tool-toggle__label">Vocab Cards</span>
  </button>
</div>
```

- [ ] **Step 3: Overwrite the toggle styles**

Replace the `.language-tool-toggle` style block with:

```css
.language-tool-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.language-tool-toggle__btn {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 120ms ease-out, color 120ms ease-out;
}

.language-tool-toggle__btn:hover {
  color: var(--color-text);
}

.language-tool-toggle__btn--active {
  background: var(--color-text);
  color: var(--color-surface);
}

.language-tool-toggle__glyph {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0;
}

.language-tool-toggle__btn--active .language-tool-toggle__glyph {
  color: var(--color-surface);
}
```

- [ ] **Step 4: Typecheck + visual smoke**

Run: `npm run typecheck && npm run dev` — navigate to `?tab=language-tools` and confirm the toggle renders with a clear inverted active state.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/LanguageToolsPanel.tsx apps/web/src/panels/LanguageToolsPanel.css
git commit -m "style(language-tools): invert active toggle + add glyphs"
```

---

## Task 17: SimplifiedViewer — accept defaults from props

**Files:**
- Modify: `apps/web/src/components/SimplifiedViewer.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/SimplifiedViewer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SimplifiedViewer from "../SimplifiedViewer";

describe("SimplifiedViewer defaults", () => {
  it("initializes Grade from defaultGradeBand prop", () => {
    render(
      <SimplifiedViewer
        onSubmit={() => {}}
        result={null}
        loading={false}
        defaultGradeBand="Grade 3"
      />,
    );
    const grade = screen.getByLabelText(/grade/i) as HTMLSelectElement;
    expect(grade.value).toBe("Grade 3");
  });

  it("falls back to Grade 4 when defaultGradeBand is undefined", () => {
    render(
      <SimplifiedViewer onSubmit={() => {}} result={null} loading={false} />,
    );
    const grade = screen.getByLabelText(/grade/i) as HTMLSelectElement;
    expect(grade.value).toBe("Grade 4");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/SimplifiedViewer.test.tsx`
Expected: FAIL — prop doesn't exist.

- [ ] **Step 3: Extend `Props` and initial state**

```typescript
interface Props {
  onSubmit: (sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") => void;
  result: SimplifyResponse | null;
  loading: boolean;
  defaultGradeBand?: string;
}

export default function SimplifiedViewer({ onSubmit, result, loading, defaultGradeBand }: Props) {
  const [sourceText, setSourceText] = useState("");
  const [gradeBand, setGradeBand] = useState(defaultGradeBand ?? "Grade 4");
  const [ealLevel, setEalLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  // ... rest unchanged
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run apps/web/src/components/__tests__/SimplifiedViewer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/SimplifiedViewer.tsx apps/web/src/components/__tests__/SimplifiedViewer.test.tsx
git commit -m "feat(simplify): accept defaultGradeBand prop"
```

---

## Task 18: VocabCardGrid — accept defaults and drop the duplicate Subject selector

The CurriculumPicker already has a Subject selector that drives the same classification purpose. We keep a single lightweight Subject chip inside VocabCardGrid (so the vocab request still carries a subject string), and we re-point the displayed source of truth to the CurriculumPicker when it is opened. The core de-duplication move: compute `subject` from CurriculumPicker when a selection exists, and keep the local `select` as a minimal fallback.

**Files:**
- Modify: `apps/web/src/components/VocabCardGrid.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/VocabCardGrid.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VocabCardGrid from "../VocabCardGrid";

describe("VocabCardGrid defaults", () => {
  it("initializes Grade from defaultGradeBand", () => {
    render(
      <VocabCardGrid
        onSubmit={() => {}}
        result={null}
        loading={false}
        defaultGradeBand="Grade 3"
      />,
    );
    const grade = screen.getByLabelText(/grade/i) as HTMLSelectElement;
    expect(grade.value).toBe("Grade 3");
  });

  it("initializes Target Language from defaultTargetLanguage", () => {
    render(
      <VocabCardGrid
        onSubmit={() => {}}
        result={null}
        loading={false}
        defaultTargetLanguage="ar"
      />,
    );
    const lang = screen.getByLabelText(/target language/i) as HTMLSelectElement;
    expect(lang.value).toBe("ar");
  });

  it("renders only one Subject control (the CurriculumPicker's)", () => {
    render(<VocabCardGrid onSubmit={() => {}} result={null} loading={false} />);
    const subjectControls = screen.queryAllByLabelText(/^subject$/i);
    expect(subjectControls.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/VocabCardGrid.test.tsx`
Expected: FAIL — two Subject selects currently exist.

- [ ] **Step 3: Edit VocabCardGrid**

Replace the existing `<select id="vocab-subject">` block with a hidden-but-derived value. Update the top of the component:

```typescript
interface Props {
  onSubmit: (
    artifactText: string,
    subject: string,
    targetLanguage: string,
    gradeBand: string,
    curriculumSelection: CurriculumSelection | null,
  ) => void;
  result: VocabCardsResponse | null;
  loading: boolean;
  defaultGradeBand?: string;
  defaultTargetLanguage?: string;
}

// Inside the component:
const [artifactText, setArtifactText] = useState("");
const [targetLang, setTargetLang] = useState(defaultTargetLanguage ?? "es");
const [gradeBand, setGradeBand] = useState(defaultGradeBand ?? "Grade 4");
const [curriculumSelection, setCurriculumSelection] = useState<CurriculumSelection | null>(null);

// Subject is derived: either from CurriculumPicker selection, or default "ELA".
// A friendly label is shown next to the form for disclosure; users change it
// by using the CurriculumPicker below.
const SUBJECT_CODE_TO_LABEL: Record<string, string> = {
  english_language_arts_and_literature: "ELA",
  mathematics: "Math",
  science: "Science",
  social_studies: "Social Studies",
};
const derivedSubjectCode = curriculumSelection?.entry_id
  ? inferSubjectFromEntryId(curriculumSelection.entry_id) // see helper below
  : null;
const subject = derivedSubjectCode ? SUBJECT_CODE_TO_LABEL[derivedSubjectCode] ?? "ELA" : "ELA";
```

Add a helper outside the component:

```typescript
function inferSubjectFromEntryId(entryId: string): string | null {
  if (entryId.includes("ela")) return "english_language_arts_and_literature";
  if (entryId.includes("math")) return "mathematics";
  if (entryId.includes("science")) return "science";
  if (entryId.includes("social")) return "social_studies";
  return null;
}
```

Remove the top-level `<select id="vocab-subject">` block and the `const [subject, setSubject] = useState("ELA")` state. The remaining form row becomes a 2-column `Target language` + `Grade` layout. Replace the `handleSubmit`'s `onSubmit(artifactText, subject, ...)` call — `subject` is now derived.

Above the CurriculumPicker usage, add a small disclosure line:

```tsx
<p className="vocab-form__subject-hint">
  <span aria-hidden="true">Subject</span>
  <strong>{subject}</strong>
  <span className="vocab-form__subject-hint-note">— change via Alberta Curriculum below</span>
</p>
```

- [ ] **Step 4: Add the CSS for the hint**

In the existing `VocabCardGrid.css`, append:

```css
.vocab-form__subject-hint {
  margin: var(--space-3) 0 var(--space-2);
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.vocab-form__subject-hint strong {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text);
}

.vocab-form__subject-hint-note {
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run apps/web/src/components/__tests__/VocabCardGrid.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/VocabCardGrid.tsx apps/web/src/components/VocabCardGrid.css apps/web/src/components/__tests__/VocabCardGrid.test.tsx
git commit -m "feat(vocab): derive subject from curriculum selection; accept language/grade defaults"
```

---

## Task 19: LanguageToolsPanel — wire defaults from classroom profile

**Files:**
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx`

- [ ] **Step 1: Import the helpers**

Add to the top of the file:

```typescript
import { pickDefaultGradeBand, pickDefaultTargetLanguage } from "../utils/classroomLanguageDefaults";
```

- [ ] **Step 2: Compute defaults with useMemo**

Inside `LanguageToolsPanel`, just after the existing hooks:

```typescript
const defaultGradeBand = useMemo(() => pickDefaultGradeBand(profile ?? null), [profile]);
const defaultTargetLanguage = useMemo(() => pickDefaultTargetLanguage(profile ?? null), [profile]);
```

- [ ] **Step 3: Pass through to the viewers**

Replace the two `<SimplifiedViewer ... />` calls with:

```tsx
<SimplifiedViewer
  onSubmit={handleSimplify}
  result={null}
  loading={simplify.loading}
  defaultGradeBand={defaultGradeBand}
/>
```

```tsx
<SimplifiedViewer
  onSubmit={handleSimplify}
  result={simplify.result}
  loading={simplify.loading}
  defaultGradeBand={defaultGradeBand}
/>
```

Replace the two `<VocabCardGrid ... />` calls with:

```tsx
<VocabCardGrid
  onSubmit={handleVocabCards}
  result={null}
  loading={vocab.loading}
  defaultGradeBand={defaultGradeBand}
  defaultTargetLanguage={defaultTargetLanguage}
/>
```

```tsx
<VocabCardGrid
  onSubmit={handleVocabCards}
  result={vocab.result}
  loading={vocab.loading}
  defaultGradeBand={defaultGradeBand}
  defaultTargetLanguage={defaultTargetLanguage}
/>
```

- [ ] **Step 4: Typecheck + visual smoke**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run dev`, visit `/?classroom=demo-okafor-grade34&demo=true&tab=language-tools`. The Grade select should start at "Grade 3" (demo grade 3-4 → Grade 3 is the first numeric). The Target Language should reflect the demo's most common non-English family language.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panels/LanguageToolsPanel.tsx
git commit -m "feat(language-tools): pre-fill grade and target language from classroom profile"
```

---

## Task 20: LanguageTools — optional "For student" selector

**Files:**
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx`
- Create: `apps/web/src/components/LanguageToolsStudentPicker.tsx`
- Create: `apps/web/src/components/LanguageToolsStudentPicker.css`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/LanguageToolsStudentPicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageToolsStudentPicker from "../LanguageToolsStudentPicker";

const STUDENTS = [
  { alias: "Amira", eal_flag: true, family_language: "Arabic" },
  { alias: "Elena", eal_flag: true, family_language: "Spanish" },
  { alias: "Diego", eal_flag: false, family_language: "English" },
];

describe("LanguageToolsStudentPicker", () => {
  it("lists only EAL-flagged students", () => {
    render(
      <LanguageToolsStudentPicker students={STUDENTS} value={null} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /for student/i }));
    expect(screen.getByRole("option", { name: /amira/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /elena/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /diego/i })).not.toBeInTheDocument();
  });

  it("emits the selected student when changed", () => {
    const onChange = vi.fn();
    render(
      <LanguageToolsStudentPicker students={STUDENTS} value={null} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /for student/i }));
    fireEvent.click(screen.getByRole("option", { name: /amira/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ alias: "Amira", family_language: "Arabic" }),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/LanguageToolsStudentPicker.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the picker**

```typescript
// apps/web/src/components/LanguageToolsStudentPicker.tsx
import { useState } from "react";
import "./LanguageToolsStudentPicker.css";

export interface StudentLike {
  alias: string;
  eal_flag?: boolean;
  family_language?: string;
}

interface Props {
  students: StudentLike[];
  value: StudentLike | null;
  onChange: (s: StudentLike | null) => void;
}

export default function LanguageToolsStudentPicker({ students, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ealStudents = students.filter((s) => s.eal_flag);

  if (ealStudents.length === 0) return null;

  return (
    <div className="lt-student-picker">
      <button
        type="button"
        className="lt-student-picker__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lt-student-picker__label">For student</span>
        <span className="lt-student-picker__value">
          {value ? value.alias : "Optional — any EAL student"}
        </span>
      </button>
      {open ? (
        <ul className="lt-student-picker__list" role="listbox">
          <li role="option" aria-selected={value === null}>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Any EAL student
            </button>
          </li>
          {ealStudents.map((s) => (
            <li key={s.alias} role="option" aria-selected={value?.alias === s.alias}>
              <button
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                <span className="lt-student-picker__alias">{s.alias}</span>
                {s.family_language ? (
                  <span className="lt-student-picker__lang">{s.family_language}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

```css
/* apps/web/src/components/LanguageToolsStudentPicker.css */
.lt-student-picker {
  position: relative;
  margin-bottom: var(--space-3);
}

.lt-student-picker__toggle {
  appearance: none;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-3);
  align-items: baseline;
  cursor: pointer;
  text-align: left;
}

.lt-student-picker__label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.lt-student-picker__value {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.lt-student-picker__list {
  list-style: none;
  margin: var(--space-1) 0 0;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-elevated);
  max-height: 12rem;
  overflow-y: auto;
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
}

.lt-student-picker__list button {
  appearance: none;
  background: transparent;
  border: 0;
  padding: var(--space-2) var(--space-3);
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.lt-student-picker__list button:hover,
.lt-student-picker__list button:focus-visible {
  background: var(--color-surface-muted);
}

.lt-student-picker__lang {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 4: Run the component test**

Run: `npx vitest run apps/web/src/components/__tests__/LanguageToolsStudentPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the picker into LanguageToolsPanel**

In `LanguageToolsPanel.tsx`:

```typescript
import LanguageToolsStudentPicker, { type StudentLike } from "../components/LanguageToolsStudentPicker";

// inside the component:
const [focusStudent, setFocusStudent] = useState<StudentLike | null>(null);

// When a student is picked, override the defaults so the form re-renders
// with their family language as the target language when applicable.
const effectiveTargetLanguage = useMemo(() => {
  if (!focusStudent?.family_language) return defaultTargetLanguage;
  const mapped = pickDefaultTargetLanguage({
    ...profile!,
    students: [focusStudent as ClassroomProfile["students"][number]],
  });
  return mapped;
}, [focusStudent, defaultTargetLanguage, profile]);
```

Place the picker inside the rail, just above the `language-tool-toggle`:

```tsx
<LanguageToolsStudentPicker
  students={profile?.students ?? []}
  value={focusStudent}
  onChange={setFocusStudent}
/>
```

Update the VocabCardGrid `defaultTargetLanguage` prop to use `effectiveTargetLanguage`.

- [ ] **Step 6: Typecheck + visual smoke**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/LanguageToolsStudentPicker.tsx apps/web/src/components/LanguageToolsStudentPicker.css apps/web/src/components/__tests__/LanguageToolsStudentPicker.test.tsx apps/web/src/panels/LanguageToolsPanel.tsx
git commit -m "feat(language-tools): add optional For-student picker that shifts defaults"
```

---

## Task 21: Language Tools empty state — sample card + classroom EAL summary

**Files:**
- Create: `apps/web/src/components/LanguageToolsEmptyState.tsx`
- Create: `apps/web/src/components/LanguageToolsEmptyState.css`
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/components/__tests__/LanguageToolsEmptyState.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LanguageToolsEmptyState from "../LanguageToolsEmptyState";

describe("LanguageToolsEmptyState", () => {
  it("renders a simplify-mode sample with before/after text", () => {
    render(
      <LanguageToolsEmptyState
        mode="simplify"
        ealStudents={4}
        topLanguages={["Arabic", "Spanish"]}
      />,
    );
    expect(screen.getByText(/before/i)).toBeInTheDocument();
    expect(screen.getByText(/after/i)).toBeInTheDocument();
    expect(screen.getByText(/4 eal/i)).toBeInTheDocument();
  });

  it("renders a vocab-mode sample with a bilingual term", () => {
    render(
      <LanguageToolsEmptyState mode="vocab" ealStudents={4} topLanguages={["Arabic"]} />,
    );
    expect(screen.getByText(/community/i)).toBeInTheDocument();
    expect(screen.getByText(/arabic/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/components/__tests__/LanguageToolsEmptyState.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// apps/web/src/components/LanguageToolsEmptyState.tsx
import "./LanguageToolsEmptyState.css";

interface Props {
  mode: "simplify" | "vocab";
  ealStudents: number;
  topLanguages: string[];
}

export default function LanguageToolsEmptyState({ mode, ealStudents, topLanguages }: Props) {
  return (
    <section className="lt-empty" aria-label="Language tools preview">
      <header className="lt-empty__header">
        <span className="lt-empty__eyebrow">
          {mode === "simplify" ? "Simplify preview" : "Vocab card preview"}
        </span>
        <h3 className="lt-empty__title">
          {mode === "simplify" ? "What a simplified passage looks like" : "What a bilingual card looks like"}
        </h3>
        <dl className="lt-empty__summary">
          <div>
            <dt>EAL</dt>
            <dd>{ealStudents} EAL</dd>
          </div>
          <div>
            <dt>Top languages</dt>
            <dd>{topLanguages.slice(0, 3).join(" · ") || "—"}</dd>
          </div>
        </dl>
      </header>

      {mode === "simplify" ? (
        <div className="lt-empty__simplify">
          <article className="lt-empty__block">
            <span className="lt-empty__block-label">Before</span>
            <p>Firefighters protect the community by extinguishing fires and performing rescues.</p>
          </article>
          <article className="lt-empty__block lt-empty__block--after">
            <span className="lt-empty__block-label">After</span>
            <p>Firefighters help people. They stop fires. They help people get out.</p>
          </article>
        </div>
      ) : (
        <article className="lt-empty__card">
          <div className="lt-empty__card-term">community</div>
          <div className="lt-empty__card-trans">
            <span>{topLanguages[0] ?? "Arabic"}</span>
            <span className="lt-empty__card-foreign">مجتمع</span>
          </div>
          <p className="lt-empty__card-def">A group of people who live, work, or learn together.</p>
          <p className="lt-empty__card-example">The community helped plant the garden.</p>
        </article>
      )}
    </section>
  );
}
```

```css
/* apps/web/src/components/LanguageToolsEmptyState.css */
.lt-empty {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

.lt-empty__header {
  display: grid;
  gap: var(--space-2);
  max-width: 64ch;
}

.lt-empty__eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-tertiary);
}

.lt-empty__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--color-text);
}

.lt-empty__summary {
  display: flex;
  gap: var(--space-4);
  margin: var(--space-2) 0 0;
}

.lt-empty__summary > div {
  display: grid;
  gap: var(--space-1);
}

.lt-empty__summary dt {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.lt-empty__summary dd {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--color-text);
}

.lt-empty__simplify {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 760px) {
  .lt-empty__simplify {
    grid-template-columns: 1fr;
  }
}

.lt-empty__block {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--color-surface);
}

.lt-empty__block-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.lt-empty__block p {
  margin: var(--space-2) 0 0;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.lt-empty__card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: var(--color-surface);
  display: grid;
  gap: var(--space-2);
  max-width: 32rem;
}

.lt-empty__card-term {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--color-text);
}

.lt-empty__card-trans {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
}

.lt-empty__card-trans span:first-child {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.lt-empty__card-foreign {
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  color: var(--color-text);
}

.lt-empty__card-def,
.lt-empty__card-example {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
```

- [ ] **Step 4: Use it in LanguageToolsPanel**

Replace the existing `<EmptyStateCard ... />` block with:

```tsx
<LanguageToolsEmptyState
  mode={activeTool === "simplify" ? "simplify" : "vocab"}
  ealStudents={profile?.students.filter((s) => s.eal_flag).length ?? 0}
  topLanguages={topFamilyLanguages(profile?.students ?? [])}
/>
```

Add the helper at the bottom of the file (or import from `classroomLanguageDefaults`):

```typescript
function topFamilyLanguages(students: { family_language?: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const s of students) {
    const raw = (s.family_language ?? "").trim();
    if (!raw || raw.toLowerCase() === "english") continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([lang]) => lang);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run apps/web/src/components/__tests__/LanguageToolsEmptyState.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/LanguageToolsEmptyState.tsx apps/web/src/components/LanguageToolsEmptyState.css apps/web/src/components/__tests__/LanguageToolsEmptyState.test.tsx apps/web/src/panels/LanguageToolsPanel.tsx
git commit -m "feat(language-tools): richer empty state with sample + EAL summary"
```

---

## Task 22: Wire `RecentRunsChipRow` into both panels

**Files:**
- Modify: `apps/web/src/panels/DifferentiatePanel.tsx`
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx`

- [ ] **Step 1: Record runs after a successful generation (Differentiate)**

In `DifferentiatePanel.tsx`, add:

```typescript
import RecentRunsChipRow from "../components/RecentRunsChipRow";
import { useRecentRuns } from "../hooks/useRecentRuns";
```

Inside the component:

```typescript
const recent = useRecentRuns("differentiate", activeClassroom, 3);
```

In `handleDifferentiate`, just after `setResultKey((k) => k + 1);`:

```typescript
recent.record({
  id: `diff-${resultKey + 1}`,
  label: artifact.title,
  at: Date.now(),
});
```

Render the chip row above `ResultBanner` (inside the `result ?` branch of the canvas):

```tsx
<RecentRunsChipRow
  runs={recent.runs}
  onSelect={() => {
    // Selecting a recent run currently just scrolls back to the result canvas.
    // A future task can wire restore-from-cache; for now this is a nav hint.
    resultRef.current?.scrollIntoView({ behavior: "smooth" });
  }}
/>
```

- [ ] **Step 2: Do the same for LanguageToolsPanel**

```typescript
const recent = useRecentRuns(
  activeTool === "simplify" ? "simplify" : "vocab",
  activeClassroom,
  3,
);
```

Record in `handleSimplify`:

```typescript
recent.record({
  id: `simplify-${simplifyKey + 1}`,
  label: sourceText.slice(0, 40) + (sourceText.length > 40 ? "…" : ""),
  at: Date.now(),
});
```

Record in `handleVocabCards`:

```typescript
recent.record({
  id: `vocab-${vocabKey + 1}`,
  label: `${targetLanguage.toUpperCase()} · ${gradeBand}`,
  at: Date.now(),
});
```

Render `<RecentRunsChipRow runs={recent.runs} onSelect={() => {}} />` inside each `result` branch of the canvas, above `ResultBanner`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/panels/DifferentiatePanel.tsx apps/web/src/panels/LanguageToolsPanel.tsx
git commit -m "feat(prep): show last-3 runs as a chip row above results"
```

---

## Task 23: Full validation

- [ ] **Step 1: TypeScript**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Unit tests**

Run: `npm run test`
Expected: existing 1,474+ vitest tests still pass plus the new tests added in this plan (approximately +22 tests).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Release gate (mock lane only)**

Run: `npm run release:gate`
Expected: PASS.

- [ ] **Step 5: Contrast check**

Run: `npm run check:contrast`
Expected: PASS (all new CSS uses existing tokens that already pass WCAG AA).

- [ ] **Step 6: Visual sanity**

Run: `npm run dev`. Visit:
- `/?classroom=demo-okafor-grade34&demo=true&tab=differentiate` — confirm PrepSectionIntro at top, sample variant triptych in empty state, sticky Generate button, ALL-CAPS mono labels for required/optional legend, collapsible Alberta section.
- `/?classroom=demo-okafor-grade34&demo=true&tab=language-tools` — confirm inverted-active toggle, For-student picker, Grade pre-filled to "Grade 3", Target language pre-filled to the demo's top non-English family language, rich empty state.

- [ ] **Step 7: Final commit if any fixes**

If any sanity-check surfaced an issue, fix and commit. Otherwise, no-op.

---

## Out-Of-Scope (tracked for follow-up)

These are deliberately *not* in this plan:

- **Server-persisted run history.** Differentiate and Language Tools output is ephemeral; this plan adds only `sessionStorage`-scoped history. Persisting to SQLite memory would require new endpoints, schemas, and retention policy — that's a bigger change and should land behind its own spec. (Audit #20 partial.)
- **Classroom-switcher wiring from the `live` PageIntro badge.** The badge dispatches a DOM event; listening for it and opening the palette is a separate App-shell change. (Audit #4 partial.)
- **Restore-from-cache when a recent chip is clicked.** The chip currently only scrolls the result panel into view. A full restore would require keeping the full response payload in session memory (bigger storage footprint, not proved needed yet).
- **Print-styled vocab cards for physical cutting.** Already flagged as an open gap in `project_frontend_design_gaps.md` — not part of this audit response.

---

## Self-Review Checklist

- [x] **Spec coverage:** every concurred audit finding has a task:
  - #1 → Task 4–5
  - #2 → Task 6
  - #3 → Task 4
  - #4 → Tasks 7–9
  - #5 → Tasks 10–11
  - #6 → Task 12
  - #8 → Task 14
  - #9 → Task 13
  - #10/#11 → Task 15
  - #12 → Task 16
  - #14/#16 → Tasks 17–19
  - #15 → Task 18
  - #17/#19 → Task 21
  - #18 → Task 20
  - #20 → Tasks 2–3, 22
- [x] **No placeholders:** every code block is concrete.
- [x] **Tokens verified:** `--color-accent`, `--color-border`, `--color-border-strong`, `--color-surface`, `--color-surface-elevated`, `--color-surface-muted`, `--color-text`, `--color-text-secondary`, `--color-text-tertiary`, `--font-sans`, `--font-mono`, `--font-display`, `--text-2xs`, `--text-xs`, `--text-sm`, `--text-base`, `--text-md`, `--text-lg`, `--text-xl`, `--text-2xl`, `--space-1..9`, `--space-2-5`, `--radius-sm`, `--radius-md`, `--radius-pill`, `--shadow-xs`, `--font-weight-medium` — all present in `apps/web/src/styles/tokens.css`.
- [x] **Type consistency:** `RecentRun` is defined once in `useRecentRuns.ts` and imported by `RecentRunsChipRow`; `StudentLike` is defined in `LanguageToolsStudentPicker.tsx` and re-exported.
- [x] **Rejected findings documented** (#7, #13, #21) so no one re-reports them as missing.
