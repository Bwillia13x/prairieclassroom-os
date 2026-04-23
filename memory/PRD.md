# PrairieClassroom OS — Product Record

## Problem statement (original)
"@claude.md perform final review and testing of this application. ensure everything is working perfectly. polish/fine-tune the ui/ux where recommended"

## Project summary
PrairieClassroom OS is a teacher- and EA-facing classroom complexity copilot for Alberta K-6 classrooms. It is a production-hardened monorepo (Vite + React UI `apps/web`, Express orchestrator `services/orchestrator`, Python inference service `services/inference`, per-classroom SQLite memory `services/memory`, shared Zod schemas `packages/shared`). Twelve teacher-facing **working surfaces** (tool workspaces hosted under seven top-level shell views: Classroom · Today · Tomorrow · Week · Prep · Ops · Review) surface 13 model-routed prompt classes plus deterministic retrieval views.

## User personas
- **Teacher** (primary) — generates, approves, logs; sees every panel.
- **Educational Assistant (EA)** — narrower scope; Today, EA briefing, debt register, Usage Insights.
- **Substitute** — Today, EA Briefing, Log Intervention (write).
- **Reviewer** — read-only history across plans / messages / interventions / patterns / Usage Insights.

## Core requirements (static)
- Classroom-code auth via `X-Classroom-Code` + optional `X-Classroom-Role` on protected routes.
- WCAG AA contrast for every color-token pair (light + dark).
- Mock-mode lane is the default no-cost proof.
- Hosted Gemini lane is synthetic/demo only.
- Teacher judgment stays in the loop (no autonomous family messaging, no risk scoring).

## What's implemented as of this session (2026-04-21)

### Pre-existing (working)
- 12 teacher-facing panels, 13 model-routed prompt classes, 21 API route bases / 49 endpoints.
- 1779 vitest tests + 69 pytest tests passing.
- `typecheck`, `lint`, `check:contrast` all green.
- Urban-mirror measurement scaffold for responsive Ops tab overflow.

### Polish done this session (2026-04-21)

**Round 1 — primary UI/UX fixes**
- **Ops intro banner dismiss affordance**: `OpsSectionHint` was still rendering the text `Got it` inside a 1.5rem × 1.5rem slot whose CSS was migrated during audit #12 to expect a `✕` icon. Replaced the text with `<span aria-hidden>✕</span>`; kept the `Dismiss Operations tip` aria-label. (`apps/web/src/components/OpsSectionHint.tsx`)
- **Ops tab overflow detection**: The hidden width-measurement mirror was rendering label-only spans while the real tabs include a `<kbd>` shortcut badge. At 1920×900 that undercounted tab widths by ~80-130px so the "More ▾" trigger never appeared, and `SUB PACKET 9` bled past the container's right edge. Added a matching `<kbd aria-hidden>` to each mirror tab so measured widths match the live tabs. Overflow now correctly collapses `EA LOAD BALANCE` + `SUB PACKET` into the "MORE ▾" menu when the Ops group doesn't fit. (`apps/web/src/App.tsx`)
- **Always-on right fade obscuring last tab**: `.shell-nav__tabs-frame::after` defaulted to `opacity: 0.5` and was never toggled on (no `data-scrolled-end` wiring), so it always washed out the trailing tab. Zeroed its default opacity to match `::before`. (`apps/web/src/styles/shell.css`)
- **Usage Insights duplicate workflow list**: `UsageInsightsPanel` rendered the same `common_flows` data twice — a `WorkflowFlowStrip` and an ordered list — which looked redundant for the trivial/single-step flows that dominate demo and early-pilot data. Hid the `<ol>` when every flow is a single step; keep it for multi-step flows where the arrow sequence adds information. (`apps/web/src/panels/UsageInsightsPanel.tsx`)

**Round 2 — follow-ups**
- **Scroll-indicator fade wiring**: Added a `tabsFrameRef` + scroll / ResizeObserver listener on `.shell-nav__tabs` that toggles `data-scrolled-start` / `data-scrolled-end` on `.shell-nav__tabs-frame` so the `::before` / `::after` gradient fades appear only when the tabstrip is actually scrolled past an edge. Verified via playwright: `scrollLeft=500` shows both fades, `scrollLeft=scrollWidth` shows only the start fade, `scrollLeft=0` shows neither. (`apps/web/src/App.tsx`)
- **Regression test for Usage Insights suppression**: Added `UsageInsightsPanel.workflowPatterns.test.tsx` with 3 cases — all-single-step flows hide the `<ol>`; mixed single + multi-step renders the `<ol>`; any multi-step flow renders its arrow-joined sequence. (`apps/web/src/panels/__tests__/UsageInsightsPanel.workflowPatterns.test.tsx`)
- **Vite dev-server allowedHosts**: Added the Emergent preview hostname suffixes to `server.allowedHosts` so `npm run dev` can be accessed through the preview proxy without the Cloudflare tunnel choking with a 403 "Blocked request" page. (`apps/web/vite.config.ts`)

**Round 3 — scroll-fade test coverage + demo data**
- **Pure helper for the scroll-fade rule**: Extracted `computeTabScrollFadeState(scrollLeft, scrollWidth, clientWidth)` into `apps/web/src/utils/tabScrollFade.ts` so the "fade appears only when scrolled past that edge" rule can be regression-guarded without a real DOM. App.tsx now delegates to this helper. 7 unit tests cover: content-fits / sub-pixel overflow / at-start / middle / at-end / 1px tolerance / overscroll-bounce negative scrollLeft. (`apps/web/src/utils/__tests__/tabScrollFade.test.ts`)
- **Seeded multi-step demo sessions**: Extended `data/demo/seed.ts` with 5 realistic teacher sessions (morning triage 2×, prep block, Friday wrap, solo EA briefing) so `GET /api/sessions/summary/demo-okafor-grade34` now returns a multi-step `common_flows` entry at the top (`Today → Log Intervention → Tomorrow Plan (2×)`). The Usage Insights `<ol>` now renders in the demo classroom, exercising the "any flow has length > 1" branch in a browser smoke run. Session count in the demo seed summary surfaces the new total.

### Validation results after polish
- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run test` — **160 files / 1789 tests PASS** (+10 new regression tests across Rounds 2 + 3)
- `npm run test:python` — **69 tests PASS**
- `npm run check:contrast` — all 80 pairs meet WCAG AA ✓
- `npm run system:inventory:check` — canonical claims in sync
- Manual smoke test via preview URL: Today, Prep/Differentiate, Ops/Log Intervention, Review/Family Message, Review/Usage Insights (now with a multi-step `Today → Log Intervention → Tomorrow Plan (2×)` flow at the top) all render with real demo data; end-to-end request path web → orchestrator → Python inference (mock) returns 200 with structured variants.

## Out of scope / known host limitations
- `npm run release:gate` pre-flight rejects Node `v20.20.2` vs `.nvmrc` `v25.8.2`. This is a host-image constraint; no code change fixes it inside this container.
- `npm run proof:check` reports drift for the latest hosted-Gemini artifact bundle; refreshing that is a paid-run operation intentionally gated per CLAUDE.md cost guardrails.

## Prioritized backlog

### P1 — ready for future session
- (none actively queued — the two round-3 items completed the P1 list)

### P2 — deferred
- Hosted-proof refresh (Gemini lane) to clear `proof:check` drift — requires paid API budget.
- Node upgrade to v25 to unlock `npm run release:gate` — host-image work.

## Next action items
- Hand back to user for review; await direction on the P1 items or further UI polish.
