# PrairieClassroom OS — Session Log Template

**For:** A pilot participant (teacher or EA) running a self-documented session *without* an observer present.
**Fill time:** ~3 minutes during the session + ~5 minutes after.
**Purpose:** Capture what actually happened in a session the participant ran on their own, at their own pace, outside a formal observation. Pairs with `usefulness-rubric.md` (which is the subjective summary) — the session log is the objective trace.

**Read first:** `docs/pilot/participant-brief.md`.

---

## Session metadata

| Field | Value |
|---|---|
| Date | |
| Start time | |
| End time | |
| Classroom id used (demo or de-identified) | |
| Inference lane (mock / ollama / hosted-gemini) | |
| What you were hoping to accomplish this session | |

---

## Rules of the session

Fill these in *before* starting — they protect you later.

- ☐ I am **not** entering real student names. I am using the demo classroom or manually de-identified records.
- ☐ I have read the participant brief.
- ☐ I know I can stop at any time.
- ☐ I know how to purge the session's memory at the end if I want to.

If any box is unchecked, pause and resolve it before continuing.

---

## What you did, in order

Add a row for each meaningful action. A "meaningful action" is anything that changed state — a generation, a save, an edit, a navigation — **not** scrolling or hovering. Aim for fidelity, not coverage: 5 rows of honest detail beats 30 rows of placeholders.

| # | Time | Panel | Input you gave (brief, de-identified) | Output you got (brief) | What you did with it | Friction noted |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |

**Notes on filling this out:**

- "Input you gave" should be a **short** description, not a transcript. "Pasted a reading passage and asked for variants for 3 EAL students" is better than the actual passage text.
- "Friction noted" is any moment where you hesitated, got confused, had to back up, or said "hmm" out loud. These are the most valuable rows.
- If a row's friction is already covered in the row above, just write "same as #N."

---

## Moments you re-read or re-ran something

For each thing you generated twice or re-ran with different input, note what changed between attempts. These are the moments where the product's iteration loop matters most.

1. 
2. 
3. 

---

## Moments the output matched what you actually know about your classroom

Not just "it was correct" — specifically, moments where the output cited something you'd documented and the citation was accurate (or inaccurate) to your lived memory of that classroom.

1. 
2. 
3. 

---

## Moments you wouldn't have sent / used the output as-is

For each, say what you would have changed before actually using it. These shape the next iteration of the prompt builders.

1. 
2. 
3. 

---

## What you'd do differently if you ran this session again

Short list. No prose necessary.

- 
- 
- 

---

## What you want to try next session

What this session made you curious about, or what it made you realize you never got to.

- 
- 
- 

---

## At the end of this session

Pick one:

- ☐ Keep all memory from this session (it informs your next pilot session).
- ☐ Purge all memory from this session. Run: `npm run memory:admin -- purge --classroom <id> --confirm`.
- ☐ Export the session's memory as an anonymized JSON for my own records. Run: `npm run memory:admin -- anonymize --classroom <id>`.

If you want an audit trail of every request this session made, run:

```bash
npm run audit:log -- --classroom <id> --from <session-date> --artifact
```

That writes a JSON snapshot to `output/access-audit/` with per-route counts, per-outcome counts, and the most recent request records.

---

*Session Log Template v1. Companion to `participant-brief.md`, `observation-template.md`, `usefulness-rubric.md`, `claims-ledger.md`, `incident-log.md`. Where the observation template is filled out *by an observer watching you*, this one is filled out *by you alone*.*
