# Local Release-Ready Memo

- **Memo date:** 2026-05-05; proof pointers refreshed 2026-05-12
- **Scope:** Local repo, proof, and submission-package readiness for the Gemma 4 competition submission.
- **Current HEAD inspected:** `1208fd11c7b1db4c0ca9905a42f4764c9d989c6c`
- **Working-tree state:** dirty; this memo records the current local candidate, not a committed or published release.
- **Primary checklist:** [../hackathon-submission-checklist.md](../hackathon-submission-checklist.md)
- **Copy guardrails:** [../submission-copy-pack.md](../submission-copy-pack.md)

## Verdict

**LOCAL-READY / EXTERNAL-INCOMPLETE.**

The current repo state is strong enough for local handoff into the final competition packaging lane: mock structure, hosted Gemma 4 proof, browser smoke, claims checks, inventory, and evidence docs are aligned to the refreshed 2026-05-11 local mock gate plus the 2026-05-03 hosted Gemma proof artifact set. The May 8 hosted refresh remains a blocker artifact, not a new passing hosted baseline.

This memo does **not** mark the competition submission complete. The public Vercel synthetic demo is now deployed and smoked, but the public video, teacher-session artifact, media gallery, Kaggle submission, and hosted-Gemma public backend still require external actions and should remain outside any local completion claim until performed and verified.

## Objective Mapped To Evidence

| Requirement | Current evidence | Verdict |
| --- | --- | --- |
| App is real and route-complete | `npm run system:inventory:check` reports 12 panels, 13 prompt classes, 53 API endpoints, 134 eval cases | Green |
| Mock structural gate passes | `output/release-gate/2026-05-11T22-53-32-342Z-87696/summary.json` has `status: "passed"` and `inference_mode: "mock"` | Green |
| Last passing hosted Gemma 4 proof exists | `output/release-gate/2026-05-03T17-59-42-981Z-80702/summary.json` has `status: "passed"` and `inference_mode: "gemini"` | Green |
| Hosted proof uses Gemma 4 models | Hosted summary lists `gemma-4-26b-a4b-it` for live tier and `gemma-4-31b-it` for planning tier | Green |
| Last passing hosted eval suite passes | `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-summary.json` records 13 total cases, 13 passed, 0 failed, 134 available cases | Green |
| Current May 8 hosted refresh | `output/release-gate/2026-05-08T22-47-12-031Z-43430/summary.json` has `status: "failed"` at `75-gemini-evals`; `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json` records the latest completed May 8 eval summary at 12/13 | Yellow |
| Unit and contract coverage are current | Latest mock-gate logs record 191 Vitest files, 2,086 Vitest tests, and 76 Python tests passed | Green |
| Browser workflow smoke passes | `output/release-gate/2026-05-11T22-53-32-342Z-87696/90-smoke-browser.log` records `PASS browser smoke` | Green |
| Demo fixture remains valid | `npm run pilot:reset` restored the canonical demo DB after UI evidence capture, and `npm run demo:fixture:check` passed with 36 interventions, 3 plans, 1 pattern report, 1 family message, 5 sessions, and zero generated variants/runs | Green |
| Claims are internally consistent | `npm run claims:check` passed after the latest docs changes | Green |
| Proof docs are internally consistent | `npm run proof:check` passed after the latest docs changes | Green |
| Eval inventory is generated from cases | `npm run eval:inventory:check` passed after regenerating `docs/eval-inventory.md` from 134 JSON case files | Green |
| Evidence docs are current and guarded | `npm run evidence:generate` regenerated `docs/evidence/` on 2026-05-03 after UI capture and demo reset; session-patterns says QA/demo sessions are not teacher-adoption evidence | Green |
| UI media evidence is refreshed | `PRAIRIE_WEB_BASE=http://127.0.0.1:5173 npm run ui:evidence` produced 29 screenshots at `output/playwright/ui-evidence/2026-05-03T22-25-59-189Z` | Green |
| Public claim copy avoids overclaiming | `docs/submission-copy-pack.md` warns against real teacher validation, local Ollama proof, no-cloud, and measured-outcome claims without new artifacts | Green |
| Public live demo exists | `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34` is deployed and `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo` passes using the static demo fallback | Green |
| Public repo is verified | Public clone test passed on 2026-05-11 against `https://github.com/Bwillia13x/prairieclassroom-os`; latest verified pushed `main` was `1208fd11c7b1db4c0ca9905a42f4764c9d989c6c` | Green |
| Public video URL exists | Local MP4 QA passed, but YouTube/public video URL is still pending | Red |
| Teacher validation is documented | Checklist still requires a teacher session, quote, anonymized notes, and claims-ledger update | Red |
| Local Ollama privacy-first proof exists | `ops:status` reports `ollama: none recorded`; host preflight is `ollama_unavailable` | Yellow |
| Kaggle entry is submitted | Checklist still requires conversion from draft to submitted entry | Red |

## Artifact Anchors

- Mock release gate: `output/release-gate/2026-05-11T22-53-32-342Z-87696`
- Current May 8 hosted refresh: `output/release-gate/2026-05-08T22-47-12-031Z-43430`
- Latest completed May 8 hosted eval summary: `output/evals/2026-05-08-gemini/2026-05-08T21-48-03-113Z-23553-gemini-summary.json`
- Last passing hosted Gemma 4 release gate: `output/release-gate/2026-05-03T17-59-42-981Z-80702`
- Last passing hosted eval summary: `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-summary.json`
- Hosted eval failure ledger: `output/evals/2026-05-03-gemini/2026-05-03T17-59-42-981Z-80702-gemini-failure-summary.json`
- Live proof status: [../live-model-proof-status.md](../live-model-proof-status.md)
- Judge proof brief: [../hackathon-proof-brief.md](../hackathon-proof-brief.md)
- Submission checklist: [../hackathon-submission-checklist.md](../hackathon-submission-checklist.md)
- Kaggle writeup: [../kaggle-writeup.md](../kaggle-writeup.md)
- Copy pack: [../submission-copy-pack.md](../submission-copy-pack.md)

## Latest Verification Commands

Commands recently run against this local candidate:

```bash
npm run release:gate
npm run release:gate:gemini
npm run build -w apps/web
PRAIRIE_WEB_BASE=http://127.0.0.1:4173 npm run smoke:browser
npm run lint
npm run typecheck
npm run test
npm run test:scripts
npm run proof:check
npm run claims:check
npm run system:inventory:check
npm run eval:inventory:check
npm run demo:fixture:check
npm run check:contrast
npm run ops:status
PRAIRIE_WEB_BASE=http://127.0.0.1:5173 npm run ui:evidence
npm run pilot:reset
npm run evidence:generate
git diff --check
```

The latest direct checks after the final docs/evidence polish were:

- `npm run claims:check` - passed
- `npm run proof:check` - passed
- `npm run eval:inventory:check` - passed
- `npm run test:scripts` - passed, 57 tests
- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm run test` - passed in the latest mock gate, 191 files / 2,086 tests
- `PRAIRIE_PYTHON=$PWD/services/inference/.venv311/bin/python npm run test:python` - passed in the latest mock gate, 76 tests
- `PRAIRIE_PYTHON=$PWD/services/inference/.venv311/bin/python npm run release:gate` - passed; latest mock artifact `output/release-gate/2026-05-11T22-53-32-342Z-87696`
- `npm run ops:status` - inventory/proof status aligned
- `npm run evidence:generate` - passed; system reliability now covers 25,679 requests across 9 log files and session patterns reflects the reset demo DB
- `PRAIRIE_WEB_BASE=http://127.0.0.1:5173 npm run ui:evidence` - passed, 29 screenshots
- `npm run pilot:reset` - passed; reset artifact `output/pilot/2026-05-03T22-28-20-977Z-pilot-reset-demo-okafor-grade34.json`
- `npm run demo:fixture:check` - passed after reset
- `npm run submission:final-check -- --skip-release-gate` - correctly failed on unresolved public-link placeholders
- `npm run submission:final-check -- --skip-release-gate --skip-publication-check` - passed the local-only gate
- `git diff --check` - passed

## Remaining External Lane

The next operator actions are not code polish tasks:

1. Create the public backend/frontend deployment and set required hosting secrets.
2. Smoke `/?demo=true` from an external network and cellular.
3. Finalize and publish the video link.
4. Attach the media gallery assets.
5. Conduct or explicitly waive the teacher quote/session lane.
6. Submit the Kaggle entry and verify submitted state.

`npm run submission:final-check` now enforces the public-link placeholder check by default. Use `--skip-publication-check` only when intentionally running a local-only gate before the external links exist.

Until those are complete, the correct status is **local release-ready, competition submission incomplete**.

## Claim Boundary

This candidate may claim:

- Working Gemma 4 hosted proof on synthetic/demo data.
- 12 teacher-facing workflow tools and 13 model-routed prompt classes.
- Mock structural gate and browser smoke passing.
- Current eval/test/inventory counts listed above.
- Privacy-first local deployment path implemented but not proven on this host.

This candidate must not claim:

- Real teacher or EA validation.
- Measured classroom outcomes.
- Public live-demo availability.
- Public repository verification.
- Public video availability.
- Passing Ollama proof on the current maintenance host.
- No-cloud operation unless a real offline run is captured and linked.

## Sign-Off Boundary

This memo is a local engineering handoff, not final competition sign-off. It exists to prevent a polished local build from being confused with a fully submitted public entry.
