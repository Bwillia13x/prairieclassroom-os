# OutputActionBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every generation panel a persistent, sticky "what-now" action bar (Print / Copy / Save-to-Tomorrow / Share-with-EA / Download) so teacher outputs stop being terminal — and give the FamilyMessagePanel approval the ceremony it deserves via a two-step dialog.

**Architecture:** Introduce one shared `<OutputActionBar />` at `apps/web/src/components/shared/OutputActionBar.tsx` that accepts a strongly-typed `OutputAction[]` array and renders a sticky horizontal row of icon+label buttons inside the workspace canvas, below existing feedback. Panels assemble their own action arrays from three reusable hooks (`useCopyToClipboard`, `useDownloadBlob`, and a new `APPEND_TOMORROW_NOTE` reducer action). FamilyMessagePanel replaces its inline approval button with a `<MessageApprovalDialog />` that the OutputActionBar triggers, so the clipboard write and the server approval call happen inside a confirming modal rather than a naked single button.

**Tech Stack:** React 18, Vite, TypeScript, vitest, @testing-library/react, Clipboard API (navigator.clipboard)

---

## Shared Contract

All tasks below assume this canonical type, declared once in `apps/web/src/components/shared/OutputActionBar.tsx` and re-exported from `apps/web/src/components/shared/index.ts`:

```ts
import type { SectionIconName } from "../SectionIcon";

export type OutputActionKey =
  | "print"
  | "copy"
  | "download"
  | "save-to-tomorrow"
  | "share-with-ea"
  | "review-approval";

export type OutputActionVariant = "primary" | "ghost" | "approve";

export interface OutputAction {
  key: OutputActionKey;
  label: string;
  icon: SectionIconName;
  onClick: () => void | Promise<void>;
  variant?: OutputActionVariant;
  disabled?: boolean;
  disabledReason?: string;
  tooltip?: string;
  /** When true, the button label is collapsed on narrow viewports but remains as aria-label. */
  collapseOnNarrow?: boolean;
}

export interface OutputActionBarProps {
  actions: OutputAction[];
  /** Label rendered at the start of the bar for screen readers and visible context. */
  contextLabel?: string;
  /** Override sticky positioning — default true. */
  sticky?: boolean;
  /** Optional test id for integration tests. */
  "data-testid"?: string;
}
```

`OutputActionKey` is used for test assertions and analytics stability; `OutputAction` is the single contract every panel uses.

---

## Task 1 — Create OutputActionBar component (TDD)

- [ ] Create `apps/web/src/components/shared/OutputActionBar.tsx` with the `OutputAction`, `OutputActionKey`, `OutputActionVariant`, and `OutputActionBarProps` types declared above.
- [ ] Component renders a `<nav className="output-action-bar" aria-label={contextLabel ?? "Output actions"}>` wrapping a `<ul>` of `<li>` per action. Each action becomes a real `<button type="button">` with:
  - class: `output-action-bar__btn output-action-bar__btn--${variant}` (variant defaults to `"ghost"`)
  - `aria-label={action.label}` always set (for icon-only mobile collapse)
  - `aria-disabled={disabled ? "true" : undefined}` and native `disabled={disabled}`
  - `title={action.tooltip ?? action.disabledReason}` when relevant
  - A leading `<SectionIcon name={action.icon} />` followed by `<span className="output-action-bar__label">{action.label}</span>`
  - `onClick` wrapped in a `void Promise.resolve(action.onClick())` dispatcher so async handlers do not swallow rejections silently
- [ ] Create `apps/web/src/components/shared/OutputActionBar.css` with these rules using existing design tokens (`--color-surface`, `--color-surface-elevated`, `--color-border`, `--color-text-primary`, `--space-sm`, `--space-md`, `--radius-md`, `--shadow-sm`, `--transition-base`). No hex literals. Respect `@media (prefers-reduced-motion: reduce)` by disabling the transition on hover.
- [ ] Export `OutputActionBar` (default) and re-export `OutputAction`, `OutputActionKey`, `OutputActionBar` from `apps/web/src/components/shared/index.ts`.
- [ ] Write `apps/web/src/components/shared/__tests__/OutputActionBar.test.tsx` that mirrors the structure of `apps/web/src/components/__tests__/TodayStory.test.tsx`. Required tests:
  1. Renders one action with label and icon visible, button accessible by its `aria-label`.
  2. Renders three actions — clicking the middle button calls its `onClick` handler once.
  3. Renders five actions with a mix of variants, confirms each button carries the correct `output-action-bar__btn--primary|ghost|approve` class.
  4. A disabled action carries `aria-disabled="true"`, native `disabled`, and does **not** invoke `onClick` when clicked.
  5. An async `onClick` that rejects is still caught (`vi.spyOn(console, "error")` is not triggered — use a try/catch in the dispatcher).
  6. Passing `contextLabel="Differentiate output"` surfaces on the `<nav>` `aria-label`.
- [ ] Verify with `npm --workspace apps/web run test -- OutputActionBar`. All six tests green.
- [ ] Commit: `feat(web): add OutputActionBar shared component and types`.

---

## Task 2 — useCopyToClipboard hook (TDD)

- [ ] Create `apps/web/src/hooks/useCopyToClipboard.ts` exporting:

```ts
export type CopyStatus = "idle" | "copying" | "copied" | "error";

export interface UseCopyToClipboardResult {
  copy: (text: string) => Promise<boolean>;
  status: CopyStatus;
  error: string | null;
  reset: () => void;
}

export function useCopyToClipboard(options?: { resetMs?: number }): UseCopyToClipboardResult;
```

- [ ] Implementation:
  1. Set `status = "copying"`, try `await navigator.clipboard.writeText(text)` first.
  2. If `navigator.clipboard` is `undefined` or the promise rejects, fall back to creating an off-screen `<textarea>`, selecting it, calling `document.execCommand("copy")`, and removing the node.
  3. On success set `status = "copied"` and schedule `status = "idle"` after `options?.resetMs ?? 2000` ms via `setTimeout`; the hook must clear the timeout in a `useEffect` cleanup to avoid leaking on unmount.
  4. On total failure set `status = "error"` and `error` to `err instanceof Error ? err.message : "Copy failed"`.
  5. The hook returns a stable `copy` via `useCallback` and a stable `reset` via `useCallback` so callers can memoize safely.
- [ ] Write `apps/web/src/hooks/__tests__/useCopyToClipboard.test.tsx` mirroring `apps/web/src/hooks/__tests__/useFeedback.test.tsx`. Required tests:
  1. Happy path: `navigator.clipboard.writeText` is mocked with `vi.fn().mockResolvedValue(undefined)`. Call `copy("hello")`. Assert it resolves `true`, status transitions `idle → copying → copied`, and the clipboard mock received `"hello"`.
  2. Fallback path: `Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })` before render, mock `document.execCommand` with `vi.fn().mockReturnValue(true)`. Call `copy("hi")`. Assert `execCommand("copy")` was called and `copy` resolved `true`.
  3. Error path: clipboard mock rejects with `new Error("denied")` and `document.execCommand` returns `false`. Assert `copy` resolves `false`, `status === "error"`, `error === "denied"`.
  4. Timer reset: use `vi.useFakeTimers()`, assert `status === "copied"` immediately after resolution, advance `2000` ms, assert `status === "idle"`.
- [ ] Verify with `npm --workspace apps/web run test -- useCopyToClipboard`. All four tests green.
- [ ] Commit: `feat(web): add useCopyToClipboard hook with execCommand fallback`.

---

## Task 3 — useDownloadBlob hook (TDD)

- [ ] Create `apps/web/src/hooks/useDownloadBlob.ts` exporting:

```ts
export interface DownloadBlobOptions {
  filename: string;
  content: string;
  mime?: "text/plain" | "text/markdown" | "application/json";
}

export interface UseDownloadBlobResult {
  download: (opts: DownloadBlobOptions) => void;
  lastDownloadedAt: number | null;
}

export function useDownloadBlob(): UseDownloadBlobResult;
```

- [ ] Implementation:
  1. In `download`, construct a `Blob([opts.content], { type: opts.mime ?? "text/plain" })`.
  2. Call `URL.createObjectURL(blob)` and store the URL locally.
  3. Create an `<a>` element via `document.createElement("a")`, set `href = url`, `download = opts.filename`, `rel = "noopener"`, append to `document.body`, call `.click()`, remove the node, and finally call `URL.revokeObjectURL(url)` on the next animation frame (via `requestAnimationFrame`) to ensure the download has started.
  4. Update `lastDownloadedAt = Date.now()` via `useState` so tests can assert call order.
  5. Sanitize `opts.filename`: strip characters not in `[A-Za-z0-9._-]` and replace with `_`; enforce a maximum length of 128.
- [ ] Write `apps/web/src/hooks/__tests__/useDownloadBlob.test.tsx`. Required tests:
  1. Happy path with mocked `URL.createObjectURL` (`vi.fn().mockReturnValue("blob:mock")`), `URL.revokeObjectURL` (`vi.fn()`), and `HTMLAnchorElement.prototype.click` spied via `vi.spyOn`. Call `download({ filename: "variants.md", content: "# hi", mime: "text/markdown" })`. Assert `createObjectURL` received a `Blob`, the anchor's `download` attribute was `"variants.md"`, and `click` was called once.
  2. Filename sanitization: call `download({ filename: "my plan/../etc.md", content: "x" })`, assert the resulting anchor's `download` attribute is `"my_plan_.._etc.md"`.
  3. `requestAnimationFrame` is mocked; after calling `download`, advance the frame and assert `revokeObjectURL` was called with `"blob:mock"`.
  4. `lastDownloadedAt` is non-null after a successful download.
- [ ] Verify with `npm --workspace apps/web run test -- useDownloadBlob`. All four tests green.
- [ ] Commit: `feat(web): add useDownloadBlob hook with filename sanitization`.

---

## Task 4 — Tomorrow Notes state slot + reducer action (TDD)

- [ ] Add to `apps/web/src/types.ts` (UI-only section):

```ts
export type TomorrowNoteSource =
  | "differentiate"
  | "tomorrow-plan"
  | "support-patterns"
  | "ea-briefing"
  | "complexity-forecast"
  | "survival-packet"
  | "language-tools"
  | "family-message";

export interface TomorrowNote {
  id: string;
  sourcePanel: TomorrowNoteSource;
  sourceType: string; // e.g. "differentiate_material" — mirrors prompt-class names
  summary: string;
  createdAt: string; // ISO-8601
}
```

- [ ] Update `apps/web/src/appReducer.ts`:
  1. Import `TomorrowNote` from `./types`.
  2. Add `tomorrowNotes: TomorrowNote[]` to `AppState`.
  3. Add two new actions to `AppAction`:
     - `{ type: "APPEND_TOMORROW_NOTE"; note: TomorrowNote }`
     - `{ type: "CLEAR_TOMORROW_NOTES" }`
  4. Add handling in `appReducer`:
     - `APPEND_TOMORROW_NOTE` pushes the note onto `tomorrowNotes` and persists the full array to `localStorage` under key `"prairie-tomorrow-notes"` (swallow errors).
     - `CLEAR_TOMORROW_NOTES` resets to `[]` and removes the localStorage key.
  5. Add a `loadTomorrowNotes()` helper (pattern mirrors `loadFeedbackQueue`). Wire into `createInitialState()`.
- [ ] Update `apps/web/src/AppContext.tsx` to expose `tomorrowNotes: TomorrowNote[]` and a convenience function `appendTomorrowNote: (note: Omit<TomorrowNote, "id" | "createdAt">) => void` that generates an ID (`crypto.randomUUID()`) and ISO timestamp before dispatching. Wire through `App.tsx` where the provider is composed.
- [ ] Write `apps/web/src/__tests__/appReducer.tomorrowNotes.test.ts` with these cases:
  1. Fresh state has `tomorrowNotes: []`.
  2. Dispatching `APPEND_TOMORROW_NOTE` with a sample `TomorrowNote` returns a new state whose `tomorrowNotes` length is 1 and whose first item matches.
  3. Dispatching two `APPEND_TOMORROW_NOTE` actions preserves order.
  4. Dispatching `CLEAR_TOMORROW_NOTES` empties the array.
  5. `localStorage` is updated — use `vi.spyOn(Storage.prototype, "setItem")` to verify the key is `"prairie-tomorrow-notes"` and the serialized value parses back to the expected array.
- [ ] Verify with `npm --workspace apps/web run test -- appReducer.tomorrowNotes`. All five tests green.
- [ ] Commit: `feat(web): add tomorrowNotes state slot and APPEND_TOMORROW_NOTE action`.

---

## Task 5 — Wire OutputActionBar into DifferentiatePanel (TDD)

- [ ] Create a helper `apps/web/src/panels/DifferentiatePanel.helpers.ts` that exports two pure functions (so they are unit-testable without rendering the panel):

```ts
import type { DifferentiatedVariant } from "../types";

export function serializeVariantsToPlainText(artifactTitle: string, variants: DifferentiatedVariant[]): string;
export function serializeVariantsToMarkdown(artifactTitle: string, variants: DifferentiatedVariant[]): string;
export function summarizeVariantsForTomorrow(artifactTitle: string, variants: DifferentiatedVariant[]): string;
```

  - Plain text: `"<title>\n\n— Variant: <variant.variant_type> —\n<variant.content>\n\n..."` with `\n\n---\n\n` dividers.
  - Markdown: `"# <title>\n\n## Variant: <variant_type>\n\n<content>\n"` concatenated.
  - Summary: `"${variants.length} variants for '${artifactTitle}' — readiness: X, chunking: Y, extension: Z, language: W"` (counts by `variant_type`).

- [ ] Edit `apps/web/src/panels/DifferentiatePanel.tsx`:
  1. Import `OutputActionBar`, `OutputAction` from `../components/shared`, `useCopyToClipboard` from `../hooks/useCopyToClipboard`, `useDownloadBlob` from `../hooks/useDownloadBlob`, and the three new helpers.
  2. Instantiate `const { copy } = useCopyToClipboard();` and `const { download } = useDownloadBlob();` at the top of the component.
  3. Consume `appendTomorrowNote` and `setActiveTab` from `useApp()`.
  4. Build `const actions = useMemo<OutputAction[]>(() => result ? [ ... ] : [], [result, artifactTitle, copy, download, appendTomorrowNote, setActiveTab]);` with:
     - Print: `{ key: "print", label: "Print", icon: "pencil", onClick: () => window.print() }`
     - Copy: `{ key: "copy", label: "Copy", icon: "check", onClick: async () => { await copy(serializeVariantsToPlainText(artifactTitle, result.variants)); showSuccess("Copied"); } }`
     - Download: `{ key: "download", label: "Download", icon: "grid", onClick: () => download({ filename: slugify(artifactTitle) + ".md", content: serializeVariantsToMarkdown(artifactTitle, result.variants), mime: "text/markdown" }) }`
     - Save to Tomorrow: `{ key: "save-to-tomorrow", label: "Save to Tomorrow", icon: "star", variant: "primary", onClick: () => { appendTomorrowNote({ sourcePanel: "differentiate", sourceType: "differentiate_material", summary: summarizeVariantsForTomorrow(artifactTitle, result.variants) }); showSuccess("Saved to Tomorrow Plan"); } }`
  5. Render `{result ? <OutputActionBar actions={actions} contextLabel="Variants output" /> : null}` **after** `<FeedbackCollector />` inside the existing canvas fragment (lines ~140–144).
  6. Introduce a tiny local `function slugify(s: string) { return (s || "variants").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80); }` near the bottom of the file.
- [ ] Create `apps/web/src/panels/__tests__/DifferentiatePanel.actionBar.test.tsx`:
  1. Render the panel with a fake result (mock `useAsyncAction` and/or the `api.differentiate` call the way existing panel tests do — if there is no existing panel test harness, use a helper wrapper that directly sets `result` via a prop override — **document the approach in the test file's top comment**).
  2. Assert all four action buttons are accessible by their labels.
  3. Click "Copy". Assert the mocked `navigator.clipboard.writeText` was called with a string containing `"— Variant:"` and all variant contents.
  4. Click "Download". Assert the mocked anchor's `download` attribute ends in `.md`.
  5. Click "Save to Tomorrow". Assert `dispatch` was called with an action whose `type === "APPEND_TOMORROW_NOTE"` and whose `note.sourcePanel === "differentiate"`.
  6. Also unit-test `serializeVariantsToPlainText`, `serializeVariantsToMarkdown`, and `summarizeVariantsForTomorrow` in a sibling file `DifferentiatePanel.helpers.test.ts` with three `DifferentiatedVariant` fixtures.
- [ ] Verify: `npm --workspace apps/web run test -- DifferentiatePanel`. All tests green.
- [ ] Commit: `feat(web): wire OutputActionBar into DifferentiatePanel`.

---

## Task 6 — Wire OutputActionBar into TomorrowPlanPanel (TDD)

- [ ] Create `apps/web/src/panels/TomorrowPlanPanel.helpers.ts` exporting:

```ts
import type { TomorrowPlan } from "../types";

export function serializePlanToPlainText(plan: TomorrowPlan): string;
export function serializePlanToEABriefingSummary(plan: TomorrowPlan): string;
```

  - Plain text walks `transition_watchpoints`, `support_priorities`, `prep_checklist`, `ea_actions`, `family_followups` with section headers.
  - EA summary: "Tomorrow's EA actions (<N>): …" followed by up to five priority items.

- [ ] Edit `apps/web/src/panels/TomorrowPlanPanel.tsx` to add `OutputActionBar` with:
  - Print: `window.print()`
  - Copy: copies plain text summary via `useCopyToClipboard`
  - Save to Tomorrow: **disabled** with `disabledReason: "You are already editing tomorrow's plan"` (still shown so the bar feels uniform across panels)
  - Share with EA: calls `copy(serializePlanToEABriefingSummary(displayResult.plan))`, shows `"EA summary copied — paste into Slack/email"`
  - (No Download for this panel.)
- [ ] Place the `<OutputActionBar />` after `<FeedbackCollector />`, guarded by `{displayResult ? ... : null}`.
- [ ] Write `apps/web/src/panels/__tests__/TomorrowPlanPanel.actionBar.test.tsx`:
  1. Renders the bar with four buttons when `displayResult` is set.
  2. "Save to Tomorrow" has `aria-disabled="true"` and clicking it does not dispatch any action.
  3. "Share with EA" triggers the clipboard mock with a string containing `"Tomorrow's EA actions"`.
  4. "Copy" populates the clipboard mock with a string containing `"Support priorities"` and `"Prep checklist"` section headers.
  5. Helpers unit-tested in a sibling `TomorrowPlanPanel.helpers.test.ts`.
- [ ] Verify: `npm --workspace apps/web run test -- TomorrowPlanPanel`. All green.
- [ ] Commit: `feat(web): wire OutputActionBar into TomorrowPlanPanel with EA share`.

---

## Task 7 — Wire remaining panels (TDD, grouped by canvas kind)

- [ ] Create `apps/web/src/panels/outputActionBarHelpers.ts` — a single helpers file that exports panel-specific serializers so each panel avoids duplicating Blob/format code:

```ts
import type {
  SupportPatternReport,
  EABriefing,
  ComplexityForecast,
  SurvivalPacket,
  SimplifiedOutput,
  VocabCardSet,
} from "../types";

export function serializeSupportPatternsToPlainText(report: SupportPatternReport): string;
export function serializeEABriefingToPlainText(briefing: EABriefing): string;
export function serializeForecastToPlainText(forecast: ComplexityForecast): string;
export function serializeSurvivalPacketToMarkdown(packet: SurvivalPacket): string;
export function serializeLanguageOutputToPlainText(output: SimplifiedOutput | VocabCardSet): string;
```

- [ ] Wire OutputActionBar into each of the five panels below. For every panel: guard on its displayed result, memoize the `actions` array, place the bar after `<FeedbackCollector />`, and pass a `contextLabel` unique to that panel (e.g. `"Support patterns output"`, `"EA briefing output"`).

| Panel | File | Action set |
|---|---|---|
| SupportPatternsPanel | `apps/web/src/panels/SupportPatternsPanel.tsx` | Print, Copy, Save to Tomorrow (note: `sourcePanel: "support-patterns"`), Share with EA |
| EABriefingPanel | `apps/web/src/panels/EABriefingPanel.tsx` | Print, Copy, Download (.md), Save to Tomorrow |
| ForecastPanel | `apps/web/src/panels/ForecastPanel.tsx` | Print, Copy, Save to Tomorrow |
| SurvivalPacketPanel | `apps/web/src/panels/SurvivalPacketPanel.tsx` | Print, Copy, Download (.md) — this is the packet-export panel |
| LanguageToolsPanel | `apps/web/src/panels/LanguageToolsPanel.tsx` | Print, Copy, Download (.txt for SimplifiedOutput, .md for VocabCardSet), Save to Tomorrow |

- [ ] Create one **smoke test** per panel under `apps/web/src/panels/__tests__/` that only asserts: (a) the OutputActionBar renders with the expected number of buttons when the mocked result is set, (b) the panel still renders its empty state when `result === null`. Name them `<PanelName>.actionBar.test.tsx`. These are short — 40–60 lines each — and use the same mocking approach as task 5.
- [ ] Write `apps/web/src/panels/__tests__/outputActionBarHelpers.test.ts` with one test per serializer using the minimal fixtures in `packages/shared/src/__tests__/` (or inline fixtures if simpler) confirming the returned string contains the expected section headers.
- [ ] Verify with `npm --workspace apps/web run test -- panels`. All smoke tests green.
- [ ] Commit: `feat(web): wire OutputActionBar into remaining five generation panels`.

---

## Task 8 — FamilyMessagePanel approval ceremony (TDD)

- [ ] Create `apps/web/src/components/MessageApprovalDialog.tsx` — a modal dialog that:
  1. Uses a native `<dialog>` element (with `ref.current?.showModal()` on open) for keyboard trap + escape-to-close.
  2. Accepts props: `{ open: boolean; draft: FamilyMessageDraft; onConfirm: () => Promise<void>; onCancel: () => void; copyStatus: CopyStatus; }`.
  3. Renders: a header with `"Review approval"`, a meta row (recipient count via `draft.student_refs.length`, target language, message type), a scrollable preview of `draft.plain_language_text` (and `simplified_student_text` if present), and two footer buttons: `Cancel` (ghost) and `Approve & Copy` (primary/approve variant).
  4. `Approve & Copy` calls `onConfirm`, which in FamilyMessagePanel will (a) copy text via `useCopyToClipboard`, (b) call the existing `approveFamilyMessage` API, (c) dispatch `showSuccess`, (d) close the dialog.
  5. Focus management: on open, focus the `Cancel` button (safer default than auto-approve). On close, restore focus to the triggering button.
  6. Accessibility: dialog has `aria-labelledby` pointing at the header id, `role="dialog"` (native `<dialog>` provides this), and a visually-hidden live region announcing copy status changes.
- [ ] Create `apps/web/src/components/MessageApprovalDialog.css` using design tokens. No hex literals. Respects reduced-motion (no fade-in animation when `prefers-reduced-motion: reduce`).
- [ ] Edit `apps/web/src/components/MessageDraft.tsx`:
  1. Remove the inline `Approve & Copy to Clipboard` button (lines 62–76) and the `draft-approval` block's button. Keep the approved badge rendering, but drive its visibility from the new `approved` prop passed in.
  2. Change the component signature to `{ draft, approved, copied }` — the parent panel now owns the approval state and copy state.
  3. Also remove the `PrintButton` from line 78 — printing is now handled by the shared OutputActionBar.
- [ ] Edit `apps/web/src/panels/FamilyMessagePanel.tsx`:
  1. Add `const [dialogOpen, setDialogOpen] = useState(false);` and `const [approvedIds, setApprovedIds] = useState<Record<string, boolean>>({});`.
  2. Add `const { copy, status: copyStatus } = useCopyToClipboard();`.
  3. Rewrite `handleApprove` to (a) open the dialog, not approve directly.
  4. Add `async function handleDialogConfirm()` that copies `displayResult.draft.plain_language_text`, calls the existing `approveFamilyMessage` server call, sets `approvedIds[draft.draft_id] = true`, calls `showSuccess("Message approved and copied")` plus `showUndo(...)`, and finally closes the dialog.
  5. Pass `approved={approvedIds[displayResult.draft.draft_id] ?? displayResult.draft.teacher_approved}` into `<MessageDraft />`.
  6. Build the OutputActionBar actions array:
     - `review-approval`: `{ key: "review-approval", label: approved ? "Approved" : "Review approval", icon: "check", variant: "approve", disabled: approved, onClick: () => setDialogOpen(true) }`
     - `print`: `window.print()`
     - `copy`: copies `draft.plain_language_text` directly (outside the ceremony — useful for re-copying after approval)
  7. Render the dialog at the end of the canvas: `{displayResult ? <MessageApprovalDialog open={dialogOpen} draft={displayResult.draft} onConfirm={handleDialogConfirm} onCancel={() => setDialogOpen(false)} copyStatus={copyStatus} /> : null}`.
- [ ] Write `apps/web/src/components/__tests__/MessageApprovalDialog.test.tsx` with:
  1. Render closed — `<dialog>` has no `open` attribute.
  2. Render open — `<dialog>` shows, recipient count from `draft.student_refs.length` is visible, preview text is visible.
  3. Clicking `Cancel` calls `onCancel` once.
  4. Clicking `Approve & Copy` calls `onConfirm` once.
  5. When `copyStatus === "copied"`, the live region reads `"Copied to clipboard"`.
  6. Initial focus lands on the Cancel button.
  7. Pressing `Escape` invokes `onCancel` (via the native `close` event).
- [ ] Write `apps/web/src/panels/__tests__/FamilyMessagePanel.approval.test.tsx`:
  1. Renders the `review-approval` button when a draft is shown.
  2. Clicking it opens the dialog (asserts dialog body is in the document).
  3. Clicking `Approve & Copy` inside the dialog triggers the mocked `approveFamilyMessage` API and the mocked `navigator.clipboard.writeText`, and afterwards the `review-approval` button shows `"Approved"` and is disabled.
- [ ] Verify: `npm --workspace apps/web run test -- FamilyMessage MessageApprovalDialog`. All tests green.
- [ ] Commit: `feat(web): upgrade FamilyMessagePanel approval to two-step dialog`.

---

## Task 9 — Sticky positioning, reduced-motion, and dark-mode contrast

- [ ] Edit `apps/web/src/components/shared/OutputActionBar.css`:
  1. Base styles:
     ```css
     .output-action-bar {
       position: sticky;
       bottom: 0;
       display: flex;
       align-items: center;
       gap: var(--space-sm);
       padding: var(--space-sm) var(--space-md);
       background: var(--color-surface-elevated);
       border-top: 1px solid var(--color-border);
       box-shadow: 0 -2px 8px var(--color-shadow-soft);
       z-index: 3;
       margin-top: var(--space-md);
     }
     ```
  2. Button styles use `--color-text-primary`, `--color-surface`, `--radius-md`, `--transition-base`.
  3. Hover and focus-visible rules raise the button via `box-shadow` and `transform: translateY(-1px)`.
  4. Reduced motion:
     ```css
     @media (prefers-reduced-motion: reduce) {
       .output-action-bar__btn { transition: none; }
       .output-action-bar__btn:hover { transform: none; }
     }
     ```
  5. Dark-mode override: add `:root[data-theme="dark"] .output-action-bar { background: var(--color-surface-elevated-dark); border-color: var(--color-border-dark); }`. Confirm the tokens exist by reading `apps/web/src/styles/tokens.css` (or equivalent) — if a required token is missing, add it in the same commit and update `docs/dark-mode-contract.md`.
  6. Narrow viewport: `@media (max-width: 600px) { .output-action-bar__btn .output-action-bar__label { display: none; } .output-action-bar__btn { padding: var(--space-sm); } }` — labels collapse, icons remain accessible via `aria-label`.
- [ ] Run `npm --workspace apps/web run check:contrast` (or `npm run check:contrast` from repo root per CLAUDE.md) to verify WCAG contrast on the new surfaces. Fix any failures before committing.
- [ ] Add a visual-regression-style test: extend `apps/web/src/components/shared/__tests__/OutputActionBar.test.tsx` (from task 1) with two additional tests:
  1. `getComputedStyle(nav).position === "sticky"` when rendered in a test document.
  2. With `matchMedia("(prefers-reduced-motion: reduce)")` mocked to match, the button transition is `"none 0s ease 0s"` (or equivalent — assert the property is absent/reset).
- [ ] Verify: `npm --workspace apps/web run test -- OutputActionBar` and `npm run check:contrast`. Both pass.
- [ ] Commit: `feat(web): add sticky, reduced-motion, dark-mode styles to OutputActionBar`.

---

## Task 10 — Documentation and architecture note

- [ ] Update `docs/architecture.md` with a new short section titled `## OutputActionBar contract` placed near the existing component sections. One paragraph explaining: the `OutputAction` type, where it lives (`apps/web/src/components/shared/OutputActionBar.tsx`), which panels implement it, the three supporting hooks (`useCopyToClipboard`, `useDownloadBlob`), and the new `tomorrowNotes` state slot. Include a one-line note that `FamilyMessagePanel` routes its approval through the `MessageApprovalDialog` for ceremony.
- [ ] Update `docs/decision-log.md` with a dated entry (`## 2026-04-14 — OutputActionBar adopted`) explaining the "what-now" problem, the decision to standardize on a single shared bar rather than per-panel bespoke buttons, and the rationale for the two-step family approval (legal/communication weight).
- [ ] Run `npm run system:inventory` to regenerate `docs/system-inventory.md` and `docs/api-surface.md` (no API surface changes expected, but the inventory check in `npm run system:inventory:check` will flag stale generated docs otherwise).
- [ ] Run the full validation gate for this change:
  - `npm run typecheck`
  - `npm run lint`
  - `npm --workspace apps/web run test`
  - `npm run check:contrast`
- [ ] Commit: `docs(web): document OutputActionBar contract and family approval ceremony`.

---

## Acceptance checklist (final review before closing the plan)

- [ ] Seven panels render the OutputActionBar at the bottom of their canvas after generation: DifferentiatePanel, TomorrowPlanPanel, SupportPatternsPanel, EABriefingPanel, ForecastPanel, SurvivalPacketPanel, LanguageToolsPanel.
- [ ] FamilyMessagePanel renders `review-approval` (plus Print and Copy) via OutputActionBar, and approval always routes through `MessageApprovalDialog` — no single naked button remains.
- [ ] All new `.tsx` and `.ts` files use `OutputAction` from the shared module — the type is defined once.
- [ ] Every action button has either visible text or an `aria-label` and uses real `<button>` elements. Disabled actions set both `disabled` and `aria-disabled="true"`.
- [ ] `useCopyToClipboard` has a real fallback path using `document.execCommand("copy")`.
- [ ] `useDownloadBlob` revokes its object URL.
- [ ] `tomorrowNotes` state is persisted to localStorage and restored on reload.
- [ ] No hex literal introduced in any CSS file. No emoji added to any file.
- [ ] All vitest suites for the changed files are green, `typecheck` passes, `lint` passes, `check:contrast` passes.
- [ ] One commit per task landed in sequence; no multi-task commits.
