# PrairieClassroom OS — Product Record

## Problem statement (original)
"@claude.md perform final review and testing of this application. ensure everything is working perfectly. polish/fine-tune the ui/ux where recommended"

## Project summary
PrairieClassroom OS is a teacher- and EA-facing classroom complexity copilot for Alberta K-6 classrooms. It is a production-hardened monorepo (Vite + React UI `apps/web`, Express orchestrator `services/orchestrator`, Python inference service `services/inference`, per-classroom SQLite memory `services/memory`, shared Zod schemas `packages/shared`). Twelve teacher-facing panels across Today / Prep / Ops / Review surface 13 model-routed prompt classes plus deterministic retrieval views.

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
- **Ops intro banner dismiss affordance**: `OpsSectionHint` was still rendering the text `Got it` inside a 1.5rem × 1.5rem slot whose CSS was migrated during audit #12 to expect a `✕` icon. Replaced the text with `<span aria-hidden>✕</span>`; kept the `Dismiss Operations tip` aria-label. (`apps/web/src/components/OpsSectionHint.tsx`)
- **Ops tab overflow detection**: The hidden width-measurement mirror was rendering label-only spans while the real tabs include a `<kbd>` shortcut badge. At 1920×900 that undercounted tab widths by ~80-130px so the "More ▾" trigger never appeared, and `SUB PACKET 9` bled past the container's right edge. Added a matching `<kbd aria-hidden>` to each mirror tab so measured widths match the live tabs. Overflow now correctly collapses `EA LOAD BALANCE` + `SUB PACKET` into the "MORE ▾" menu when the Ops group doesn't fit. (`apps/web/src/App.tsx`)
- **Always-on right fade obscuring last tab**: `.shell-nav__tabs-frame::after` defaulted to `opacity: 0.5` and was never toggled on (no `data-scrolled-end` wiring), so it always washed out the trailing tab. Zeroed its default opacity to match `::before`; the scroll-indicator becomes dead CSS that a future scroll observer can re-enable without re-tuning. (`apps/web/src/styles/shell.css`)
- **Usage Insights duplicate workflow list**: `UsageInsightsPanel` rendered the same `common_flows` data twice — a `WorkflowFlowStrip` and an ordered list — which looked redundant for the trivial/single-step flows that dominate demo and early-pilot data. Hid the `<ol>` when every flow is a single step; keep it for multi-step flows where the arrow sequence adds information. (`apps/web/src/panels/UsageInsightsPanel.tsx`)

### Validation results after polish
- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run test` — **158 files / 1779 tests PASS**
- `npm run test:python` — **69 tests PASS**
- `npm run check:contrast` — all 80 pairs meet WCAG AA ✓
- `npm run system:inventory:check` — canonical claims in sync
- Manual smoke test via preview URL: Today, Prep/Differentiate, Ops/Log Intervention, Review/Family Message, Review/Usage Insights all render with real demo data; end-to-end request path web → orchestrator → Python inference (mock) returns 200 with structured variants.

## Out of scope / known host limitations
- `npm run release:gate` pre-flight rejects Node `v20.20.2` vs `.nvmrc` `v25.8.2`. This is a host-image constraint; no code change fixes it inside this container.
- `npm run proof:check` reports drift for the latest hosted-Gemini artifact bundle; refreshing that is a paid-run operation intentionally gated per CLAUDE.md cost guardrails.

## Prioritized backlog

### P1 — ready if user wants
- Re-enable the horizontal scroll-indicator fades on `.shell-nav__tabs-frame` by wiring `data-scrolled-start` / `data-scrolled-end` from the tabs scroll event (now that the default `::after` opacity is 0, this becomes additive).
- Add a `UsageInsightsPanel.workflowPatterns.test.tsx` covering the new single-step flow suppression branch.

### P2 — deferred
- Hosted-proof refresh (Gemini lane) to clear `proof:check` drift — requires paid API budget.
- Node upgrade to v25 to unlock `npm run release:gate` — host-image work.
- Multi-step `common_flows` demo data so the restored `<ol>` gets exercised in the demo classroom.

## Next action items
- Hand back to user for review; await direction on the P1 items or further UI polish.
