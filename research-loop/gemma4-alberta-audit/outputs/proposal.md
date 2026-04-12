# Proposal

## Executive Summary

PrairieClassroom OS is a serious and unusually well-framed application of Gemma 4, but its strongest novelty is narrower than the broadest marketing claims imply. The least differentiated parts of the product are the ones most teacher-AI companies already offer: lesson generation, differentiation, translation, family communication, and general planning assistance. The most differentiated parts are the ones that recast the problem itself: classroom complexity as an adult coordination problem, a local classroom-memory layer instead of stateless prompting, explicit teacher/EA workflows rather than student chatbot flows, and emerging complexity-management workflows such as forecast, debt, handoff, and scaffold review.

On the evidence available in the repository and current external sources, PrairieClassroom OS deserves a "high-potential, credibly differentiated" assessment rather than a fully proven "game-changing" one. Alberta's context makes the thesis unusually plausible: the province is explicitly funding school complexity-team structures, Calgary alone now has 118 school allocations in the provincial complexity-team list, the Calgary Board of Education reports very large multilingual learner volume, and Alberta's own collaboration guidance emphasizes timely, responsive coordination across adults. At the same time, Alberta teachers remain cautious about AI readiness: the Alberta Teachers' Association reports that only 8.3% agreed their school was ready to leverage AI effectively, while 59.4% agreed unequal AI access could widen the divide.

The most important strategic conclusion is this: the platform should not try to win by claiming it is a better general AI assistant for teachers. That market is already crowded. It should win by proving it reduces the coordination tax in high-complexity classrooms while keeping data local, adults in control, and outputs grounded in classroom memory. If you can show measurable reductions in planning time, missed follow-ups, substitute/EA handoff friction, and multilingual communication lag, the platform could become genuinely important in Alberta. Without that evidence, the system remains a strong concept with a compelling architecture and an incomplete proof burden.

## Context and Background

The repository's own product thesis is consistent and unusually disciplined. Internal documents define PrairieClassroom OS as a "Gemma-4-native, local-first classroom orchestration layer" and explicitly reject the common failure modes of education AI: diagnosis, surveillance, autonomous parent messaging, and replacing teacher judgment. The architecture is also coherent. The orchestrator assigns specific prompt classes to live and planning tiers, uses typed request/response contracts, persists classroom memory locally, and injects retrieval context into high-reasoning tasks.

This matters because the technical and policy environment in Alberta rewards exactly this kind of framing. Alberta's collaboration guidance says schools are most effective when staff, families, and partners work together in ways that are timely, culturally sensitive, and responsive. That is closer to an operations-and-handoff problem than to a pure content-generation problem. The Calgary Board of Education's 2024-25 annual report shows a very large English-language-learning population; an inferred total from the report's language-proficiency counts is 42,181 students with identified LP levels in 2024-25, and the report also documents significant numbers of students with special-education codes. Separately, Alberta's complexity-team allocation list dated February 17, 2026 shows that the Calgary School Division alone has 118 allocated complexity teams, indicating that classroom complexity is not a rhetorical niche issue but an actively recognized operational category.

The external AI context cuts both ways. Official Gemma 4 documentation now supports much of the technical story the product wants to tell: multimodal text-image inputs, audio on smaller models, context windows up to 256K, configurable thinking modes, native system prompts, and agentic/function-calling support. That makes a local-first school workflow story much more believable than it would have been a year earlier. But it also raises the bar. If Gemma 4 natively supports function calling and the broader Gemma ecosystem now includes specialized paths such as FunctionGemma, EmbeddingGemma, and ShieldGemma, an application that claims to be deeply Gemma-native should eventually show more than dual-tier text generation plus image OCR.

## Domain Findings

### 1. What is genuinely novel

The product's most original move is conceptual and architectural: it treats classroom complexity as an operating condition to be managed, not as a vague background problem and not as an excuse to generate more content. That choice changes the workflow surface. Instead of centering the student chatbot or teacher chat box, the product centers adult coordination tasks: tomorrow planning, EA briefing, intervention logging, support pattern synthesis, complexity forecasting, substitute handoff, and future notions such as debt registers and scaffold decay. This is materially different from the dominant market framing of "AI teacher productivity tools."

There is also genuine novelty in the local-memory feedback loop. The repo consistently routes later tasks through structured retrieval over accumulated classroom records. That gives the product a stronger "operating layer" identity than commodity teacher-AI tools, which usually emphasize one-shot generation or document-centric assistance. Your use of explicit schemas and approval gates also improves credibility with schools because it shifts the product away from free-form chat and toward auditable operations.

Finally, the Alberta fit is not superficial. Multilingual family communication, split-grade differentiation, part-time EA coordination, and privacy-sensitive classroom notes map well to the realities cited in Alberta and CBE materials. The substitute packet and complexity forecast ideas are especially well targeted to Alberta's public framing of complexity and collaborative support.

### 2. What is only moderately novel

Many of the visible user-facing features overlap with mainstream teacher-AI platforms. MagicSchool says it provides 80+ teacher tools spanning instructional planning, content creation, differentiation, and communication. Brisk says it helps teachers create materials, differentiate instruction, translate text, generate family communication, and even create sub plans. That means the mere presence of differentiation, simplified text, translation, parent messages, or sub-planning is not a strong novelty claim by itself.

This does not make PrairieClassroom OS uninteresting. It means the novelty must be argued at the level of system design and workflow composition, not at the level of familiar feature nouns. If you present the product as "AI that differentiates, translates, and drafts family messages," it will read as crowded-market parity. If you present it as "a local classroom operating layer that compounds its usefulness through structured memory, adult handoffs, and complexity-aware planning," it becomes much more defensible.

### 3. What is Gemma-native today, and what is not

The current implementation uses Gemma 4 in three substantively relevant ways.

First, the dual-tier routing is real in the codebase. Small Gemma models are assigned to low-latency classroom tasks and larger models to synthesis and planning. Second, the system uses Gemma 4 multimodality for worksheet extraction and downstream differentiation, which is a meaningful fit to real classroom inputs. Third, the planning routes expose thinking summaries in the UI, which helps make the model's deeper reasoning visible rather than magic.

However, several parts of the Gemma story are presently weaker than the marketing language suggests.

The repo marks some routes as tool-call-capable, but the live stack does not actually implement function-calling round trips. The inference harness explicitly says tool-call smoke tests are mock-only and that the current live stack is text generation only. The project also references EmbeddingGemma and ShieldGemma in planning materials, but the current retrieval layer is SQL-based and there is no production-path moderation layer using ShieldGemma. Those are not failures; in fact, SQL is probably the correct first retrieval architecture for bounded classroom memory. But they do mean the correct claim is "Gemma-centered, local-first dual-tier orchestration" rather than "full-spectrum Gemma platform exploitation."

### 4. What is overstated or currently under-evidenced

The single biggest evidentiary gap is real model validation. The public-facing writeup claims zero safety failures and zero regressions, but the repo's real Gemma 4 baseline document still says the status is pending and awaits a Gemma 4 eval run. That means the current eval story is strongest as a contract-and-orchestrator reliability story, not yet a complete real-inference quality story.

There is also an evidence gap around human validation. The demo script contains lines implying teachers tested it, EAs tested it, and parents approved messages, but the repository does not appear to contain corresponding user-research artifacts or pilot evidence. Those statements should be removed or softened unless you can produce notes, walkthrough results, or sign-off records.

Finally, the security and deployment posture is not school-ready yet. Alberta's Access to Information Act applies to school boards as public bodies. A local-first architecture is directionally helpful, but classroom-code auth is not a sufficient district deployment model. Real school deployment would need role-based access, auditable approvals, device management assumptions, data retention rules, and probably distinct substitute/EA access controls.

## Cross-Cutting Themes

### Theme A: The best proof point is operational, not pedagogical

The strongest defensible value proposition is not "better personalized learning" in the abstract. Even Alberta teachers are mixed and cautious on AI's student-learning upside. The stronger and more credible claim is that the platform reduces adult coordination burden in classrooms that already run on overloaded human memory, fragmented notes, and inconsistent handoffs.

### Theme B: Local-first is strategically important, but it is not enough by itself

Local inference is a real differentiator in school settings because it speaks to privacy, resilience, and procurement concerns. Official Gemma materials explicitly support deployment across laptops, workstations, and edge-like devices, which makes the local story technically plausible. But local inference alone does not make a school platform trustworthy. Governance, moderation, auditability, and permissioning still matter.

### Theme C: The most interesting future path is a Gemma stack, not just a Gemma model

The current product uses core Gemma 4 competently. The next genuine leap would come from using the broader Gemma ecosystem more deliberately:
- FunctionGemma or equivalent tool-routing to make certain operations more deterministic.
- EmbeddingGemma for multilingual semantic retrieval once memory scales beyond a bounded relational structure.
- ShieldGemma or a comparable explicit moderation layer for text/image safety evaluations in sensitive school workflows.

Those additions would make the "Gemma-native" claim much stronger and less dependent on brand association.

## Policy Options or Recommendations

### Recommendation 1: Position the product around classroom complexity operations

Lead with adult coordination, continuity, and complexity reduction. Demote generic AI feature language. Your best wedge is not "teacher assistant"; it is "classroom complexity operating layer for teachers and EAs."

### Recommendation 2: Tighten the novelty claim

Use language like:
- "Architecturally differentiated"
- "High Alberta-policy fit"
- "Novel combination of local memory, complexity forecasting, and adult handoff workflows"

Avoid language like:
- "Unprecedented"
- "Solves Alberta education"
- "Fully proven game-changing platform"

### Recommendation 3: Close the proof gaps in order of leverage

1. Run and publish the real Gemma 4 eval baseline.
2. Remove or substantiate unsupported human-testing claims.
3. Run a 3-5 classroom workflow pilot or structured walkthrough with teachers/EAs.
4. Define success metrics tied to complexity operations:
   - minutes saved on tomorrow planning
   - time to generate approvable family communication
   - number of unresolved follow-ups surfaced
   - substitute/EA handoff completeness
   - teacher-rated usefulness and trust

### Recommendation 4: Build the district-readiness layer only after proof of workflow value

Do not prematurely build a school-admin dashboard. First prove the teacher/EA loop. Once that is validated, add:
- stronger auth and role separation
- approval logs
- retention/configuration controls
- explicit substitute access profiles

### Recommendation 5: Make the next Gemma step selective, not maximalist

Do not force every Gemma capability into the product. The most worthwhile additions are the ones that strengthen reliability:
- deterministic function routing
- multilingual retrieval
- independent safety evaluation

## Data Gaps and Future Research

- No pilot evidence in real Alberta classrooms was found in the repository.
- No completed real-inference baseline was found for Gemma 4.
- No independent measure of forecast accuracy, substitute packet usefulness, or intervention-to-plan improvement is yet documented.
- The repo does not yet show district-level governance artifacts required for real procurement or deployment.

## Sources

- S-001 to S-009: internal repository files documenting implemented architecture, prompts, routes, and current evidence gaps.
- S-010 to S-014: official Google Gemma documentation and announcements.
- S-015 to S-018 and S-021: Alberta and teacher-association context on collaboration, complexity teams, multilingual demand, AI readiness, and privacy obligations.
- S-019 to S-020: mainstream teacher-AI market overlap.
