# Teacher Session Pre-flight Checklist

**Plan owner:** [2026-05-18-submission-plan.md](./2026-05-18-submission-plan.md) Phase C
**Companion docs (do not duplicate):** [pilot/facilitator-session-guide.md](../pilot/facilitator-session-guide.md), [pilot/cold-start-protocol.md](../pilot/cold-start-protocol.md), [pilot/participant-brief.md](../pilot/participant-brief.md), [pilot/observation-template.md](../pilot/observation-template.md), [pilot/usefulness-rubric.md](../pilot/usefulness-rubric.md), [pilot/session-log-template.md](../pilot/session-log-template.md), [pilot/claims-ledger.md](../pilot/claims-ledger.md)

This is the **submission-window pre-flight** — the day-before-and-day-of operational checks. The actual *facilitation method* is governed by `pilot/facilitator-session-guide.md`. Do not duplicate guidance here; do enforce repo readiness here.

---

## T-7 days — Recruitment

- [ ] Send 3 outreach messages by EOD 2026-04-28. Recommended targets in priority order:
  1. A K-6 classroom teacher (your strongest signal)
  2. An educational assistant (EA-perspective signal — also valuable)
  3. A retired teacher / consultant (lower-stakes, more candor)
- [ ] Honorarium: $100 baseline; raise to $200 if no replies after 4 days.
- [ ] Use the [participant-brief.md](../pilot/participant-brief.md) verbatim as the consent + framing attachment.
- [ ] Schedule for 2026-05-04 → 2026-05-10 (gives Phase E video production a buffer).

### Outreach template

> Subject: Volunteer for a 90-minute usability session on a Gemma-4-native classroom copilot (honorarium offered)
>
> Hi [Name],
>
> I'm submitting a project to the Gemma 4 Good Hackathon (May 18 deadline). It's a teacher- and EA-facing copilot for inclusive K-6 classrooms — not a student tutor; an adult-coordination layer for differentiating work, planning tomorrow, and briefing support staff.
>
> Before I submit, I'd like to capture **one real teacher voice** to lift the project out of "just a synthetic demo." I'm looking for a 60-90 minute session where you walk through the product cold using a synthetic Alberta classroom (no real student data). I'd offer $100 for your time.
>
> Materials I'd send ahead: a participant brief that explains exactly what's happening with your input. The session is recorded for the submission only with your consent, and I'd anonymize anything before publication. Happy to share the consent form first.
>
> Are you available any time in the window of May 4-10?
>
> Thanks,
> [name]

---

## T-1 day — Repo readiness

- [ ] `nvm use && npm run pilot:reset` — clean demo classroom state
- [ ] `npm run release:gate` — full mock gate green
- [ ] `npm run demo:fixture:check` — clean-seed contract verified (26 students, 36 interventions, 3 plans, 1 pattern report, 1 approved family message, 5 sessions)
- [ ] Confirm `?demo=true` skips onboarding and role-selection modals
- [ ] Spot-check that Today, Differentiate, Tomorrow Plan, EA Briefing, Family Message panels all render without console errors
- [ ] If using hosted Gemini for the session: run `npm run gemini:readycheck` and verify budget cap is intact (≤$20 day)
- [ ] Print: [observation-template.md](../pilot/observation-template.md), [usefulness-rubric.md](../pilot/usefulness-rubric.md), [session-log-template.md](../pilot/session-log-template.md)

## T-1 day — Session readiness

- [ ] Confirm the session location (in-person preferred; remote acceptable with screen share)
- [ ] Confirm the participant has received and signed the consent form
- [ ] Test screen recording end-to-end (5-minute test capture; verify file plays and audio is clean)
- [ ] Test audio recorder for the quote capture (smartphone is fine; backup with second device)
- [ ] Charge laptop, phone, and any external recording devices
- [ ] Have a printed worksheet ready (per the multimodal hero-shot capture if running both in one session)

---

## T-0 — During session

Follow [pilot/facilitator-session-guide.md](../pilot/facilitator-session-guide.md). Key facilitator rules to internalize:

- Do not pitch while the participant is using the product.
- Do not explain what they "should" think of an output.
- Do not rescue them from ordinary UI confusion.
- Do write down direct quotes when possible.

### Quote capture (last 15 minutes)

When the rubric is filled out, ask:

> I'd love to include a 20-second clip of you saying one true sentence about what this is or what you'd do with it. Only what you actually believe — no script. Examples to spark thinking, not to read: "This is the part of my day that's hard." "I'd use this on Monday morning." "I'm not worried about it taking my judgment away." But please say something that's true for you, in your own words.

Record. If the first take feels stilted, do a second. Use the better take. Hard-stop at 25 seconds raw; you'll trim to ≤20 in editing.

---

## T+24 hours — Post-session

- [ ] Anonymize any identifying details from notes (school name, child names, district names).
- [ ] Save anonymized session notes to `docs/pilot/sessions/YYYY-MM-DD-session.md` (create the `sessions/` directory on first session).
- [ ] Save the completed usefulness rubric and session log to the same directory.
- [ ] Crop the teacher quote to ≤20 seconds; export as a separate file in `qa/demo-script/teacher-quote/<YYYY-MM-DD>/`.
- [ ] Update [pilot/claims-ledger.md](../pilot/claims-ledger.md):
  - If rubric supports it, advance "Validated by Alberta teachers" from `unsupported` to `partially supported (n=1, synthetic demo session, YYYY-MM-DD)`.
  - Do **not** advance "Reduces teacher prep time" — that requires multi-session quantitative measurement.
- [ ] Tick the corresponding checkbox in [submission-plan.md](./2026-05-18-submission-plan.md) Phase C.
- [ ] If the session **contradicts** any current claim, downgrade the claim immediately and update public copy. The honest downgrade is more valuable than the missed claim.

---

## Contingency

| Trigger | Response |
|---|---|
| Participant cancels day-of | Reschedule within 48 hours if possible; otherwise execute the multimodal-only video opening (Phase E shot 2 contingency in [video-shot-list.md](../video-shot-list.md)). |
| Quote capture refused | Anonymize and use a paraphrased text-on-camera card. Lower video score; preserve honesty. |
| Rubric supports nothing | Do not advance any claim. Use the session as design feedback only; capture the friction in `docs/structured-walkthrough-v1.md` style if useful. |
| Session reveals safety/trust failure | Stop video plan immediately. Triage in [docs/decision-log.md](../decision-log.md). The submission is not worth shipping a known-bad teacher experience. |
