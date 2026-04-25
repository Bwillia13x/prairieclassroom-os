# Gemma Integration — Followups After 2026-04-17 P0+P1+P2+P3+P4+P5 Bundles

This file tracks the audit recommendations from the 2026-04-17 Gemma
integration review that were **not** landed in the bundles below. Each item
is self-contained and bounded — pick any one independently.

## Shipped 2026-04-17 — P0 bundle

- **Token-cost capture** end-to-end (Gemini `usage_metadata` + Ollama
  `prompt_eval_count`/`eval_count` → harness → Flask `/generate` →
  `InferenceResult` → `RequestContextState` → `output/request-logs/*.jsonl`).
- **Daily cost rollup** at `npm run cost:rollup` — aggregates
  `output/request-logs/*.jsonl` into `output/cost-rollups/*-rollup.json` with
  by-provider, by-prompt-class, by-model breakdowns and ceiling-priced USD
  estimates.
- **Structured-output mode** for Gemini (`response_mime_type:
  "application/json"`) and Ollama (`format: "json"`).
- **Model + latency + tokens UI chip** via
  `apps/web/src/components/buildModelMetaItems.ts`.
- **6 of 13 routes** initially carrying `inferenceResponseMeta(...)`.

## Shipped 2026-04-17 — P1 bundle (F1 + F4 + F9)

- **F1 closed**: All 13 model-routed routes now spread
  `inferenceResponseMeta(...)` and carry token counts in their response
  payloads (added: intervention, language-tools simplify + vocab, support-
  patterns, scaffold-decay, ea-load, survival-packet). Web `Response`
  interfaces extended with optional `prompt_tokens`/`output_tokens`/
  `total_tokens`. Sub-component panels with model-meta chips now total **8**:
  DifferentiatePanel, EABriefingResult, PlanViewer, MessageDraft,
  ForecastViewer, PatternReportResult, InterventionCard, SurvivalPacket.
  *Remaining web gap:* `SimplifiedViewer` and `VocabCardGrid` don't render an
  `OutputMetaRow` at all today. Either add one, or leave them as-is — they're
  still telemetry-complete via the request log.
- **F4 closed**: `services/orchestrator/cost-budget.ts` enforces the
  `$20`/day daily cap. Pre-flight check inside `callInference()` refuses
  with 429 + `category: "cost_budget"` + `detail_code: "daily_budget_exceeded"`
  once today's spend reaches the cap. Post-flight `recordCallSpend()`
  accumulates per-call USD into `output/cost-budget/today.json` (UTC date
  rotated, restart-safe). `npm run cost:status` prints today's spend vs.
  budget headroom. Mock and Ollama lanes price to $0 so the gate effectively
  only constrains the hosted Gemini path. Set `PRAIRIE_DAILY_BUDGET_USD=0`
  to disable enforcement. 17 unit tests + 4 integration tests.
- **F9 closed**: `extract-001-schema` added to
  `evals/suites/hosted-gemini-proof.txt`. The hosted lane now exercises the
  multimodal `inline_data` path through Gemini; was previously unproven.

## Shipped 2026-04-17 — P2 bundle (F6 + F10 + F12)

- **F6 closed**: `?fast=true` query param on any model-routed POST overrides
  `route.thinking_enabled` to `false` for that single call. Implemented in
  `services/orchestrator/inference-client.ts::readFastModeOverride`. Aliases
  `1` / `true` / `yes` / `on` (case-insensitive). 5 unit tests cover the
  default-on behavior, the override, the live-route no-op, the truthy
  aliases, and that unrelated values keep the route default. Honors the
  gemma-routing skill's "thinking is opt-in" rule per call.
- **F10 closed**: `npm run eval:regression --lane <lane>` diffs the latest
  two `output/evals/*-summary.json` files for a lane and flags pass-rate
  drops, newly-failing case IDs, and dropped models. Pure-diff helpers in
  `scripts/lib/eval-regression-diff.mjs`; CLI in
  `scripts/eval-regression.mjs`. 11 unit tests, exit code 0/1/2 (OK /
  regression / IO error). Smoke-validated against existing
  `output/evals/2026-04-09-gemini/*-summary.json` artifacts.
- **F12 closed**: `MessageApprovalDialog` renders the AI draft in an
  **editable textarea**, not a static `<p>`. The teacher's edits flow
  through `onConfirm(editedText: string)` to
  `FamilyMessagePanel::handleDialogConfirm`, which copies the edited text
  to the clipboard. An "Edited" badge appears in the meta row when the
  textarea diverges from the AI draft. Edits reset on draft identity
  change but persist across same-draft cancel/reopen. **Edited text is
  NOT yet persisted to memory** — the clipboard is the source of truth
  since the teacher pastes manually into Gmail/SMS. Persistence to the
  `family_messages` table is tracked as F12.5 below. 9 dialog tests,
  browser-verified end-to-end.

## Shipped 2026-04-17 — P3 bundle (F10.5 + F14 + F12.5)

- **F10.5 closed**: `npm run eval:regression` now also compares per-endpoint
  P95 latency between the two latest `*-results.json` files for a lane.
  Default growth threshold 20%. Endpoints with <2 passing samples are
  excluded so a single slow run can't trigger a false positive. Failed
  cases are excluded from the latency distribution (502/timeout rejects
  return fast and would skew the P95 downward).
  Implementation in `scripts/lib/eval-regression-diff.mjs::p95LatencyByEndpoint`
  + `diffLatency`. 11 new tests. Smoke-validated against historical
  hosted-gemini runs — caught real regressions: `POST /api/tomorrow-plan
  P95 +29.3%` and `POST /api/family-message P95 +42.2%`.
- **F14 closed**: `npm run feedback:harvest` walks all per-classroom SQLite
  DBs in `data/memory/`, queries low-rated feedback rows, and writes one
  draft eval candidate file per row to `evals/cases/_pending/`. Each draft
  case captures the full feedback `_source` block (id, generation_id,
  classroom, panel, rating, comment, created_at) and a hint pointing the
  operator at the matching `output/request-logs/` file for prompt recovery.
  `input` and `expected` are `_TODO` stubs the operator fills in before
  promotion. Idempotent (skips files that already exist). Categorizes via
  comment-content heuristic: safety/diagnosis → `safety_correctness`,
  slow/timeout → `latency_suitability`, else `content_quality`. Backed by
  new `getLowRatedFeedback` helper in `services/memory/store.ts`. 14 unit
  tests on the helpers + dry-run smoke test verified on a fresh memory dir.
- **F12.5 closed**: Family-message edits now persist server-side. Schema
  extends `FamilyMessageDraftSchema` with optional `edited_text`.
  `ApproveMessageRequestSchema` accepts an optional `edited_text` field.
  `approveFamilyMessage(classroomId, draftId, editedText?)` uses SQLite
  `json_set(message_json, '$.edited_text', ?)` so the AI draft and the
  teacher's edits coexist in the same row (immutable audit trail).
  `apps/web/src/api.ts::approveFamilyMessage` accepts `editedText?` and
  only sends the field when the dialog's textarea actually diverged from
  the AI draft (verbatim approvals stay clean). `MessageDraft.tsx` prefers
  `edited_text` over `plain_language_text` for display with an "Edited by
  teacher" tag. 8 round-trip store tests cover verbatim approval,
  edited approval, JSON-special chars, re-edit overwrite, and the F14
  helper. The dialog's onConfirm path (F12) and the persistence path
  (F12.5) now together fulfill CLAUDE.md's "human-in-the-loop = editable"
  guarantee end-to-end.

## Shipped 2026-04-17 — P4 bundle (F2 coherent slice)

- **F2.0 closed for local orchestration:** The `tool_call_capable` flag is now
  operational for both declared routes. `callInference()` discovers route-
  scoped tools, sends `tools[]` in the Flask `/generate` body, executes model-
  emitted tool calls in TypeScript, and performs one follow-up generation for
  final schema JSON. Cumulative latency and token counts include both model
  turns.
- **Concrete local tools landed:**
  - `lookup_curriculum_outcome(grade, subject, keyword)` for
    `differentiate_material`, backed by `curriculum-registry.ts` and the local
    Alberta K-6 catalog.
  - `query_intervention_history(student_ref, days, limit)` for
    `prepare_tomorrow_plan`, backed by the active classroom SQLite memory.
- **Backend tool-definition plumbing:** Gemini API receives
  `tools=[{function_declarations:[...]}]`; Ollama receives OpenAI-style
  `tools` on `/api/chat`; Vertex endpoint payloads receive OpenAI-style
  `tools` plus `tool_choice: "auto"`. All three backend paths now extract
  returned function/tool calls into `GenerationResponse.tool_calls`.
- **Mock/eval coverage:** `MockBackend` now emits a route-appropriate tool call
  on the first tool-capable turn and the normal fixture after tool results.
  Added `evals/cases/diff-015-tool-calling-curriculum.json` plus unit coverage
  for the registry, multi-turn orchestration, Gemini/Ollama/Vertex payload
  forwarding, and provider-style tool-call extraction.
- **Honest remaining F2.x scope:** F2.0 proved the orchestration loop; P5 below
  makes provider history native. The only remaining F2 proof gap is a hosted
  Gemini run with credentials enabled.

## Shipped 2026-04-17 — P5 bundle (F2.1 native history)

- **F2.1 closed for provider-native follow-up history:** The orchestrator now
  sends executed tool calls as `tool_interactions[]` on the second `/generate`
  request instead of stuffing tool results into prompt text. The old bounded
  `TOOL RESULTS` block is retained only in `debug_prompt_body` so request logs
  remain auditable.
- **Provider translations landed:**
  - Gemini API: `tool_interactions[]` become a `model` turn with
    `function_call` parts followed by a `user` turn with matching
    `function_response` parts.
  - Ollama: `tool_interactions[]` become an assistant `tool_calls` message plus
    `role: "tool"` messages with `tool_name`, compact JSON content, and the
    call id when available.
  - Vertex/OpenAI-compatible endpoint: `tool_interactions[]` become OpenAI-style
    assistant `tool_calls` plus `role: "tool"` result messages.
- **Hosted proof suite prepared:** `diff-015-tool-calling-curriculum` is now in
  `evals/suites/hosted-gemini-proof.txt`. Live hosted validation was not run in
  the 2026-04-18 implementation session because `npm run gemini:readycheck`
  reported a missing Gemini API key and disabled hosted-run guard, but a later
 hosted rerun passed with the supplied AI Studio key at
  `output/release-gate/2026-04-25T17-52-51-834Z-9428` with a matching `12/12`
  eval summary under `output/evals/2026-04-25-gemini/`.

## Shipped 2026-04-18 — F3 bundle (real SSE streaming)

- **F3.0 closed for planning-call SSE:** The Python inference service now
  exposes `/generate/stream`. Gemini uses
  `client.models.generate_content_stream(...)`; Ollama sends `stream: true`
  to `/api/chat` and iterates NDJSON; mock/local/Vertex-compatible modes fall
  back to a full-response stream so the API contract is stable across modes.
- **Orchestrator streaming proxy landed:** Planning-route stream variants now
  exist for Tomorrow Plan, Complexity Forecast, EA Load, Survival Packet, and
  Support Patterns. The browser first makes an authenticated `POST /stream`
  request, receives a short-lived opaque stream id, then attaches to `GET
  /stream/:streamId/events` with native `EventSource`. Classroom access codes
  stay in headers on the POST path and are not placed in URLs. The orchestrator
  forwards provider chunks/thinking updates over SSE, assembles the final JSON
  server-side, and persists only the final validated object.
- **Web reducer path is real now:** `useStreamingRequest` no longer emits
  canned thinking messages. Real SSE chunks drive `STREAM_PROGRESS`; provider
  thinking/tool notices drive `STREAM_THINKING_CHUNK`; final parsed payloads
  still end through the existing `STREAM_COMPLETE` reducer surface.
- **Validation:** Focused Vitest coverage exercises the inference SSE parser,
  tool-turn streaming, the web EventSource adapter, and the streaming hook.
  Python backend tests cover Gemini and Ollama stream assembly.

## Still deferred — Followups, by priority

### F2.2 — Hosted Gemma tool-calling proof (P0 cleanup)

F2.0/F2.1 now forward tools, execute local JS tools, and send provider-native
tool result history on the follow-up turn. The remaining proof gap is hosted
Gemma validation:

1. Ensure `PRAIRIE_GEMINI_API_KEY` or `GEMINI_API_KEY` is set.
2. Enable the hosted-run guard with `PRAIRIE_ENABLE_GEMINI_RUNS=true`.
3. Run `npm run cost:status` and confirm budget headroom.
4. Run the hosted proof lane that includes `diff-015-tool-calling-curriculum`.
5. Confirm the request log shows `lookup_curriculum_outcome` executed and final
   JSON remained schema-valid.

Do not run the hosted proof until `npm run cost:status` confirms budget
headroom.

### F3.x — Remaining streaming hardening

The F3.0 slice intentionally covered the long synchronous planning-call wait
surfaces that use `useStreamingRequest`: Tomorrow Plan, Complexity Forecast,
EA Load, Survival Packet, and Support Patterns. Remaining bounded work:

1. **F3.1 — Scaffold decay streaming route/UI.** Add the same `/stream` +
   `/stream/:streamId/events` pattern for `detect_scaffold_decay` if/when that
   route gets a first-class long-wait UI surface.
2. **F3.2 — Non-planning emulation cleanup.** `useEmulatedStreaming` still
   powers shorter live-tier panels such as Differentiate and Language Tools.
   Replace only if the product wants every generation to expose provider
   chunks, not just the long planning tier.
3. **F3.3 — Hosted/local live proof.** Run the browser flow against real
   Gemini and Ollama streaming hosts after credentials/model availability are
   confirmed and budget checks pass. Unit tests prove protocol assembly; they
   do not prove provider-specific hosted latency or disconnect behavior.
4. **F3.4 — Provider cancellation proof.** EventSource close now aborts the
   orchestrator fetch; add live proof that upstream Gemini/Ollama work stops
   promptly on client disconnect before claiming end-to-end cancellation.

### F5 — 3-tier model selection (P2 from audit)

Today's `live` / `planning` split lumps `prepare_tomorrow_plan` (sized
correctly at 27b) with `generate_survival_packet` (could justify 31b on
hosted) and the lighter planning calls.

Plan:

1. Add a `synthesis` tier to `services/orchestrator/types.ts`'s `ModelTier`.
2. Per-class assignment:
   - `synthesis`: `generate_survival_packet`, `forecast_complexity`,
     `detect_support_patterns` — heaviest synthesis calls.
   - `planning`: `prepare_tomorrow_plan`, `detect_scaffold_decay`,
     `balance_ea_load` — multi-section JSON, but lighter context.
   - `live`: unchanged.
3. Each backend's `_model_for_tier` gains a third branch. Defaults:
   - Hosted Gemini: `synthesis = gemma-4-31b-it`, `planning =
     gemma-4-26b-a4b-it`.
   - Ollama: needs a third model pulled (e.g. `gemma4:12b` or another tag).
   - Vertex: third endpoint env var pair.

Product call: which classes earn `synthesis` is a cost/quality tradeoff that
should be A/B-tested with the eval harness before defaults are locked in.

### F7 — Fallback chain (P2 from audit)

Today, Gemini error → request fails. No degraded-mode fallback.

Plan: optional `fallback_tier?: "mock" | "live"` per route. On inference
failure (after retries), retry once with the fallback. Mark the response with
`model_id: "mock-fallback"` so the UI chip + request-log can flag it.

Product call: which classes can degrade safely? `simplify_for_student` and
`generate_vocab_cards` are good candidates; `draft_family_message` should
**not** silently fall back (human-in-the-loop sensitivity).

### F8 — Semantic memory retrieval (P2 from audit)

`services/memory/retrieve.ts` returns the last-N records by `created_at DESC`.
For long-running classrooms, the prompt context will overflow with stale data
before the relevant intervention is reached.

Plan: add an embedding column to the `interventions` table (and the other
memory tables that feed retrieval); compute embeddings via `text-embedding-004`
(Gemini) or `nomic-embed-text` (Ollama) on write; cosine-rank to top-K
relevance during retrieval. Falls back to recency when embeddings are absent.

Eval impact: every `detect_support_patterns` and `prepare_tomorrow_plan` case
should re-baseline. Don't ship without the rebaseline.

### F11 — Multimodal pipeline cleanup (P3 from audit)

Today `routes/extract-worksheet.ts` writes base64 → tmpfile → harness re-reads
→ backend re-base64-encodes for HTTP. Two encode/decode round-trips per
worksheet. Also: PDFs unsupported (only one image).

Plan: stream image bytes through the inference HTTP body (multipart) instead
of staging to tmpdir; add PDF support via per-page split → multi-image
content array.

### F12.6 — Editable simplified_student_text in approval dialog (P3 followup)

P2/P12.5 only made the main `plain_language_text` editable in the approval
dialog. The `simplified_student_text` (translation/EAL-friendly version)
is still rendered in a static `<p>`. Same pattern as F12: textarea bound
to local state, plumbed via a second optional arg to `onConfirm`, and a
new `edited_simplified_text` field on the schema. Apply only if the team
hears teacher feedback that the student version also needs editing. ~2 hrs.

### F13 — Output caching (P3 from audit)

Same `(classroom_id, prompt_class, sha256(prompt))` triggers a fresh Gemma
call on every panel revisit. Add SQLite cache table keyed on prompt hash with
30-min TTL; opt-out header for evals.

### F14.5 — Auto-attach prompt+response to harvested feedback (P3 followup)

Today's `feedback:harvest` writes a draft case skeleton with `_TODO` stubs
for `input` and `expected`. The operator must hand-grep the request log
to find the original prompt body. Closing this gap requires either:
(a) joining the feedback row's `generation_id` against the JSONL request
log at harvest time and pre-filling `input`, or
(b) recording the request body inside the feedback DB at submit time.

Option (a) is non-invasive — just enrich the harvest script with a
`output/request-logs/*.jsonl` reader that matches by generation_id and
classroom + same-day date window. ~2 hrs.

---

## Validation checklist for any followup

- `npm run typecheck` — passes
- `npm run test` — passes (1891+ vitest)
- `npm run test:python` — passes (69+ pytest)
- For new routes: `npm run release:gate` (mock) before merge
- For backend behavior changes: targeted eval case before merge
