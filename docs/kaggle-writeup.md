# PrairieClassroom OS

**A Gemma-4-native operating layer for high-complexity inclusive classrooms**

## 1. Why this problem matters

The hardest part of teaching an inclusive classroom is usually not writing the lesson. It is coordinating everything around it.

Mrs. Okafor teaches a Grade 3/4 split in Lethbridge. Her day includes differentiating one worksheet into multiple support levels, generating bilingual materials for EAL learners, logging interventions, briefing the educational assistant, planning tomorrow from today’s observations, and drafting family communication that still requires professional review. The bottleneck is not content generation. The bottleneck is coordination under real classroom load.

That is where PrairieClassroom OS is focused. Instead of acting like a generic tutor or a chatbot with classroom branding, it treats the classroom as an operating environment: memory, retrieval, safety boundaries, approval gates, and role-specific workflows all matter as much as raw text generation.

## 2. What PrairieClassroom OS does

PrairieClassroom OS is a classroom operations copilot for teachers and educational assistants. It is explicitly not a replacement for teacher judgment.

The current product is organized around eight workflows:

1. **Differentiate** one source artifact into learner-specific variants
2. **Tomorrow Plan** grounded in recent classroom context
3. **Family Message** drafts that always require teacher approval
4. **Intervention Log** turning free-text notes into structured records
5. **Simplify Text** for grade-level and EAL supports
6. **Vocab Cards** tied to lesson content in multiple languages
7. **Support Patterns** across recent classroom records
8. **EA Briefing** for the next school-day handoff

The system’s signature is the closed loop between those workflows. Interventions become structured memory. Pattern detection uses that memory. Tomorrow planning uses the latest patterns and prior plans. The EA briefing uses the same records to create a concise morning handoff. The result is not one more isolated AI tool. It is a classroom operating layer that compounds in usefulness as context accumulates.

## 3. Why Gemma 4 is central

PrairieClassroom OS uses a three-service architecture:

- **Vite + React UI** for the teacher and EA shell
- **Express orchestrator** for prompt assembly, retrieval, validation, and approval boundaries
- **Flask inference service** for model routing and provider-specific execution

Classroom memory lives in SQLite. That is a deliberate design choice. The data is structured, bounded, and relational: students, interventions, plans, messages, and pattern reports. For this use case, SQL retrieval is more transparent and controllable than approximate vector search. The system is trying to stay grounded in classroom records, not invent new abstractions around them.

Gemma 4 matters here for three specific reasons.

**First, multimodal worksheet handling.** Teachers can submit a worksheet image directly to the Differentiate workflow. Gemma 4 vision extracts the content without requiring manual retyping, which makes the workflow usable at classroom speed.

**Second, dual-tier routing.** PrairieClassroom OS routes fast transformation tasks to a live tier and deeper synthesis tasks to a planning tier. Differentiation, simplification, vocab support, intervention structuring, and EA briefing stay on the faster path. Tomorrow planning and pattern detection route to the larger planning model where cross-record reasoning matters.

**Third, selective thinking mode.** Thinking is enabled only where it creates value: tomorrow planning and support-pattern detection. This keeps the rest of the product fast and operational rather than over-reasoned.

For the hackathon submission, the artifact-backed proof lane is **hosted Gemma 4 through the Gemini API** on synthetic/demo classroom data:

- live tier: `gemma-4-26b-a4b-it`
- planning tier: `gemma-4-31b-it`

The repo also includes a separate **local/self-hosted Ollama lane** for the intended privacy-preserving school deployment path:

- live tier: `gemma4:4b`
- planning tier: `gemma4:27b`

That distinction is important. The hosted lane is the proof path used for the submission artifacts described here. The Ollama lane is the future privacy-first deployment path for local-first school environments. The project keeps those stories separate so the public claims stay accurate.

## 4. Safety by design

Education software has to be safer than a generic productivity assistant, especially when it touches student records and family communication.

PrairieClassroom OS uses two hard prompt-level constraints for classroom-record workflows:

- **Observational language.** The system reflects teacher documentation back as “Your records show...” rather than asserting diagnostic or clinical claims of its own.
- **Forbidden terminology.** Clinical and stigmatizing terms are excluded from relevant prompt classes to reduce overreach.

The family-message workflow adds a product-level boundary on top of that prompt safety: the system may draft, but it does not send. Teacher approval is required every time. The point is to reduce coordination overhead without removing professional control.

## 5. What is proven today

The checked-in repo contains 90 evaluation cases covering schema reliability, safety boundaries, retrieval usage, planning usefulness, latency expectations, and content quality.

The repo currently proves three different things:

- **Mock structural gate:** the current branch passes typecheck, lint, Python tests, TypeScript tests, harness smoke, API smoke, and browser smoke with no paid services
- **Hosted Gemma 4 proof lane:** the hosted Gemini proof suite passed `10/10`, and the full hosted release gate completed successfully on synthetic/demo data
- **Local-first deployment lane:** a separate Ollama path exists in the repo for privacy-first deployment, but the artifact-backed submission proof described here is the hosted lane

That separation is part of the product discipline. The submission should claim what is proven, not what is merely intended.

The current proof sources are:

- `docs/eval-baseline.md` for provider-specific status
- `docs/hackathon-proof-brief.md` for the concise judge-facing proof summary
- `output/release-gate/2026-04-09T14-26-54-338Z-54148` for the latest passing hosted gate artifact

The normal hosted refresh order is `npm run proof:check`, `npm run gemini:readycheck`, `npm run release:gate:gemini`, `npm run eval:summary`, and `npm run logs:summary`.

## 6. Why this is a strong Future of Education entry

PrairieClassroom OS is built around a different thesis than most AI education demos. It does not try to replace the teacher with a tutor. It tries to strengthen the teacher’s operating capacity inside a real inclusive classroom.

That is why the product combines multilingual support, classroom memory, intervention logging, pattern synthesis, role-specific briefings, and approval-gated family communication in one system. The value is not a single output. The value is a better-coordinated classroom day.

For the hackathon, hosted Gemma 4 on synthetic/demo data proves the system is real, working, and architecturally coherent. For the longer-term Alberta deployment story, the same orchestration model is designed to move toward local or self-hosted Gemma 4 with SQLite classroom memory and privacy-preserving operations.

PrairieClassroom OS is therefore not just a Gemma 4 app. It is a Gemma-4-native operating layer for the human work of inclusive teaching.

## Technical Summary

| Metric | Value |
|--------|-------|
| User-facing workflows | 8 |
| Prompt classes | 12 |
| Model tiers | 2 |
| Submission proof models | `gemma-4-26b-a4b-it`, `gemma-4-31b-it` |
| Privacy-first deployment target | `gemma4:4b`, `gemma4:27b` |
| API endpoints | 13 |
| SQLite tables per classroom | 5 |
| Checked-in eval cases | 90 |
| Languages in vocab workflow | 10 |
| Primary user roles | teacher, educational assistant |
