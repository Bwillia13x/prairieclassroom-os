# Intervention Quick-Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make intervention logging feel like a 5-second hallway action by shipping `QuickCaptureTray` — a chip-and-avatar tap flow that becomes the primary entry path in `InterventionPanel`, with the existing `InterventionLogger` form demoted to an optional "Structured details" expansion.

**Architecture:** A new `QuickCaptureTray` component composes three new child primitives (`StudentAvatar`, `InterventionChip`) and one new hook (`useSpeechCapture`) into a single-screen flow: tap avatar(s) → tap chip → optionally dictate or edit the auto-generated starter note → submit. Submission reuses `logIntervention` with the existing `InterventionRequest` shape, so no API, orchestrator, or schema changes are required. The legacy `InterventionLogger` is preserved verbatim and rendered inside a `<details>` element as a progressive-disclosure fallback for teachers who need structured context (classroom dropdown, prefill from Tomorrow Plan, etc.).

**Tech Stack:** React 18, Vite, TypeScript, vitest, @testing-library/react, Web Speech API (optional, graceful fallback)

---

## Context Snapshot

- Current form: `apps/web/src/components/InterventionLogger.tsx` (lines 51-156). Classroom `<select>`, student `<input type="checkbox">` grid, `<textarea>`, submit. Self-describes as "Log what happened while the moment is still fresh" but forces 30+ seconds of UI interaction.
- Host panel: `apps/web/src/panels/InterventionPanel.tsx`. Renders `<InterventionLogger/>` inside the `WorkspaceLayout` `rail` slot. `handleSubmit` calls `logIntervention({ classroom_id, student_refs, teacher_note, context })` via `useAsyncAction`, then `showSuccess`, `showUndo`, and `history.refresh()`.
- API signature (already stable, do NOT redefine): `logIntervention(request: InterventionRequest, signal?: AbortSignal)` in `apps/web/src/api.ts` → `POST /intervention`.
- Type: `InterventionRequest` (`apps/web/src/types.ts` line 134): `{ classroom_id: string; student_refs: string[]; teacher_note: string; context?: string }`.
- Button primitive: `apps/web/src/components/shared/ActionButton.tsx` — supports `variant`, `size`, `loading`, `leadingIcon`, `aria-label`, `fullWidth`.
- Icon set: `apps/web/src/components/SectionIcon.tsx` → `SectionIconName = "sun" | "pencil" | "grid" | "check" | "mail" | "alert" | "star" | "clock" | "lock" | "info" | "refresh"`.
- Design tokens: `apps/web/src/styles/tokens.css` (use existing `--color-*` / `--space-*` / radius / shadow variables — no hex literals).
- Test patterns to mirror: `apps/web/src/components/__tests__/TodayStory.test.tsx` (component render + interaction) and `apps/web/src/hooks/__tests__/useFeedback.test.tsx` (hook testing with `renderHook` + vi spies).
- Hook test file (localStorage polyfill + `renderHook` + `act`) lives in `apps/web/src/hooks/__tests__/`.

## Downstream Rationale

`detect_support_patterns` and `forecast_complexity` are both data-starved when teachers skip the logging form. Raising intervention volume by lowering capture cost directly improves the quality of the two downstream reports. This is the product reason this is a priority, not a nice-to-have.

---

## Task Breakdown

### Task 1 — Define chip data model and starter-note generator (TDD)

- [ ] Create `apps/web/src/components/quickCapture/interventionChipDefs.ts` (new directory `quickCapture/` under `components/`).
- [ ] Export `InterventionChipKey` as a string-literal union: `"redirect" | "calm_corner" | "praise" | "break" | "check_in" | "scaffold"`.
- [ ] Export `InterventionChipDef` interface: `{ key: InterventionChipKey; label: string; icon: SectionIconName; starterNote: (studentAliases: string[]) => string }`.
- [ ] Export `INTERVENTION_CHIP_DEFS: readonly InterventionChipDef[]` with 6 entries:
  - `redirect` → label "Redirect", icon `"alert"`, starter "Redirected {names} during the current block — brief verbal cue, returned to task."
  - `calm_corner` → label "Calm corner", icon `"sun"`, starter "{names} used the calm corner — took a short reset, re-entered the activity when ready."
  - `praise` → label "Praise", icon `"star"`, starter "Named effort for {names} in front of the class — specific, task-focused praise."
  - `break` → label "Break", icon `"clock"`, starter "{names} took a movement break — returned within the block, ready to continue."
  - `check_in` → label "Check-in", icon `"info"`, starter "Pulled {names} aside for a 1:1 check-in — surfaced what was in the way and set a next step."
  - `scaffold` → label "Scaffold", icon `"pencil"`, starter "Added scaffolding for {names} — broke the task into smaller steps and gave a visible anchor."
- [ ] Export helper `formatAliasList(aliases: string[]): string` that produces grammatically correct lists:
  - `[]` → `"the student"`
  - `["Ari"]` → `"Ari"`
  - `["Ari", "Bea"]` → `"Ari and Bea"`
  - `["Ari", "Bea", "Cal"]` → `"Ari, Bea, and Cal"`
- [ ] `starterNote` implementations call `formatAliasList` to produce their `{names}` substitution.
- [ ] Create `apps/web/src/components/quickCapture/__tests__/interventionChipDefs.test.ts` with cases:
  1. `formatAliasList([])` returns `"the student"`.
  2. `formatAliasList(["Ari"])` returns `"Ari"`.
  3. `formatAliasList(["Ari", "Bea"])` returns `"Ari and Bea"` (no Oxford comma for 2).
  4. `formatAliasList(["Ari", "Bea", "Cal"])` returns `"Ari, Bea, and Cal"` (Oxford comma for 3+).
  5. `INTERVENTION_CHIP_DEFS` has exactly 6 entries with unique keys.
  6. Each chip's `starterNote(["Ari"])` contains "Ari" and does not contain `{names}` or `undefined`.
  7. `INTERVENTION_CHIP_DEFS.find(c => c.key === "redirect")!.starterNote(["Ari", "Bea"])` contains `"Ari and Bea"`.
  8. Every chip def has an `icon` that is a valid `SectionIconName` (imported type-check, no runtime assertion needed).
- [ ] Run `npm run test -- interventionChipDefs` until green.
- [ ] Commit: `feat(quick-capture): add intervention chip defs and alias formatter`.

### Task 2 — `StudentAvatar` primitive (TDD)

- [ ] Create `apps/web/src/components/quickCapture/StudentAvatar.tsx`.
- [ ] Props: `{ alias: string; selected: boolean; onToggle: (alias: string) => void; disabled?: boolean }`.
- [ ] Render a `<button type="button">` with:
  - Class `student-avatar` plus `student-avatar--selected` when selected.
  - `aria-pressed={selected}`.
  - `aria-label={`${selected ? "Unselect" : "Select"} ${alias}`}`.
  - Inner markup: a `<span className="student-avatar__initial" aria-hidden="true">` containing `alias.trim().charAt(0).toUpperCase() || "?"` and a `<span className="student-avatar__name">` with the full alias.
  - `onClick` calls `onToggle(alias)`.
  - `disabled` prop passed through.
- [ ] Create `apps/web/src/components/quickCapture/__tests__/StudentAvatar.test.tsx`:
  1. Renders the first letter of the alias (e.g., `"Ari"` → visible `"A"`).
  2. Falls back to `"?"` when alias is empty string.
  3. Does NOT set `aria-pressed="true"` when `selected={false}`; the accessible name is "Select Ari".
  4. Sets `aria-pressed="true"` when `selected={true}`; accessible name is "Unselect Ari".
  5. Clicking calls `onToggle` exactly once with the alias.
  6. When `disabled`, clicking does not call `onToggle` and the button has `disabled` attribute.
- [ ] Run tests until green.
- [ ] Commit: `feat(quick-capture): add StudentAvatar tap-target component`.

### Task 3 — `InterventionChip` primitive (TDD)

- [ ] Create `apps/web/src/components/quickCapture/InterventionChip.tsx`.
- [ ] Props: `{ def: InterventionChipDef; selected: boolean; onSelect: (key: InterventionChipKey) => void }`.
- [ ] Render a `<button type="button">` with:
  - Class `intervention-chip` + `intervention-chip--selected` when selected.
  - `aria-pressed={selected}`.
  - `aria-label={def.label}`.
  - Inner: `<SectionIcon name={def.icon} className="intervention-chip__icon" />` (decorative) + `<span className="intervention-chip__label">{def.label}</span>`.
  - `onClick` calls `onSelect(def.key)`.
- [ ] Create `apps/web/src/components/quickCapture/__tests__/InterventionChip.test.tsx`:
  1. Renders the chip label text.
  2. `aria-pressed` reflects the `selected` prop.
  3. Clicking calls `onSelect` once with the chip's `key`.
  4. The button type is `"button"` (never accidentally submits a form).
  5. Renders a `<svg>` (or appropriate icon element) from `SectionIcon` inside the button.
- [ ] Run tests until green.
- [ ] Commit: `feat(quick-capture): add InterventionChip selection primitive`.

### Task 4 — `useSpeechCapture` hook with feature detection (TDD)

- [ ] Create `apps/web/src/hooks/useSpeechCapture.ts`.
- [ ] Return type: `{ supported: boolean; recording: boolean; transcript: string; error: string | null; start: () => void; stop: () => void; reset: () => void }`.
- [ ] Feature detection (run once at hook init):
  ```ts
  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
        ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
      : undefined;
  ```
- [ ] If `SpeechRecognition` is undefined, the hook returns `{ supported: false, recording: false, transcript: "", error: null, start: noop, stop: noop, reset: noop }` and never throws.
- [ ] If supported:
  - `start()` lazily instantiates `new SpeechRecognition()`, sets `continuous=false`, `interimResults=true`, `lang="en-US"`.
  - Wire `onresult` to concatenate final results into `transcript`; wire `onerror` to populate `error` and set `recording=false`; wire `onend` to set `recording=false`.
  - `stop()` calls `.stop()` on the active instance; guards against a null instance.
  - `reset()` clears `transcript` and `error`.
  - Cleanup: on unmount, abort any active session (`.abort?.()` if available, otherwise `.stop()`).
- [ ] Create `apps/web/src/hooks/__tests__/useSpeechCapture.test.ts` (mirror the `useFeedback.test.tsx` pattern — `renderHook`, `act`, `vi.stubGlobal`):
  1. **Unsupported path:** with `window.SpeechRecognition` and `window.webkitSpeechRecognition` both unset, `result.current.supported === false`, `start()` is a no-op, `transcript === ""`.
  2. **Supported path:** install a `FakeSpeechRecognition` class via `vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition)`. After `act(() => result.current.start())`, `result.current.recording === true`, and the fake instance has `.start()` called once.
  3. **Transcript accumulation:** after start, simulate an `onresult` event with a `results` payload `[[{ transcript: "Ari needed a reset", isFinal: true }]]` (shape-matched) → `result.current.transcript` contains `"Ari needed a reset"`.
  4. **Stop transitions state:** calling `stop()` fires the fake's `.stop()` and a subsequent `onend` sets `recording === false`.
  5. **Error path:** firing `onerror` with `{ error: "not-allowed" }` sets `result.current.error` to a non-null string and `recording === false`.
  6. **Unmount cleanup:** unmounting while `recording === true` invokes `abort()` (or `stop()` fallback) on the fake, no unhandled errors.
  7. **Reset clears state:** `reset()` zeroes `transcript` and `error` without changing `supported`.
- [ ] `FakeSpeechRecognition` pattern (co-located in the test file) — approx shape:
  ```ts
  class FakeSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = "";
    onresult: ((e: { results: { 0: { transcript: string; isFinal: boolean } }[] }) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start = vi.fn();
    stop = vi.fn(() => { this.onend?.(); });
    abort = vi.fn();
  }
  ```
- [ ] Run `npm run test -- useSpeechCapture` until green.
- [ ] Commit: `feat(quick-capture): add useSpeechCapture hook with graceful fallback`.

### Task 5 — `QuickCaptureTray` orchestrator component (TDD)

- [ ] Create `apps/web/src/components/quickCapture/QuickCaptureTray.tsx`.
- [ ] Props:
  ```ts
  interface QuickCaptureTrayProps {
    classroomId: string;
    students: { alias: string }[];
    loading: boolean;
    onSubmit: (request: InterventionRequest) => void;
  }
  ```
  (Import `InterventionRequest` from `../../types` — do NOT redefine.)
- [ ] Internal state (all `useState`):
  - `selectedAliases: string[]`
  - `selectedChip: InterventionChipKey | null`
  - `note: string` (auto-populated from `starterNote` when chip picked; user-editable)
  - `noteDirty: boolean` (true once user edits manually, so re-selecting a chip doesn't clobber their text)
- [ ] Behavior:
  - Toggling an avatar adds/removes from `selectedAliases`.
  - Clicking a chip sets `selectedChip` and, if `!noteDirty`, replaces `note` with `def.starterNote(selectedAliases)`.
  - Editing the textarea sets `noteDirty=true`.
  - Submit is disabled unless `selectedAliases.length > 0 && note.trim().length > 0`.
  - On submit, call `onSubmit({ classroom_id: classroomId, student_refs: selectedAliases, teacher_note: note.trim(), context: selectedChip ? `Quick-capture: ${selectedChip}` : undefined })`, then reset all local state (clear aliases, chip, note, noteDirty).
- [ ] Voice integration:
  - Use `useSpeechCapture()`. If `supported`, render a microphone toggle button (`ActionButton variant="ghost"`, `aria-label={recording ? "Stop dictation" : "Start dictation"}`, `aria-pressed={recording}`).
  - While `recording`, append the live `transcript` onto `note` (effect that fires when `transcript` changes and appends the delta since last append — keep a `lastTranscriptRef`).
  - On stop, call `reset()` so the next dictation starts from zero.
  - If `!supported`, render nothing for the mic button (the textarea alone is the fallback).
- [ ] Layout (top to bottom):
  1. Section heading "Quick capture" + short subtitle "Tap, tap, done."
  2. "Who?" row — horizontal scroll of `StudentAvatar` buttons.
  3. "What happened?" row — `INTERVENTION_CHIP_DEFS.map(def => <InterventionChip />)`.
  4. Note textarea (3 rows, auto-filled after chip select).
  5. Mic button (if supported) + submit `ActionButton variant="primary" fullWidth loading={loading}`.
- [ ] Keyboard support: chips and avatars are natural tab stops as `<button>`s. Add `onKeyDown` handlers on the chip row and avatar row that respond to `ArrowLeft`/`ArrowRight` by moving focus to the previous/next sibling button (roving tab index pattern). Extract a small helper `moveFocusByArrow(e: KeyboardEvent, container: HTMLElement)` co-located in the file.
- [ ] Create `apps/web/src/components/quickCapture/__tests__/QuickCaptureTray.test.tsx` with the following cases (use `userEvent` from `@testing-library/user-event` — already in the repo's testing setup):
  1. **Renders all students as avatars:** given `students=[{alias:"Ari"},{alias:"Bea"}]`, two buttons with accessible names `"Select Ari"` and `"Select Bea"` are present.
  2. **Renders all 6 intervention chips:** `INTERVENTION_CHIP_DEFS` all present by label.
  3. **Submit disabled initially:** primary submit has `disabled` (or `aria-disabled`) until both student and note are provided.
  4. **Chip selection auto-populates note:** click Ari, click "Redirect" → textarea `value` contains `"Ari"`.
  5. **noteDirty suppresses overwrite:** click Ari, click "Redirect", type extra content ("— also used timer"), then click "Praise" → textarea still contains the teacher's edit (`"— also used timer"` substring) and is NOT replaced.
  6. **Multi-student starter note:** select Ari + Bea, click "Break" → textarea contains `"Ari and Bea"`.
  7. **Submit payload:** select Ari, click "Redirect", click submit → `onSubmit` called once with object whose `classroom_id === "test-class"`, `student_refs === ["Ari"]`, `teacher_note` is the starter sentence, `context === "Quick-capture: redirect"`.
  8. **Post-submit reset:** after calling `onSubmit`, re-render shows no avatar selected (`aria-pressed="false"` on Ari), no chip selected, textarea empty.
  9. **Unsupported speech:** with `SpeechRecognition` absent on `window`, the mic button is not in the document (`queryByRole("button", { name: /dictation/i })` is null).
  10. **Supported speech (optional — mark as `.skip` if mocking is awkward):** stub `SpeechRecognition` and verify the mic button appears and toggles `aria-pressed` on click.
  11. **Keyboard navigation:** focusing first chip and pressing `ArrowRight` moves focus to the next chip (check `document.activeElement`).
- [ ] Run `npm run test -- QuickCaptureTray` until green.
- [ ] Commit: `feat(quick-capture): add QuickCaptureTray orchestrator`.

### Task 6 — Wire `QuickCaptureTray` into `InterventionPanel` and demote the legacy form (TDD)

- [ ] Edit `apps/web/src/panels/InterventionPanel.tsx`:
  - Import `QuickCaptureTray` from `../components/quickCapture/QuickCaptureTray`.
  - Create a wrapper callback `handleQuickSubmit(request: InterventionRequest)` that calls the existing `handleSubmit(request.classroom_id, request.student_refs, request.teacher_note, request.context)`.
  - In the `rail` slot, render `<QuickCaptureTray classroomId={activeClassroom} students={students} loading={loading} onSubmit={handleQuickSubmit} />` BEFORE the other rail children, as the primary capture surface.
  - Wrap the existing `<InterventionLogger ... />` in a `<details className="intervention-structured-details">` with `<summary>Structured details (optional)</summary>` — this element preserves the full form verbatim for prefill-driven flows and post-hoc structured logging.
  - Do NOT remove any existing props or the `prefill` path. The legacy form still handles the Tomorrow-Plan prefill case and remains fully functional.
- [ ] Create `apps/web/src/panels/__tests__/InterventionPanel.quickCapture.test.tsx` (new test file, co-located with existing panel tests if any; follow the TodayStory.test.tsx render pattern and use an `AppProvider` test wrapper if one already exists, otherwise mock `useApp`/`useSession` with `vi.mock`). Cases:
  1. **Quick Capture renders first:** the "Quick capture" heading appears in the document and its DOM position is earlier than the `Structured details` summary element.
  2. **Structured details is collapsed by default:** `screen.getByText(/Structured details/i).closest("details")?.hasAttribute("open") === false`.
  3. **Structured form is reachable:** after `userEvent.click` on the summary, the legacy form's "What happened?" textarea becomes visible.
  4. **QuickCaptureTray submit calls logIntervention:** spy on `api.logIntervention`; select an avatar, click a chip, click submit → spy called once with a payload matching the selected student and a non-empty `teacher_note`.
- [ ] Run `npm run test -- InterventionPanel.quickCapture` until green.
- [ ] Commit: `feat(intervention): make QuickCaptureTray the primary capture path`.

### Task 7 — Styles, tokens, and accessibility polish

- [ ] Create `apps/web/src/components/quickCapture/QuickCaptureTray.css`. All values come from existing tokens in `apps/web/src/styles/tokens.css` / `base.css`. No raw hex values.
- [ ] Layout rules:
  - `.quick-capture-tray` — block with `padding: var(--space-4)` and `gap: var(--space-3)` (use `display: flex; flex-direction: column`).
  - `.quick-capture-tray__row` — `display: flex; flex-wrap: wrap; gap: var(--space-2)`.
  - `.quick-capture-tray__row--students` — allows horizontal scroll overflow on narrow viewports (`overflow-x: auto; scroll-snap-type: x proximity`).
  - `.quick-capture-tray__heading` — uses `var(--font-size-md)` / existing type scale tokens.
- [ ] `.student-avatar`:
  - `min-width: 44px; min-height: 44px; padding: var(--space-2);`
  - Circular initial bubble + alias label beneath.
  - `background: var(--color-surface-raised)`, `border: 1px solid var(--color-border-muted)`, `border-radius: var(--radius-lg)`.
  - `&--selected`: `background: var(--color-accent-soft); border-color: var(--color-accent); box-shadow: var(--shadow-inset-press)`.
  - `&:focus-visible`: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`.
- [ ] `.intervention-chip`:
  - `min-height: 44px; padding: var(--space-2) var(--space-3); border-radius: var(--radius-pill);`
  - `display: inline-flex; align-items: center; gap: var(--space-2);`
  - Transition limited to `background-color` and `transform`, duration from an existing motion token (or fallback `150ms ease-out`).
  - `&--selected`: selected background/color pair from the existing palette (mirrors the pattern used in `StudentRoster.css` / `ContextualHint.css`).
  - `&:focus-visible`: same focus ring as above.
- [ ] Reduced motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .intervention-chip,
    .student-avatar {
      transition: none;
    }
    .intervention-chip--selected {
      transform: none;
    }
  }
  ```
- [ ] `.intervention-structured-details > summary` — styled like a secondary control, not a system-default disclosure triangle; still keyboard-operable (native `<details>` behavior preserved).
- [ ] Run `npm run check:contrast` (per CLAUDE.md, this is required when color tokens or contrast-sensitive styles change) and confirm no regressions.
- [ ] Run `npm run lint && npm run typecheck`.
- [ ] Commit: `style(quick-capture): add tap-target styles with reduced-motion fallback`.

### Task 8 — Documentation hooks

- [ ] Append a short entry to `apps/web/src/panels/InterventionPanel.tsx`'s JSDoc (or inline comment near the tray import) explaining the dual-path design: "Quick capture is the primary chip-first flow; the legacy `InterventionLogger` stays in a `<details>` expansion for structured / prefill cases."
- [ ] Add a bullet under the "Intervention" section of `docs/development-gaps.md` (check if this section exists first — if not, add a minimal new H2 `### Intervention capture velocity`): "QuickCaptureTray (2026-04-14) reduces hallway logging friction; chip-first flow targets 5-second submission and feeds `detect_support_patterns` / `forecast_complexity` with denser input."
- [ ] If `docs/decision-log.md` tracks per-feature entries, add a 2026-04-14 note: "Intervention Quick-Capture shipped. Primary capture path is now chip-first; structured form preserved as optional expansion."
- [ ] Commit: `docs: record intervention quick-capture rationale`.

### Task 9 — Session summary chip (optional, scoped small)

- [ ] In `apps/web/src/panels/InterventionPanel.tsx`, track a lightweight local state `recentCaptures: Array<{ id: string; ts: number }>` (push on successful submit in `handleSubmit`, keep only entries where `Date.now() - ts < 60_000`).
- [ ] When `recentCaptures.length > 1`, render a small `ActionButton variant="ghost" size="sm"` above the tray that reads `"{count} captured this session — review"` and, on click, opens the existing `HistoryDrawer` (which already lives in the rail). The simplest wiring is to toggle an `isHistoryExpanded` state or scroll the drawer into view via `scrollIntoView({ behavior: "smooth", block: "start" })`.
- [ ] TDD (optional, acceptable to skip if scope pressure):
  - `InterventionPanel.sessionSummary.test.tsx`: fire two submits via the tray within the same test, assert the summary chip text is `"2 captured this session — review"`.
  - Use `vi.useFakeTimers()` to advance past 60s and confirm the chip disappears.
- [ ] Commit: `feat(intervention): add session-summary chip above quick capture`.

---

## Verification Checklist (run before declaring complete)

- [ ] `npm run test` — all unit tests pass, including the 4 new test files.
- [ ] `npm run typecheck` — no type errors (especially around `InterventionRequest` import and `SpeechRecognition` DOM typing).
- [ ] `npm run lint` — clean.
- [ ] `npm run check:contrast` — no new contrast violations.
- [ ] Manual smoke: open the `Log Intervention` panel, select a student avatar, tap a chip, verify the starter note appears, click submit, confirm the intervention appears in the history drawer.
- [ ] Manual smoke: click `Structured details (optional)`, confirm the full legacy form is still there and its prefill-from-plan path still works end-to-end.
- [ ] Manual smoke (Chrome): click the mic button, speak a short phrase, confirm the transcript lands in the textarea. (Skip on browsers without SpeechRecognition; no error should appear.)
- [ ] Manual a11y: Tab through the tray — focus order is avatars → chips → note → mic → submit. Arrow keys move focus within the chip row. Screen reader announces `aria-pressed` state changes.

## Non-Goals (explicit scope fences)

- No backend changes. `POST /intervention` payload shape is frozen.
- No new prompt classes. The auto-generated starter note is deterministic, not model-routed.
- No new shared Zod schema. `InterventionRequest` is reused verbatim.
- No global navigation changes. The `Log Intervention` panel stays where it is.
- No removal of the existing `InterventionLogger` component. It is preserved inside the `<details>` expansion for the structured-context use case.
- No pattern-report refactor. Downstream improvement is a natural consequence of denser logs, not a direct code change in this plan.

## Files Created

- `apps/web/src/components/quickCapture/interventionChipDefs.ts`
- `apps/web/src/components/quickCapture/StudentAvatar.tsx`
- `apps/web/src/components/quickCapture/InterventionChip.tsx`
- `apps/web/src/components/quickCapture/QuickCaptureTray.tsx`
- `apps/web/src/components/quickCapture/QuickCaptureTray.css`
- `apps/web/src/components/quickCapture/__tests__/interventionChipDefs.test.ts`
- `apps/web/src/components/quickCapture/__tests__/StudentAvatar.test.tsx`
- `apps/web/src/components/quickCapture/__tests__/InterventionChip.test.tsx`
- `apps/web/src/components/quickCapture/__tests__/QuickCaptureTray.test.tsx`
- `apps/web/src/hooks/useSpeechCapture.ts`
- `apps/web/src/hooks/__tests__/useSpeechCapture.test.ts`
- `apps/web/src/panels/__tests__/InterventionPanel.quickCapture.test.tsx`

## Files Modified

- `apps/web/src/panels/InterventionPanel.tsx` — add QuickCaptureTray rail slot, wrap legacy logger in `<details>`, add optional session-summary chip.
- `docs/development-gaps.md` — add intervention-capture-velocity note.
- `docs/decision-log.md` — add 2026-04-14 entry if the log tracks per-feature decisions.
