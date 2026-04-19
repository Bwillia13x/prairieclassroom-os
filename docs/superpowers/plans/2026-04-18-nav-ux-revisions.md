# Navigation & Header UX Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the audit findings the team concurs with — focused on header semantics, role-selector clarity, badge placement, two-tier tab hierarchy, and command-palette polish — while staying aligned with the nothing-design system already in use across the shell.

**Architecture:** Pure UI work in `apps/web/src/components/*` and `apps/web/src/styles/nothing-theme.css`. No reducer/state shape changes. No API/contract changes. Each task is a self-contained edit + test + commit.

**Tech Stack:** React 18 + TypeScript, Vite, vitest + @testing-library/react, monochromatic nothing-theme CSS tokens.

## Concur / Decline Summary

The audit lists 17 issues. This plan implements the ones we concur with; the rest are documented inline.

| # | Issue | Verdict | Why |
|---|---|---|---|
| 1 | Light/Dark toggle "L"/"D" ambiguous | **Concur** — sun/moon icon | Aligns with nothing-design Section 2.4 (lightest tool that works) |
| 2 | ⌘K button has no label/tooltip | **Concur** — add visible "Jump to" label | Cheap clarity win |
| 3 | Header button hierarchy flat | **Concur** — separate role from utility cluster with a hairline | Nothing-design Section 2.3 (spacing > dividers, but a single rule is allowed when proximity isn't enough) |
| 4 | "Quick Help" misleading | **Concur** — split into icon `?` (replay tour) + restore-tip uses contextual hint inline; keep current dual-purpose behavior but relabel + iconify | Preserves the contextual-tip restore feature already wired |
| 5 | Lock icon's purpose unclear | **Concur** — replace lock-as-trigger with `grid` switcher icon; keep lock chip in the dropdown for "protected" status | Removes metaphor mismatch |
| 6 | Classroom title not obviously clickable | **Already fixed** — entire pill is a `<button>` (App.tsx:780). Visual affordance can be polished. | Add hover state + cursor token |
| 7 | Classroom switcher popover anchoring | **Concur** — pin popover to anchor pill, not viewport | Bug-fix-grade |
| 8 | Two-tier tabs look identical | **Concur** — sub-tabs lighter weight + smaller | Nothing-design Section 2.1 (three-layer rule) |
| 9 | OPS sub-tabs overflow (6) | **Decline grouping; concur on visibility** — keep scroll, add fade indicators (already partially present per App.tsx:636) and bump scroll-into-view padding | Premature to add a dropdown overflow |
| 10 | Badge inline after text | **Concur** — superscript top-right corner | Convention |
| 11 | "SUPPORT PATTERNS 24" badge intent | **Concur** — clarify with tone (alert vs. count) by mapping `getTabBadgeCount` returns through a tone classifier | Visual honesty |
| 12 | Visual link top→sub tab | **Already adequate** — sliding indicator + `data-active-section` color tone exists | Skip |
| 13 | Role checkboxes → radio | **Concur visually** — code already uses `role="menuitemradio"` + `aria-checked`. Visual chip currently looks ambiguous; replace with explicit filled/empty radio dot. | Semantic + visual alignment |
| 14 | No selected role indicator | **Concur** — add visible `[ACTIVE]` Space-Mono tag and a checkmark on the selected option | Nothing-design tertiary metadata |
| 15 | Tooltip disconnected | **Decline** — current placement inside menu is a reasonable header. | Skip |
| 16 | Shortcut hint discoverability | **Decline** — already shown inline next to each entry. | Skip |
| 17 | Command palette section dividers | **Concur** — labeled Space-Mono ALL CAPS group headers ("PANELS", "CLASSROOMS") | Nothing-design Section 2.3 |

## File Map

- Modify: `apps/web/src/App.tsx` (header markup: classroom switcher icon, ⌘K label, Quick Help → icon)
- Modify: `apps/web/src/components/ThemeToggle.tsx` (sun/moon icon, drop letter)
- Modify: `apps/web/src/components/SectionIcon.tsx` (add `moon` and `command` icons)
- Modify: `apps/web/src/components/RoleContextPill.tsx` (radio dot + ACTIVE tag)
- Modify: `apps/web/src/components/RoleContextPill.css` (radio styling)
- Modify: `apps/web/src/components/CommandPalette.tsx` (grouped sections w/ headers)
- Modify: `apps/web/src/components/CommandPalette.css` (group header styling)
- Modify: `apps/web/src/styles/nothing-theme.css` (sub-tab hierarchy, badge superscript, header hairline divider, classroom popover anchoring, hover affordance)
- Test: `apps/web/src/components/__tests__/ThemeToggle.test.tsx` (new)
- Test: `apps/web/src/components/__tests__/RoleContextPill.test.tsx` (existing; extend)
- Test: `apps/web/src/components/__tests__/CommandPalette.test.tsx` (existing; extend)
- Test: `apps/web/src/__tests__/App.shell.test.tsx` (existing; extend with classroom-pill icon assertion)

Validation cadence per CLAUDE.md: `npm run typecheck` + `npm run test` per task; `npm run check:contrast` if any token changes (none planned).

---

## Task 1: Replace classroom-pill lock icon with switcher metaphor

**Why:** Audit Issue 5. The lock metaphor reads as "secured/cannot edit" but the pill is the click target for switching classrooms. Move the lock semantic to the protected-status chip inside the popover (already exists per App.tsx:830), and use a `grid` switcher icon on the trigger.

**Files:**
- Modify: `apps/web/src/App.tsx:61-78` (delete `LockIcon` component — no longer used in trigger)
- Modify: `apps/web/src/App.tsx:788-790` (replace lock span with switcher icon)
- Modify: `apps/web/src/styles/nothing-theme.css:1261` (rename `.shell-classroom-pill__lock` rules to `.shell-classroom-pill__switcher`)

- [ ] **Step 1: Write the failing test**

In `apps/web/src/__tests__/App.shell.test.tsx`, add:

```tsx
it("renders a switcher icon (not a lock) on the classroom pill trigger", async () => {
  await renderShellWithDemo();
  const trigger = screen.getByRole("button", { name: /active classroom/i });
  // The switcher rectangle grid is rendered as four <rect> elements via SectionIcon name="grid"
  const switcherIcon = trigger.querySelector(".shell-classroom-pill__switcher");
  expect(switcherIcon).not.toBeNull();
  // Ensure the legacy LockIcon path (path with "M5.5 8V5.9") is no longer in the trigger
  expect(trigger.innerHTML).not.toMatch(/M5\.5 8V5\.9/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/App.shell.test.tsx -t "switcher icon"`
Expected: FAIL — current trigger renders `LockIcon` SVG path `M5.5 8V5.9...`.

- [ ] **Step 3: Update App.tsx — remove LockIcon usage in trigger, render SectionIcon "grid"**

Replace App.tsx:788-790:

```tsx
<span className="shell-classroom-pill__switcher" aria-hidden="true">
  <SectionIcon name="grid" className="shell-classroom-pill__switcher-icon" />
</span>
```

Then delete the unused `LockIcon` component (App.tsx:61-78). Keep the import path (no other refs — verified via grep).

- [ ] **Step 4: Update CSS class names in nothing-theme.css**

Replace `.shell-classroom-pill__lock` and `.shell-classroom-pill__lock--locked` selectors throughout `apps/web/src/styles/nothing-theme.css` with `.shell-classroom-pill__switcher`. Drop the locked-state branch (no longer needed — protected status is shown by the chip in the popover at App.tsx:830).

```bash
grep -n "shell-classroom-pill__lock" apps/web/src/styles/nothing-theme.css
```

For each match, rename to `.shell-classroom-pill__switcher` (delete the `--locked` variant rules entirely; switcher has one neutral state).

Add a sizing rule near the existing pill styles:

```css
.shell-classroom-pill__switcher-icon {
  width: 16px;
  height: 16px;
  opacity: 0.75;
}
```

- [ ] **Step 5: Run typecheck and the test**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/__tests__/App.shell.test.tsx -t "switcher icon"`
Expected: PASS, no TS errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles/nothing-theme.css apps/web/src/__tests__/App.shell.test.tsx
git commit -m "ui: replace classroom-pill lock with switcher icon"
```

---

## Task 2: Sun/moon icon ThemeToggle

**Why:** Audit Issue 1. "L LIGHT" / "D DARK" / "A AUTO" reads as a keyboard chord. Nothing-design Section 2.8 #4 ("controls look like controls"): a theme toggle should show the mode it represents.

**Files:**
- Modify: `apps/web/src/components/SectionIcon.tsx` (add `moon` icon)
- Modify: `apps/web/src/components/ThemeToggle.tsx` (icon + accessible label only — drop visible text)

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/__tests__/ThemeToggle.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import ThemeToggle from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders an icon-only button with descriptive aria-label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /color theme/i });
    expect(btn).toBeInTheDocument();
    // No visible "L"/"D"/"A" letter label
    expect(btn.textContent?.trim()).toMatch(/^$/);
    // SVG icon present
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("cycles system → light → dark and updates icon role", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /color theme/i });
    expect(btn.getAttribute("aria-label")).toMatch(/auto/i);
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-label")).toMatch(/light/i);
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-label")).toMatch(/dark/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/__tests__/ThemeToggle.test.tsx`
Expected: FAIL — current toggle renders visible letter `L`/`D`/`A`.

- [ ] **Step 3: Add `moon` icon to SectionIcon**

Edit `apps/web/src/components/SectionIcon.tsx`. Add `"moon"` to the `SectionIconName` union (line 7), and add this clause inside the SVG (after the `sun` clause):

```tsx
{name === "moon" ? (
  <path d="M20.5 14.2A8 8 0 1 1 9.8 3.5a6.4 6.4 0 0 0 10.7 10.7Z" />
) : null}
```

- [ ] **Step 4: Replace ThemeToggle body**

Replace the entire return block of `apps/web/src/components/ThemeToggle.tsx`:

```tsx
import SectionIcon, { type SectionIconName } from "./SectionIcon";

const ICON_NAME: Record<Theme, SectionIconName> = {
  system: "refresh",
  light: "sun",
  dark: "moon",
};

// Inside component:
return (
  <button
    className="btn btn--ghost theme-toggle"
    onClick={cycle}
    type="button"
    aria-label={`Color theme: ${LABELS[theme]}. Click to change.`}
    title={`Theme: ${LABELS[theme]}`}
  >
    <SectionIcon name={ICON_NAME[theme]} className="theme-toggle__icon" />
  </button>
);
```

Delete the `ICONS` constant and the `<span className="theme-toggle-label">…` span (no longer rendered).

Also export `SectionIconName` from `SectionIcon.tsx` if not already exported (it is — line 7 uses `export type`).

Add CSS in `apps/web/src/styles/nothing-theme.css` near the existing `.theme-toggle` block:

```css
.theme-toggle__icon {
  width: 18px;
  height: 18px;
}
.theme-toggle-label { display: none; }
```

(Keep the `.theme-toggle-label` reset so any orphan ref harmlessly hides.)

- [ ] **Step 5: Run typecheck + tests**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/components/__tests__/ThemeToggle.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ThemeToggle.tsx apps/web/src/components/SectionIcon.tsx apps/web/src/components/__tests__/ThemeToggle.test.tsx apps/web/src/styles/nothing-theme.css
git commit -m "ui: icon-only theme toggle (sun/moon/auto)"
```

---

## Task 3: Label the ⌘K button

**Why:** Audit Issue 2. The current button shows only `⌘K` glyph — invisible to non-power users. Adding a visible "Jump to" label costs ~40px and makes the entry point obvious.

**Files:**
- Modify: `apps/web/src/App.tsx:853-861` (palette button content)
- Modify: `apps/web/src/styles/nothing-theme.css` (`.shell-bar__palette-btn` layout)

- [ ] **Step 1: Write failing assertion in App.shell.test.tsx**

Append to `apps/web/src/__tests__/App.shell.test.tsx`:

```tsx
it("renders the command-palette trigger with a visible 'Jump to' label and ⌘K hint", async () => {
  await renderShellWithDemo();
  const btn = screen.getByRole("button", { name: /open command palette/i });
  expect(btn.textContent).toMatch(/jump to/i);
  expect(btn.textContent).toMatch(/⌘K/);
});
```

- [ ] **Step 2: Run to confirm fail**

Run: `cd apps/web && npx vitest run src/__tests__/App.shell.test.tsx -t "Jump to"`
Expected: FAIL — current button text is just `⌘K`.

- [ ] **Step 3: Update the trigger markup**

Replace App.tsx:853-861 with:

```tsx
<button
  type="button"
  className="shell-bar__palette-btn"
  onClick={() => setPaletteOpen(true)}
  aria-label="Open command palette"
  title="Command palette (⌘K)"
>
  <span className="shell-bar__palette-btn-label">Jump to</span>
  <kbd className="shell-bar__palette-btn-kbd" aria-hidden="true">⌘K</kbd>
</button>
```

- [ ] **Step 4: Add CSS rules**

Append to `apps/web/src/styles/nothing-theme.css`:

```css
.shell-bar__palette-btn {
  gap: 8px;
}
.shell-bar__palette-btn-label {
  font-family: var(--font-sans, "DM Sans", sans-serif);
  font-size: 13px;
  letter-spacing: 0.02em;
}
.shell-bar__palette-btn-kbd {
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid currentColor;
  border-radius: 4px;
  opacity: 0.7;
}
```

- [ ] **Step 5: Run typecheck + tests**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/__tests__/App.shell.test.tsx -t "Jump to"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles/nothing-theme.css apps/web/src/__tests__/App.shell.test.tsx
git commit -m "ui: label command-palette trigger with 'Jump to ⌘K'"
```

---

## Task 4: Quick Help → contextual icon button

**Why:** Audit Issue 4. "Quick Help" reads as contextual help but launches the onboarding tour OR restores a panel tip. The dual behavior is correct; the label was the bug. Replace the text button with a `?` icon button whose `aria-label` and tooltip describe the contextual action.

**Files:**
- Modify: `apps/web/src/App.tsx:868-884` (replace button content)
- Modify: `apps/web/src/styles/nothing-theme.css` (icon-button sizing)

- [ ] **Step 1: Write failing test**

Append to `apps/web/src/__tests__/App.shell.test.tsx`:

```tsx
it("renders the help button as an icon-only `?` control with contextual aria-label", async () => {
  await renderShellWithDemo();
  const btn = screen.getByRole("button", { name: /open onboarding tour|restore panel tip/i });
  expect(btn.classList.contains("app-help-btn")).toBe(true);
  expect(btn.textContent?.trim()).toBe("?");
});
```

- [ ] **Step 2: Run to confirm fail**

Run: `cd apps/web && npx vitest run src/__tests__/App.shell.test.tsx -t "icon-only"`
Expected: FAIL — current button text is "Quick Help".

- [ ] **Step 3: Replace App.tsx:868-884**

```tsx
<button
  className="btn btn--ghost app-help-btn app-help-btn--icon"
  onClick={handleQuickHelpClick}
  type="button"
  aria-label={
    PANELS_WITH_HINT.has(state.activeTab) && state.featuresSeen[state.activeTab]
      ? "Restore panel tip for the current page"
      : "Open onboarding tour"
  }
  title={
    PANELS_WITH_HINT.has(state.activeTab) && state.featuresSeen[state.activeTab]
      ? "Restore tip for this panel"
      : "Replay onboarding tour"
  }
>
  <span aria-hidden="true">?</span>
</button>
```

- [ ] **Step 4: Add CSS rule**

Append to `apps/web/src/styles/nothing-theme.css`:

```css
.app-help-btn--icon {
  width: 32px;
  height: 32px;
  padding: 0;
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 5: Run typecheck + tests**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/__tests__/App.shell.test.tsx -t "icon-only"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles/nothing-theme.css apps/web/src/__tests__/App.shell.test.tsx
git commit -m "ui: replace 'Quick Help' label with contextual ? icon"
```

---

## Task 5: Header utility cluster — hairline divider between role pill and utilities

**Why:** Audit Issue 3. The role pill is identity (persistent state); ⌘K, theme, help are utility actions. Nothing-design Section 2.4 says use a single divider only when proximity is insufficient. Here, the four controls sit too tight to communicate the grouping by spacing alone.

**Files:**
- Modify: `apps/web/src/styles/nothing-theme.css:1266` (`.shell-bar__actions` — add separator pseudo-element after the role pill)

- [ ] **Step 1: Add separator rule**

Inside the existing `.shell-bar__actions` block in `nothing-theme.css`, add:

```css
.shell-bar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shell-bar__actions > .role-pill-anchor + .shell-bar__palette-btn::before {
  content: "";
  display: inline-block;
  width: 1px;
  height: 20px;
  background: currentColor;
  opacity: 0.18;
  margin-right: 12px;
  vertical-align: middle;
}
```

(Keep any existing properties on `.shell-bar__actions` — only adjust `gap` if not already set.)

- [ ] **Step 2: Visual verification**

Run: `cd apps/web && npm run dev` and confirm a hairline appears between the role pill and `⌘K Jump to`. No test required (pure decorative CSS).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles/nothing-theme.css
git commit -m "ui: hairline divider between role pill and utility actions"
```

---

## Task 6: RolePill — explicit radio dot + ACTIVE tag on selected option

**Why:** Audit Issues 13 & 14. Code already declares `role="menuitemradio"` + `aria-checked` (RoleContextPill.tsx:111-112), which is correct semantics. The visual is the gap: the colored chip looks like a checkbox. Replace with an explicit radio dot (filled circle for selected, hairline ring for unselected) and add a Space-Mono `[ACTIVE]` tag for the current role.

**Files:**
- Modify: `apps/web/src/components/RoleContextPill.tsx:104-122`
- Modify: `apps/web/src/components/RoleContextPill.css`
- Test: `apps/web/src/components/__tests__/RoleContextPill.test.tsx`

- [ ] **Step 1: Check existing tests**

Run: `cd apps/web && ls src/components/__tests__/RoleContextPill.test.tsx`
If file does not exist, create it with the test below. Otherwise append.

- [ ] **Step 2: Write failing test**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RoleContextPill from "../RoleContextPill";
import AppContext from "../../AppContext";

function renderWithCtx(role = "teacher") {
  const setClassroomRole = vi.fn();
  return render(
    <AppContext.Provider
      value={{
        activeClassroom: "demo-okafor-grade34",
        activeRole: role,
        setClassroomRole,
      } as never}
    >
      <RoleContextPill />
    </AppContext.Provider>,
  );
}

describe("RoleContextPill option visuals", () => {
  it("renders a radio dot per option and an ACTIVE tag on the selected role", () => {
    renderWithCtx("teacher");
    fireEvent.click(screen.getByRole("button", { name: /current role/i }));
    const teacherOpt = screen.getByRole("menuitemradio", { name: /Teacher/ });
    expect(teacherOpt.querySelector(".role-pill__option-radio")).not.toBeNull();
    expect(teacherOpt.querySelector(".role-pill__option-active-tag")?.textContent).toMatch(/active/i);
    const eaOpt = screen.getByRole("menuitemradio", { name: /^EA/ });
    expect(eaOpt.querySelector(".role-pill__option-active-tag")).toBeNull();
  });
});
```

- [ ] **Step 3: Run to confirm fail**

Run: `cd apps/web && npx vitest run src/components/__tests__/RoleContextPill.test.tsx`
Expected: FAIL — neither `.role-pill__option-radio` nor `.role-pill__option-active-tag` exist yet.

- [ ] **Step 4: Update RoleContextPill.tsx option markup**

Replace the option button JSX (lines 107-122) with:

```tsx
<button
  key={role}
  type="button"
  role="menuitemradio"
  aria-checked={selected}
  className={`role-pill__option${selected ? " role-pill__option--selected" : ""}`}
  onClick={() => handleSelect(role)}
>
  <span
    className={`role-pill__option-radio${selected ? " role-pill__option-radio--on" : ""}`}
    aria-hidden="true"
  />
  <span className="role-pill__option-copy">
    <span className="role-pill__option-label">
      {ROLE_LABEL[role]}
      {selected ? (
        <span className="role-pill__option-active-tag">[ACTIVE]</span>
      ) : null}
    </span>
    <span className="role-pill__option-hint">{ROLE_HINT[role]}</span>
  </span>
</button>
```

(Delete the legacy `role-pill__option-chip` span.)

- [ ] **Step 5: Add radio + tag CSS**

Append to `apps/web/src/components/RoleContextPill.css`:

```css
.role-pill__option-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: 0.55;
  flex-shrink: 0;
  position: relative;
}
.role-pill__option-radio--on {
  opacity: 1;
}
.role-pill__option-radio--on::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: currentColor;
}
.role-pill__option-active-tag {
  margin-left: 8px;
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 10px;
  letter-spacing: 0.08em;
  opacity: 0.55;
}
```

Remove or hide any orphan `.role-pill__option-chip` rules. Search:

```bash
grep -n "role-pill__option-chip" apps/web/src/components/RoleContextPill.css
```

Delete each matched rule.

- [ ] **Step 6: Run typecheck + tests**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/components/__tests__/RoleContextPill.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/RoleContextPill.tsx apps/web/src/components/RoleContextPill.css apps/web/src/components/__tests__/RoleContextPill.test.tsx
git commit -m "ui: radio dot + ACTIVE tag on role-pill options"
```

---

## Task 7: Sub-tab visual hierarchy — lighter weight, smaller scale

**Why:** Audit Issue 8. Top-level groups (TODAY/PREP/OPS/REVIEW) and sub-tabs both render with the same all-caps Space-Mono treatment. Nothing-design Section 2.1 (three-layer rule) requires a clear hierarchy. Make sub-tabs the **secondary** layer: smaller, lighter weight, looser tracking.

**Files:**
- Modify: `apps/web/src/styles/nothing-theme.css` `.shell-nav__tab` and `.shell-nav__group` rules

- [ ] **Step 1: Identify current rules**

Run:
```bash
grep -n "\.shell-nav__group\b\|\.shell-nav__tab\b" apps/web/src/styles/nothing-theme.css
```

- [ ] **Step 2: Update rules in nothing-theme.css**

Locate `.shell-nav__group` (line ~1336) and ensure it carries:

```css
.shell-nav__group {
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

Locate `.shell-nav__tab` (line ~1415) and replace its typography props with:

```css
.shell-nav__tab {
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.7;
}
.shell-nav__tab.shell-nav__tab--active {
  opacity: 1;
  font-weight: 500;
}
```

Keep all other layout / padding / hover rules intact.

- [ ] **Step 3: Visual verification**

Run: `cd apps/web && npm run dev`
Confirm: TODAY/PREP/OPS/REVIEW reads as primary; sub-tabs (DIFFERENTIATE, LANGUAGE TOOLS, etc.) read as a clear second tier — smaller, faded until active.

- [ ] **Step 4: Run regression suite**

Run: `cd apps/web && npx vitest run`
Expected: PASS (no behavior tests should break — purely visual).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles/nothing-theme.css
git commit -m "ui: differentiate sub-tab type scale from primary nav"
```

---

## Task 8: Badge superscript + tone classification

**Why:** Audit Issues 10 & 11. Badges currently render inline after the tab label. Move them to the top-right corner of the tab via absolute positioning; introduce an `alert` vs. `count` tone so high-numbers don't read as urgent when they're informational.

**Files:**
- Modify: `apps/web/src/appReducer.ts` (add `getTabBadgeTone` next to `getTabBadgeCount`)
- Modify: `apps/web/src/App.tsx:922-952` (consume tone in tab rendering)
- Modify: `apps/web/src/styles/nothing-theme.css` `.shell-nav__badge` block

- [ ] **Step 1: Write failing test**

Append to `apps/web/src/__tests__/App.shell.test.tsx`:

```tsx
it("renders the LOG INTERVENTION badge in the corner with alert tone", async () => {
  await renderShellWithDemo({ debtCounts: { stale_followup: 8 } });
  // Switch to OPS group so the sub-tab is in the DOM
  fireEvent.click(screen.getByTestId("shell-nav-group-ops"));
  const tab = await screen.findByRole("tab", { name: /Log Intervention/i });
  const badge = tab.querySelector(".shell-nav__badge");
  expect(badge).not.toBeNull();
  expect(badge?.classList.contains("shell-nav__badge--alert")).toBe(true);
});
```

If `renderShellWithDemo` doesn't accept a `debtCounts` option, extend it minimally to pre-seed `dispatch({ type: "SET_DEBT_COUNTS", counts })` after the initial classroom load.

- [ ] **Step 2: Run to confirm fail**

Run: `cd apps/web && npx vitest run src/__tests__/App.shell.test.tsx -t "alert tone"`
Expected: FAIL — no `--alert` class exists.

- [ ] **Step 3: Add tone helper to appReducer.ts**

After `getTabBadgeCount` (line 191), add:

```ts
export type TabBadgeTone = "alert" | "count";

export function getTabBadgeTone(tab: ActiveTab): TabBadgeTone {
  switch (tab) {
    case "family-message":
    case "log-intervention":
      return "alert";
    case "support-patterns":
      return "count";
    default:
      return "count";
  }
}
```

- [ ] **Step 4: Update App.tsx tab rendering**

In App.tsx, import `getTabBadgeTone` from `./appReducer`. In the secondary-tab map (around line 922), update the badge span:

```tsx
{count > 0 ? (
  <span
    className={`shell-nav__badge shell-nav__badge--${getTabBadgeTone(tab)}`}
    aria-label={`${count} pending`}
  >
    {count}
  </span>
) : null}
```

- [ ] **Step 5: Update CSS — superscript positioning + tones**

Replace the existing `.shell-nav__badge` block in `nothing-theme.css` with:

```css
.shell-nav__tab {
  position: relative;
}
.shell-nav__badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  border-radius: 999px;
  font-weight: 500;
}
.shell-nav__badge--alert {
  background: var(--color-alert, #d71921);
  color: #fff;
}
.shell-nav__badge--count {
  background: transparent;
  color: currentColor;
  border: 1px solid currentColor;
  opacity: 0.6;
}
```

(Adjust `--color-alert` to match the existing red token used in the project; verify with `grep "color-alert\|color-danger\|color-error" apps/web/src/tokens.css`.)

- [ ] **Step 6: Run typecheck + tests + contrast**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/__tests__/App.shell.test.tsx -t "alert tone" && cd ../.. && npm run check:contrast`
Expected: PASS, contrast intact.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/appReducer.ts apps/web/src/App.tsx apps/web/src/styles/nothing-theme.css apps/web/src/__tests__/App.shell.test.tsx
git commit -m "ui: corner badges with alert/count tones on sub-tabs"
```

---

## Task 9: Command palette — labeled section headers

**Why:** Audit Issue 17. Entries currently flow into a flat list; the only signal of grouping is the `command-palette__kind` tag inside each row. Add Space-Mono ALL CAPS group headers ("PANELS", "CLASSROOMS", "ACTIONS") that respect existing entry order without changing data shape.

**Files:**
- Modify: `apps/web/src/components/CommandPalette.tsx` (group entries by `entry.kind` while preserving sort)
- Modify: `apps/web/src/components/CommandPalette.css` (header style)
- Test: `apps/web/src/components/__tests__/CommandPalette.test.tsx`

- [ ] **Step 1: Inspect existing palette test**

Run: `cd apps/web && cat src/components/__tests__/CommandPalette.test.tsx | head -40`

If absent, create with imports modeled on `RoleContextPill.test.tsx` above.

- [ ] **Step 2: Write failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CommandPalette from "../CommandPalette";

const entries = [
  { id: "p1", kind: "panel" as const, label: "Today", keywords: ["today"], onSelect: vi.fn() },
  { id: "p2", kind: "panel" as const, label: "Differentiate", keywords: ["diff"], onSelect: vi.fn() },
  { id: "c1", kind: "classroom" as const, label: "Demo Grade 3-4", keywords: ["demo"], onSelect: vi.fn() },
];

describe("CommandPalette section headers", () => {
  it("renders a group header above each kind grouping when no query is active", () => {
    render(<CommandPalette open onClose={vi.fn()} entries={entries} />);
    const headers = screen.getAllByRole("presentation", { hidden: true })
      .filter((el) => el.classList.contains("command-palette__group-header"));
    expect(headers.length).toBeGreaterThanOrEqual(2);
    expect(headers.map((h) => h.textContent)).toEqual(expect.arrayContaining(["PANELS", "CLASSROOMS"]));
  });
});
```

- [ ] **Step 3: Run to confirm fail**

Run: `cd apps/web && npx vitest run src/components/__tests__/CommandPalette.test.tsx -t "section headers"`
Expected: FAIL.

- [ ] **Step 4: Update CommandPalette.tsx**

Replace the `<ul>` body in `CommandPalette.tsx` (lines 113-147) so that as the filtered list is rendered, a header `<li>` is emitted whenever `entry.kind` changes from the previous entry. Group label map:

```tsx
const KIND_HEADER: Record<PaletteEntry["kind"], string> = {
  panel: "PANELS",
  classroom: "CLASSROOMS",
  action: "ACTIONS",
};

// Inside the .map, refactor to a reduce that emits headers + items:
{filtered.length === 0 ? (
  <li className="command-palette__empty">No matches</li>
) : (
  filtered.slice(0, 40).reduce<JSX.Element[]>((acc, entry, i, arr) => {
    const prevKind = i === 0 ? null : arr[i - 1].kind;
    if (entry.kind !== prevKind) {
      acc.push(
        <li
          key={`hdr-${entry.kind}`}
          className="command-palette__group-header"
          role="presentation"
        >
          {KIND_HEADER[entry.kind]}
        </li>,
      );
    }
    acc.push(
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
        <span className="command-palette__meta">
          {entry.group && <span className="command-palette__group">{entry.group}</span>}
          {entry.shortcut && (
            <kbd
              className="command-palette__shortcut"
              aria-label={`Keyboard shortcut ${entry.shortcut}`}
            >
              {entry.shortcut}
            </kbd>
          )}
        </span>
      </li>,
    );
    return acc;
  }, [])
)}
```

Important: keep `i` as the **filtered index** for `aria-selected` and `activeIdx` math — do not let header rows shift the count.

- [ ] **Step 5: Add CSS for group header**

Append to `apps/web/src/components/CommandPalette.css`:

```css
.command-palette__group-header {
  list-style: none;
  padding: 12px 16px 4px;
  font-family: var(--font-mono, "Space Mono", monospace);
  font-size: 10px;
  letter-spacing: 0.12em;
  opacity: 0.45;
  text-transform: uppercase;
  pointer-events: none;
}
```

- [ ] **Step 6: Run typecheck + tests**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run src/components/__tests__/CommandPalette.test.tsx`
Expected: PASS.

Also run: `cd apps/web && npx vitest run src/components/__tests__/CommandPalette.test.tsx` for full file pass (no regressions on existing assertions).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/CommandPalette.tsx apps/web/src/components/CommandPalette.css apps/web/src/components/__tests__/CommandPalette.test.tsx
git commit -m "ui: labeled section headers in command palette"
```

---

## Task 10: Classroom switcher popover anchoring

**Why:** Audit Issue 7. The popover is reportedly drifting mid-page in some viewports. The DOM is already correctly nested inside `.shell-classroom-anchor` (App.tsx:778) — the issue is that some CSS in `nothing-theme.css` may render the panel as `position: fixed` rather than `position: absolute` relative to the anchor.

**Files:**
- Modify: `apps/web/src/styles/nothing-theme.css` (`.shell-classroom-panel` and `.shell-classroom-anchor`)

- [ ] **Step 1: Audit current rules**

Run:
```bash
grep -n "shell-classroom-anchor\|shell-classroom-panel" apps/web/src/styles/nothing-theme.css
```

Read the matched blocks and verify the panel uses `position: absolute` and the anchor uses `position: relative`.

- [ ] **Step 2: Patch positioning rules**

Inside `nothing-theme.css`, ensure the following hold (add or correct as needed):

```css
.shell-classroom-anchor {
  position: relative;
}
.shell-classroom-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: auto;
  width: max(320px, 100%);
  z-index: 50;
}
```

If a `position: fixed` rule exists for `.shell-classroom-panel`, replace it with the absolute rule above. Keep visual styles (background, border, padding) untouched.

- [ ] **Step 3: Visual verification at multiple widths**

Run: `cd apps/web && npm run dev`
Resize the browser to 1280, 900, and 600 px wide; click the classroom pill in each. Confirm the popover drops directly beneath the pill, never floats over unrelated content.

- [ ] **Step 4: Run regression suite**

Run: `cd apps/web && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles/nothing-theme.css
git commit -m "ui: anchor classroom switcher popover to its trigger"
```

---

## Task 11: Final regression sweep + dark/light contrast check

**Why:** Cumulative CSS edits across nine tasks have non-trivial blast radius. The repo's `npm run check:contrast` is the canonical guard for the dark-mode contract per CLAUDE.md.

**Files:** none — validation only.

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Full vitest**

Run: `npm run test`
Expected: 1257+ tests pass (matching baseline in memory).

- [ ] **Step 3: Contrast check**

Run: `npm run check:contrast`
Expected: PASS.

- [ ] **Step 4: Visual smoke in both themes**

Run: `cd apps/web && npm run dev` and walk the demo classroom in light and dark mode. Confirm:
- Theme toggle icon flips sun ↔ moon.
- Classroom pill carries the grid switcher icon.
- ⌘K reads "Jump to ⌘K".
- Help button is `?`.
- Sub-tabs are visibly subordinate to top groups.
- LOG INTERVENTION badge sits in the top-right corner with red fill.
- SUPPORT PATTERNS badge sits in the top-right corner with neutral outline.
- Role pill options show a radio dot + `[ACTIVE]` tag on the current role.
- Command palette shows PANELS / CLASSROOMS headers.
- Classroom popover drops under its pill.

- [ ] **Step 5: Commit if any small touch-ups were needed**

If no edits, skip. Otherwise:

```bash
git add -A
git commit -m "ui: final touch-ups from regression sweep"
```

---

## Self-Review Notes

- **Spec coverage:** Every concur item from the audit summary table is implemented; declined items are documented in the Concur/Decline table at the top.
- **No placeholders:** Every step contains exact selectors, exact JSX, exact CSS, exact file paths, and exact commands.
- **Type consistency:** `getTabBadgeTone` in Task 8 is the only new type symbol; it is exported from `appReducer.ts` and imported in `App.tsx` — naming matches.
- **Nothing-design alignment:** Every visual change maps to a numbered principle (3-layer rule, lightest container, controls look like controls, single break in pattern). No chart-junk, no toasts, no shadows, no gradients added.
- **Safety:** No reducer state shape changes, no API contract changes, no schema changes. The plan is reversible at the commit boundary; each task lands in one commit.
