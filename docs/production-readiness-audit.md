# Production Readiness Audit Plan

**Author:** maintainer
**Plan date:** 2026-04-24
**Target verdict date:** (set when sign-off phase starts)
**Scope:** Orchestrate a single, evidence-backed audit pass that takes PrairieClassroom OS from "production-hardened" to "confidently pilot-ready" across every dimension the system actually exposes.

This plan is an orchestrator. It does **not** restate the mechanics that already live in [release-checklist.md](release-checklist.md), [pilot-readiness.md](pilot-readiness.md), [safety-governance.md](safety-governance.md), [eval-baseline.md](eval-baseline.md), or [development-gaps.md](development-gaps.md). It sequences them, names the evidence each phase must produce, and defines an explicit sign-off bar.

---

## 1. Purpose

Move the repo from its current state — mock gate passing, hosted Gemini proof lane passing on synthetic data, Ollama lane structurally blocked on the maintenance host, 12 real-data pilot blockers in flight — to a defensible, artifact-backed statement of readiness for each supported operating mode:

- `demo` + `synthetic-proof`: fully trusted
- `local-pilot-rehearsal`: ready on a clean target host
- `local-pilot-real-data`: gated strictly by the human-process blockers named in [pilot-readiness.md](pilot-readiness.md)
- `hosted-real-data`: remains prohibited by product design

The audit's job is to eliminate **code, config, doc, and evidence** risk so the only remaining real-data blockers are the human-process ones the project is intentionally not claiming to have closed (G-06: human validation; G-14 remaining items).

---

## 2. Non-Goals

This plan deliberately does **not**:

- Claim real-classroom validation on the back of synthetic artifacts.
- Unlock hosted real-data use. Hosted Gemini remains synthetic/demo-only.
- Commission paid Vertex baselines — those stay behind `PRAIRIE_ALLOW_PAID_SERVICES=true` and explicit operator approval.
- Expand scope to new prompt classes, new panels, or new roles. If the audit surfaces a gap, it gets a ticket; it does not get retrofitted inside the audit.
- Re-litigate decisions captured in [decision-log.md](decision-log.md).

---

## 3. Readiness Bar

A dimension is "green" only when **all three** of the following are true:

1. **Automated check passes** against the current commit on a clean host.
2. **Evidence artifact** exists at the canonical path (under `output/` or `docs/evidence/`), is dated within the audit window, and is reproducible from a one-line command.
3. **Canonical doc** reflects the current surface (generated inventories regenerated; hand-maintained docs reviewed).

Any dimension that is "yellow" must be either upgraded to green or explicitly accepted as a known limitation with a decision-log entry.

---

## 4. Audit Dimensions

Each dimension lists: scope, commands, artifacts, pass criteria, current status, and the canonical doc it answers to. Commands are copy-pasteable from repo root.

### D1. Structural Integrity

- **Scope:** Typecheck, lint, Node/Python toolchain match, workspace hygiene.
- **Commands:** `npm run typecheck`, `npm run lint`, `npm run test:scripts`.
- **Artifacts:** `output/release-gate/<run>/` logs.
- **Pass:** Zero type errors, zero lint errors, `.nvmrc` honored, Python 3.11 resolvable.
- **Known risk:** Node changes can break `better-sqlite3`; recovery is `npm run rebuild:memory`.
- **Answers to:** [release-checklist.md](release-checklist.md).

### D2. Schema and Contract Validity

- **Scope:** Zod schemas in `packages/shared`, branded domain ID types, prompt request/response contracts, migrations table.
- **Commands:** `npm run test` (vitest covers schema + builder + parser suites), `npm run test:python` (pytest covers inference-side contracts).
- **Artifacts:** vitest + pytest summaries inside the release-gate log bundle.
- **Pass:** ~1,891 vitest + 69 pytest cases pass; no skipped schema suites; migration `_migrations` table reflects current schema version.
- **Answers to:** [architecture.md](architecture.md), [database-schema.md](database-schema.md), [classroom-profile-schema.md](classroom-profile-schema.md).

### D3. Prompt Class Coverage (13 model-routed classes)

- **Scope:** Every prompt class listed in CLAUDE.md §Current Surface Area has at least happy-path + degraded-path + retrieval-relevance coverage where applicable. Golden outputs stay current.
- **Commands:** `npm run eval` (full 127-case corpus), `npm run eval:summary`, `npm run eval:regression`.
- **Artifacts:** `output/evals/<date>-<mode>/` per-mode result bundle, `docs/eval-baseline.md` updated.
- **Pass:** No regressions against latest passing per-mode baseline; every class except `extract_worksheet` carries ≥1 edge-case (G-03 accepted limitation).
- **Sub-skill:** Use `classroom-evals` when authoring or updating eval cases.
- **Answers to:** [eval-inventory.md](eval-inventory.md), [eval-baseline.md](eval-baseline.md).

### D4. Inference Lane Verification

Four lanes; they do not carry equal product weight.

| Lane     | Command                      | Data policy            | Audit expectation                                     |
| -------- | ---------------------------- | ---------------------- | ----------------------------------------------------- |
| `mock`   | `npm run release:gate`       | any                    | **must pass** every audit cycle                       |
| `ollama` | `npm run release:gate:ollama` | any                    | **host-dependent**; document target host + result     |
| `gemini` | `npm run release:gate:gemini` | synthetic/demo only    | bounded proof refresh; respect $20/day cap            |
| `api`    | `npm run release:gate:real`  | opt-in only            | out of scope unless the operator explicitly schedules |

- **Pre-hosted gate:** `npm run proof:check` then `npm run gemini:readycheck`. Do not loop on hosted retries.
- **Ollama posture:** G-02 records that the maintenance host (8 GiB RAM, 6.76 GiB free disk) cannot run `gemma4:27b`. The audit names the target host explicitly or records the lane as "host-infeasible, tracked in G-02."
- **Sub-skill:** Use `gemma-routing` when revisiting live/planning routing or latency/quality tradeoffs.
- **Answers to:** [eval-baseline.md](eval-baseline.md), [hackathon-hosted-operations.md](hackathon-hosted-operations.md), [live-model-proof-status.md](live-model-proof-status.md).

### D5. API Surface and Role Scope

- **Scope:** Every implemented endpoint appears in `docs/api-surface.md` with its role scope. Header contract (`X-Classroom-Code`, `X-Classroom-Role`) enforced server-side.
- **Commands:** `npm run system:inventory`, `npm run system:inventory:check`.
- **Artifacts:** `docs/system-inventory.md`, `docs/api-surface.md` (both generated), role-scope tests in `services/orchestrator/__tests__/auth.test.ts`.
- **Pass:** Inventory check exits 0; the role scope matrix matches CLAUDE.md §Adult API role contract; invalid roles return `classroom_role_invalid`; disallowed roles return `classroom_role_forbidden`.

### D6. Web Shell and UX Behavior

- **Scope:** Seven-view top-level nav (`classroom / today / tomorrow / week / prep / ops / review`), canonical `tab`+`tool` URL state, legacy `?tab=<old-panel>` migration, classroom-code retry flow, 12 teacher-facing panels.
- **Commands:** `npm run smoke:browser` (Playwright), `npm run smoke` (API+browser).
- **Artifacts:** Browser smoke log + screenshots; `npm run ui:evidence` bundle (8 screenshots + manifest under `output/playwright/ui-evidence/`); optional `npm run demo:screenshots`.
- **Pass:** All smoke assertions green; tab+tool state survives refresh; legacy params migrate; protected classroom prompt retries protected reads and writes.
- **Answers to:** browser-smoke portion of [release-checklist.md](release-checklist.md).

### D7. Security and Safety Controls

- **Scope:**
  - classroomId path traversal validation
  - rate limiting (global + per-classroom auth)
  - security headers
  - safe JSON deserialization (all 15 memory retrieval paths)
  - atomic schedule writes
  - prompt injection detection
  - adult-role header boundaries
  - family-message approval dialog (two-step)
  - demo-bypass is demo-only
  - hosted lanes cannot receive real classroom data (operationally + technically blocked)
- **Commands:** `npm run test` covers server-side guards; manual review of `docs/pilot/incident-drills/` drills 1–5.
- **Artifacts:** Drill rehearsal notes appended to each `drill-NN-*.md` file; `npm run audit:log -- --outcome denied` snapshot.
- **Pass:** All five drills rehearsed at least once against the demo classroom; every hard rule in [safety-governance.md](safety-governance.md) §"Hard rules" is enforced by code or a documented process, not by convention.
- **Answers to:** [safety-governance.md](safety-governance.md), `docs/pilot/safety-artifacts/`, `docs/pilot/incident-drills/`.

### D8. Data Integrity and Memory Lifecycle

- **Scope:** SQLite per-classroom memory, migration framework, retention policy (`default_days` + per-table overrides), export/anonymize/backup/prune/purge/restore, tombstone audit artifacts.
- **Commands:**
  ```bash
  npm run memory:admin -- summary  --classroom demo-okafor-grade34
  npm run memory:admin -- export   --classroom demo-okafor-grade34
  npm run memory:admin -- anonymize --classroom demo-okafor-grade34
  npm run memory:admin -- backup   --classroom demo-okafor-grade34
  npm run memory:admin -- prune    --classroom demo-okafor-grade34 --confirm
  ```
- **Artifacts:** `output/memory-admin/<run>.sqlite` + tombstone JSON; `_migrations` table inspected.
- **Pass:** Every lifecycle command round-trips; anonymized export flagged as requiring adult free-text review; destructive commands refuse without `--confirm`.
- **Answers to:** [database-schema.md](database-schema.md), [pilot-readiness.md](pilot-readiness.md) §Memory Lifecycle Commands.

### D9. Demo Fixture Integrity

- **Scope:** Canonical demo classroom contract (`demo-okafor-grade34`), tiered roster (8 active / 7 watchlist / 11 light-touch), 26 students / 36 interventions / 3 plans / 1 pattern / 1 approved family message / 5 sessions, load-bearing aliases D1..D6, EAL tag convention, no seeded feedback/forecast/scaffold/survival/variant/run rows.
- **Commands:** `npm run pilot:reset`, `npm run demo:fixture:check`.
- **Artifacts:** Pilot-reset tombstone under `output/pilot/`, fixture-check green log.
- **Pass:** Clean-seed counts match; no cross-classroom alias collisions; EAL convention validated on the demo; G-15 non-demo EAL fragmentation remains documented but does not block the demo.

### D10. Accessibility and Dark-Mode Contrast

- **Scope:** WCAG-relevant color tokens, letterpress/tactility palette, ARIA attributes across 60+ components, dark-mode switching, mobile responsiveness.
- **Commands:** `npm run check:contrast`; manual mobile-responsive pass per maintainer memory (getByTestId selectors in smoke-browser).
- **Artifacts:** Contrast report at `output/contrast-report.md`; `dark-mode-contract.md` reflects current tokens.
- **Pass:** Contrast exits 0; no regressed tokens; no invented `--color/--space/--font/--shadow` tokens (grep `apps/web/src/styles/tokens.css` first per maintainer memory).
- **Answers to:** [dark-mode-contract.md](dark-mode-contract.md).

### D11. Observability and Cost Controls

- **Scope:** Per-request `X-Request-Id`, JSONL request logs, audit log queries, log pruning, cost rollup, ops-status rollup.
- **Commands:**
  ```bash
  npm run logs:summary
  npm run logs:prune -- --days 14
  npm run audit:log -- --classroom demo-okafor-grade34 --from <start> --to <end>
  npm run cost:rollup
  npm run cost:status
  npm run ops:status
  ```
- **Artifacts:** `output/request-logs/<date>.jsonl`, `output/access-audit/<run>.json` (when `--artifact` is passed), cost rollup snapshot.
- **Pass:** `ops:status` shows no drift against gate / host-preflight / inventory / evidence. Hosted spend stays under the $20/day CLAUDE.md cap.

### D12. Evidence Portfolio and Docs Hygiene

- **Scope:** Generated system inventory, generated API surface, evidence portfolio, claims ledger, decision log, hackathon proof brief, Kaggle writeup, demo script.
- **Commands:** `npm run evidence:generate`, `npm run evidence:snapshot`, `npm run claims:check`.
- **Artifacts:** `docs/evidence/` refreshed, `output/evidence-snapshots/<run>/` captured, `docs/pilot/claims-ledger.md` reviewed.
- **Pass:** Claims check green; no claim sits at `supported` without a linked artifact; decision log carries an entry for any architecture, routing, safety, or ops change made during the audit.

---

## 5. Execution Phases (cheapest first)

Run in order. Each phase has an exit criterion. Do not skip phases; if a phase fails, fix root cause before escalating cost.

### Phase 0 — Freeze and Baseline (≈15 min)

- Confirm branch is clean; capture the current commit SHA for the sign-off memo header.
- `npm run ops:status` — captures gate / host-preflight / inventory / evidence drift in one view.
- `npm run system:inventory:check` — fail fast on inventory drift.
- `npm run demo:fixture:check` — fail fast on fixture drift.
- **Exit:** All three commands exit 0, or drift is understood and documented.

### Phase 1 — No-Cost Structural Audit (≈20–40 min)

- `npm run pilot:reset`
- `npm run release:gate` (the default mock lane)
- `npm run smoke` (covered inside the gate but rerun standalone if investigating)
- `npm run check:contrast`
- **Exit:** Mock release gate green. Contrast green. All D1/D2/D5/D6/D9/D10 dimensions move to green.

### Phase 2 — Privacy-First Live Model (host-dependent)

- `npm run host:preflight:ollama` — writes `output/host-preflight/<run>.json`.
- If preflight green and target host has ≥16 GiB RAM / ≥40 GiB free disk: `npm run release:gate:ollama`.
- If preflight red (as on the current maintenance host per G-02): do not attempt the gate. G-02 already carries a 2026-04-12 decision-log entry for this exact host constraint; no new entry is needed unless the finding changes. Leave D4 Ollama row as "host-infeasible, tracked in G-02."
- **Exit:** Either Ollama gate green on a capable host, or the infeasibility is explicitly recorded with the artifact path.

### Phase 3 — Hosted Proof Refresh (bounded spend, synthetic only)

- Pre-flight: `npm run proof:check`, then `npm run gemini:readycheck`.
- Budget: at most one bounded hosted gate run before reassessing. Stay under $20/day. Do not loop on hosted retries.
- Command: `npm run release:gate:gemini`.
- Post-run: update `docs/eval-baseline.md` hosted section, update `docs/hackathon-proof-brief.md` run date, `npm run cost:rollup`.
- **Exit:** Hosted Gemini baseline passes on synthetic/demo data; spend under cap; D4 Gemini row green.

### Phase 4 — Security and Safety Deep-Dive (≈60 min)

- Rehearse each of `docs/pilot/incident-drills/drill-01..05` against the demo classroom. Append rehearsal outcomes to each drill file.
- Re-read each `docs/pilot/safety-artifacts/*.md` and confirm §8 approval status is current.
- `npm run audit:log -- --outcome denied` — verify denied accesses are categorized correctly.
- Spot-check prompt-injection detection on at least one intentionally adversarial input per model-routed class.
- **Exit:** All drills rehearsed within the audit window; D7 green.

### Phase 5 — Evidence, UX Review, and Sign-Off (≈45 min)

- `npm run evidence:generate` — regenerate portfolio.
- `npm run ui:evidence` — refresh 8-screenshot UI bundle.
- `npm run demo:screenshots` (optional) — regenerate demo-script screenshots.
- `npm run claims:check` — fail fast on unsubstantiated claims.
- Update `docs/pilot/claims-ledger.md` with any newly supported or newly revoked claims.
- Write the sign-off memo (template in §8).
- **Exit:** All 12 dimensions green or explicitly yellow-with-decision-log. Sign-off memo written to `docs/evidence/<date>-production-audit-memo.md`. Commit decision is the maintainer's — the audit does not require a commit to be complete, only a durable memo.

---

## 6. Cost Guardrails (hard rules)

From CLAUDE.md §Cost Guardrails, reasserted here because the audit tempts cost inflation:

- Hosted-model spend stays under $20/day unless the operator explicitly overrides for that day.
- No external GPU rentals, no paid infra spin-ups, no Vertex escalations to "speed up validation."
- Cheapest sequence first: `proof:check` → `gemini:readycheck` → at most one bounded hosted gate run.
- Mock and Ollama for iteration; hosted Gemini only for bounded proof refresh.
- If a hosted run fails, inspect artifacts and fix locally before spending again.

---

## 7. Risk Register

| ID  | Risk                                                                                            | Likelihood | Impact | Mitigation                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| R1  | Ollama lane remains host-infeasible on maintenance host; live-model story depends on alt host. | High       | Medium | Record G-02 state; name the capable target host in the decision log; accept as known limitation for audit.   |
| R2  | Hosted Gemini run regresses and tempts a retry loop.                                            | Medium     | Medium | Enforce the "one bounded run, then investigate locally" rule. Budget gate: `npm run cost:status`.             |
| R3  | System inventory drifts after late edits.                                                       | Medium     | Low    | Rerun `npm run system:inventory` at the end of Phase 5; fail audit if `system:inventory:check` is non-zero.  |
| R4  | Claims ledger slips into `supported` without linked artifacts.                                  | Medium     | High   | `npm run claims:check` is a Phase 5 exit gate. Reviewer countersign on any claim upgrade.                    |
| R5  | Drills 1–5 rehearsed mechanically without capturing rehearsal outcomes.                         | Medium     | Medium | Require each drill file to receive an append-only rehearsal note with date + outcome + follow-up.            |
| R6  | EAL tag vocabulary drift (G-15) leaks into pattern-detection logic.                             | Low        | Medium | Treat non-demo EAL tag normalization as a post-audit ticket; flag in any review that touches those fixtures. |
| R7  | Real-data blockers (G-06, G-14 remainder) framed as "code-closable" in public copy.             | Medium     | High   | Enforce language from [pilot-readiness.md](pilot-readiness.md) §Public Claim Rules in every artifact.        |
| R8  | Browser smoke selectors drift (maintainer memory).                                              | Medium     | Low    | Prefer `getByTestId` over `getByRole` when touching `scripts/smoke-browser.mjs`.                             |
| R9  | Design tokens invented rather than reused.                                                      | Low        | Low    | Always grep `apps/web/src/styles/tokens.css` before using any `--color/--space/--font/--shadow` token.        |

---

## 8. Sign-Off Gate

Do not declare audit-complete until all of the following are true. Produce a single memo at `docs/evidence/<date>-production-audit-memo.md` summarizing:

1. Commit SHA and audit window.
2. Per-dimension verdict (green / yellow / red) with artifact path for each green row.
3. Decision-log entry written for every yellow row that is **not already** documented in `docs/decision-log.md`. Existing yellows that already have a pointer (e.g. G-02) do not need a duplicate entry.
4. Hosted spend total for the audit window.
5. Drill rehearsal log references (file + line), or an explicit note that no rehearsals were run during this audit window.
6. Claims-ledger delta (which rows moved, with links). "None" is an acceptable and often the honest answer.
7. Known limitations carried forward (G-02 Ollama host; G-06 human validation; G-14 remainder; G-15 EAL fragmentation).
8. The explicit statement of what the audit *does not* unlock: no hosted real-data use; no claim of human-validated outcomes; no district-readiness claim.

The memo is the audit's durable artifact. Public copy derived from the audit must trace back to rows in the claims ledger, not to the memo directly.

---

## 9. Anti-Goals to Re-State at Sign-Off

The product does not become, and the audit does not unlock:

- a diagnosis engine
- a behavior-risk or discipline scoring system
- a surveillance product
- an autonomous family-messaging sender
- a replacement for teacher or EA judgment
- a district-ready or "production" system in any sense that exceeds `local-pilot-rehearsal`

These are from CLAUDE.md §Product Boundaries and [safety-governance.md](safety-governance.md) §Hard rules. Any audit artifact that starts to imply otherwise is defective and must be rewritten.

---

## 10. Related Docs (do not duplicate)

- [README.md](../README.md) — top-level setup and commands
- [docs/spec.md](spec.md) — product spec
- [docs/architecture.md](architecture.md) — current architecture
- [docs/prompt-contracts.md](prompt-contracts.md) — model-routed prompt contracts
- [docs/decision-log.md](decision-log.md) — durable decisions
- [docs/release-checklist.md](release-checklist.md) — the mechanical gate this plan orchestrates
- [docs/pilot-readiness.md](pilot-readiness.md) — demo vs. pilot vs. real-data boundaries
- [docs/safety-governance.md](safety-governance.md) — hard rules + operating modes
- [docs/development-gaps.md](development-gaps.md) — priority map G-01..G-18
- [docs/eval-baseline.md](eval-baseline.md) — per-lane eval baselines
- [docs/system-inventory.md](system-inventory.md) — generated, do not hand-edit
- [docs/api-surface.md](api-surface.md) — generated, do not hand-edit

If a canonical doc contradicts this plan, the canonical doc wins. If the current code contradicts a canonical doc, update the canonical doc — do not update this plan to paper over the drift.
