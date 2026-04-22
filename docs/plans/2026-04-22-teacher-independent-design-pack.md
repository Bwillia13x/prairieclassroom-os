# 2026-04-22 Teacher-Independent Design Pack

## Purpose

This document consolidates the roadmap work that can be completed without a real teacher or EA walkthrough.

It is intended to close the design and packaging items that are still actionable before human-validation evidence arrives.

## What this pack completes

- guided workflow bundle definition
- provenance and delta-view design pass
- schedule and event model design pass
- deployment mode matrix and pilot hardware profile
- first-pass requirements for voice notes, print and export, and roster or family-preference maintenance

## Current-state anchors

- The product already has the core surfaces required for bundle orchestration in [../architecture.md](../architecture.md).
- Retrieval trace is already implemented on retrieval-backed planning surfaces; this pack extends trust surfaces beyond that existing baseline.
- The current schedule contract already includes `schedule`, `ea_student_refs`, `upcoming_events`, and `sub_ready`; this pack defines the next bounded evolution rather than restarting the model.
- The local-first deployment claim is still limited by current hardware realities documented in the claims ledger and development gaps.

## 1. Guided workflow bundles

### Rule for all bundles

Do not add net-new prompt classes for bundle delivery.

The bundle layer should be orchestration, navigation, persistence, and output packaging on top of the existing routed classes and deterministic surfaces.

### Bundle A — Morning brief

Entry surface:

- Today

User promise:

- Tell me where to start and why.

Inputs consumed:

- latest forecast
- debt register
- latest tomorrow plan
- recent session-summary recommendation if present

UI contract:

- one recommended next step above the fold
- one sentence of reasoning
- quick view of forecast risk, open follow-ups, and anything waiting for approval
- one click into the recommended follow-on surface

Primary actions:

- open recommended panel
- dismiss recommendation for this session
- expand supporting evidence

Not in scope:

- multi-step wizard
- autonomous action chains

### Bundle B — Tomorrow prep

Entry surfaces:

- Differentiate
- Tomorrow Plan

User promise:

- Use one prep session to get tomorrow ready.

Inputs consumed:

- source artifact
- teacher reflection
- recent interventions and pattern context
- current schedule and EA window

Outputs packaged together:

- differentiated variants
- tomorrow plan
- EA briefing
- prep checklist

UI contract:

- explicit step order
- visible progress state across the bundle
- persistent draft state across steps
- final review state that shows what is ready, what is still draft, and what has not been generated yet

Primary actions:

- continue to next step
- return to previous step without losing inputs
- print or export the final prep packet

### Bundle C — Absence handoff

Entry surface:

- Survival Packet

User promise:

- Hand a substitute one coherent artifact instead of four disconnected surfaces.

Inputs consumed:

- survival packet
- latest forecast
- critical supports from classroom profile
- sub-ready gate

Outputs packaged together:

- substitute packet
- one-page heads-up summary
- print-ready packet state

UI contract:

- strong teacher approval gate before packet generation
- visible stale timestamp if underlying records are old
- export and print state clearly labeled

Not in scope:

- substitute write access beyond the already-bounded substitute role
- school-wide staffing assignment

### Bundle D — Weekly review

Entry surfaces:

- Support Patterns
- Review group

User promise:

- Show me what is repeating, what is improving, and what I keep deferring.

Inputs consumed:

- support patterns
- scaffold reviews
- debt register
- family communication backlog
- feedback and session summaries when useful

Outputs packaged together:

- weekly themes
- recommended follow-ups
- items to carry into next week's plan

UI contract:

- summary first, detail second
- clear distinction between observation, recommendation, and unresolved item
- ability to open the next relevant surface from each review block

## 2. Provenance and delta-view contract

### Current state

The system already exposes retrieval trace on retrieval-backed planning routes. That is useful but incomplete.

The remaining trust gap is not "did it retrieve anything?" alone. The remaining gap is:

- what changed since last time
- what is draft versus approved
- what is safe to export
- which role boundary is currently active

### New shared primitives

#### EvidenceStrip

Show above the primary output.

Must include:

- source type: AI-generated, record-derived, or mixed
- freshness timestamp
- active role context where relevant
- approval state where relevant
- export state where relevant

#### DeltaSummaryCard

Show only when a previous comparable output exists.

Must answer:

- what is new
- what was removed
- what materially changed

Target routes:

- Tomorrow Plan
- Forecast
- EA Briefing
- Survival Packet
- Family Message drafts when the same student and message type were recently regenerated

#### ReviewStateBadge

Single reusable badge family for:

- draft
- approved
- persisted
- mock output
- ephemeral only

#### SafeExportBadge

Explicitly labels whether the current output is:

- safe to print
- safe to export
- blocked pending approval
- blocked because it is mock output

### Delta rules

The delta layer must compare structured fields, not raw rendered prose.

For example:

- Tomorrow Plan compares support priorities, watchpoints, EA actions, prep items, and family follow-ups.
- Forecast compares block risk levels and mitigation text.
- EA Briefing compares watch list, schedule blocks, and follow-ups.

If a route has no stable previous structured record, do not fake a delta view.

### Rollout order

1. Tomorrow Plan
2. Forecast
3. EA Briefing
4. Survival Packet
5. Family Message

## 3. Schedule and event model design pass

### Current contract

The current contract already supports:

- `schedule[]` with `time_slot`, `activity`, `ea_available`, optional `ea_student_refs`, optional `notes`
- `upcoming_events[]` with `description`, optional `event_date`, optional `time_slot`, optional `impacts`
- `sub_ready`

That is a good baseline and should not be thrown away.

### Remaining gap

The current shape is not yet strong enough for:

- recurring weekly schedule variants
- date-specific overrides
- stronger event typing and event impact handling
- cleaner bundle packaging for Tomorrow prep and Absence handoff

### Target model

Preserve backward compatibility by treating today's `schedule[]` as the default template, then add a bounded second layer.

Recommended additions:

```json
{
  "weekly_schedule": {
    "default": [
      {
        "block_id": "morning-math",
        "time_slot": "12:30-1:15",
        "activity": "Math",
        "ea_available": false,
        "ea_student_refs": ["Brody"],
        "notes": "Post-lunch fractions review"
      }
    ],
    "fri": [
      {
        "block_id": "friday-art",
        "time_slot": "1:15-2:00",
        "activity": "Art",
        "ea_available": true,
        "ea_student_refs": ["Amira"],
        "notes": "Higher engagement block with full support"
      }
    ]
  },
  "schedule_overrides": [
    {
      "date": "2026-04-23",
      "reason": "Assembly",
      "blocks": []
    }
  ],
  "upcoming_events": [
    {
      "description": "Fire drill",
      "event_date": "2026-04-24",
      "time_slot": "10:30",
      "impacts": "Transition disruption",
      "impact_level": "high"
    }
  ]
}
```

### Design decisions

- Keep schedule data in classroom JSON, not SQLite, for now.
- Keep one default weekly template plus optional weekday variants and date overrides.
- Do not build full calendar sync in this phase.
- Add stable `block_id` so forecast, EA load, and delta views can compare the same block across generations.
- Add `impact_level` to events so forecast and handoff views can sort by significance.

### Endpoint behavior

The existing schedule endpoints should evolve rather than multiply.

- `GET /api/classrooms/:id/schedule` should return the effective view for the requested date when a date is provided.
- `PUT /api/classrooms/:id/schedule` should accept bounded edits to the default weekly schedule or a named date override.

### Migration rule

If a classroom has only `schedule[]`, interpret it as `weekly_schedule.default` and preserve the old shape during the transition window.

## 4. Deployment mode matrix and pilot hardware profile

### Operating modes

#### Mode A — Mock structural lane

- Use for local development and UI walkthroughs.
- Allowed data: demo, synthetic, or manually de-identified only.
- Claims allowed: structural proof only.
- Hardware expectation: any dev host that can run the web app and orchestrator.

#### Mode B — Hosted Gemma synthetic proof lane

- Use for artifact-backed competition proof.
- Allowed data: synthetic and demo only.
- Claims allowed: hosted proof on synthetic or demo data.
- Hardware expectation: browser plus network access.

#### Mode C — Local live-only Ollama lane

- Use only as a partial local proof.
- Allowed data: de-identified rehearsal or, later, real pilot data only if governance gates are open.
- Claims allowed: live-tier local proof only, not full dual-speed proof.
- Maintenance-host note: this is the maximum realistic local mode on the current 8 GiB host.

#### Mode D — Local dual-speed Ollama lane

- This is the intended privacy-first pilot target.
- Allowed data: local-pilot-real-data only when the real-data gate is open.
- Claims allowed: full local privacy-first dual-speed deployment, if actually run on the target hardware.

#### Mode E — Paid Vertex lane

- Explicit opt-in only.
- Allowed data: only when budget and governance approvals are explicit.
- Claims allowed: paid hosted inference exists; do not collapse this into the zero-cost narrative.

### Hardware profiles

#### Current maintenance host

- 8 GiB RAM
- approximately 6.76 GiB free disk at the last documented preflight
- suitable for mock and maybe partial live-only experimentation
- not suitable for full dual-speed Ollama proof

#### Minimum pilot workstation

- 16 GiB RAM
- 40 GiB free disk
- suitable target for the full local dual-speed lane according to current repo guidance

#### Preferred pilot workstation

- 32 GiB RAM
- 80 GiB free disk
- preferred for smoother local dual-speed operation and lower operator confusion

### UI and operator rules

- The active mode must be visible in the UI.
- Mock output must remain visibly marked.
- Live-only local mode must be labeled as partial coverage, not general proof.
- Public copy must not describe 8 GiB laptops as a full local deployment target.

## 5. Voice note capture and transcription pre-spec

### Scope

Voice notes are allowed for:

- intervention capture
- tomorrow reflections
- coordination notes

### Privacy rules

- no passive listening
- no always-on audio
- no hidden transcription
- no hosted transcription for real classroom data

### Product rules

- teacher must explicitly start and stop recording
- transcript must be shown before save
- original audio should be optional to retain and off by default
- transcript becomes the persisted artifact, not raw audio, unless the teacher explicitly opts in

### Mode behavior

- mock mode: permit the UI flow with stub transcript behavior
- local mode: preferred real transcription path
- hosted synthetic-demo mode: acceptable only for demo data

## 6. Print and export hardening requirements

### Outputs in scope

- Tomorrow Plan
- EA Briefing
- Survival Packet
- Family Message

### Required export signals

- classroom id or alias context
- generation timestamp
- mode state
- approval state
- mock watermark when applicable

### Rules

- unapproved family messages should not present as final send-ready exports
- mock outputs must remain visibly non-final when printed or exported
- page-break behavior matters for substitute packets and multi-section plans

## 7. Roster and family-preference maintenance

### Editable fields

- student alias
- family language
- communication notes
- support tags
- known successful scaffolds

### Boundaries

- teacher-only editing
- no SIS integration in this phase
- no cross-classroom sync
- keep persistence in the classroom profile layer

### Goal

Improve the quality of downstream planning and communication without turning PrairieClassroom into a student information system.

## 8. What still remains blocked on teacher evidence

This pack does not close Phase 0.

The following still require a real teacher or EA walkthrough:

- claims-ledger advancement from real evidence
- ranked friction list from a real session
- ranked obvious-value list from a real session
- confident choice of the single workflow that should anchor the next UI packaging pass

## Recommended implementation order after this pack

1. Build Morning brief and Tomorrow prep bundles.
2. Roll out EvidenceStrip and DeltaSummaryCard on Tomorrow Plan and Forecast.
3. Implement the schedule-layer evolution with backward compatibility.
4. Publish the deployment matrix in operator-facing docs and UI mode labels.
5. Build voice-note capture and export hardening only after the bundle and trust passes are in motion.
