#!/usr/bin/env npx tsx
// data/demo/seed.ts
// Populates the demo classroom SQLite database using the live store functions.
//
// ─── Behavior ────────────────────────────────────────────────────────────────
// This script is upsert-only. Running it against an existing DB will re-insert
// or refresh the canonical records listed below; it will NOT delete extra rows
// a manual demo may have left behind. For deterministic clean state, use:
//
//   npm run pilot:reset          (purges the demo DB, then re-runs this script)
//
// Canonical clean-seed counts (from a blank DB): see scripts/validate-demo-fixture.mjs
// and docs/demo-script.md. Those counts are contract — if you edit this file,
// update the fixture validator and the docs together.
//
// Run: npx tsx data/demo/seed.ts

import {
  saveIntervention,
  savePlan,
  savePatternReport,
  saveFamilyMessage,
  approveFamilyMessage,
  saveSession,
} from "../../services/memory/store.js";
import { closeAll, getDb } from "../../services/memory/db.js";

import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type {
  TomorrowPlan,
  TransitionWatchpoint,
  SupportPriority,
  EAAction,
  FamilyFollowup,
} from "../../packages/shared/schemas/plan.js";
import type {
  SupportPatternReport,
  RecurringTheme,
  FollowUpGap,
  PositiveTrend,
  SuggestedFocus,
} from "../../packages/shared/schemas/pattern.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";

const CLASSROOM = "demo-okafor-grade34";
const MODEL = "mock-gemma-4-4b-it";
const SCHEMA_V = "1.0";

const NOW = new Date();
const MS_PER_MINUTE = 60_000;

function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function latestUsableSchoolTimestamp(hour: number, minute: number, second = 0): Date {
  const timestamp = new Date(NOW);
  timestamp.setHours(hour, minute, second, 0);
  while (isWeekendDay(timestamp) || timestamp > NOW) {
    timestamp.setDate(timestamp.getDate() - 1);
    timestamp.setHours(hour, minute, second, 0);
  }
  return timestamp;
}

function recentSchoolDayIso(
  schoolDaysAgo: number,
  hour: number,
  minute: number,
  second = 0,
): string {
  const timestamp = latestUsableSchoolTimestamp(hour, minute, second);
  let remaining = Math.max(0, Math.floor(schoolDaysAgo));
  while (remaining > 0) {
    timestamp.setDate(timestamp.getDate() - 1);
    timestamp.setHours(hour, minute, second, 0);
    if (!isWeekendDay(timestamp)) {
      remaining -= 1;
    }
  }
  return timestamp.toISOString();
}

function startOfCurrentIsoWeekLocal(): Date {
  const isoDay = NOW.getDay() || 7;
  const weekStart = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  weekStart.setDate(weekStart.getDate() - isoDay + 1);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

const CURRENT_ISO_WEEK_START = startOfCurrentIsoWeekLocal();
const CURRENT_SCHOOL_DAY_INDEX = Math.min((NOW.getDay() || 7) - 1, 4);

function localSchoolWeekTimestamp(
  schoolDayIndex: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const timestamp = new Date(CURRENT_ISO_WEEK_START);
  timestamp.setDate(timestamp.getDate() + schoolDayIndex);
  timestamp.setHours(hour, minute, second, 0);
  return timestamp;
}

function currentWeekSessionIso(
  preferredDayIndex: number,
  hour: number,
  minute: number,
  second = 0,
): string {
  let actualDayIndex = Math.min(preferredDayIndex, CURRENT_SCHOOL_DAY_INDEX);
  let timestamp = localSchoolWeekTimestamp(actualDayIndex, hour, minute, second);
  while (timestamp > NOW && actualDayIndex > 0) {
    actualDayIndex -= 1;
    timestamp = localSchoolWeekTimestamp(actualDayIndex, hour, minute, second);
  }
  if (timestamp > NOW) {
    timestamp = new Date(NOW.getTime() - MS_PER_MINUTE);
  }
  return timestamp.toISOString();
}

function currentSchoolDayIso(hour: number, minute: number, second = 0): string {
  return currentWeekSessionIso(CURRENT_SCHOOL_DAY_INDEX, hour, minute, second);
}

function stampPlanCreatedAt(planId: string, createdAt: string): void {
  getDb(CLASSROOM)
    .prepare("UPDATE generated_plans SET created_at = ? WHERE plan_id = ?")
    .run(createdAt, planId);
}

function stampPatternReportCreatedAt(reportId: string, createdAt: string): void {
  getDb(CLASSROOM)
    .prepare("UPDATE pattern_reports SET created_at = ? WHERE report_id = ?")
    .run(createdAt, reportId);
}

function stampFamilyMessageCreatedAt(draftId: string, createdAt: string): void {
  getDb(CLASSROOM)
    .prepare("UPDATE family_messages SET created_at = ? WHERE draft_id = ?")
    .run(createdAt, draftId);
}

// ─── INTERVENTIONS ────────────────────────────────────────────────────────────

const interventions: InterventionRecord[] = [
  {
    record_id: "int-demo-001",
    classroom_id: CLASSROOM,
    student_refs: ["Brody"],
    observation:
      "Brody had significant difficulty transitioning back from lunch recess. He stood in the doorway for several minutes, unable to shift into quiet independent work. Body language showed elevated stress — rocking slightly, avoiding eye contact.",
    action_taken:
      "Offered a 5-minute sensory break in the calm corner with the weighted lap pad before joining the group. Used a quiet, low-pressure tone. Did not rush the transition.",
    outcome:
      "Brody rejoined the group calmly after approximately 6 minutes. Settled into seat and engaged with math warm-up within 2 minutes of sitting down.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(6, 13, 18),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-002",
    classroom_id: CLASSROOM,
    student_refs: ["Amira"],
    observation:
      "Amira stalled during a multi-step word problem in math. She read the problem three times but couldn't begin writing. When asked quietly, she said 'I don't know what it's asking.' Her oral explanation of the math concept was accurate — the barrier was language processing, not mathematical reasoning.",
    action_taken:
      "Provided a sentence frame card: 'First I need to find ___, then I need to ___.' Paired Amira with Farid (strong in both Somali and English) to co-plan the solution steps verbally before writing. Amira led the math reasoning; Farid helped with English phrasing.",
    outcome:
      "Amira completed the problem correctly with written work that reflected her actual understanding. Farid benefited from explaining the steps aloud.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(5, 10, 42),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-003",
    classroom_id: CLASSROOM,
    student_refs: ["Daniyal"],
    observation:
      "Daniyal did not follow the end-of-morning transition routine (materials away, move to carpet). He continued drawing at his desk when others had moved. Appeared not to notice the transition had begun — not defiant, just disconnected from classroom cues.",
    action_taken:
      "Used the visual schedule card on his desk to point to 'carpet time.' Asked Farid (seated nearby) to invite Daniyal to walk over together. Gave Daniyal a specific carpet spot with a taped marker.",
    outcome:
      "Daniyal followed Farid to the carpet without resistance. For the next transition (carpet to lunch), he independently checked the visual schedule and moved with the class.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(5, 11, 5),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-004",
    classroom_id: CLASSROOM,
    student_refs: ["Elena"],
    observation:
      "Elena froze during a timed 3-minute multiplication fact quiz. She completed 2 out of 10 questions, then put her pencil down and looked at the ceiling. After class she said 'my brain just goes blank when the timer starts.' Strong conceptual understanding of multiplication observed in previous manipulative work.",
    action_taken:
      "Removed the visible timer for Elena's quiz attempt. Provided base-ten blocks as an optional support. Allowed extended untimed completion after the group finished.",
    outcome:
      "Elena completed 8 out of 10 questions correctly with the manipulatives available (used them for 3 questions). Said 'that was way better' when finished.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(4, 9, 55),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-005",
    classroom_id: CLASSROOM,
    student_refs: ["Brody"],
    observation:
      "Brody independently picked up the visual countdown timer from the supply shelf before the transition from guided reading to math centres. He set it himself and began cleaning up when it reached zero — without any adult prompt.",
    action_taken:
      "Gave specific verbal praise: 'Brody, I noticed you used the timer on your own. That shows real self-management. That's exactly what strong learners do.'",
    outcome:
      "Brody smiled and made eye contact briefly. Transitioned smoothly into math centres. Positive momentum building — this is day 3 of successful post-lunch transitions.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(3, 13, 12),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-006",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal", "Daniyal"],
    observation:
      "During independent reading, Chantal noticed Daniyal was struggling with a word and leaned over to help him without being asked. She pointed to the picture cue and covered the end of the word — using decoding strategies correctly. Daniyal accepted the help without protest.",
    action_taken:
      "Observed without intervening initially. When natural break occurred, quietly adjusted the reading pace: gave Daniyal a slightly shorter text version while keeping Chantal on the standard. Noted Chantal's instinct for peer support.",
    outcome:
      "Daniyal read through two more pages with Chantal nearby. Chantal appeared proud and focused. At end of reading block she said 'I helped Daniyal figure out a word.'",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(3, 10, 30),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-007",
    classroom_id: CLASSROOM,
    student_refs: ["Farid"],
    observation:
      "During math journal time, Farid had strong verbal math reasoning (explained his pattern-finding strategy clearly to a partner) but struggled significantly with transferring thinking to written form. Journal entry had 3 words after 8 minutes. Farid looked frustrated and erased repeatedly.",
    action_taken:
      "Provided sentence frame card ('I noticed ___, so I tried ___. My answer is ___ because ___.'). Offered dictation-then-copy: Farid spoke his explanation to EA while she scribed, then he copied it into his journal. Kept writing expectation to 2-3 sentences.",
    outcome:
      "Farid produced a complete journal entry with his dictated explanation copied. He reread it aloud twice and seemed satisfied. The written work accurately reflected his strong reasoning.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(2, 11, 20),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-008",
    classroom_id: CLASSROOM,
    student_refs: ["Elena", "Amira"],
    observation:
      "Elena and Amira were paired in a small fraction group using physical fraction tiles. Both were highly engaged — building, comparing, and testing equivalencies without prompting. Elena kept reaching for new tiles to test. Session was scheduled for 15 minutes.",
    action_taken:
      "Extended the small group session by 10 minutes. Did not interrupt the flow. Noted that Elena was the one suggesting next explorations ('what if we try sixths?'). Amira was narrating her comparisons in complete English sentences unprompted.",
    outcome:
      "Elena said 'I actually get this now' at the end of the extended session. Amira accurately explained fraction equivalency to the group when we regrouped. Both students produced correct written summaries afterward.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(2, 10, 15),
    schema_version: SCHEMA_V,
  },
  // ─── Chantal scaffold-decay arc (12 records for scaffold-decay eval threshold) ──
  {
    record_id: "int-demo-ch-01",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal could not begin the writing task. Sat looking at the blank page for 4 minutes.",
    action_taken: "Provided full sentence starters and word bank. Modelled the first sentence together.",
    outcome: "Completed 2 of 5 sentences with full scaffold support.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(24, 10, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-02",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal needed sentence starters again for the journal entry. Asked 'what do I write first?'",
    action_taken: "Gave sentence starters card. Sat nearby for the first 3 minutes.",
    outcome: "Completed 3 of 5 sentences. Used sentence starters for all three.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(22, 10, 15),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-03",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal reached for sentence starters immediately at the start of writing block.",
    action_taken: "Provided sentence starters and word bank as requested. No additional modelling needed.",
    outcome: "Completed 4 of 5 sentences. Faster start than previous sessions.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(20, 10, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-04",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal used sentence starters but started her second sentence independently before checking the card.",
    action_taken: "Noted the independent start. Kept sentence starters available but did not prompt their use.",
    outcome: "Completed all 5 sentences. Two started independently, three used sentence starters.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(18, 10, 30),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-05",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal asked for the word bank but did not use sentence starters for the first two sentences.",
    action_taken: "Provided word bank only. Sentence starters on desk but face-down.",
    outcome: "Completed 4 of 5 sentences. Used sentence starters only for the last one.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(16, 10, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-06",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal started writing within 1 minute without reaching for sentence starters. Used word bank for spelling.",
    action_taken: "Observed from a distance. Did not intervene.",
    outcome: "Completed all 5 sentences. Only used word bank for two unfamiliar words.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(14, 10, 15),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-07",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Your records show Chantal completed the writing task independently. Did not ask for sentence starters.",
    action_taken: "No scaffold provided. Word bank available on desk but unused.",
    outcome: "Completed all sentences independently. Writing quality consistent with scaffolded sessions.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(12, 10, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-08",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal struggled slightly on a new topic (persuasive writing) but recovered after re-reading the prompt.",
    action_taken: "Offered word bank for the new topic vocabulary. Did not provide sentence starters.",
    outcome: "Completed 4 of 5 sentences. Quality lower on unfamiliar topic but independent.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(10, 10, 30),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-09",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal wrote independently for the full period. No scaffold requests.",
    action_taken: "No intervention needed.",
    outcome: "Completed all sentences independently. Improving confidence visible in willingness to start.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(8, 10, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-10",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal helped a peer start their writing by suggesting they use the word bank.",
    action_taken: "Acknowledged Chantal's peer support. No scaffold needed for her own work.",
    outcome: "Completed all sentences and assisted a peer. Strong independent writing session.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(6, 10, 15),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-11",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal started the writing task before other students had finished reading the prompt.",
    action_taken: "No intervention. Monitored for accuracy — writing was on-topic and complete.",
    outcome: "Completed early. Used the extra time to add details to her responses.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(4, 10, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-ch-12",
    classroom_id: CLASSROOM,
    student_refs: ["Chantal"],
    observation: "Chantal completed a challenging cross-curricular writing task (science observation report) without any scaffold.",
    action_taken: "No intervention. Sentence starters have not been used for 2 weeks.",
    outcome: "Full independent completion. Your records show clear scaffold withdrawal pattern over past 4 weeks.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(2, 10, 30),
    schema_version: SCHEMA_V,
  },
  // ─── Full-roster interventions (current school week) — referencing new aliases ────
  {
    record_id: "int-demo-020",
    classroom_id: CLASSROOM,
    student_refs: ["Imani"],
    observation:
      "Imani's first day. Sat quietly through morning meeting and appeared overwhelmed when the group moved to literacy centres — stood beside her desk watching the room. Followed other students to the carpet when Chantal gestured her over. Made eye contact briefly twice during the read-aloud. No verbal contribution but tracked the picture book with her eyes.",
    action_taken:
      "Placed visual schedule card on her desk before she arrived. Asked Chantal privately to model the morning routine — pack bag away, get pencil box, go to carpet — without explicit language instructions. Kept all verbal communication brief and paired with gestures or picture cues.",
    outcome:
      "Imani followed each step of the morning routine by end of day. No verbal English but she mimicked Chantal's actions accurately. Left with her belongings organized and a small smile. Follow-up: coordinate with settlement services for home-language support this week.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(4, 9, 12),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-021",
    classroom_id: CLASSROOM,
    student_refs: ["Imani", "Chantal"],
    observation:
      "During snack break, Chantal noticed Imani hesitating at the snack table — unfamiliar with the routine of grabbing a napkin first. Without being asked, Chantal walked over and demonstrated: napkin, snack, sit at the round table. Imani followed exactly. They sat together for the rest of snack.",
    action_taken:
      "Observed without intervening. At end of snack, quietly acknowledged Chantal privately: 'That was kind and exactly right — you taught without making her feel watched.' Did not make it a classroom announcement.",
    outcome:
      "Chantal's peer mentor role (see int-demo-006, Mar 26) extends naturally to the new arrival. Imani has a clear ally for routine questions. Mental note: Chantal's informal support is saving many teacher interventions per day during Imani's first week.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(3, 10, 45),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-023",
    classroom_id: CLASSROOM,
    student_refs: ["Maya"],
    observation:
      "Maya finished the literacy grammar worksheet in 10 minutes — the class had 25. Came to the front quietly and asked 'do you have anything else I could do?' without interrupting the students still working.",
    action_taken:
      "Pulled out the independent extension menu (prepared last week for moments like this) and offered the poetry-analysis option, which she had flagged as interesting. Set it on her desk and said 'try as much as you want; tell me if you get stuck.'",
    outcome:
      "Maya worked on the poetry analysis for the remaining 15 minutes. Produced a thoughtful paragraph on imagery. Independent engagement the whole time. The extension menu is finally working at the pace we hoped for.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(3, 9, 52),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-024",
    classroom_id: CLASSROOM,
    student_refs: ["Quinn"],
    observation:
      "Math fact practice sheet — 20 questions, 5 minutes. Quinn completed 3 questions then put her pencil down and stared at the paper. When I walked by she whispered 'I keep thinking I'll get one wrong.' Conceptual understanding is fine; the issue is the weight she's putting on each attempt.",
    action_taken:
      "Reframed the sheet as a draft: 'This isn't graded. Draw a little D in the corner. The D means draft. Drafts can be wrong — that's how you find what to practice.' Took back the sheet, wrote D in the corner, and handed it back.",
    outcome:
      "Quinn completed 17 of 20 questions in the remaining time. 16 correct. Said 'I didn't know practice could be a draft' at the end of class. The framing matters; she needs written permission to be wrong on practice work.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(3, 10, 22),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-025",
    classroom_id: CLASSROOM,
    student_refs: ["Marco"],
    observation:
      "Marco signed up for next Friday's class share (oral report on a book he chose). He flagged three words to the SLP at last week's consult as ones he worries about mispronouncing: 'expedition,' 'archaeologist,' and 'hieroglyph.' Today he practiced reading his draft report to me at his desk.",
    action_taken:
      "Pre-taught the three flagged words using the SLP's suggested sequence: break into syllables, hum the rhythm, then say it. Practiced each word three times. Had him read the draft once with me following along silently.",
    outcome:
      "Marco read the draft fluently, including the three flagged words. He said 'I don't feel the throat tightness on archaeologist anymore.' Sharing is next Friday — repeat the preview on Thursday. Follow-up: confirm SLP consult schedule covers next week.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(3, 11, 35),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-028",
    classroom_id: CLASSROOM,
    student_refs: ["Navpreet", "Farid"],
    observation:
      "During vocabulary work for this week's social studies unit (community roles), Navpreet and Farid chose to pair up at the same table without being assigned. Navpreet's spoken English is stronger than Farid's; Farid's reading comprehension is stronger than Navpreet's. They took turns reading definitions and Navpreet helped Farid pronounce 'municipality' and 'council' after the third attempt.",
    action_taken:
      "Observed from a distance. Did not interrupt. At the end of the period, made a brief note to pair them again on Thursday for the vocabulary quiz practice.",
    outcome:
      "Both students produced correct vocabulary matching sheets. Navpreet's written work was more complete than usual (he stayed focused to explain concepts to Farid) and Farid's pronunciation of the two target words improved. Mutual benefit — this pairing is worth repeating.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(2, 9, 30),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-031",
    classroom_id: CLASSROOM,
    student_refs: ["Wesley"],
    observation:
      "Wesley finished the grade 4 multiplication worksheet (12 questions) in 8 minutes with every answer correct. Sat at his desk drawing number patterns on scrap paper while the rest of the class continued. When I walked by, he asked 'is there a harder version?'",
    action_taken:
      "Pulled the grade 5 multi-step pattern problem I'd been saving for him (prime numbers and sequences — extends well beyond the grade 4 curriculum). Offered it as a 'try it and show me what you think' task, not an assigned piece. Sat with him for 30 seconds to read the question together.",
    outcome:
      "Wesley solved it in 12 minutes, with a correct written explanation. His reasoning was more structured than I expected — he identified the pattern in two steps and checked his work. Worth documenting as an anchor observation for the GATE program conversation with the resource teacher. Not a referral yet — an observation.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(0, 13, 10),
    schema_version: SCHEMA_V,
  },

  // ─── ENRICHED-STUDENT INTERVENTIONS (D7-D25 newly-complex) ─────────────────

  {
    record_id: "int-demo-032",
    classroom_id: CLASSROOM,
    student_refs: ["Gabriel"],
    observation:
      "Assembly day. Gabriel's hearing aids picked up feedback from the gym PA system — he was visibly uncomfortable, covering his ears and leaning away. Other students didn't notice the issue.",
    action_taken:
      "Moved Gabriel to a seat farther from the speaker. Checked in quietly after assembly — he said the high-pitched sound was 'like a whistle inside my head.' Noted for future assemblies: seat him near the gym door, not the stage.",
    outcome:
      "Gabriel recovered within minutes once moved. Participated in the post-assembly discussion. Need to flag this with the music teacher before Friday concert rehearsal — gym acoustics are the issue, not classroom volume.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(3, 10, 45),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-033",
    classroom_id: CLASSROOM,
    student_refs: ["Hannah"],
    observation:
      "Literacy block writing task. Hannah spent 12 minutes producing two laboured sentences by hand. Her ideas were complex — she was narrating verbally to her neighbour the whole time — but the physical act of handwriting was the bottleneck. She looked frustrated and stopped writing mid-word twice.",
    action_taken:
      "Offered the classroom Chromebook for the remainder of the task. Hannah typed three full paragraphs in 15 minutes — fluent, detailed, well-organized. The contrast between her handwritten and typed output is stark.",
    outcome:
      "Hannah's typed output was the strongest narrative in the class today. This confirms the OT recommendation: keyboard access is not a convenience, it is an access tool. Will ensure Chromebook is on her desk at the start of every writing block going forward. Follow up with OT to document.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(3, 9, 50),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-034",
    classroom_id: CLASSROOM,
    student_refs: ["Jasper"],
    observation:
      "Science lab — new format today (partner experiment with unfamiliar materials). Jasper froze at the transition from desks to lab tables. He stood beside his desk while the rest of the class moved. His face was neutral but his hands were gripping the desk edge.",
    action_taken:
      "Read the social story I'd prepared the night before (3 sentences about what lab time looks like). Walked through the lab layout with him before other students arrived at tables. Paired him with Oliver, who is calm and predictable.",
    outcome:
      "Jasper participated fully once he understood the sequence. He actually led the measurement recording because he noticed a pattern in the data that Oliver missed. The social story + preview combination is reliable for him — need to prep these before any new-format activity.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(2, 10, 55),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-035",
    classroom_id: CLASSROOM,
    student_refs: ["Kiana"],
    observation:
      "Kiana's energy dropped noticeably during the literacy block — she missed her scheduled break because the class was in a read-aloud and she didn't want to interrupt. She was pale and quiet by 10:15, not her usual engaged self.",
    action_taken:
      "Discreetly reminded her that her break schedule is non-negotiable — she doesn't need to ask. Sent her to the office for her check-in with her buddy (Anaya). Updated the visual timer on her desk to beep silently (vibrate mode) rather than waiting for her to notice the clock.",
    outcome:
      "Kiana returned after 10 minutes looking much better. Need to reinforce with the whole class that some students have break schedules that aren't optional — frame it as 'everyone's body has different needs' without singling her out. The vibrate timer should prevent this from recurring.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(2, 10, 20),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-036",
    classroom_id: CLASSROOM,
    student_refs: ["Oliver"],
    observation:
      "Journal writing period. Oliver sat for 8 minutes with a blank page, pen in hand. When I asked what he was thinking about, he gave a detailed, eloquent oral response about his weekend camping trip — vivid details, sequence, description. Then said 'I just can't make my hand write all that.'",
    action_taken:
      "Offered speech-to-text on the Chromebook. Oliver dictated for 6 minutes straight. Then read it back, made two edits, and added a conclusion. Also sketched a quick diagram of the campsite in the margin of his printed version.",
    outcome:
      "Oliver's dictated journal entry was one of the most detailed in the class. The gap between his oral and written expression is the widest I've seen. The resource teacher is monitoring monthly — will share this sample at the next check-in. The key insight: he doesn't lack ideas or language, he lacks an output channel that matches his capacity.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(2, 9, 40),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-037",
    classroom_id: CLASSROOM,
    student_refs: ["Anaya"],
    observation:
      "Social studies — Alberta geography unit. Anaya raised her hand and said 'we did this differently in Ontario.' She described the Ontario curriculum's approach to Canadian geography, which was actually more advanced in some respects. Other students were interested.",
    action_taken:
      "Invited Anaya to share what she'd learned about the Great Lakes in Ontario as a compare-and-contrast with Alberta's river systems. Framed it as 'Anaya is our Ontario expert.' This gave her a role in the classroom and validated her prior learning.",
    outcome:
      "Anaya was visibly more confident for the rest of the period. Two students asked her questions about Ontario afterward. This is the first time she's spontaneously contributed in social studies since transferring. The bridge between her prior curriculum knowledge and Alberta content is a strength, not a gap.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(2, 11, 0),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-038",
    classroom_id: CLASSROOM,
    student_refs: ["Rania", "Farid"],
    observation:
      "Social studies vocabulary work. Rania was stalled on a vocabulary matching activity — she understood the concepts when I explained them in simpler English but couldn't parse the textbook definitions. Farid noticed and moved his chair closer without being asked.",
    action_taken:
      "Let the pair work together. Farid explained three terms to Rania using both Arabic and English — his L3 proficiency made him an effective bridge. Rania's oral storytelling strength meant she could then explain the concepts back to the table group in her own words.",
    outcome:
      "Rania completed the activity and Farid reported that explaining helped him understand the terms better too. Mutual benefit — exactly the peer model dynamic the EAL literature describes. Will seat them together for vocabulary-heavy tasks. Note: Farid and Rania speak different Arabic dialects but communicate effectively.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(1, 11, 15),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-040",
    classroom_id: CLASSROOM,
    student_refs: ["Nadia"],
    observation:
      "Nadia was absent Monday and Tuesday. Returned Wednesday morning. At morning check-in she was quiet but made eye contact. When I asked 'what's one thing you need today?' she said 'just time.' She went to her desk and began drawing in her journal — not the assigned bell work, but her own artwork.",
    action_taken:
      "Let her draw for the full bell-work period without redirecting. After 15 minutes she transitioned to calendar math on her own. At snack break, I checked in again — she said she was 'okay now.' Did not press for details about the absence.",
    outcome:
      "Nadia engaged with the rest of the morning. The art-as-processing strategy is working — she regulates through drawing and then re-enters academic tasks independently. The school counselor confirmed the flexible attendance arrangement is still in place. Key: the morning check-in must happen every day she's present, especially after absences.",
    follow_up_needed: true,
    created_at: recentSchoolDayIso(0, 8, 40),
    schema_version: SCHEMA_V,
  },
  {
    record_id: "int-demo-041",
    classroom_id: CLASSROOM,
    student_refs: ["Gabriel"],
    observation:
      "Math test period. Gabriel requested the quiet workspace because the classroom pencil-scratching noise was amplified by his hearing aids. The single bookshelf desk was already in use for another student's reading conference.",
    action_taken:
      "Set up a temporary second quiet workspace at the reading nook with a portable desk. Gave Gabriel the bookshelf desk (preferential seating near the front, per his accommodation), kept his test materials and full timing.",
    outcome:
      "Gabriel completed the test comfortably and scored 92% — above his typical range. Noise level in the main room was clearly impacting his performance. Will request a second permanent quiet desk from the resource room for test days going forward.",
    follow_up_needed: false,
    created_at: recentSchoolDayIso(0, 13, 30),
    schema_version: SCHEMA_V,
  },
];

// ─── PLANS ────────────────────────────────────────────────────────────────────

const plan1: TomorrowPlan = {
  plan_id: "plan-demo-001",
  classroom_id: CLASSROOM,
  source_artifact_ids: ["int-demo-001", "int-demo-002", "int-demo-003"],
  transition_watchpoints: [
    {
      time_or_activity: "Post-lunch return (approx. 12:55 PM)",
      risk_description:
        "Brody has shown elevated dysregulation at this transition point. The shift from unstructured outdoor time to quiet independent work is the highest-risk moment in his day.",
      suggested_mitigation:
        "Have the calm corner prepped with weighted lap pad before students return. EA to position near doorway and offer Brody a quiet 5-minute buffer before joining the group. Do not draw attention from peers.",
    } as TransitionWatchpoint,
    {
      time_or_activity: "Morning carpet to independent work (approx. 9:15 AM)",
      risk_description:
        "Daniyal has missed transition cues twice this week — not defiant, but disconnected from environmental signals. Without a specific prompt he may remain at carpet while others move.",
      suggested_mitigation:
        "Ensure Daniyal's visual schedule card is on his desk before class. Seat Farid nearby as a natural movement anchor. Give a 2-minute warning before transition.",
    } as TransitionWatchpoint,
    {
      time_or_activity: "Word problem work period (Math, approx. 10:00 AM)",
      risk_description:
        "Amira is likely to stall on language-heavy problems even when her mathematical reasoning is strong. Without support she may disengage silently.",
      suggested_mitigation:
        "Pre-place sentence frame cards at Amira's desk before the period begins. Pre-approve pairing with Farid for any written problem-solving tasks.",
    } as TransitionWatchpoint,
  ],
  support_priorities: [
    {
      student_ref: "Brody",
      reason:
        "Transition dysregulation is the primary barrier to Brody's full participation. Two incidents this week — both resolved with sensory buffer. Pattern is emerging and needs proactive structure, not reactive response.",
      suggested_action:
        "Establish a standing 5-minute sensory break protocol after lunch return. Does not require teacher decision each day — make it a default routine Brody can self-initiate.",
    } as SupportPriority,
    {
      student_ref: "Daniyal",
      reason:
        "Transition disconnection is happening across multiple transition types. Visual schedule alone isn't sufficient without an environmental anchor or peer cue.",
      suggested_action:
        "Assign Farid as Daniyal's transition buddy for this week. Add a visual timer to Daniyal's desk that counts down to each transition — activates his awareness before the group moves.",
    } as SupportPriority,
    {
      student_ref: "Amira",
      reason:
        "Language barrier is masking strong mathematical ability. She shuts down silently rather than asking for help, so the barrier is invisible without close observation.",
      suggested_action:
        "Proactively provide sentence frames for all written math tasks — not as a remediation tool but as a standard scaffold. Consider language-first groupings for complex word problems.",
    } as SupportPriority,
  ],
  ea_actions: [
    {
      description:
        "Set up calm corner with weighted lap pad and noise-dampening headphones before students return from lunch. Post a quiet 'open' sign that Brody knows means the space is available.",
      student_refs: ["Brody"],
      timing: "12:45 PM — 10 minutes before lunch return",
    } as EAAction,
    {
      description:
        "Place visual schedule card on Daniyal's desk and confirm he has reviewed it before morning work begins. Check in after each transition to mark completed steps together.",
      student_refs: ["Daniyal"],
      timing: "8:45 AM — before students arrive at desks",
    } as EAAction,
    {
      description:
        "Pre-distribute sentence frame cards to Amira (and Farid as backup) before math word problem period. Stay available for verbal anchoring if Amira stalls — prompt with 'what do you think the question is really asking?'",
      student_refs: ["Amira", "Farid"],
      timing: "9:55 AM — 5 minutes before math period",
    } as EAAction,
  ],
  prep_checklist: [
    "Print 3 copies of sentence frame cards (math word problem version) — one for Amira, one for Farid, one spare",
    "Confirm weighted lap pad is in calm corner and in good condition",
    "Write Daniyal's name on visual schedule card and laminate if possible",
    "Identify seating: Farid adjacent to both Amira (math) and Daniyal (transitions)",
    "Prepare untimed math quiz version for any student who needs it tomorrow",
    "Review tomorrow's literacy text for complexity — flag any pages with high word density for Daniyal's adjusted version",
  ],
  family_followups: [
    {
      student_ref: "Elena",
      reason:
        "Elena had a strong moment today — completed a multiplication quiz correctly when supports were in place. Worth sharing as a positive update before the timed assessment pattern becomes a concern for the family.",
      message_type: "praise",
    } as FamilyFollowup,
    {
      student_ref: "Amira",
      reason:
        "Update family on new routine: sentence frames and verbal-first problem solving are being used in math to support English language processing. Recommend similar approach if family is supporting homework at home.",
      message_type: "routine_update",
    } as FamilyFollowup,
  ],
  schema_version: SCHEMA_V,
};

const plan2: TomorrowPlan = {
  plan_id: "plan-demo-002",
  classroom_id: CLASSROOM,
  source_artifact_ids: [
    "int-demo-004",
    "int-demo-005",
    "int-demo-006",
    "int-demo-007",
  ],
  transition_watchpoints: [
    {
      time_or_activity: "Post-lunch return (approx. 12:55 PM)",
      risk_description:
        "Brody has now had 3 successful post-lunch transitions using the visual timer independently. Maintain the structure — do not remove the support during positive momentum. Risk is complacency leading to removal of scaffolds too early.",
      suggested_mitigation:
        "Keep calm corner prepped as standard. Acknowledge Brody's self-management explicitly but briefly. If he uses the timer again, note it without making it a big event.",
    } as TransitionWatchpoint,
    {
      time_or_activity: "Math journal writing period (approx. 11:15 AM)",
      risk_description:
        "Farid has strong verbal mathematical reasoning but the writing task creates a bottleneck that obscures his ability. Without scaffolding he becomes visibly frustrated and shuts down.",
      suggested_mitigation:
        "Pre-stage sentence frames and dictation option before the math journal period begins. EA should be available for 5-minute dictation window if needed.",
    } as TransitionWatchpoint,
    {
      time_or_activity: "Timed or assessed tasks (any subject)",
      risk_description:
        "Elena's timed-assessment freeze is now documented. Any timed task format — even informal — may trigger the same response.",
      suggested_mitigation:
        "Default to untimed completion for Elena on all formal assessments until a specific plan is in place. Do not require her to work while timer is visible to the group.",
    } as TransitionWatchpoint,
  ],
  support_priorities: [
    {
      student_ref: "Elena",
      reason:
        "The fraction tile breakthrough (int-demo-004 context; extended session today) shows Elena learns best with concrete manipulatives and no time pressure. Need to consolidate this before Friday and plan for Monday regression risk.",
      suggested_action:
        "Design tomorrow's fraction task so Elena can continue with tiles as primary representation. Offer a 'show me with tiles first, then draw it' structure for the written component.",
    } as SupportPriority,
    {
      student_ref: "Farid",
      reason:
        "Verbal reasoning is strong — this is a writing production gap, not a math gap. The dictation-then-copy approach worked today. Need to make this a consistent option rather than an occasional workaround.",
      suggested_action:
        "Create a standing 'voice first' option for Farid during any journal or written explanation task. EA scribes for 2-3 sentences, Farid copies. Target: reduce the writing barrier enough that frustration doesn't interrupt his thinking.",
    } as SupportPriority,
    {
      student_ref: "Daniyal",
      reason:
        "Transition independence emerged today (self-checked visual schedule for second transition). The Farid buddy system is working. Continue and reinforce — don't drop it early.",
      suggested_action:
        "Keep Farid as transition anchor for rest of week. Begin fading the buddy check-in: have Daniyal check the schedule independently first, then confirm with Farid as backup.",
    } as SupportPriority,
    {
      student_ref: "Chantal",
      reason:
        "Chantal demonstrated genuine peer teaching instinct during independent reading. This is worth developing deliberately — it builds her leadership identity and provides real support for Daniyal.",
      suggested_action:
        "Invite Chantal into a low-stakes 'reading buddy' role for one literacy block this week. Frame it as a classroom responsibility, not tutoring. Observe whether she sustains the engagement.",
    } as SupportPriority,
  ],
  ea_actions: [
    {
      description:
        "Before math journal: place sentence frame card and blank scribe sheet at Farid's desk. When writing period begins, check in at 3 minutes — if Farid has fewer than one sentence, offer dictation mode.",
      student_refs: ["Farid"],
      timing: "11:10 AM — 5 minutes before math journal",
    } as EAAction,
    {
      description:
        "During fraction work: ensure manipulative kit is at Elena's station before the lesson begins. When written task is introduced, whisper the 'tiles first, then draw' option to Elena before she starts.",
      student_refs: ["Elena"],
      timing: "10:00 AM — math lesson start",
    } as EAAction,
  ],
  prep_checklist: [
    "Prepare fraction tile kits — one per small group table, plus one dedicated kit for Elena's station",
    "Print fraction recording sheet with 'draw what you built' option (no written explanation required first)",
    "Prepare scribe sheets for Farid's math journal — lined, with sentence frame printed at top",
    "Confirm Farid is still seated near Daniyal — maintain transition buddy positioning",
    "Plan tomorrow's literacy pairing: Chantal seated near Daniyal for one reading rotation",
    "Check if Elena's family message from Plan 1 was sent — if not, draft today",
  ],
  family_followups: [
    {
      student_ref: "Farid",
      reason:
        "Farid's verbal math reasoning is genuinely strong. Family should know this clearly, even as we work on the writing production gap. Worth communicating that the barrier is writing format, not understanding.",
      message_type: "routine_update",
    } as FamilyFollowup,
  ],
  schema_version: SCHEMA_V,
};

const plan3: TomorrowPlan = {
  plan_id: "plan-demo-003",
  classroom_id: CLASSROOM,
  source_artifact_ids: ["int-demo-007", "int-demo-008"],
  transition_watchpoints: [
    {
      time_or_activity: "Monday morning return (first transition of week)",
      risk_description:
        "Weekend breaks consistently increase transition difficulty for students with routine-dependent regulation. Brody's 3-day independent streak may regress after 2 days away from classroom structure.",
      suggested_mitigation:
        "On Monday morning, proactively place the visual timer on Brody's desk before he arrives. Greet him at the door with a brief orientation: 'Same as last week — timer is on your desk.' Don't wait for dysregulation.",
    } as TransitionWatchpoint,
    {
      time_or_activity: "Monday literacy block — Daniyal",
      risk_description:
        "Daniyal has been making consistent gains with the buddy system. If Farid is absent Monday or the seating changes, Daniyal loses his primary transition anchor.",
      suggested_mitigation:
        "Prepare a backup transition buddy (Chantal as second option — she's shown peer instincts). Brief Chantal Friday afternoon if possible.",
    } as TransitionWatchpoint,
    {
      time_or_activity: "First independent fraction task — Elena",
      risk_description:
        "Elena's breakthrough with tiles was in a supported small-group setting. First independent attempt is always higher risk — she may revert to avoidance if she hits an unfamiliar fraction.",
      suggested_mitigation:
        "Keep tiles accessible for all fraction work through next week. Frame independence as 'try tiles first, then ask' — not 'work without help.'",
    } as TransitionWatchpoint,
  ],
  support_priorities: [
    {
      student_ref: "Brody",
      reason:
        "Three consecutive days of independent timer use and successful post-lunch transitions. This is the longest positive streak observed. Protect it over the weekend break by setting up Monday proactively.",
      suggested_action:
        "Write a brief transition protocol card for Monday: 'Brody's morning routine — timer on desk, calm corner open, no prompting needed unless he asks.' Leave it for the sub or Monday EA rotation.",
    } as SupportPriority,
    {
      student_ref: "Elena",
      reason:
        "End-of-week fraction breakthrough is a genuine turning point. Her self-report ('I actually get this now') is significant — this is metacognitive awareness, not just task completion. Build on it immediately.",
      suggested_action:
        "Design Monday's first fraction task as a low-stakes extension of today's work — same tile format, slightly harder equivalency challenge. Keep the joy of discovery in the structure.",
    } as SupportPriority,
    {
      student_ref: "Chantal",
      reason:
        "Chantal has now spontaneously supported Daniyal twice. This is an emerging peer mentor role. Formalizing it slightly — with her awareness — will benefit both students and give Chantal positive classroom identity.",
      suggested_action:
        "Invite Chantal to be Monday's 'reading room helper' for one rotation. Give her a specific, small task: show the new student where the decodable readers are. Don't over-explain — let her lead.",
    } as SupportPriority,
  ],
  ea_actions: [
    {
      description:
        "Before students arrive Monday: place Brody's visual timer on his desk, confirm calm corner is stocked, write 'Good morning Brody' sticky note on the timer.",
      student_refs: ["Brody"],
      timing: "Monday 8:30 AM — before students arrive",
    } as EAAction,
    {
      description:
        "Brief Chantal privately on Friday afternoon: 'I noticed how you helped Daniyal this week. On Monday I'd like you to be the reading room helper. I'll explain what that means. It's a real job.' Allow her to ask questions.",
      student_refs: ["Chantal"],
      timing: "Friday 2:45 PM — end of day",
    } as EAAction,
    {
      description:
        "Prepare Elena's Monday fraction station: tiles, recording sheet, and a note that reads 'Start with building. Draw what you make. Writing is optional today.' Remove any visible timer from her table area.",
      student_refs: ["Elena"],
      timing: "Friday 3:00 PM — end of day prep",
    } as EAAction,
  ],
  prep_checklist: [
    "Write Brody's Monday transition protocol card and leave it in the sub binder",
    "Prepare Elena's Monday fraction extension task — same tile format, new equivalency challenge",
    "Brief Chantal on reading room helper role — 5 minutes at end of Friday",
    "Confirm Farid's seating for Monday keeps him adjacent to Daniyal",
    "Check Amira's sentence frame supply — replenish if fewer than 3 cards",
    "Draft Brody's family praise message for approval — milestone: 3 days independent transitions",
    "Review Monday schedule for any timed assessments — flag and modify for Elena",
  ],
  family_followups: [
    {
      student_ref: "Brody",
      reason:
        "Brody has independently used the visual transition timer for 3 consecutive days. This is a significant milestone in self-regulation. Family should hear this as concrete, specific progress — not a vague positive report.",
      message_type: "praise",
    } as FamilyFollowup,
  ],
  schema_version: SCHEMA_V,
};

// ─── PATTERN REPORT ───────────────────────────────────────────────────────────

const patternReport: SupportPatternReport = {
  report_id: "pat-demo-001",
  classroom_id: CLASSROOM,
  student_filter: null,
  time_window: 9,
  recurring_themes: [
    {
      theme: "Post-lunch and mid-morning transition difficulty",
      student_refs: ["Brody", "Daniyal"],
      evidence_count: 4,
      example_observations: [
        "Brody stood in doorway for several minutes unable to shift into quiet work after lunch (int-demo-001, Mar 20)",
        "Daniyal did not follow end-of-morning transition routine — continued drawing while group moved to carpet (int-demo-003, Mar 22)",
        "Brody required sensory buffer before rejoining group at post-lunch return (int-demo-001)",
        "Daniyal missed transition cue despite visual schedule being present — cue needs environmental anchor, not just card (int-demo-003)",
      ],
    } as RecurringTheme,
    {
      theme: "Language barrier obscuring mathematical ability in written tasks",
      student_refs: ["Amira", "Farid"],
      evidence_count: 3,
      example_observations: [
        "Amira stalled on word problem — read it three times but couldn't begin writing despite accurate oral explanation of the math (int-demo-002, Mar 21)",
        "Farid had 3 words in journal after 8 minutes — strong verbal explanation, complete shutdown on written transfer (int-demo-007, Mar 27)",
        "Sentence frames resolved both students' written production immediately — indicates scaffold gap, not comprehension gap (int-demo-002, int-demo-007)",
      ],
    } as RecurringTheme,
    {
      theme: "Manipulative-supported confidence breakthrough in mathematics",
      student_refs: ["Elena", "Amira"],
      evidence_count: 2,
      example_observations: [
        "Elena completed 8/10 multiplication questions correctly with base-ten blocks available after freezing on timed version (int-demo-004, Mar 24)",
        "Elena and Amira both engaged deeply with fraction tiles — Elena led explorations, Amira narrated in complete English sentences (int-demo-008, Mar 28)",
      ],
    } as RecurringTheme,
  ],
  follow_up_gaps: [
    {
      original_record_id: "int-demo-003",
      student_refs: ["Daniyal"],
      observation:
        "Daniyal did not follow transition routine and required peer anchor + visual schedule. Follow-up noted: needed to assess whether independent transition generalizes across all transition types, not just carpet-to-lunch.",
      days_since: 6,
    } as FollowUpGap,
    {
      original_record_id: "int-demo-004",
      student_refs: ["Elena"],
      observation:
        "Elena froze during timed multiplication quiz. Underlying timed-assessment anxiety noted. Follow-up needed: formal plan for assessment accommodations and communication with resource teacher.",
      days_since: 4,
    } as FollowUpGap,
  ],
  positive_trends: [
    {
      student_ref: "Brody",
      description:
        "Your records show a clear progression from reactive dysregulation to proactive self-management over 5 days. On March 20, Brody required adult-initiated sensory support to transition. By March 25, he independently picked up the visual timer, set it himself, and moved to the next activity without prompting. This is not incremental — it is a qualitative shift in self-regulation strategy.",
      evidence: [
        "Mar 20 (int-demo-001): Adult offered sensory break after Brody stalled in doorway",
        "Mar 25 (int-demo-005): Brody independently retrieved visual timer, set it, and transitioned at zero without adult prompt",
        "Mar 25 (int-demo-005): Three consecutive successful post-lunch transitions noted — longest positive streak in records",
      ],
    } as PositiveTrend,
    {
      student_ref: "Chantal",
      description:
        "Chantal has demonstrated spontaneous peer mentoring behavior in two separate contexts this week. She is using correct literacy strategies (picture cues, word covering) and applying them without adult direction. Her classroom identity is shifting toward capable helper — a role that increases her own engagement and provides natural differentiation support for peers.",
      evidence: [
        "Mar 26 (int-demo-006): Chantal noticed Daniyal struggling with a word and used picture cue + word cover strategy to help him, unprompted",
        "Mar 26 (int-demo-006): Daniyal accepted the support without protest and read two more pages",
        "Chantal self-reported at end of block: 'I helped Daniyal figure out a word' — indicates positive self-concept around the role",
      ],
    } as PositiveTrend,
  ],
  suggested_focus: [
    {
      student_ref: "Daniyal",
      reason:
        "Transition support follow-up is 6 days overdue. Buddy system is working but no formal plan documents it, and no backup buddy exists if Farid is absent. One incident without a plan in place could erase recent gains.",
      suggested_action:
        "Document current buddy system as a formal accommodation. Identify Chantal as backup transition anchor. Brief both students on their roles. Share plan with resource teacher this week.",
      priority: "high",
    } as SuggestedFocus,
    {
      student_ref: "Elena",
      reason:
        "Timed-assessment accommodation follow-up is 4 days overdue. The freeze pattern is documented across two separate assessment formats (multiplication quiz, general timed tasks). Without a formal accommodation plan, Elena will continue to encounter timed assessments that mask her actual ability.",
      suggested_action:
        "Draft a simple assessment accommodation plan: untimed completion default, manipulatives available, no visible group timer. Bring to resource teacher or learning support team for review. Do not wait for a third incident.",
      priority: "high",
    } as SuggestedFocus,
    {
      student_ref: "Farid",
      reason:
        "Writing production gap is emerging as a consistent barrier. Dictation-then-copy worked once but has not been formalized. Without a standing scaffold, Farid will continue to hit the same wall on every written math task.",
      suggested_action:
        "Establish 'voice first' as a standing option for Farid in all journal and written explanation tasks. Create a simple scribe sheet template. Consider whether this warrants mention in a student support plan.",
      priority: "medium",
    } as SuggestedFocus,
  ],
  generated_at: recentSchoolDayIso(1, 15, 0),
  schema_version: SCHEMA_V,
};

// ─── FAMILY MESSAGE ───────────────────────────────────────────────────────────

const familyMessage: FamilyMessageDraft = {
  draft_id: "msg-demo-001",
  classroom_id: CLASSROOM,
  student_refs: ["Elena"],
  message_type: "praise",
  target_language: "en",
  plain_language_text: `Dear Elena's family,

I wanted to share some exciting news from our math class today.

Elena had a real breakthrough moment with fractions. During a small group activity, she worked with physical fraction tiles — building, comparing, and testing different fraction combinations. She was the one suggesting new things to try, and at the end she told me, "I actually get this now."

That kind of confidence with a tricky concept is a big deal, and I wanted you to know about it right away.

Elena learns best when she can work with concrete materials and has time to explore without pressure. We'll keep building on this approach in the coming weeks.

Warmly,
Ms. Okafor`,
  simplified_student_text:
    "Elena, today you figured out fractions using the fraction tiles. You kept trying new things and said 'I actually get this now.' That was a great math moment. Keep it up!",
  teacher_approved: false,
  schema_version: SCHEMA_V,
};

// ─── SEED ────────────────────────────────────────────────────────────────────

console.log(`\nSeeding demo classroom: ${CLASSROOM}`);
console.log(`Model: ${MODEL}`);
console.log("─".repeat(50));

console.log("\nSaving interventions...");
for (const record of interventions) {
  saveIntervention(CLASSROOM, record, MODEL);
  console.log(`  ✓ ${record.record_id} — ${record.student_refs.join(", ")} (${record.created_at.slice(0, 10)})`);
}

console.log("\nSaving plans...");
const plans = [
  {
    plan: plan1,
    reflection:
      "Hard week so far. Brody and Daniyal both struggling with transitions in different ways. Amira's language barrier is invisible unless you're watching closely — her math is solid. Need to build better scaffolds before tomorrow.",
  },
  {
    plan: plan2,
    reflection:
      "Brody momentum is real — don't touch it. Farid surprised me today, he explained the pattern perfectly verbally then could barely write a word. Elena froze on the quiz but then crushed it with blocks. The manipulative thing is worth leaning into.",
  },
  {
    plan: plan3,
    reflection:
      "End of week. Elena's 'I actually get this now' is the highlight of the month. Chantal is becoming a classroom asset — she doesn't know it yet. Want to plan Monday carefully — don't want Brody's streak to break over the weekend.",
  },
];

for (const { plan, reflection } of plans) {
  savePlan(CLASSROOM, plan, reflection, MODEL);
  console.log(`  ✓ ${plan.plan_id}`);
}
stampPlanCreatedAt(plan1.plan_id, currentSchoolDayIso(8, 10));
stampPlanCreatedAt(plan2.plan_id, currentSchoolDayIso(8, 11));
stampPlanCreatedAt(plan3.plan_id, currentSchoolDayIso(8, 12));
console.log(`  ✓ latest plan pointer fixed at ${plan3.plan_id}`);

console.log("\nSaving pattern report...");
savePatternReport(CLASSROOM, patternReport, MODEL);
stampPatternReportCreatedAt(patternReport.report_id, currentSchoolDayIso(8, 9));
console.log(`  ✓ ${patternReport.report_id} (${patternReport.recurring_themes.length} themes, ${patternReport.follow_up_gaps.length} gaps, ${patternReport.positive_trends.length} positive trends)`);

console.log("\nSaving family message...");
saveFamilyMessage(CLASSROOM, familyMessage, MODEL);
console.log(`  ✓ ${familyMessage.draft_id} — draft saved`);

console.log("\nApproving family message...");
approveFamilyMessage(CLASSROOM, familyMessage.draft_id);
stampFamilyMessageCreatedAt(familyMessage.draft_id, currentSchoolDayIso(8, 14));
console.log(`  ✓ ${familyMessage.draft_id} — approved`);

// ─── SESSION USAGE (drives Review → Usage Insights + Today workflow nudge) ──
// Seeded sessions mix realistic multi-panel teacher workflows so the Usage
// Insights "Common workflows" strip demonstrates arrow-joined flows (not just
// single-panel visits). The same records now feed the top-of-Today workflow
// nudge by looking for the most common repeated sequence that starts on
// `today`. Repeating a sequence boosts both summaries. Session timestamps are
// anchored inside the local ISO week and clamped to the latest completed
// school-day timestamp, so a fresh reseed stays on the literal "this week"
// path without creating future-dated demo records.
const sessions = [
  // Morning triage flow — seeded 2x so it wins the #1 slot.
  {
    session_id: "sess-demo-001",
    started_at: currentWeekSessionIso(0, 8, 5),
    ended_at: currentWeekSessionIso(0, 8, 21, 30),
    panels_visited: ["today", "log-intervention", "tomorrow-plan"],
    generations_triggered: [
      { panel_id: "tomorrow-plan", prompt_class: "prepare_tomorrow_plan", timestamp: currentWeekSessionIso(0, 8, 18) },
    ],
    feedback_count: 1,
  },
  {
    session_id: "sess-demo-002",
    started_at: currentWeekSessionIso(1, 8, 2),
    ended_at: currentWeekSessionIso(1, 8, 19),
    panels_visited: ["today", "log-intervention", "tomorrow-plan"],
    generations_triggered: [
      { panel_id: "tomorrow-plan", prompt_class: "prepare_tomorrow_plan", timestamp: currentWeekSessionIso(1, 8, 16) },
    ],
    feedback_count: 1,
  },
  // Prep block — classic two-stop flow.
  {
    session_id: "sess-demo-003",
    started_at: currentWeekSessionIso(2, 15, 40),
    ended_at: currentWeekSessionIso(2, 16, 2),
    panels_visited: ["differentiate", "language-tools"],
    generations_triggered: [
      { panel_id: "differentiate", prompt_class: "differentiate_material", timestamp: currentWeekSessionIso(2, 15, 48) },
      { panel_id: "language-tools", prompt_class: "generate_vocab_cards", timestamp: currentWeekSessionIso(2, 15, 58) },
    ],
    feedback_count: 2,
  },
  // Review flow — pattern reflection + family follow-up.
  {
    session_id: "sess-demo-004",
    started_at: currentWeekSessionIso(4, 15, 10),
    ended_at: currentWeekSessionIso(4, 15, 28),
    panels_visited: ["today", "support-patterns", "family-message"],
    generations_triggered: [
      { panel_id: "support-patterns", prompt_class: "detect_support_patterns", timestamp: currentWeekSessionIso(4, 15, 18) },
      { panel_id: "family-message", prompt_class: "draft_family_message", timestamp: currentWeekSessionIso(4, 15, 25) },
    ],
    feedback_count: 1,
  },
  // Solo EA briefing — a tail single-panel visit for contrast.
  {
    session_id: "sess-demo-005",
    started_at: currentWeekSessionIso(1, 8, 35),
    ended_at: currentWeekSessionIso(1, 8, 42),
    panels_visited: ["ea-briefing"],
    generations_triggered: [
      { panel_id: "ea-briefing", prompt_class: "generate_ea_briefing", timestamp: currentWeekSessionIso(1, 8, 38) },
    ],
    feedback_count: 0,
  },
];

console.log("\nSaving sessions...");
for (const s of sessions) {
  saveSession(CLASSROOM, {
    id: s.session_id,
    classroom_id: CLASSROOM,
    session_id: s.session_id,
    started_at: s.started_at,
    ended_at: s.ended_at,
    panels_visited: s.panels_visited,
    generations_triggered: s.generations_triggered,
    feedback_count: s.feedback_count,
  });
  console.log(`  ✓ ${s.session_id} — ${s.panels_visited.join(" → ")}`);
}

closeAll();

console.log("\n" + "─".repeat(50));
console.log("Demo seed complete.");
console.log(`  Interventions:    ${interventions.length}`);
console.log(`  Plans:            ${plans.length}`);
console.log(`  Pattern reports:  1`);
console.log(`  Family messages:  1 (approved)`);
console.log(`  Sessions:         ${sessions.length}`);
console.log(`\n  DB: data/memory/${CLASSROOM}.sqlite`);
console.log("─".repeat(50) + "\n");
