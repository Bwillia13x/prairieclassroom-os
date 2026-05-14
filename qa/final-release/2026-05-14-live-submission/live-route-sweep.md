# Live Submission Route Sweep

Base: https://prairieclassroom-os.vercel.app
Captured: 2026-05-14T20:37:20.748Z

## First Run

```json
{
  "href": "https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34",
  "title": "PrairieClassroom OS",
  "todayVisible": true,
  "accessDialogVisible": false,
  "rolePromptVisible": false,
  "onboardingVisible": false,
  "activeClassroom": "",
  "firstVisibleText": "TodayTodaySame-day triage for Grade 3-4: recommended next move, immediate risks, and the carry-forward you committed to before the day started.26 studentsTodayAfter-school closeout: capture notes, messages, and tomorrow's first move.Do this nowAfter-school closeoutClose today's loop for BrodyAfter-school closeout: capture the evidence and next move — Recurring struggles with post-lunch regulation as noted in your pattern review..Do this now: Support PatternsStudentBrodyWindow12:45-1:45Open27NowMath blockToday's flowCurrent8:30-9:158:30-9:15Status: currentNowMath blockArrival of a new Somali-speaking EAL student requiring immediate orientationCurrent focus9:15-9:30Status: pastBreakBased on your documented observations, this is a sensory peak for BrodyComplete9:30-10:30Status: pastReading blockHigh concentration of EAL students (9 total) requiring tiered language supportsComplete10:30-10:4"
}
```

## Routes

| Viewport | Route | Screenshot | Overflow | Blocking UI | Footer Gemma |
| --- | --- | --- | ---: | --- | --- |
| desktop | today | desktop-today.png | 0 | none | no |
| desktop | classroom | desktop-classroom.png | 0 | none | no |
| desktop | tomorrow-plan | desktop-tomorrow-plan.png | 0 | none | yes |
| desktop | week | desktop-week.png | 0 | none | no |
| desktop | prep-differentiate | desktop-prep-differentiate.png | 0 | none | no |
| desktop | ops-ea-load | desktop-ops-ea-load.png | 0 | none | yes |
| desktop | review-family-message | desktop-review-family-message.png | 0 | none | yes |
| desktop | review-support-patterns | desktop-review-support-patterns.png | 0 | none | yes |
| mobile | today | mobile-today.png | 0 | none | no |
| mobile | classroom | mobile-classroom.png | 0 | none | no |
| mobile | tomorrow-plan | mobile-tomorrow-plan.png | 0 | none | yes |
| mobile | week | mobile-week.png | 0 | none | no |
| mobile | prep-differentiate | mobile-prep-differentiate.png | 0 | none | no |
| mobile | ops-ea-load | mobile-ops-ea-load.png | 0 | none | yes |
| mobile | review-family-message | mobile-review-family-message.png | 0 | none | yes |
| mobile | review-support-patterns | mobile-review-support-patterns.png | 0 | none | yes |

## Runtime Findings

### desktop

- console warnings/errors: 0
- page errors: 0
- failed requests: 9
- bad responses: 0

```json
{
  "consoleEvents": [],
  "pageErrors": [],
  "failedRequests": [
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    }
  ],
  "badResponses": []
}
```
### mobile

- console warnings/errors: 0
- page errors: 0
- failed requests: 8
- bad responses: 0

```json
{
  "consoleEvents": [],
  "pageErrors": [],
  "failedRequests": [
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    },
    {
      "url": "https://prairieclassroom-orchestrator.onrender.com/api/sessions",
      "method": "POST",
      "failure": "net::ERR_ABORTED"
    }
  ],
  "badResponses": []
}
```

## Command Palette

```json
{
  "visible": true,
  "text": "ACTIONSactionRecommended now: Support PatternsNowNowPAGESpanelTodayLive-day triage — recommended next move, immediate risks, carry-forward.1panelClassroomBird's-eye dashboard — health, coverage, queues, student watch.2panelTomorrowNext-day plan, complexity forecast, and queued carry-forward.3panelWeekMulti-day coverage, upcoming events, planning rhythm, pattern pressure.4panelPrepLesson adaptation and language supports — differentiate and language tools.5panelOpsAdult coordination — log intervention, EA briefing, EA load, substitute packet.6panelReviewFamily message, support patterns, and usage insights.7TOOLStoolPrep · DifferentiatePreptoolPrep · Language ToolsPreptoolTomorrow · Tomorrow PlanTomorrowtoolTomorrow · ForecastTomorrowtoolOps · Log InterventionOpstoolOps · EA BriefingOpstoolOps · EA Load BalanceOpstoolOps · Sub PacketOpstoolReview · Family MessageReviewtoolReview · Support P",
  "overflowX": 0
}
```