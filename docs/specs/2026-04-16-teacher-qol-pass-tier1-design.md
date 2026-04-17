# Teacher Quality-of-Life Pass — Tier 1

**Date:** 2026-04-16
**Status:** Design, awaiting user approval
**Scope:** Four additive QoL features that cut navigation cost, rebuild-cost-after-interruption, and "where was I?" friction for real classroom teachers.

## Why this, why now

PrairieClassroom is production-hardened: 12 panels, 1,123 tests, 127+ design tokens, full dark mode, mobile nav, undo toast infrastructure, classroom-code auth, cross-panel Tomorrow Plan accumulator. The surface is complete. What teachers hit day-to-day is **friction inside that surface**:

- An Alberta K-6 teacher is interrupted every ~4 minutes, plans tomorrow in 20-min breaks, and logs interventions standing in hallways.
- They already know the action they want. They are paying a per-session tax: find the tab → re-establish context → remember what they'd half-typed → remember what they'd queued for tomorrow.
- Four small interventions remove that tax at its four highest-frequency points: **finding**, **queuing visibility**, **resumption**, and **shortcut recall**.

This spec is deliberately small and additive. No routing, schema, or backend changes. No re-architecture. Every item is independently shippable.

## In scope (Tier 1)

1. Command palette (`Cmd/Ctrl+K`)
2. Tomorrow Plan cart indicator in header with quick-view
3. Draft restoration across interruptions (panel forms)
4. Keyboard shortcut cheat-sheet on `?`

## Out of scope (deferred to Tier 2/3)

- Next-step chips after generation
- Context-aware prefill from Today → panels
- Time-expectation banner during streaming
- Voice-to-text on Log Intervention / Teacher Reflection
- End-of-day close shortcut
- Widened undo coverage (infrastructure already exists; wiring is Tier 3)

## Non-goals

- No new API endpoints. No shared schema changes. No Zod schema additions.
- No changes to prompt classes, orchestrator routes, or inference behavior.
- No dependency additions. The palette uses plain React + DOM; no `cmdk`, `downshift`, or similar.
- Mobile-specific UX for the palette is best-effort (overlay works, but the primary target is desktop, where teachers prep).

## Item 1 — Command palette (`Cmd/Ctrl+K`)

### Teacher story

> "I'm on Today, I see Amara flagged for a family follow-up. Today I just want to message her family. I press `Cmd+K`, type `msg amara`, hit Enter — I'm on Family Message with her student ref pre-filled."

### Entries the palette can jump to

The palette indexes three entry types, all assembled client-side from state already in `AppContext`:

1. **Panels** — from `TAB_META` + `TAB_ORDER`. Shows group label, short label, keyboard digit. ~12 entries.
2. **Classrooms** — from `state.classrooms`. Shows grade band, subject focus, lock status. Switching triggers the same code path as the existing classroom menu.
3. **Actions** — a static list of ~8 common verbs, each mapping to a panel + optional prefill. Examples:
   - `Draft family message → <student>` (enumerates flagged students from `debt_register`)
   - `Log intervention → <student>`
   - `Differentiate a lesson`
   - `Forecast tomorrow`
   - `Brief EA`
   - `Build sub packet`

### Interaction

- Trigger: `Cmd+K` (mac) / `Ctrl+K` (other). Also accessible from a new header icon for discoverability.
- Escape closes. Enter selects. ↑/↓ navigate. Typing fuzzy-filters (simple `includes` across `label + group + keywords` — no new dep).
- Recent entries (last 5) shown when input is empty, persisted to `localStorage` under `prairieclassroom.palette.recents`.

### Files touched

- **New:** `apps/web/src/components/CommandPalette.tsx` (~300 LOC)
- **New:** `apps/web/src/components/CommandPalette.css` (~120 LOC using existing tokens)
- **New:** `apps/web/src/hooks/usePaletteEntries.ts` (~80 LOC — memoizes entries from `AppContext`)
- **Modified:** `apps/web/src/App.tsx` — add `Cmd+K` listener alongside existing `handleKeydown` at App.tsx:411; mount palette; add header trigger button.
- **Modified:** `apps/web/src/components/__tests__/` — new `CommandPalette.test.tsx` with 8–10 cases (filter, select, recents, prefill handoff, mac vs. non-mac binding).

### Acceptance

- `Cmd+K` opens palette from any panel in <100ms (no network).
- Typing `fam` surfaces Family Message panel and any `message family → <student>` actions.
- Selecting an action with prefill lands on the panel with `InterventionPrefill` / `FamilyMessagePrefill` populated — reuses the existing prefill plumbing.
- Recent entries persist across reloads.
- Works with screen readers: `role="dialog"`, `aria-modal`, `aria-activedescendant` on results list.
- Does not fire when a modal (`ClassroomAccessDialog`, `RolePromptDialog`, `OnboardingOverlay`) is already open.

## Item 2 — Tomorrow Plan cart indicator

### Teacher story

> "I saved three things to Tomorrow from different panels over the course of the morning. I want to see what's queued without leaving my current panel."

### Current state

`appendTomorrowNote` in `AppContext` pushes into `state.tomorrowNotes`. The only way to see it is to navigate to Tomorrow Plan. There's no ambient confirmation that items accumulated.

### UX

- A persistent chip in the header, visible on all panels: `Tomorrow · 3`
- Badge count is the length of `state.tomorrowNotes` that haven't yet been materialized into a Tomorrow Plan generation.
- Clicking the chip opens a lightweight popover (not full drawer) showing:
  - Each queued note's `summary` and `sourcePanel` with a tiny icon.
  - A per-item `×` to remove (dispatches new `REMOVE_TOMORROW_NOTE` action).
  - A `Review all →` link that routes to Tomorrow Plan.
- The chip pulses briefly on new append and announces to screen readers: `"Saved to Tomorrow Plan. 3 items queued."`

### Files touched

- **New:** `apps/web/src/components/TomorrowChip.tsx` (~130 LOC)
- **New:** `apps/web/src/components/TomorrowChip.css` (~80 LOC)
- **Modified:** `apps/web/src/appReducer.ts` — add `REMOVE_TOMORROW_NOTE` action; extend types; keep the existing `APPEND_TOMORROW_NOTE` path untouched.
- **Modified:** `apps/web/src/AppContext.tsx` — expose `removeTomorrowNote(id)`.
- **Modified:** `apps/web/src/App.tsx` — render chip in the header alongside `StatusChip` / `RoleContextPill`.
- **Modified:** `apps/web/src/__tests__/appReducer.tomorrowNotes.test.ts` — add remove-action coverage.
- **New:** `apps/web/src/components/__tests__/TomorrowChip.test.tsx` — 4 cases (count, click, remove, empty-state hides chip).

### Acceptance

- Chip hidden when `tomorrowNotes.length === 0`.
- Count is accurate across appends, removes, and page reloads (state already persists — verify).
- Popover is dismissable with Escape + click-outside.
- Accessible: chip is a `<button>`, popover has `role="dialog"` with focus trap.
- Announcing "Saved to Tomorrow Plan — N items queued" runs once per append via `aria-live="polite"` region.

## Item 3 — Draft restoration across interruptions

### Teacher story

> "I was typing a family message during lunch. A parent walked in. I closed the laptop. After school I reopen — the message I'd half-written is still there, and the app asks me if I want to keep going."

### Approach

A shared `useFormDraft(formKey, value, setValue)` hook that:

- On every keystroke (debounced to 500ms), writes the form's serialized value to `sessionStorage` under `prairieclassroom.draft.<formKey>`.
- On mount, if a non-empty stored value exists AND it's younger than 12 hours (timestamp stored alongside), surfaces a small `Resume your draft?` chip near the form. Click → restore. Dismiss → clear stored value.
- On successful submit, clears the stored value.

`formKey` is scoped `<panel>:<classroomId>` so switching classrooms doesn't cross-contaminate.

### Panels covered in Tier 1

Just three — the panels with free-text that a teacher would be most annoyed to lose:

1. **Family Message** (`FamilyMessagePanel`) — long-form intent + context
2. **Log Intervention** (`InterventionPanel`) — free-text notes
3. **Differentiate** (`DifferentiatePanel`) — teacher goal + artifact title/body

Extending to other panels in a follow-up is one-line-per-panel.

### Files touched

- **New:** `apps/web/src/hooks/useFormDraft.ts` (~90 LOC)
- **New:** `apps/web/src/hooks/__tests__/useFormDraft.test.tsx` — 6 cases (write, read, expire, clear-on-submit, classroom-scoping, empty-string short-circuit).
- **New:** `apps/web/src/components/DraftRestoreChip.tsx` (~50 LOC)
- **Modified:** `apps/web/src/panels/FamilyMessagePanel.tsx` — wire the hook for the intent/context fields.
- **Modified:** `apps/web/src/panels/InterventionPanel.tsx` — wire the hook for the note field.
- **Modified:** `apps/web/src/panels/DifferentiatePanel.tsx` — wire the hook for teacher goal.

### Acceptance

- Draft survives a hard reload within the 12h window.
- Draft is scoped per classroom — switching classrooms shows a fresh form.
- Draft is cleared on successful generation (we hook into `execute` success).
- No draft persisted if the user has not typed anything.
- No PII concerns escalated beyond current `sessionStorage` posture — same origin, same browser, cleared on browser session end for incognito.

## Item 4 — Keyboard shortcut cheat-sheet on `?`

### Teacher story

> "I remember the app has a shortcut but I can't remember what — is it Cmd+/ or Cmd+K? I hit `?` and see the list."

### UX

- Pressing `?` (Shift+/) anywhere except a focused text input opens a lightweight overlay listing shortcuts:
  - `1 – 9 · 0` → panels
  - `Cmd/Ctrl + K` → command palette
  - `?` → this sheet
  - `Esc` → close
  - `Cmd/Ctrl + Shift + D` → toggle dark mode (if this exists; otherwise omit — verify `ThemeToggle`)
- The sheet is pure presentational — no state beyond open/closed.
- Discoverable from a subtle `?` icon in the footer that opens the same sheet on click.

### Files touched

- **New:** `apps/web/src/components/ShortcutSheet.tsx` (~120 LOC)
- **New:** `apps/web/src/components/ShortcutSheet.css` (~60 LOC)
- **Modified:** `apps/web/src/App.tsx` — extend the existing `handleKeydown` at App.tsx:411 with the `?` case; skip when input/textarea is focused (check `document.activeElement?.tagName`).
- **Modified:** `apps/web/src/components/AppFooter.tsx` — add the `?` trigger icon.
- **New:** `apps/web/src/components/__tests__/ShortcutSheet.test.tsx` — 4 cases (open, escape, focused-input skip, footer-trigger).

### Acceptance

- `?` opens the sheet when focus is outside a text input.
- `?` inserts a `?` character normally when an input is focused — no hijack.
- The sheet content matches the actual shortcut handlers in App.tsx (no documentation drift — test asserts this by referencing `TAB_ORDER.length`).

## Ordering and ship strategy

Independent, additive PRs — recommended order:

1. **Item 4 (shortcut sheet)** first. Smallest. Validates the kbd-handler extension pattern. ~1 day.
2. **Item 2 (Tomorrow chip)** second. Small reducer addition + one component. Teachers notice immediately. ~1 day.
3. **Item 3 (draft restore)** third. Shared hook + three panel wires. ~2 days.
4. **Item 1 (command palette)** last. Largest. Biggest win. ~3–4 days.

Each PR must:

- Add tests (counts given above).
- Pass `npm run typecheck`, `npm run lint`, `npm run test`.
- Not touch `docs/api-surface.md`, `docs/system-inventory.md`, prompt contracts, or release-gate lanes.
- Update `docs/decision-log.md` only if a convention choice needs recording (none anticipated).

## Risks and mitigations

- **Risk:** Command palette fuzzy-match quality is poor without a real library.
  **Mitigation:** Start with case-insensitive `includes` over `label + group + keywords + actionSynonyms`. Teachers type short exact-prefix queries ("fam", "log", "diff"). If user-testing shows it's too noisy, swap to a 40-line Sublime-style subsequence matcher before adding a dependency.

- **Risk:** Draft restore becomes annoying if the "Resume draft?" chip shows for trivial typos.
  **Mitigation:** Only surface the chip when the stored draft is >= 20 characters AND the user has been gone >= 2 minutes since last keystroke.

- **Risk:** Tomorrow chip competes with existing header real estate on narrow viewports.
  **Mitigation:** Collapse to icon-only below 760px (matches existing responsive tier 2); count moves to a superscript badge.

- **Risk:** `?` shortcut collides with keyboard layouts that require Shift for non-`/` keys.
  **Mitigation:** Listen for `e.key === "?"` (which handles the shifted mapping) rather than `e.code`. Already the pattern used in `OnboardingOverlay.tsx:46`.

## Test plan summary

- ~24 new unit tests (4 + 4 + 6 + 10 across the four items).
- One additive reducer action (`REMOVE_TOMORROW_NOTE`) with coverage.
- No integration/eval tests needed — this is UI-only.
- Manual smoke: teacher-persona walkthrough documented in each PR description.

## Validation commands

Per CLAUDE.md conventions, each PR runs:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

No `release:gate`, no `system:inventory:check`, no contrast check needed — these items use existing tokens and introduce no new API surface.

## Open questions

None. Defaults chosen:

- Palette: in-house fuzzy, recents via `localStorage`, opens on `Cmd/Ctrl+K` only (no other binding).
- Chip: popover (not drawer), hidden when empty, auto-announces via `aria-live`.
- Draft: 12h TTL, 20-char threshold, 2-min inactivity threshold, per-classroom scoping.
- Sheet: opens on `?` only, skips when input focused, one footer trigger for mouse users.

Any of these can be revisited in implementation-plan review; none block starting.
