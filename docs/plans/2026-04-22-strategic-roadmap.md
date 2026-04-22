# 2026-04-22 Strategic Roadmap

## Purpose

This is a dated strategic assessment and execution roadmap for PrairieClassroom OS based on the current repo state, not the original MVP concept.

Primary source docs reviewed:

- `CLAUDE.md`
- `README.md`
- `system_overview.md`
- `docs/spec.md`
- `docs/architecture.md`
- `docs/development-gaps.md`
- `docs/pilot-readiness.md`
- `docs/decision-log.md`
- `docs/future-development.md`

## Strategic verdict

PrairieClassroom OS makes sense.

The product thesis is strong because it treats classroom complexity as an adult coordination problem, not a student-chat problem. That is a differentiated position, a credible Gemma fit, and a much better strategic lane than generic tutoring or generic school AI.

The current risk is not lack of features. The current risk is that the product now proves architectural breadth better than it proves teacher value, adoption simplicity, and real deployment realism.

The next phase should therefore optimize for three things before more prompt-class expansion:

1. human validation
2. workflow compression
3. deployment credibility

## Findings

### F1. Evidence is now the bottleneck

Synthetic proof is strong. Human proof is still missing.

The repo has solid technical evidence: release gates, hosted proof, evals, browser smoke, role scopes, audit logs, and governance documentation. But `docs/development-gaps.md` and `docs/pilot-readiness.md` are explicit that teacher and EA validation artifacts are still missing. That means the limiting factor is no longer whether the system can run. It is whether the system reliably saves adult time in real use.

Strategic implication:

- Do not prioritize major new capability expansion ahead of real teacher and EA walkthrough evidence.
- Treat the first real pilot sessions as product-shaping inputs, not as proof theater.

### F2. The feature surface is ahead of the adoption surface

The product has grown from a narrow MVP loop into a 12-panel system with 13 routed prompt classes plus deterministic retrieval surfaces. That is impressive technically, but it creates adoption risk.

The strongest story is still the core teacher loop already present in `docs/spec.md`:

1. differentiate work
2. prepare tomorrow
3. coordinate support
4. draft family communication
5. log what happened

In the tighter Phase 0 framing, `log what happened` still matters, but it behaves as supporting infrastructure for the four primary workflows rather than as a separate lead entry point.

Everything outside that loop should currently behave like supportive infrastructure or advanced review, not like equal-weight entry points.

Strategic implication:

- The product should feel smaller than it is.
- The UI should increasingly guide users through recommended flows instead of exposing every capability as a separate decision.

### F3. The local-first story is only partially operational today

The local-first positioning is strategically correct, but the current operating reality is mixed.

The repo documents that the full dual-speed Ollama lane is blocked on the maintenance host because the planning-tier model is not hardware-feasible there. That creates a strategy gap: the product promise emphasizes privacy-first local deployment, while the strongest current proof artifact is the hosted synthetic/demo lane.

Strategic implication:

- The deployment story must become more explicit.
- The product needs a supported degraded mode and a named pilot hardware profile, not just a best-case local-first aspiration.

### F4. The roadmap itself has drifted

`docs/future-development.md` mixes historical concept work with already-shipped capabilities. Forecasting, scaffold decay, substitute packet, debt register, and EA load balancing are already in the architecture, but the older document still reads like they are mostly future work.

Strategic implication:

- Planning artifacts need a clean split between historical feature ideation and the active roadmap.
- Future sessions should use this plan for sequencing work instead of relying on stale capability lists.

### F5. Input friction is still a major product risk

The architecture is strong on generation, storage, and review, but some of the highest-leverage inputs remain either manual or missing:

- schedule structure
- roster and family-preference maintenance
- voice note capture
- print/export surfaces for real classroom handoff

If the system requires too much setup or too much typing, teachers will perceive it as adding coordination work while claiming to reduce it.

Strategic implication:

- The next meaningful product gains will come from better input capture and workflow packaging, not from additional analysis modules.

### F6. Trust and explainability should be more productized across panels

The safety posture is good, and the Today surface already does more to expose source freshness and record-vs-AI boundaries. That pattern should become universal.

Teachers need to quickly answer:

- Why did the system suggest this?
- Which memory or record did it use?
- What changed since the last version?
- What still requires my approval?

Strategic implication:

- Trust affordances should become a platform capability, not a panel-by-panel detail.

## Recommended strategic changes

### 1. Freeze net-new prompt classes for now

Do not add more model-routed classes until these three gates are materially advanced:

- at least one real teacher or EA walkthrough with artifacts
- a clearer guided core-loop experience
- an explicit supported deployment topology for pilot use

This does not mean stop improving the product. It means improve packaging, inputs, trust, and proof before expanding breadth.

### 2. Reframe the product around workflow bundles

The repo already has the raw capabilities for several strong bundles. Productize those bundles before inventing more surfaces.

Recommended bundles:

- Morning brief: Today snapshot + debt register + forecast + suggested next step
- Tomorrow prep: differentiate + tomorrow plan + EA briefing + prep checklist
- Absence handoff: survival packet + latest forecast + critical supports
- Weekly review: support patterns + scaffold review + open follow-ups + family communication backlog

These bundles make the system feel like an operating layer instead of a tray of separate tools.

### 3. Make input infrastructure a higher priority than more intelligence features

The most valuable next platform work is likely:

- structured schedule model and recurring schedule editor/import
- bounded roster and family-language data maintenance
- voice notes with local transcription path
- durable print/export surfaces for plans, briefings, and substitute packets

These are leverage multipliers for the features already built.

### 4. Turn trust affordances into a cross-product contract

Standardize these across generation and review panels:

- source/freshness label
- memory inputs used
- what changed since last run
- approval status
- safe export state
- visible role boundary

The product should feel reviewable and governable by default.

### 5. Treat human validation as a product development sprint, not a later checkbox

The first pilot sessions should drive roadmap changes in the same way failing tests drive engineering changes.

Required outputs from that sprint:

- updated claims ledger
- usefulness rubric data
- observer friction logs
- top 5 repeated confusion points
- top 5 moments of obvious value

## Highest-value additions worth implementing

These additions are worth doing because they increase real product usefulness without broadening the conceptual surface too much.

### A. Guided workflow mode

Add a guided mode that turns the current panel set into recommended sequences for common adult jobs.

Why it matters:

- reduces navigation burden
- makes adoption easier
- sharpens the demo and pilot story

### B. Voice note capture and transcription

Voice is one of the clearest missing inputs for hallway-grade usage. The architecture already acknowledges voice notes as planned. Implementing this would materially improve capture velocity for interventions, next-day notes, and handoff context.

Why it matters:

- fits teacher reality better than typed-only capture
- increases memory density
- strengthens later planning and pattern features

### C. Schedule and event model

Several advanced features already depend on schedule structure. Make schedule and event modeling a first-class platform capability instead of an implicit dependency.

Why it matters:

- improves forecast credibility
- improves EA load balancing
- improves substitute packet usefulness
- reduces repeated manual entry

### D. Output provenance and delta view

Add a simple, reusable view showing what records informed an output and what changed since the last generation.

Why it matters:

- increases trust
- reduces rereading burden
- helps adults review faster

### E. Pilot evidence dashboard

Not a public analytics dashboard. A private operator view that summarizes pilot evidence quality:

- completed sessions
- rubric averages
- repeated friction themes
- repeated value themes
- unsupported public claims still open

Why it matters:

- keeps the team honest
- prevents feature sprawl from outrunning evidence
- makes future prioritization sharper

## Additions to defer

These may become worthwhile later, but they should not lead the next phase.

- school-wide analytics and district dashboards
- LMS or SIS deep integration
- cross-classroom aggregation
- student-facing experiences
- autonomous outbound communication
- additional prompt classes that do not simplify the core adult loop

## Execution roadmap

## Phase 0. Evidence and focus reset

Goal: prove real adult usefulness and reduce roadmap ambiguity.

Execution artifact:

- [2026-04-22-phase-0-checklist.md](./2026-04-22-phase-0-checklist.md)

Progress as of 2026-04-22:

- Complete: historical roadmap drift was reduced by reclassifying `docs/future-development.md` as a historical ideation document rather than the active backlog.
- Complete: the primary product story was tightened to the 4-workflow narrative across the checklist, facilitator guide, demo script, and submission copy.
- Complete: facilitator-side walkthrough materials and pre-demo claims checks are now operationalized.
- Remaining: a real teacher or EA walkthrough artifact set does not exist yet.
- Remaining: the claims ledger has not yet been updated from real human evidence.
- Remaining: the top 5 repeated friction points and top 5 obvious-value moments still need to be captured from a real session.

Tasks:

- run at least one cold teacher or EA walkthrough using the existing pilot artifacts
- update `docs/pilot/claims-ledger.md` based on real evidence, not internal belief
- capture the top repeated friction points and convert them into concrete backlog items
- annotate or retire stale roadmap assumptions from historical planning docs
- define the primary pilot story as a 4-workflow narrative, not a 12-panel tour

Exit criteria:

- at least one real walkthrough artifact set exists
- claims ledger updated after the walkthrough
- top 5 friction issues named and prioritized

## Phase 1. Workflow compression and trust

Goal: make the product easier to adopt without reducing capability depth.

Teacher-independent design artifact:

- [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)

Tasks:

- build guided workflow bundles for Morning brief, Tomorrow prep, and Absence handoff
- standardize source/freshness/provenance on high-value panels
- add a reusable "what changed since last run" view for planning outputs
- make role state and approval state more visible at the output level
- ensure the most common adult loop can be completed without hunting across unrelated panels

Exit criteria:

- a new user can follow a recommended path through the core loop
- trust affordances are consistent on the key generation outputs
- pilot feedback shows less navigation confusion than the baseline walkthrough

## Phase 2. Input and operational infrastructure

Goal: reduce teacher input burden and strengthen the features already shipped.

Tasks:

- implement a first-class classroom schedule and events model
- support recurring schedule templates plus bounded manual editing
- add voice note capture with a local or privacy-preserving transcription path
- improve roster and family-language preference maintenance
- add print/export polish for substitute packets, tomorrow plans, and briefings

Exit criteria:

- forecasting, EA load, and substitute workflows use shared schedule infrastructure
- teachers can capture useful context with less typing
- exported artifacts are usable in real adult handoff moments

## Phase 3. Deployment realism and pilot packaging

Goal: make the local-first claim operationally specific.

Tasks:

- define supported hardware profiles for live-only and dual-speed modes
- document the exact degraded mode when planning-tier local inference is unavailable
- package a bounded pilot topology for school use
- make the UI and operator docs reflect the actual active mode clearly
- decide whether the planning tier for pilots runs on a dedicated local machine, a stronger staff workstation, or a supported mixed-mode configuration

Exit criteria:

- local-first deployment story is explicit and defensible
- operators know exactly what works on which class of machine
- pilot setup no longer depends on implied hardware assumptions

## Phase 4. Post-pilot expansion

Goal: expand only after evidence identifies what meaningfully compounds value.

Good candidates after the earlier phases:

- cross-adult handoff protocol
- weekly review digest
- smarter debt dismissal and follow-up workflows
- a bounded pilot-evidence operator dashboard

Decision rule:

- only promote a new capability if it either reduces adult workflow steps, increases trust, or closes a pilot-proven gap

## Session-ready backlog

Use this list for upcoming work sessions.

### Do next

- real teacher or EA walkthrough with artifact capture
- guided workflow bundle definition — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)
- provenance and delta-view design pass — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)
- schedule model design pass — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)

### Do soon

- voice note capture pre-spec — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)
- print/export hardening requirements — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)
- roster and family-preference maintenance flow outline — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)
- deployment mode matrix and pilot hardware profile — captured in [2026-04-22-teacher-independent-design-pack.md](./2026-04-22-teacher-independent-design-pack.md)

### Do later

- cross-adult handoff
- school or administrator rollups
- deeper integrations

## Success metrics for the next phase

Track these explicitly:

- time to first useful output in a cold session
- number of panels touched per core workflow
- teacher edit burden before approval or use
- repeat-session adoption of the same workflow bundle
- usefulness rubric averages
- frequency of unsupported claims remaining in the claims ledger

## Bottom line

PrairieClassroom OS is strategically coherent.

The most important change is not to make it broader. The most important change is to make it easier to prove, easier to adopt, and easier to deploy while preserving the strong adult-operations thesis that already makes it distinctive.
