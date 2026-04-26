# Final Application Review — 2026-04-25

**Tester:** Claude Code (Opus 4.7) via Playwright MCP
**Stack:** mock inference lane (`npm run pilot:start`)
**Branch HEAD:** 47b6b53 (post-viz horizontal-review polish)
**Method:** boot stack → walk all seven top-level tabs → drive a model-routed generation → toggle theme → cycle viewports 375 / 768 / 1280 / 1440 → inspect console at every step.

## TL;DR

PrairieClassroom OS is in **strong shape for demo and pilot**. All seven nav tabs render cleanly in light + dark, the model-routed `differentiate` flow round-trips through the mock inference lane in ~80 ms with the full 5-variant schema (Core / EAL / Chunked / EA Small Group / Extension), Cmd-K palette is polished, mobile reflow is tight, and the safety gate on Family Message ("Always editable · No autonomous send · approval required") is visible exactly where CLAUDE.md promises.

Zero console errors during legitimate usage. The single 500 captured was reproducibly caused by my own SIGPIPE-killed orchestrator restart, not by app code.

There are **5 small findings worth fixing before shipping** and **3 polish items**. None are blockers. Details below.

---

## Findings

### Major — fix before pilot

#### M1. Silent failure when a generation API call returns 500
**Surface:** Prep → Differentiate (and almost certainly all other model-routed forms)
**Repro:** Submit `Generate variants` while orchestrator is unhealthy. Form spins briefly then returns to its idle state. **No toast, no inline error, no retry guidance.** Console shows the 500 but the teacher does not.
**Why it matters:** In a live classroom on a flaky network this looks like "I clicked it, nothing happened, I'll click again." Doubles the load on the orchestrator and leaves the teacher unsure whether the request landed.
**Recommendation:** Wire `useAsyncAction` failure paths to the existing `showSuccess` toast surface (it already handles success). Suggested copy: *"Couldn't generate variants — `<retryable>` retry / contact support."* Keep the structured `category` / `detail_code` / `retryable` from the orchestrator's error envelope visible in dev mode.
**Evidence:** `qa-differentiate-after-submit.png` — silent return to idle form.

#### M2. Demo data has stale relative timestamps (`396d ago`, `393d ago`)
**Surface:** Classroom → Watchlist; Ops → Recent Touchpoints; everywhere `pretty(timeAgo)` is used.
**Repro:** Land on demo classroom — Brody's last touchpoint shows `396d ago`, Amira `393d ago`, Farid `14d ago`.
**Root cause:** `data/synthetic_classrooms/classroom_demo.json` and `data/demo/seed.ts` use absolute timestamps that were canonical when seeded but drift further from "now" each day. CLAUDE.md acknowledges `pilot:reset` is the canonical reset; current demo state has clearly not been reset recently.
**Why it matters:** A teacher walking in cold reads "396d ago" and assumes the system is dead. Hackathon judges will read it as a bug.
**Recommendation:** Either (a) make the seeder relative to `Date.now()` so timestamps are always "today − N days" (preferred — keeps roster stable, refreshes signals), or (b) document a pre-demo `npm run pilot:reset` step in `docs/demo-script.md`. Option (a) is cheaper and matches the deterministic-seed contract.
**Evidence:** `qa-classroom-1440-sidenav.png` (Brody · 396d ago bottom of viewport).

#### M3. Side-nav label "INTELLIGENCE" mid-word breaks to "INTELLIGENC E"
**Surface:** Classroom rail (item 05). All viewports ≥ 768.
**Root cause:** `apps/web/src/components/PageAnchorRail.css:436-444` uses `overflow-wrap: break-word`. The CSS comment explicitly warns against intra-word breaks — but at `--shell-page-rail-width: 9.25rem` (148 px), INTELLIGENCE in uppercase + 0.06em letter-spacing renders at ~96 px which is just over the available label column (~95 px after the fixed 1.4 rem number gutter and gap). Single word that doesn't fit → fallback breaks anywhere.
**Why it matters:** The dev clearly intended this not to happen ("which is unreadable"). The other 6 labels fit by ≤ 8 px so the rail width is simply too aggressive.
**Recommendation:** Bump `--shell-page-rail-width` from `9.25rem` to `9.75rem` (or `10rem`) at the breakpoint where the rail becomes visible, OR reduce label letter-spacing from `0.06em` to `0.04em`, OR rename `Intelligence` → `Insight`/`Signals` in `pageAnchors.ts:19`. Quickest one-line fix is the rename if the editorial team is OK with it.
**Evidence:** `qa-classroom-1440-sidenav.png` (item 05).

### Minor — polish before shipping

#### m1. Nav-tab pending badges aggregate inconsistently
**Surface:** Top tab bar. `Ops 6` vs `Review 25`.
**Detail:** Ops side panel says "6 STALE FOLLOW-UPS · 3 EA MOVES" — total 9 outstanding items but badge shows 6 (stale follow-ups only). Review badge shows 25 = 23 reviews + 2 patterns (composite). Either both should be composite or both narrow.
**Recommendation:** Pick one rule and document it in `docs/spec.md`. Composite is more honest ("how much is on this surface") but narrow is more action-prioritized ("how many things are stale enough to act on").

#### m2. Today panel hero time is hard-coded ("12:45 is today's real test.")
**Surface:** Today.
**Detail:** Browser time was 17:23. Either (a) the line is intentional/canonical for the demo (peak Math block), or (b) it's drifted from a time-aware planner. CLAUDE.md doesn't specify.
**Recommendation:** If it's data-driven, fine — write a comment near the source. If it's editorial demo copy, label it explicitly so a future maintainer doesn't think it's broken.

#### m3. Layered/ghosted "MESSAGE PIPELINE 7% APPROVAL RATE" sub-panel
**Surface:** Review → Family Message empty-state.
**Detail:** The Message Pipeline summary card renders behind a ghosted "Pick students to draft a message" placeholder. Visually reads as a stacking-context glitch even if intentional.
**Recommendation:** Either lift the empty-state copy out of the same card or apply explicit `opacity` instead of color-mix so the contrast is intentional rather than accidental.

### Polish — nice-to-have

#### p1. App uses inner `<main>` overflow scroll instead of document scroll
**Surface:** Entire shell (`.app-main { overflow: hidden auto; height: ...; }`)
**Implication:** `window.scrollY` is always 0; `document.scrollHeight` ≈ viewport; full-page screenshot tools (Playwright `fullPage: true`, browser extensions) only see the viewport. Side-nav anchor links use `scrollIntoView` correctly so the user-facing UX is fine.
**Recommendation:** Acceptable design choice (sticky header + sticky tabs). Worth a one-liner in `CLAUDE.md` or `docs/architecture.md` so future contributors know `window.scrollTo` won't work in tests/scripts. (Existing `qa/` evidence script already accommodates — confirm it's documented.)

#### p2. "26 STUDENTS" + "26 THREADS" stat near-duplication on Classroom Pulse
**Surface:** Classroom right-side stat card.
**Detail:** Roster=26 students, Today=26 threads — equal. A teacher can read this as "every student has a thread", which contradicts the seed contract (8 active + 7 watch + 11 strength-only). Likely the THREADS metric is double-counted from a different source.
**Recommendation:** Cross-check the THREADS counter source. If it really equals 26 by coincidence, add a label or grouping (e.g. THREADS = open + watching combined) so the visual coincidence reads as intentional.

#### p3. Mobile (375 px): `SEARCH ⌘K` chip shown without an obvious touch path
**Surface:** Mobile header.
**Detail:** ⌘K shortcut hint is meaningless on touch. Tapping the chip does open the palette, so functionally fine.
**Recommendation:** Hide the `⌘K` keycap span at `<= 640px`; keep the icon/label. One-line CSS.

---

## What works really well

These are worth preserving against future drift:

1. **Editorial command-card pattern** is consistent across all 7 pages: each leads with one short imperative sentence ("Read the room before choosing the lens.", "12:45 is today's real test.", "Coordinate the adults without losing the thread.") + a status side card. This is the strongest UI signal in the product.
2. **Cmd-K palette** is polished: contextual `Recommended now: Support Patterns` action at the top, all 7 panels with descriptions and number shortcuts, "press ?" affordance. Hackathon-judge-grade.
3. **Family Message safety gate** ("Always editable · teacher edits persist", "No autonomous send · approval required") is exactly where CLAUDE.md says it has to be. Don't lose this when the surface evolves.
4. **Mock inference round-trip** via the orchestrator returns the full `differentiate` schema with realistic variant titles, teacher notes, materials, and minute estimates — not placeholder strings. This makes the "swap mock for Gemma" claim credible.
5. **Dark theme** has near-perfect contrast at every viewport tested. The accent gold/orange band on selected nav items survives the theme swap.
6. **Bottom-tab nav on mobile** with badge preservation (Ops 6, Review 25) is the right pattern for a tablet-first teacher tool.
7. **Anchor-rail scroll behavior**: clicking `03 Active Workspace` correctly scrolls the inner `<main>` container to the right anchor. The collapse/expand affordance is small and unobtrusive.

---

## What I did NOT test (declared explicitly)

- **EA, Substitute, Reviewer roles** — only Teacher path was exercised. Per CLAUDE.md the role gating is server-enforced; would benefit from a separate role-by-role smoke pass.
- **A protected (non-demo) classroom** with the `X-Classroom-Code` prompt — demo bypass was used throughout.
- **Ollama / Gemini lanes** — explicitly skipped per CLAUDE.md cost guardrail; mock lane only.
- **Onboarding tour** (the `?` button in the top-right).
- **PDF / photo upload paths** for `extract_worksheet` (paste-text path was exercised instead).
- **Service worker / offline behavior**, if any.
- **Accessibility audit** (jest-axe is already in CI per recent commits — referenced but not re-run here).

---

## Recommended next actions

| Priority | Action | Owner cost |
|----------|--------|------------|
| 1 | Fix M1 (silent failure toast) | ~30 min — wire existing toast |
| 2 | Fix M2 (relative-time seeder) | ~1 h — touch `data/demo/seed.ts` |
| 3 | Fix M3 (rail width or label rename) | ~5 min |
| 4 | Document p1 (inner scroll) in `docs/architecture.md` | ~5 min |
| 5 | Resolve m1 (badge consistency rule) | ~15 min + spec doc |
| 6 | Address m2 / m3 / p2 / p3 | ~30 min total |

**Total to ship-ready:** ~3 hours of focused polish work.

---

## Outcomes (2026-04-25)

All 9 findings closed on branch `qa/final-review-fixes-2026-04-25`. Every commit went through implementer → spec-compliance reviewer → code-quality reviewer.

| ID | Status | Commit | Notes |
|----|--------|--------|-------|
| p1 | Closed (docs) | `54eaf71` | New `## Web shell` / `### Scroll containers` subsection in `docs/architecture.md`. |
| m2 | Verified — no fix needed | `0caa380` | Today hero time IS dynamic (`peakBlock.time_slot`). New 2-slot regression test locks the behavior. |
| p3 | Closed | `1f1d447` | `header-action__kbd` hidden via `@media (max-width: 600px)`. Breakpoint chosen to match existing `shell-nav__kbd` rule (repo-dominant convention vs. plan's 640 px guess). |
| M3 | Closed | `5e83ab3` + `873ed79` | Classroom rail "Intelligence" → "Insights"; new `PageAnchorRail.label.test.tsx` enforces ≤10 char single-word labels. Follow-up `873ed79` wired `aria-labelledby` to fix the Label-in-Name a11y regression flagged on review. |
| p2 | Closed | `7a0c07c` | New `ClassroomPanel.helpers.ts` with `isActionableThread()` predicate (OR of five real signals). Demo now reads `STUDENTS 26 / THREADS 23`. 11 unit tests. |
| m1 | Closed | `6c1ddc9` | `getTabBadgeCount` Review arm dropped pattern + message addends. New `### Top-nav badge counts` rule documented in `docs/spec.md`. |
| m3 | Closed | `ea06b66` | `FamilyMessagePanel` empty state now renders only `EmptyStateCard`; the synthetic-padded `MessageApprovalFunnel` no longer ghosts under the placeholder. New regression test asserts no overlap. |
| M2 | Closed | `1dbb33a` | New `scripts/lib/demo-freshness.mjs` + `pilot:start` preflight that warns when `student_threads[].last_intervention_days` minimum exceeds 7 days. 3 node:test cases. |
| M1 | Closed | `e84503a` | `useAsyncAction` opts gained `onError`; 10 generation panels (11 hook sites) opt in with panel-specific toast copy. Inline `ErrorBanner` preserved as belt-and-suspenders. New hook unit test (4 cases) + panel integration test. |

**Branch verification:**
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run test` — **2029/2029 vitest tests pass** (+26 new tests vs. CLAUDE.md baseline of 2003)
- `npm run release:gate` (mock mode) — **PASSED**

**Net diff:** 10 commits, ~22 files touched (mix of source + tests + docs), zero regressions.

**Out-of-scope follow-ups recorded for future sprints (none blocking):**
- `TodayPanel.tsx:223–224` still uses raw `student_threads.length` for the "X watching" label — same bug class as p2 but in a different surface. The `countActionableThreads` helper from p2 is reusable; one-line change per call site.
- `InterventionPanel` toast prefix says "Couldn't log intervention" — code reviewer noted "log" implies success; "draft" or "save" would be more honest. Counter-argument: the panel itself is named "Log Intervention" so the verb is the established product term.
- `docs/spec.md` badge table could note explicitly *why* Today/Classroom have no badge (they render their own debt gauges on-page).
- `pilot-start.mjs` could build the orchestrator base URL from the `HEALTH_CHECKS.orchestrator.port` constant instead of hardcoding `http://localhost:3100` (minor consistency).

These are documented here so future-me doesn't rediscover them from scratch.
