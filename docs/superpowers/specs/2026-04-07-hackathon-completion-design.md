# Hackathon Completion Plan — PrairieClassroom OS

**Date:** 2026-04-07
**Hackathon:** Gemma 4 Good Hackathon (Kaggle)
**Deadline:** May 18, 2026
**Tracks:** Main Track, Future of Education, Ollama Special Technology
**Constraint:** Zero cost — all development and testing via Ollama (local) and Vercel (free tier)

---

## Summary

Seven workstreams to bring PrairieClassroom OS from a strong internal prototype to a competition-ready submission scoring maximally across Impact & Vision (40pts), Video Pitch (30pts — external), and Technical Depth & Execution (30pts).

The video demo is produced externally. This spec covers all code, infrastructure, and documentation work.

---

## Section 1: Vercel Frontend Deployment

**Goal:** Get the Vite frontend live on a public URL for testing layout, navigation, and responsiveness.

**Changes:**

- Deploy `apps/web/` as a Vercel static site project
- Add `VITE_API_URL` environment variable to `apps/web/src/api.ts`
  - When set: use as API base URL
  - When unset: fall back to relative `/api` paths (current behavior for local dev)
- Frontend runs in demo/offline mode when API is unreachable — renders UI with empty states, form interactions, onboarding overlay
- No backend deployed to Vercel

**Acceptance criteria:**

- [ ] `apps/web/` deployed to Vercel free tier
- [ ] UI loads at public URL without errors
- [ ] All 10 tabs render and navigate correctly
- [ ] Mobile responsive layout works
- [ ] Demo mode (`?demo=true`) loads the classroom selector

---

## Section 2: Ollama Inference Backend

**Goal:** Add Ollama as a fourth inference backend, enabling zero-cost Gemma 4 inference on a local machine.

**Changes to `services/inference/harness.py`:**

- New `OllamaBackend` class implementing the same interface as `MockBackend`, `LocalBackend`, `VertexAIBackend`
- Calls Ollama REST API:
  - Text: `POST http://{OLLAMA_URL}/api/chat` with model name and messages
  - Multimodal: same endpoint with base64 image content
- Dual-tier routing:
  - Live tier: Gemma 4 small model (exact Ollama tag confirmed at implementation time)
  - Planning tier: Gemma 4 large model (exact Ollama tag confirmed at implementation time)
- Thinking mode: passed via Ollama's API parameter for planning-tier requests
- Response flows through existing `extract_json()` pipeline
- `OLLAMA_URL` env var, defaults to `http://localhost:11434`

**Changes to `services/inference/server.py`:**

- New `--mode ollama` flag
- Backend selection: `mock | local | api | ollama`

**New tests:**

- Unit tests for `OllamaBackend` response parsing (mock HTTP responses, test JSON extraction)

**Acceptance criteria:**

- [ ] `python server.py --mode ollama --port 3200` starts successfully
- [ ] Live-tier requests route to small model
- [ ] Planning-tier requests route to large model with thinking enabled
- [ ] `extract_json()` handles Ollama's response format
- [ ] Smoke test (`scripts/smoke-api.mjs`) passes against Ollama backend

---

## Section 3: Gemma 4 Migration

**Goal:** Replace all Gemma 3 references with Gemma 4 and validate prompt contracts against real Gemma 4 output.

**Code sweep — replace Gemma 3 references:**

- `services/inference/harness.py` — MODEL_MAP values
- `scripts/provision-vertex-endpoints.mjs` — model resource names (for future cloud use)
- `README.md` — architecture diagram, endpoint references, model names
- `docs/architecture.md` — model tier references
- `docs/prompt-contracts.md` — model tier table
- `docs/eval-baseline.md` — clear Gemma 3 baseline, prepare for Gemma 4 results
- `docs/kaggle-writeup.md` — all model references
- Any other files referencing `gemma-3` or `gemma3`

**Prompt contract validation:**

- Run all 64 evals against Gemma 4 via Ollama
- Document new baseline in `eval-baseline.md`
- Tune prompt contracts for any failures caused by Gemma 4's output style differences
- Safety evals (8 cases) must all pass — non-negotiable bar

**Acceptance criteria:**

- [ ] `grep -r "gemma.3" --include="*.ts" --include="*.py" --include="*.md" --include="*.mjs"` returns zero results (excluding git history and node_modules)
- [ ] All 64 evals run against Gemma 4 via Ollama
- [ ] Results documented in `eval-baseline.md`
- [ ] 0 safety failures
- [ ] Any prompt tuning changes documented in `docs/decision-log.md`

---

## Section 4: Multimodal Worksheet Input

**Goal:** Add image input to the Differentiate workflow using Gemma 4's vision capability. This is the feature that proves Gemma 4 is not interchangeable with Gemma 3.

**Architecture — two-step:**

1. **Extract:** Image → Gemma 4 vision → extracted text (new)
2. **Differentiate:** Extracted text → existing differentiation prompt → 5 variants (unchanged)

The teacher sees extracted text and can edit before generating variants. Human-in-the-loop preserved.

**Backend changes:**

- New prompt class: `extract_worksheet`
  - Model tier: live
  - Thinking: off
  - Retrieval: none
  - Output schema: `{ extracted_text: string, confidence_notes: string[] }`
- New Zod schemas in `packages/shared/schemas/`:
  - `ExtractWorksheetRequest` — `{ image_base64: string, mime_type: string }`
  - `ExtractWorksheetResponse` — `{ extracted_text: string, confidence_notes: string[] }`
- New route: `POST /api/extract-worksheet`
  - Accepts multipart form with image file
  - Converts to base64, sends to inference with image content
  - Returns extracted text
- `OllamaBackend` sends image via Ollama's multimodal chat API (base64 in message content)
- Add to routing table in `router.ts`

**Frontend changes:**

- Differentiate panel (`DifferentiatePanel.tsx` or equivalent):
  - "Upload photo" button alongside existing text paste area
  - File input accepts JPEG, PNG, HEIC
  - On upload: show image preview thumbnail
  - Call `/api/extract-worksheet`
  - Display extracted text in the existing text area (editable)
  - Teacher clicks "Generate 5 variants" as before — rest of flow unchanged
- New component: `WorksheetUpload.tsx` — file input, preview, extraction loading state

**Prompt contract:**

- System prompt: "You are a worksheet text extractor. Given an image of a classroom worksheet, extract all text content preserving the structure (questions, instructions, answer blanks). Output as JSON."
- No retrieval, no memory, no safety-sensitive content (worksheet content, not student data)

**Acceptance criteria:**

- [ ] Teacher can upload a worksheet photo in the Differentiate tab
- [ ] Extracted text appears in the text area, editable
- [ ] Generating variants from extracted text works identically to typed text
- [ ] 2-3 eval cases pass: schema validation, content quality, safety

---

## Section 5: Fix Remaining Eval Failures + New Eval Cases

**Two existing failures:**

1. **`diff-005-safety-boundaries`** — parse failure from mixed-encoding JSON
   - Fix: add single-retry on parse failure in the orchestrator inference call path
   - Location: the shared inference-calling function in the orchestrator (or inline in the differentiate route)

2. **`surv-004-comprehensive-retrieval`** — survival packet doesn't reference follow-up context
   - Fix: strengthen survival packet system prompt — add explicit instruction: "Reference recent intervention follow-ups and pending family communications from the provided context"
   - Location: survival packet prompt builder

**New eval cases:**

- `extract-001-schema`: extract_worksheet returns valid `{ extracted_text, confidence_notes }`
- `extract-002-content-quality`: extracted text contains key content from a known test worksheet image
- `extract-003-safety`: no forbidden terms in extraction output

**Acceptance criteria:**

- [ ] `diff-005-safety-boundaries` passes
- [ ] `surv-004-comprehensive-retrieval` passes
- [ ] 3 new extract_worksheet eval cases pass
- [ ] Total eval count: 67+
- [ ] 0 safety failures across full suite

---

## Section 6: Submission Artifacts

**Kaggle writeup rewrite:**

- Rewrite `docs/kaggle-writeup.md` to ≤1,500 words
- Structure:
  - Problem (200w): Mrs. Okafor's classroom, coordination tax
  - Product (300w): 8 workflows, closed feedback loop, two users served
  - Architecture + Gemma 4 Story (400w): dual-tier Ollama routing, multimodal vision, thinking mode, local-first SQLite
  - Safety (200w): observational language, forbidden terms, approval gates
  - Evaluation (200w): 67+ evals, zero safety failures, Gemma 4 baseline
  - Closing (200w): local-first, runs on a laptop, no cloud dependency
- All metrics updated to actuals
- Multimodal and Ollama stories prominent

**Private GitHub repo:**

- Push to a private GitHub repo
- Scrub secrets from tracked files: `.env`, GCP project IDs, endpoint URIs in `eval-baseline.md`
- Add LICENSE file (Apache 2.0)
- Verify README install instructions work from clean clone (including Ollama setup)
- Flip to public before submission deadline

**Media gallery:**

- Cover image: screenshot of full UI with demo classroom loaded
- Architecture diagram: render ASCII diagram as clean image (SVG or PNG)
- Closed-loop diagram: interventions → patterns → plans → briefings
- 2-3 workflow screenshots: differentiate (with photo upload), tomorrow plan, family message approval gate

**Video shot list:**

- Write `docs/video-shot-list.md` — condensed 3-minute script
- Structure:
  - Problem hook (30s): Alberta classroom complexity
  - Photo upload + differentiate (40s): teacher photographs worksheet → 5 variants
  - Log intervention + patterns (40s): Brody's milestone → pattern detection
  - Tomorrow plan (30s): pattern-informed, specific EA actions
  - Family message approval gate (20s): no autonomous messaging
  - Closing (20s): runs on Ollama, local-first, safety-first
- Show Ollama terminal briefly during demo (3s flash proving local inference)

**Acceptance criteria:**

- [ ] Writeup ≤1,500 words with accurate metrics
- [ ] Private repo on GitHub with clean history
- [ ] 4+ media gallery images prepared
- [ ] Video shot list written and timed to ≤3 minutes

---

## Section 7: Ollama Track Positioning

No additional code. Documentation and presentation work folded into Sections 2, 3, and 6.

**Checklist:**

- [ ] Writeup includes "Local-First Architecture" section naming Ollama explicitly
- [ ] README quick-start shows: `ollama pull` → three terminals → working system
- [ ] Writeup explains dual-tier routing through Ollama (small model for live, large for planning)
- [ ] Video shot list includes 3-second terminal flash showing Ollama process

---

## Dependency Graph

```
Section 1 (Vercel)          Section 4 (Multimodal)
    │ (independent)              │ (independent until integration)
    ▼                            ▼
Section 2 (Ollama Backend) ──► Section 3 (Gemma 4 Migration)
                                    │
                                    ▼
                              Section 5 (Eval Fixes)
                                    │
                                    ▼
                              Section 6 (Artifacts)
                                    │
                              Section 7 (Ollama Track — folded in)
```

Sections 1, 2, and 4 can be worked in parallel.
Section 3 requires Section 2 (need Ollama backend to validate prompts against Gemma 4).
Section 5 requires Section 3 (need Gemma 4 baseline before fixing failures).
Section 6 comes last (needs final metrics and screenshots).

---

## Out of Scope

- GPU instances or cloud inference costs
- Video production (handled externally)
- Real teacher user testing
- Additional workflows beyond the existing 8 + multimodal extract
- Semantic/embedding retrieval (SQL retrieval is sufficient and architecturally justified)
- Tool calling execution (spec-only is fine — the writeup doesn't claim it works)
- Frontend refactoring beyond the multimodal upload addition
