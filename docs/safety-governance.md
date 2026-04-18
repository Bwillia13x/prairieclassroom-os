# Safety and Governance

## Operating principle

PrairieClassroom OS supports classroom adults. It does not replace judgment, diagnose students, or automate punitive decisions.

## Hard rules

- Do not diagnose or imply diagnosis.
- Do not generate discipline scores or behavioral risk labels.
- Do not send family communication without explicit human approval.
- Do not present inference as observation.
- Do not expose sensitive classroom notes unnecessarily.

## Output policy

### Allowed

- lesson differentiation
- support planning
- plain-language communication drafts
- intervention logging
- retrieval-grounded summaries

### Restricted

- anything that sounds medical, clinical, or disciplinary
- high-confidence claims unsupported by current context
- parent messaging that bypasses teacher review

## Logging expectations

For any outward-facing draft or structured action, preserve:

- source prompt class
- model route used
- tool calls made
- approval status
- timestamp

## Review triggers

Require a safety review when:

- a new tool is introduced
- classroom images are used in a new way
- parent messaging behavior changes
- a feature begins to infer student state

## Operating modes

Safety posture depends on the data lane:

| Mode                  | Real classroom data |                    Hosted model calls | Notes                                           |
| --------------------- | ------------------: | ------------------------------------: | ----------------------------------------------- |
| Demo                  |                  no | allowed only with synthetic/demo data | Public demos and judging.                       |
| Synthetic proof       |                  no | allowed only with synthetic/demo data | Eval, release-gate, and proof artifacts.        |
| Local pilot rehearsal |                  no |                                    no | Fake or manually de-identified records only.    |
| Local real-data pilot |               gated |                                    no | Requires pilot-readiness blockers to be closed. |
| Hosted real-data use  |          prohibited |                            prohibited | No exception in the current product.            |

## Adult role boundaries

Classroom-code auth is sufficient for demo and local rehearsal only. The current API adds an initial adult role boundary through the mandatory `X-Classroom-Role` header, with route scopes generated in `docs/api-surface.md`.

### Client-side role system (Role Identity Pill)

Each classroom stores a locally persisted role selection (`localStorage` key `prairie-classroom-roles`). On first load of a classroom with no stored role, the `RolePromptDialog` prompts the adult to self-select. The selection is surfaced in the header via the `RoleContextPill` dropdown and sent on every API request as `X-Classroom-Role`.

### Supported roles and capabilities

| Role           | `canWrite` | `canApproveMessages` | `canLogInterventions` | `canEditSchedule` |
| -------------- | :--------: | :------------------: | :-------------------: | :---------------: |
| **teacher**    |    yes     |         yes          |          yes          |        yes        |
| **ea**         |    yes     |          no          |          yes          |        no         |
| **substitute** |    yes     |          no          |          yes          |        no         |
| **reviewer**   |     no     |          no          |          no           |        no         |

The `useRole()` hook (`apps/web/src/hooks/useRole.ts`) exposes these capabilities. The pure `roleCapabilities()` function can be reused server-side.

### Scope notes

- Teacher owner scope covers generation, schedule writes, raw classroom history, classroom health, student summaries, and every operational view.
- EA collaborator scope covers Today, EA briefing, EA load balancing, intervention logging, the debt register, feedback, and session telemetry. Family message approval and all planning-tier generation remain teacher-only; the EA role is gated client-side via `canApproveMessages` and `canGenerate` returning `false`.
- **Substitute bounded view (shipped 2026-04-17).** Covering teacher for a single day. Read-only access to the today snapshot, EA-briefing generation, latest forecast, debt register, classroom profile, and schedule. Write access to `log_intervention` and session telemetry only. No access to `tomorrow_plan`, family message generation or approval, support-patterns generation, scaffold-decay, survival-packet generation, classroom health, or raw history archives. Server enforcement lives in `services/orchestrator/server.ts` mount-level middleware and per-route `requireRoles` gates; scope matrix is locked by `services/orchestrator/__tests__/auth.test.ts`.
- **Reviewer bounded view (shipped 2026-04-17).** Inclusive-ed lead, principal, or auditor. Fully read-only — no generation, no writes, no approvals on any route. Read access to latest plan / message / intervention / pattern history, latest forecast, latest pattern report, debt register, classroom profile, and aggregated feedback / session summaries for audit purposes. Operational surfaces (today, differentiate, language tools, EA briefing, EA load, survival packet) are intentionally hidden. Server enforcement lives alongside substitute in the same scope matrix.
- No role receives unrestricted raw intervention history by default — teacher and reviewer are the only roles permitted to read `/api/classrooms/:id/interventions`.
- This is not a district identity system, SSO integration, or authenticated audit log. Those remain future requirements for multi-user or school-managed deployment.
- Client-side gating (tab visibility, disabled buttons, `RoleReadOnlyBanner`, teacher-downgrade confirmation) is a UX affordance, not a security boundary. The server's scope matrix is the authoritative layer; the UI keeps roles out of views they cannot use so clicks don't fail silently.

## Data lifecycle expectations

Real classroom use requires explicit controls for:

- retention period per classroom via the `retention_policy` field in the classroom profile JSON; `npm run memory:admin -- prune --classroom <id> --confirm` applies the declared policy and writes a tombstone artifact to `output/memory-admin/` recording the policy source, per-table cutoffs, and rows removed
- export of classroom memory through `npm run memory:admin -- export --classroom <id>`
- structural de-identification/anonymization through `npm run memory:admin -- anonymize --classroom <id>`, followed by manual free-text review
- purge/delete for a classroom through `npm run memory:admin -- purge --classroom <id> --confirm`
- backup and restore of per-classroom SQLite memory through `npm run memory:admin -- backup|restore`
- operator-visible record of hosted/model lane used for each generated artifact

Access audit evidence is now captured in the orchestrator request log: every protected request records `classroom_id`, `classroom_role`, `demo_bypass`, and an `auth_outcome` in the stable vocabulary `allowed | demo_bypass | classroom_code_missing | classroom_code_invalid | classroom_role_invalid | classroom_role_forbidden | none`. Operators query and export this via `npm run audit:log -- --classroom <id> --from <YYYY-MM-DD> [--outcome denied] [--artifact]`, which emits a point-in-time audit snapshot to `output/access-audit/`. Substitute and reviewer roles ship with dedicated bounded views (see the scope notes above), so real-data pilots that cover a substitute day or an inclusive-ed review no longer require the teacher role to be shared.

## Safety artifact reviews

Every generation-producing prompt class with pilot-critical safety stakes has a completed review in `docs/pilot/safety-artifacts/`, written against the reusable template in `docs/pilot/safety-artifact-review-template.md`. The five reviews as of 2026-04-17 are:

- **`draft_family_message`** — approval gate, alias-only, language coverage pending hosted refresh. Real-data gate: approved-with-followups (English) / blocked (non-English).
- **`detect_support_patterns`** — observational framing, pattern-report persistence, retrieval-trace correctness. Real-data gate: approved-with-followups (teacher) / blocked (reviewer-role read until disclaimer banner).
- **`forecast_complexity`** — "classroom conditions, not student behavior," substitute-role read access, retrieval trace. Real-data gate: approved-with-followups (teacher) / blocked (substitute until stale-timestamp UX).
- **`generate_survival_packet`** — `sub_ready` pre-auth, deferred family comms, alias-only. Real-data gate: blocked until two gating follow-ups close.
- **`detect_scaffold_decay`** — observational-only framing, minimum-records threshold, withdrawal-plan-requires-regression-protocol. Real-data gate: approved-with-followups (teacher) / blocked (reviewer).

Each review's §8 Approval line is authoritative. A reviewed commit plus pilot-coordinator countersign is the gate for real-data use; contract or prompt changes re-open the review.

## Incident response drills

Five rehearsable drill scripts in `docs/pilot/incident-drills/` cover the S1/S2 incident categories the project anticipates: wrong-adult exposure, hosted-lane real data, diagnostic-language output, unapproved family message, and memory corruption or cross-classroom restore. Each drill has a scripted rehearsal path against the demo classroom plus a runbook for a real event, with "what good looks like" / "what bad looks like" criteria. Drill history is tracked in `docs/pilot/incident-drills/README.md`; at least one rehearsal of each drill is expected before the first real-data pilot session.

## Incident response triggers

Open an incident log entry when:

- sensitive classroom notes are exposed to the wrong adult
- a hosted lane receives real classroom or student data
- output implies diagnosis, discipline scoring, or unsupported certainty
- a family message is sent outside explicit teacher review
- classroom memory is corrupted, lost, or restored from backup

Incident entries should include timestamp, affected mode, route or panel, data class, mitigation, and whether public proof claims need to be revised.
