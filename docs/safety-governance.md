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

- Teacher owner scope currently covers generation, schedule writes, raw classroom history, classroom health, and student summaries.
- EA collaborator scope currently covers Today, EA briefing, debt register, feedback, and session-summary routes. Family message approval is gated client-side via `canApproveMessages`.
- Substitute view should see only teacher-approved survival-packet content for a bounded date; this dedicated view is not implemented yet.
- Reviewer/read-only roles should inspect de-identified summaries only; this dedicated view is not implemented yet.
- No role receives unrestricted raw intervention history by default.
- This is not a district identity system, SSO integration, or authenticated audit log. Those remain future requirements for multi-user or school-managed deployment.
- Client-side gating is a UX affordance, not a security boundary. Server-side enforcement of `X-Classroom-Role` is required before real-data pilot.

## Data lifecycle expectations

Real classroom use requires explicit controls for:

- retention period per classroom via the `retention_policy` field in the classroom profile JSON; `npm run memory:admin -- prune --classroom <id> --confirm` applies the declared policy and writes a tombstone artifact to `output/memory-admin/` recording the policy source, per-table cutoffs, and rows removed
- export of classroom memory through `npm run memory:admin -- export --classroom <id>`
- structural de-identification/anonymization through `npm run memory:admin -- anonymize --classroom <id>`, followed by manual free-text review
- purge/delete for a classroom through `npm run memory:admin -- purge --classroom <id> --confirm`
- backup and restore of per-classroom SQLite memory through `npm run memory:admin -- backup|restore`
- operator-visible record of hosted/model lane used for each generated artifact

Access audit evidence is now captured in the orchestrator request log: every protected request records `classroom_id`, `classroom_role`, `demo_bypass`, and an `auth_outcome` in the stable vocabulary `allowed | demo_bypass | classroom_code_missing | classroom_code_invalid | classroom_role_invalid | classroom_role_forbidden | none`. Operators query and export this via `npm run audit:log -- --classroom <id> --from <YYYY-MM-DD> [--outcome denied] [--artifact]`, which emits a point-in-time audit snapshot to `output/access-audit/`. Dedicated substitute/reviewer views remain required before those roles may access real classroom data.

## Incident response triggers

Open an incident log entry when:

- sensitive classroom notes are exposed to the wrong adult
- a hosted lane receives real classroom or student data
- output implies diagnosis, discipline scoring, or unsupported certainty
- a family message is sent outside explicit teacher review
- classroom memory is corrupted, lost, or restored from backup

Incident entries should include timestamp, affected mode, route or panel, data class, mitigation, and whether public proof claims need to be revised.
