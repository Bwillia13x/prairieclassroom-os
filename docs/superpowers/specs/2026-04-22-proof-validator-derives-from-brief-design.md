# 2026-04-22 Proof Validator Derives From Proof-Brief

## Context

`scripts/lib/hackathon-proof.mjs` exports `HOSTED_PROOF_RUN_DIR` — a hardcoded string of the canonical hosted release-gate artifact. Every hosted proof refresh currently requires a fan-out edit across eight files (README.md, kaggle-writeup, demo-script, gemma-integration-followups, pilot/claims-ledger, proof-brief, hosted-operations, eval-baseline) in lockstep, because `validateProofSurfaces` requires the constant's literal value to appear as a substring in each canonical doc. The file already has a permissive extractor (`extractHostedProofRunDir`) used by `buildGeminiReadycheck`, but the validator does not consume it.

The fan-out is the recurring source of the `proof:check` breakage whenever a refresh misses one doc. The F4 design on 2026-04-22 flagged this with a `TODO(follow-up)` comment at the constant declaration. This spec lands that follow-up.

Non-goal: removing `HOSTED_PROOF_RUN_DIR` entirely. It stays as a fallback seed for `readHostedProofSummary` callers and the existing `ops-scripts.test.ts` shims. Non-goal: moving doc content around; the canonical line in `docs/hackathon-proof-brief.md` already exists (`- **Latest passing hosted gate:** \`output/release-gate/...\``).

## Design

### Validator change (`scripts/lib/hackathon-proof.mjs`)

1. Introduce an internal strict extractor that reads `docs/hackathon-proof-brief.md` from `surfaces` and matches a tolerant pattern:
   ```js
   /Latest passing hosted gate[:*\s]*`(output\/release-gate\/[^`]+)`/i
   ```
   The `[:*\s]*` class tolerates the real doc's `**` bold markers. Must capture a path starting with `output/release-gate/` — otherwise the extraction fails.
2. In `validateProofSurfaces(surfaces)`:
   - First, extract the canonical artifact from the proof-brief using the strict extractor.
   - If the extraction fails (proof-brief missing, line missing, or path doesn't start with `output/release-gate/`), append one issue: `docs/hackathon-proof-brief.md: could not extract canonical hosted artifact — expected a line like "Latest passing hosted gate: \`output/release-gate/...\`"` and return early (`ok: false`).
   - Otherwise, use the extracted value as the required substring in place of `HOSTED_PROOF_RUN_DIR` for every doc in `PROOF_DOC_PATHS` (including the proof-brief itself — a trivial but harmless self-check).
3. Update the `HOSTED_PROOF_RUN_DIR` comment to note the constant is now only a fallback seed for `readHostedProofSummary` callers and existing tests that construct synthetic surfaces; docs derive from the proof-brief.
4. No change to `extractHostedProofRunDir`, `buildGeminiReadycheck`, `readHostedProofSummary`, or their exported contracts. The existing permissive extractor stays in place for readycheck/report callers.

### Test coverage

New file `scripts/lib/__tests__/hackathon-proof.test.mjs` (node:test + node:assert/strict, matching the `proof-status.test.mjs` sibling). Cases:

- **Happy path (derived agreement):** all five canonical surfaces quote the same `output/release-gate/<id>`; proof-brief uses the canonical bolded format; `validateProofSurfaces → { ok: true, issues: [] }`.
- **Drift:** proof-brief bumped to a new artifact; README still has the old one; `ok: false`, issues include `README.md: missing hosted proof artifact path: output/release-gate/<new>`.
- **Missing canonical line:** proof-brief content has no `Latest passing hosted gate:` line; `ok: false`, issues include the `could not extract canonical hosted artifact` message and references `docs/hackathon-proof-brief.md`.
- **Malformed canonical line:** `Latest passing hosted gate:` present but the captured path does not start with `output/release-gate/`; `ok: false`, `could not extract` issue.

### Existing-test adjustment (`services/orchestrator/__tests__/ops-scripts.test.ts`)

`makeConsistentProofSurfaces()` currently emits `Latest passing hosted gate: ${HOSTED_PROOF_RUN_DIR}` without backticks. The strict extractor requires backticks (matches the real doc format). Update the fixture to `- **Latest passing hosted gate:** \`${HOSTED_PROOF_RUN_DIR}\`` so:

- the happy-path test still passes (extractor finds the value),
- the drift test still catches drift (replacing in proof-brief only, other docs diverge — now failing with the SAME `missing hosted proof artifact path` substring that the test asserts).

### Documentation

- `README.md` Release-Gate section: add a one-line note that future hosted refreshes only require editing the `Latest passing hosted gate:` line in `docs/hackathon-proof-brief.md`; all other docs are verified by `proof:check` to share that value.
- `docs/decision-log.md`: add a 2026-04-22 follow-up entry immediately under the existing testing-findings remediation entry, titled like "Proof validator now derives from proof-brief," explaining the refactor and the one-file-edit posture.

## Validation

- `npm run test:scripts` (new node-test file runs here)
- `npm run typecheck`
- `npm run lint`
- `npm run test` (full vitest — confirms `ops-scripts.test.ts` still green with updated fixture)
- `npm run proof:check`
- `npm run system:inventory:check`

## Acceptance

- Strict extractor lives inside `validateProofSurfaces`; no changes to the module's public exports beyond the updated comment on `HOSTED_PROOF_RUN_DIR`.
- `scripts/lib/__tests__/hackathon-proof.test.mjs` covers happy-path, drift, missing-line, and malformed-line cases.
- `ops-scripts.test.ts` fixture updated once, no other assertions touched.
- `proof:check` remains green without touching any canonical doc during this refactor.
- Decision-log entry documents the new posture so future hosted refreshes know to edit one file.
