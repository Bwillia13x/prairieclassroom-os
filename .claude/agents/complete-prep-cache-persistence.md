# Complete Prep Cache Persistence

## Context
The Prep workspace (DifferentiatePanel + LanguageToolsPanel) now has a "Recent runs" chip row above the result canvas. This work adds two capabilities:

1. **Restore-from-cache**: Clicking a chip rehydrates the full response from sessionStorage without re-running generation.
2. **Server-persisted run history**: The chip row survives page reload and cross-device resume via the orchestrator API.

## What's Already Done
- ✅ Document-level event listener in `App.tsx` for `prairie:open-classroom-switcher` (opens command palette)
- ✅ Extended `useRecentRuns` hook with payload cache (writePayload, readPayload, getPayload, pruneOrphanPayloads, server sync on mount)
- ✅ Shared schema `packages/shared/schemas/run.ts` (RUN_TOOLS, SaveRunRequestSchema, RunRecordSchema, RUN_RETENTION_LIMIT=30)
- ✅ Re-exported run schemas from `packages/shared/schemas/index.ts`
- ✅ SQLite migration `services/memory/migrations/003_runs.sql` (runs table + index)
- ✅ Memory store `saveRun` in `services/memory/store.ts` with sync retention pruning
- ✅ Memory retrieve `getRecentRuns` in `services/memory/retrieve.ts`
- ✅ Orchestrator route `services/orchestrator/routes/runs.ts` (POST :id/runs, GET :id/runs)
- ✅ Mounted runs router in `services/orchestrator/server.ts` under `/api/classrooms`
- ✅ Web API client `fetchRecentRuns` and `saveRun` in `apps/web/src/api.ts`
- ✅ Wired `DifferentiatePanel` to cache payload and restore from cache
- ✅ Wired `LanguageToolsPanel` for simplify + vocab with restore handlers
- ✅ Added tests: `services/memory/__tests__/runs-store.test.ts` and `services/orchestrator/__tests__/runs-route.test.ts`

## Remaining Work
1. **Run the test suite** to confirm new tests pass and nothing regressed:
   ```bash
   npm test
   ```

2. **Manual smoke test** the end-to-end flow:
   - Start orchestrator and web dev servers
   - In DifferentiatePanel, generate a variant
   - Verify chip row appears
   - Reload page
   - Verify chip row persists (server sync)
   - Click chip
   - Verify result rehydrates from cache without re-generation
   - Repeat for LanguageToolsPanel simplify + vocab

3. **Update documentation**:
   - Add a brief entry in `docs/database-schema.md` describing the `runs` table and retention policy
   - If `docs/prompt-contracts.md` has a section on telemetry/evidence, add a note about run history

4. **Check for any lint/type errors**:
   ```bash
   npm run lint
   npm run typecheck
   ```

5. **Verify the classroom-switcher event**:
   - In DifferentiatePanel or LanguageToolsPanel, find the PageIntro "live" Grade badge
   - Ensure it dispatches `document.dispatchEvent(new CustomEvent('prairie:open-classroom-switcher'))` on click
   - If not implemented yet, add that dispatch to the badge click handler

## Notes
- The hook uses sessionStorage as an optimistic cache so the chip row paints immediately
- Server writes are fire-and-forget (silent: true) to keep UI responsive on offline/Ollama-only deployments
- Payloads stay in sessionStorage only; the server persists lightweight metadata only
- Retention is 30 runs per (classroom, tool) pair, enforced synchronously in saveRun

## Success Criteria
- All tests pass
- Manual smoke test confirms cache restore works for differentiate, simplify, and vocab
- Chip row persists across page reload
- Documentation is updated
- No new lint/type errors
