# PrairieClassroom OS — Pilot Incident Log

**Purpose:** A single append-only file for every incident during a pilot — safety, privacy, access, output quality, or unexpected behavior. This is the source of truth when someone asks "did the pilot surface any concerns?"

**Who writes here:** Anyone who observes something worth logging. Teachers, EAs, observers, maintainers, coordinators. If you're not sure whether to log it, log it — an ignored incident is a worse outcome than an over-reported one.

**Who reads here:** The pilot coordinator before every new session. The maintainer before every release. Anyone writing public copy about the pilot's outcome.

**Rules:**

1. Incidents are never deleted. If an incident turns out to be a false alarm, add a `disposition: false alarm — <reason>` line; don't remove the entry.
2. Incidents are anonymized. Use role labels (teacher, EA, observer, coordinator, maintainer) — not names — unless the affected person explicitly consents.
3. Student references use aliases only, ever. If a real student name appears in an incident description by accident, the coordinator must edit it out immediately and record the edit.
4. Incidents are graded using the severity scale below, not on vibes.

---

## Severity scale

| Level | Meaning | Examples |
|---|---|---|
| **S1 — critical** | A safety boundary was crossed. Pilot stops until resolved. | Diagnostic language in output reached a teacher; real student data entered a hosted lane; unauthorized access to classroom memory; system took an autonomous action that should have required teacher approval. |
| **S2 — significant** | The pilot can continue, but the session's results are tainted until the incident is understood. | Persistent output error; prompt injection succeeded in a session; a teacher lost trust mid-session; a panel produced unusable output for more than one scenario. |
| **S3 — friction** | Not harmful, but worth capturing so future sessions can learn from it. | Teacher confused by a label; output required heavy editing; session ran over time because of a workflow gap. |
| **S4 — note** | An observation that's worth remembering but wouldn't be called an incident by most people. | "Teacher mentioned they'd want X feature." "Output was fine but would have been better with Y." |

A session that closes with only S3/S4 entries is a *healthy* session — they're signal, not failure.

---

## Entry template

Copy this template for every new incident. Put the most recent incidents at the top of the Incident Entries section.

```
### INC-YYYYMMDD-NN — <short title>

- **Reporter role:** (teacher / EA / observer / coordinator / maintainer)
- **Occurred at:** YYYY-MM-DD HH:MM
- **Session:** (session id or description; "during observation-template walkthrough #3")
- **Severity:** S1 / S2 / S3 / S4
- **Category:** safety / privacy / access / output-quality / ui / other

**What happened** (2-5 sentences):

**What was expected to happen:**

**Who or what was affected:**

**Immediate action taken:**

**Evidence:** (path to request-logs JSONL line, audit artifact path, screenshot, or "none")

**Disposition:** (open / resolved / false alarm — <reason>)

**Follow-up needed:** (specific action, or "none")
```

---

## Incident entries

*(Add new entries at the top of this section. Do not delete old entries.)*

### INC-20260412-01 — No real-pilot incidents yet

- **Reporter role:** maintainer
- **Occurred at:** 2026-04-12 09:00
- **Session:** structured walkthrough v1 (synthetic, maintainer self-walkthrough)
- **Severity:** S4
- **Category:** other

**What happened:** This entry exists to make the log non-empty and to anchor the format. No real pilot has occurred yet, so there are no real incidents to log. The synthetic walkthrough surfaced friction points, but those are tracked in `docs/structured-walkthrough-v1.md` rather than here because they are not incidents in the formal sense — they are self-reported design observations.

**What was expected to happen:** The log is empty until the first real pilot session. That session will produce the first real entry.

**Who or what was affected:** Nothing.

**Immediate action taken:** Added this anchor entry so the template shape is visible to the first pilot coordinator to use this log.

**Evidence:** `docs/structured-walkthrough-v1.md`, `docs/pilot/claims-ledger.md` (rows marked `unsupported` for usefulness claims).

**Disposition:** resolved — anchor entry only.

**Follow-up needed:** Remove this anchor entry if and only if it would cause confusion when the first real entry lands. Otherwise keep it as a format example.

---

## Escalation protocol

- **S1 (critical):** The pilot coordinator is notified within 1 hour. The pilot stops. No new sessions until the maintainer reviews the incident, the claims ledger is updated if necessary, and a fix or mitigation is documented here. Any public statements about the pilot are paused until the incident is resolved.
- **S2 (significant):** The pilot coordinator is notified by the end of the day. The affected session is marked tainted in `usefulness-rubric.md`. The maintainer reviews within 48 hours.
- **S3 / S4 (friction / note):** Logged here. Reviewed in bulk before the next pilot sprint.

Every S1 incident must also generate an entry in `docs/pilot/claims-ledger.md` if it contradicts a listed public claim.

---

## Retention and sharing

- Incident entries live in the repo forever, or until the pilot program formally ends and the coordinator signs off on archiving them to a separate `docs/pilot/archive/` directory. Archived entries are not deleted, only moved.
- Incident entries are not shared outside the pilot group without explicit consent from everyone mentioned in them (by role or otherwise).
- If a public artifact needs to reference an incident, it should cite the `INC-YYYYMMDD-NN` id and nothing else. The body of the incident stays private to the pilot group.

---

*Pilot Incident Log v1. Companion to `participant-brief.md`, `observation-template.md`, `usefulness-rubric.md`, `session-log-template.md`, `claims-ledger.md`.*
