# PrairieClassroom OS

**A Gemma-4-native operating layer for high-complexity inclusive classrooms**

## 1. Problem

The hardest part of an inclusive classroom is often not writing the lesson. It is coordinating everything around the lesson.

Mrs. Okafor teaches a synthetic Grade 3/4 split classroom in Lethbridge, Alberta. Her day includes a 26-student roster, mixed grades, EAL learners across multiple home languages, sensory and transition supports, family communication, and an educational assistant who is available only in the morning. The work is not one isolated task. It is a chain: prepare differentiated materials, capture what happened, brief support staff, plan tomorrow, and communicate with families without overstepping professional judgment.

PrairieClassroom OS is built for that classroom-operations loop. It is not a student chatbot and not a generic tutor. It is a teacher and educational-assistant copilot for turning classroom signal into coordinated adult action.

## 2. Product Loop

The core loop is:

1. **Classroom signal:** a worksheet, teacher reflection, intervention note, support pattern, or pending follow-up.
2. **Gemma 4 synthesis:** the system routes the task to a fast live tier or a deeper planning tier, retrieves classroom memory when needed, and returns structured output.
3. **Teacher action:** the teacher differentiates a resource, logs an intervention, adjusts tomorrow's plan, briefs an EA, or reviews a family message.
4. **More coordinated next day:** outputs become classroom memory, and the next workflow starts with more context than the last one.

The current UI has 12 primary panels: Today, Differentiate, Language Tools, Tomorrow Plan, EA Briefing, EA Load Balance, Forecast, Log Intervention, Sub Packet, Family Message, Support Patterns, and Usage Insights. Under that shell are 13 model-routed prompt classes covering lesson differentiation, worksheet extraction, tomorrow planning, family communication, intervention logging, language supports, support-pattern detection, EA briefing, complexity forecasting, scaffold-decay review, survival packets, and EA load balancing.

## 3. Why Gemma 4 Is Central

PrairieClassroom OS uses Gemma 4 as the reasoning and generation layer, not as a decorative chatbot feature.

**Multimodal classroom artifacts.** Teachers can submit a worksheet image to the differentiation workflow. The worksheet extraction route lets a classroom artifact become the starting point for differentiated outputs instead of requiring manual retyping.

**Dual-tier routing.** Fast classroom transformations route to a live tier. Deeper cross-record synthesis routes to a planning tier. The live tier handles workflows such as differentiation, simplification, vocabulary cards, intervention structuring, EA briefing, and worksheet extraction. The planning tier handles tomorrow plans, support patterns, forecasts, scaffold-decay review, substitute packets, and EA load balancing.

**Selective thinking.** Thinking is enabled only for planning-tier workflows where it adds value: synthesizing across classroom memory, follow-up debt, schedules, and previous records. The system does not over-reason fast classroom actions that need to stay operational.

For the competition proof lane, the project uses hosted Gemma 4 through the Gemini API on synthetic/demo data only:

- live tier: `gemma-4-26b-a4b-it`
- planning tier: `gemma-4-31b-it`

The repo also includes an Ollama path for the intended privacy-preserving local deployment model, but that lane is not claimed as proven on the current maintenance host. The current competition proof is the hosted Gemini lane.

## 4. Architecture

The app is a working monorepo, not a static mockup:

- **Vite + React UI** for the teacher/EA shell.
- **Express orchestrator** for route auth, prompt assembly, retrieval, validation, approval boundaries, and request logging.
- **Flask inference service** for provider-specific execution across mock, Ollama, Gemini API, Vertex/API, and local harness modes.
- **SQLite classroom memory** for per-classroom interventions, plans, messages, forecasts, pattern reports, feedback, sessions, and lifecycle controls.
- **Shared Zod schemas** for request/response contracts and structured model outputs.

The current generated inventory records 52 exact API endpoints, 13 prompt classes, 7 live-tier routes, 6 planning-tier routes, and 7 retrieval-backed prompt classes.

## 5. Safety And Governance

Education workflows need tight boundaries. PrairieClassroom OS keeps those boundaries explicit:

- It does not diagnose students.
- It does not generate discipline scores.
- It does not operate as surveillance.
- It does not send family messages autonomously.
- It uses observational language such as "Your records show..." rather than unsupported clinical claims.
- It requires teacher approval for family-message drafts.
- It keeps hosted Gemini runs limited to synthetic/demo data.

The app also includes classroom-code protection for non-demo classrooms, adult role scopes for teacher/EA/substitute/reviewer views, per-request access logs, retention-policy tooling, memory export/anonymization commands, and a public claims ledger that marks unproven outcome claims as unsupported.

## 6. Proof Artifacts

The repo has a current artifact-backed proof story:

- **Mock structural gate:** passing at `output/release-gate/2026-04-25T02-31-26-869Z-92725`.
- **Hosted Gemma 4 release gate:** passing on synthetic/demo data at `output/release-gate/2026-04-26T13-28-55-908Z-48591`.
- **Hosted Gemini proof lane:** passing baseline; the full hosted release gate passed via `npm run release:gate:gemini`.
- **Hosted proof eval summary:** `output/evals/2026-04-26-gemini/2026-04-26T13-28-55-908Z-48591-gemini-summary.json`.
- **Hosted eval result:** 12/12 curated hosted proof cases passed.
- **Full eval corpus:** 129 checked-in eval case files.
- **Current unit coverage in latest mock gate:** 1,891 TypeScript/Vitest tests and 69 Python tests passed.
- **Canonical inventory:** `docs/system-inventory.md` and `docs/api-surface.md`.
- **Provider proof source:** `docs/eval-baseline.md`.
- **Concise judge proof brief:** `docs/hackathon-proof-brief.md`.

This proves that the application is real, route-complete, test-covered, and capable of executing real hosted Gemma 4 calls on synthetic classroom data. It does not claim real classroom outcomes.

## 7. Limitations

The project is intentionally conservative about public claims:

- No real teacher or EA validation is claimed yet unless a separate pilot artifact is added under `docs/pilot/`.
- Hosted Gemini is prohibited for real classroom or student data.
- The local Ollama lane exists, but the current maintenance host cannot run the full 27B planning tier; a separate suitable host would need to pass `npm run release:gate:ollama` before local deployment proof is claimed.
- Paid Vertex validation exists as an opt-in path, but it is not part of the zero-cost competition proof story.

## 8. Why This Fits Future Of Education

Most AI education demos focus on direct student interaction. PrairieClassroom OS focuses on the adult coordination work that makes inclusive classrooms function.

The strongest classroom value is not one generated answer. It is the closed loop: differentiate the resource, capture what happened, retrieve the record, plan tomorrow, brief the EA, and keep the teacher in control of family communication. Gemma 4 is central because it can transform classroom artifacts, synthesize across structured memory, and support role-specific workflows while preserving safety boundaries.

PrairieClassroom OS is therefore not an AI tutor with school branding. It is a Gemma-4-native operating layer for the human work of inclusive teaching.

## Technical Summary

| Metric | Value |
|--------|-------|
| Primary panels | 12 |
| Model-routed prompt classes | 13 |
| Model tiers | 2 |
| Submission proof models | `gemma-4-26b-a4b-it`, `gemma-4-31b-it` |
| Privacy-first deployment target | `gemma4:4b`, `gemma4:27b` |
| API endpoints | 52 |
| SQLite tables per classroom | 10 |
| Checked-in eval case files | 129 |
| Latest mock-gate tests | 1,891 Vitest + 69 Python |
| Primary user roles | teacher, educational assistant, substitute, reviewer |
