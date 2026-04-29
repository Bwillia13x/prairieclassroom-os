# PrairieClassroom OS — Synthetic Teacher-Day Rehearsal

**Status:** maintainer-run synthetic rehearsal, not human validation.
**Source protocol:** `docs/pilot/cold-start-protocol.md`.
**Related artifacts:** `output/pilot/2026-04-29T19-07-13-718Z-pilot-reset-demo-okafor-grade34.json`, `output/access-audit/2026-04-29T19-19-26-544Z-access-audit.json`, `output/host-preflight/2026-04-29T18-59-02-929Z.json`.

## Session Metadata

| Field | Value |
|---|---|
| Date | 2026-04-29 |
| Start time | 13:07 MDT |
| End time | 13:20 MDT |
| Classroom id used | `demo-okafor-grade34` |
| Inference lane | `mock` via `npm run pilot:start` |
| Goal | Rehearse the eight cold-start scenarios as a teacher-like user after render-deck closeout, then record friction without promoting human-validation claims. |

## Session Rules

- [x] No real student names entered; demo aliases only.
- [x] Participant brief and cold-start protocol were used as the operating boundary.
- [x] Session could stop at any time; no hosted or paid lane was invoked.
- [x] Memory lifecycle commands were rehearsed separately before the browser pass.

## Actions Walked

| # | Time | Panel | Input Given | Output / State Observed | Action Taken | Friction Noted |
|---|---|---|---|---|---|---|
| 1 | 13:07 | Today | Opened demo Today page as teacher. | Command surface answered "What should you do now?" with intervention-log next action. | Clicked `Open Intervention Log`. | Passed; first-open triage was clear. |
| 2 | 13:09 | Prep / Differentiate | Entered a small reading artifact, source label, and teacher goal. | Variant generation path exposed mock-fixture notice and variant lanes. | Triggered generation and inspected lanes. | Passed; mock banner is explicit but still reads as internal proof language. |
| 3 | 13:11 | Review / Family Message | Navigated to family-message review state. | Existing approved-message history and approval boundary were visible. | Confirmed "Approval required" / "Approve to copy" / "No autonomous send" language. | Draft button was not clicked because the form was intentionally unfilled; boundary remained clear. |
| 4 | 13:12 | Ops / Log Intervention | Tried to log Brody note: "Used calm corner before joining group; settled in 6 minutes." | Logger showed memory preview but the save path was not obvious when no roster checkbox had actually selected. | Marked as small UX defect and patched with submit guidance. | Fixed in this pass: disabled save now names the missing student/note requirement. |
| 5 | 13:14 | Tomorrow | Entered reflection and goal. | Planning surface accepted the request and retained teacher-control framing. | Triggered tomorrow-plan generation through the documented submit control. | Passed; no autonomous-action language observed. |
| 6 | 13:16 | Week | Opened forecast board and generated forecast. | Five-day board remained visible as the planning object. | Inspected schedule/risk hierarchy. | Passed; no new risk semantics were introduced. |
| 7 | 13:18 | Today | Opened follow-ups drawer. | Drawer surfaced open follow-up debt without blocking the primary Today command. | Confirmed the debt loop was reachable. | Passed; should be candidate for Sprint 5 product iteration. |
| 8 | 13:20 | Review / Closeout | Compared session against usefulness rubric dimensions. | No dead-end workflow or "system acted" claim found. | Recorded notes below. | This is maintainer evidence only, not real teacher/EA validation. |

## Re-Read Or Re-Run Moments

1. Ops logger was re-read after the disabled save path was unclear; the missing roster-selection state was the only comprehension blocker.
2. Prep generation was inspected twice to confirm the mock notice did not imply real model behavior.
3. Follow-up debt was re-opened from Today to verify the Today-to-Ops loop remained reachable.

## Classroom-Memory Match Moments

1. Today used seeded follow-up/intervention context and presented it as records, not diagnosis.
2. Tomorrow and Week surfaces framed retrieved classroom memory as planning context.
3. The audit log confirmed demo-bypass and one role-forbidden event during the drill rehearsal window.

## Outputs Not Used As-Is

1. Family-message drafting was not completed because the synthetic session did not fill the required context.
2. Ops intervention note could not be saved during the first pass because no checkbox had been selected; this was fixed with explicit submit guidance.
3. No hosted/local live-model output was produced, so no live Gemma quality claim can be made from this run.

## Usefulness Notes

| Dimension | Maintainer Rating | Notes |
|---|---:|---|
| Actionability | 4 | Today, Ops, Tomorrow, and Week all provided a next step within the first scan. Ops needed clearer disabled-submit guidance and now has it. |
| Trust | 4 | The surfaces used observational language and kept mock/model boundaries visible. This is not a substitute for teacher trust feedback. |
| Time saved | Not scored | Synthetic rehearsal did not measure real prep or coordination time. Keep public time-saved claims unsupported. |
| Cognitive load | 4 | Seven-view shell and mobile Today stayed navigable. Dense proof language in mock banners remains acceptable for local rehearsal but should be watched in teacher sessions. |
| Edit burden | Not scored | No real teacher-edited outputs were produced. |

## Next Session Priorities

- Run the same cold-start protocol with a real teacher or EA on synthetic/demo data.
- Watch the Today-to-Ops handoff as the strongest candidate for the first evidence-based product iteration.
- Keep claims ledger statuses conservative until human rubrics exist.

