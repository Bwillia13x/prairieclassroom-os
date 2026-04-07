# PrairieClassroom OS — Teacher-Friction Roadmap

**Date:** 2026-04-07
**Status:** Design
**Scope:** Phased roadmap from hackathon submission to production-ready teacher tool

---

## Context

Phase A is complete: 62/64 evals pass, 11 prompt classes operational, frontend decomposed into 9 panels + 18 components (~16.4k LOC). The system *works*. But a teacher-POV friction audit (2026-04-07) revealed that the generation UX is strong (1-3 clicks per output) while orientation, continuity, and daily-use ergonomics are weak.

This roadmap addresses 13 friction points across 3 phases. Phase 1 targets hackathon submission. Phases 2-3 target real teacher deployment.

---

## Phase 1 — "Hackathon Ready"

**Goal:** Make the demo stunning *and* solve the teacher's highest daily friction. Everything in this phase serves both judges and teachers.

**Exit criteria:** Demo script runs end-to-end with no generic-looking screens, morning dashboard loads in <500ms, visual identity is distinctive.

### 1A. Morning Dashboard / Today View (F-1)

**Problem:** Teacher opens app → lands on Differentiate tab → must tab-hop 3-4 panels to build situational awareness. Costs 2-5 min/day.

**Solution:** New `TodayPanel` as the default landing tab (position 0, before Lesson Prep group). Powered by the existing `GET /api/debt-register/:classroomId` endpoint — no model call, pure SQL/TS retrieval.

**What it shows:**
- **Pending actions count** — unapproved family messages, stale followups, interventions needing review. Sourced from debt register's `stale_followups`, `unapproved_messages`, `recurring_plan_mentions`, and `review_windows` arrays.
- **Yesterday's plan summary** — if a plan was generated, show the support priorities and prep checklist as a quick recap. Requires new `GET /api/plans/:classroomId/latest` endpoint (simple query on existing `plans` SQLite table, ordered by `created_at DESC LIMIT 1`).
- **Quick-action links** — clickable cards that navigate to the relevant tab with context: "3 unapproved messages" → Family Message tab, "2 stale followups" → Log Intervention tab.
- **Complexity snapshot** — if a forecast exists for today, show the color-coded timeline bar (reuse `ForecastTimeline` component from ForecastPanel).

**What it does NOT show:** No model-generated content. No chat. No new AI calls. This is a *retrieval-only* view that composes existing data.

**Data contract:**
```typescript
// New API endpoint
GET /api/today/:classroomId

// Response
interface TodaySnapshot {
  debt_register: ComplexityDebtRegister; // existing type from packages/shared/schemas/debt.ts
  latest_plan: TomorrowPlan | null;    // existing type, nullable
  latest_forecast: ComplexityForecast | null; // existing type, nullable
  student_count: number;
  last_activity_at: string | null;     // most recent intervention/plan timestamp
}
```

**New files:**
- `apps/web/src/panels/TodayPanel.tsx` — dashboard view
- `apps/web/src/components/PendingActionsCard.tsx` — clickable action counts
- `apps/web/src/components/PlanRecap.tsx` — condensed plan summary

**Modified files:**
- `apps/web/src/App.tsx` — add Today tab at position 0, update TAB_ORDER, default activeTab to `"today"`
- `apps/web/src/components/MobileNav.tsx` — prepend Today as a single-tab "Today" group before Prep (new first group in GROUPS array)
- `services/orchestrator/server.ts` — add `GET /api/today/:classroomId` route composing debt register + latest plan + latest forecast

### 1B. Visual Identity Refresh

**Problem:** The UI is functionally complete but visually indistinguishable from any SaaS dashboard. Judges and teachers both form first impressions in seconds.

**Solution:** CSS custom property cascade. Because the design system is already tokenized (`index.css` has ~65 custom properties), changing the identity is a property-level operation, not a component rewrite.

**Changes:**
- **Typography:** Already done — Source Sans 3 (body) + Fraunces (headings) are loaded
- **Palette:** Already shifted to warm earth tones (wheat `#faf8f3` bg, bronze `#b07a2b` accent). Verify dark mode equivalents.
- **SVG mark:** Already exists in App.tsx header (prairie horizon line). Polish if needed.
- **Subtle texture:** Add optional CSS grain overlay on `--color-bg` for warmth. Disable in `prefers-reduced-motion`.
- **Section border colors:** The plan viewer already uses unique border colors per section (watchpoint gold, priority bronze, EA teal, family purple). Extend this language to other panels.

**Scope check:** Per the memory file, gaps 1 (Visual Identity) and 5 (Empty State SVGs) are already resolved. Verify current state before doing redundant work. Remaining visual work is gaps 2 (entrance motion), 4 (forecast timeline viz), 6 (vocab card redesign), and 8 (survival packet print polish).

### 1C. Entrance Motion (Gap 2)

**Problem:** Results appear instantly with no transition. Teachers wait 2-90s for generation; the arrival should feel like a payoff.

**Solution:**
- Staggered `fade-up` animation on result sections (plan cards, variant grid, message draft). CSS `@keyframes` with `animation-delay` per child index.
- Crossfade on tab switch via CSS `opacity` transition on tab panels.
- Respect `prefers-reduced-motion: reduce` — disable all motion.
- Spring-feel on primary buttons via `transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)`.

**New files:**
- `apps/web/src/motion.css` — all animation keyframes and transition classes, centralized

**Modified files:**
- `apps/web/src/App.css` — import motion.css, add transition classes to tab panels
- Panel result containers — add `fade-up` class to result wrappers

### 1D. Strip Developer Metadata (F-5)

**Problem:** `PlanViewer`, `MessageDraft`, and other result views show `342ms · gemma-4-27b-it · v1`. Teachers don't need this.

**Solution:** Remove `latencyMs`, `modelId`, and `schema_version` from all result viewer components. Keep the data in the API response (useful for evals and debugging) — just don't render it.

**Modified files:**
- `apps/web/src/components/PlanViewer.tsx` — remove `.plan-meta` line
- `apps/web/src/components/MessageDraft.tsx` — remove `.draft-meta` line
- All other result viewers that display model metadata

### 1E. Forecast Timeline Visualization (Gap 4)

**Problem:** Complexity Forecast renders as flat text cards. Should show shape-of-day at a glance.

**Solution:** Horizontal CSS-only timeline bar above the detail cards. Each block is a colored segment (`--color-forecast-low/medium/high`) with the time slot label. Clicking a segment scrolls to the detail card below.

**New files:**
- `apps/web/src/components/ForecastTimeline.tsx` — reusable timeline bar (also used by TodayPanel)

**Modified files:**
- `apps/web/src/panels/ForecastPanel.tsx` — render `ForecastTimeline` above existing cards

---

## Phase 2 — "Teacher Trust"

**Goal:** Make teachers rely on the system day-over-day. These features solve continuity and memory friction — the things that determine whether a teacher opens the app on Day 30.

**Exit criteria:** Teacher can recall any past plan/message/intervention from the UI. Forms survive tab-switching and page reloads. Language defaults match student profiles.

### 2A. Output History and Recall (F-4)

**Problem:** Page reload erases all generated outputs. Teachers can't say "show me Monday's plan" or "did I message Liam's family?"

**Solution:** History drawer accessible from each panel. Backend already persists plans, messages, interventions, and patterns to SQLite. The UI just needs read-back endpoints and a timeline component.

**New API endpoints:**
```
GET /api/plans/:classroomId?limit=10          → TomorrowPlan[]
GET /api/family-messages/:classroomId?limit=10 → FamilyMessageDraft[]
GET /api/interventions/:classroomId?limit=20   → InterventionRecord[]
GET /api/patterns/:classroomId?limit=5         → SupportPatternReport[]
```

**UI pattern:** Each panel gets a small "History" toggle (icon button) that opens a right-side drawer or inline list showing recent outputs with timestamps. Clicking an entry loads it into the result viewer (read-only, no re-generation).

**New files:**
- `apps/web/src/components/HistoryDrawer.tsx` — generic history list, parameterized by type
- `apps/web/src/hooks/useHistory.ts` — fetch + cache hook for history endpoints

**Modified files:**
- `apps/web/src/api.ts` — add GET functions for each history endpoint
- `services/orchestrator/server.ts` — add GET routes for plans, messages, interventions, patterns
- `TomorrowPlanPanel`, `FamilyMessagePanel`, `InterventionPanel`, `SupportPatternsPanel` — add HistoryDrawer toggle

### 2B. Student-Language Association (F-3)

**Problem:** MessageComposer defaults to English every time. Teacher must remember each family's language.

**Solution:** Add optional `family_language` field to `StudentSupportSummarySchema`. When a student is selected in MessageComposer, auto-select their family's language. Teacher can still override.

**Schema change:**
```typescript
// packages/shared/schemas/classroom.ts
StudentSupportSummarySchema = z.object({
  // ... existing fields
  family_language: z.string().optional(), // ISO 639-1 code: "ar", "uk", "tl", etc.
});
```

**Data update:** Add `family_language` to demo classroom student records in `data/demo/`.

**UI change:** `MessageComposer` watches `studentRef` changes → looks up student profile → sets `targetLanguage` if `family_language` is present.

**Modified files:**
- `packages/shared/schemas/classroom.ts` — add field
- `data/demo/*.json` — add language to student records
- `apps/web/src/types.ts` — mirror field
- `apps/web/src/components/MessageComposer.tsx` — auto-select language on student change

### 2C. Draft Persistence / Autosave (F-8)

**Problem:** Teacher gets interrupted, switches tabs, comes back — form is blank. Teachers get interrupted constantly.

**Solution:** `useFormPersistence` hook that debounce-saves form state to `sessionStorage` keyed by panel name + classroom ID. Restores on mount. Clears on successful submit.

**New files:**
- `apps/web/src/hooks/useFormPersistence.ts`

**Modified files:**
- `TeacherReflection.tsx`, `ArtifactUpload.tsx`, `MessageComposer.tsx`, `InterventionLogger.tsx` — wrap form state with hook

**Design constraint:** `sessionStorage` only (not `localStorage`) — drafts clear when the browser tab closes. This prevents stale drafts from last week surprising the teacher.

### 2D. Multi-Student Message Batching (F-6)

**Problem:** UI restricts to single-student selection despite API supporting `student_refs[]`.

**Solution:** Replace single `<select>` with checkbox list in `MessageComposer`. Group-select by message type ("Routine Update for all 6 selected students" → generates one message addressing the group).

**Modified files:**
- `apps/web/src/components/MessageComposer.tsx` — replace `<select>` with multi-select checkboxes
- `apps/web/src/components/MessageComposer.css` — style checkbox group

### 2E. Pending-Actions Visibility (F-13)

**Problem:** Plan generates family followups and intervention suggestions but if teacher doesn't act immediately, they vanish.

**Solution:** Badge counts on tab buttons. The TodayPanel's debt register data (from Phase 1A) is lifted into AppContext so all tabs can display badge counts without additional API calls.

**Modified files:**
- `apps/web/src/App.tsx` — fetch debt register on classroom change, pass counts to tab buttons
- `apps/web/src/App.css` — badge styling on tab buttons
- `apps/web/src/components/MobileNav.tsx` — badge counts on mobile group buttons

---

## Phase 3 — "Operational Depth"

**Goal:** Extend the system's input surface, output portability, and backend resilience. These features make PrairieClassroom OS suitable for multi-classroom, multi-teacher deployment.

**Exit criteria:** Teachers can upload file-based artifacts. All output panels have print/export. New teachers get an onboarding experience. Server is decomposed and observable.

### 3A. File Upload for Artifacts (F-2)

**Problem:** ArtifactUpload only accepts pasted text. Teachers have PDFs, images, and Google Docs.

**Solution:** Add file input to ArtifactUpload. Frontend reads the file and sends it as base64 in the existing `raw_text` field (for text-based files) or a new `raw_image` field (for images). Backend text extraction via `pdf-parse` (PDFs) or direct pass-through (images → multimodal Gemma input).

**Scope:** Text files (PDF, DOCX, TXT) in Phase 3A. Image-based multimodal input deferred to Phase 3+ pending Gemma 4 multimodal availability.

**New files:**
- `apps/web/src/components/FileUploadZone.tsx` — drag-and-drop + file picker component
- `services/orchestrator/middleware/fileExtract.ts` — PDF/DOCX text extraction middleware

**Modified files:**
- `apps/web/src/components/ArtifactUpload.tsx` — add FileUploadZone, populate rawText from extraction
- `packages/shared/schemas/differentiate.ts` — add optional `file_data` field

### 3B. Print/Export on All Panels (F-9)

**Problem:** Only PlanViewer has a print button. EA Briefing and Survival Packet especially need print capability.

**Solution:** Shared `PrintButton` component that triggers `window.print()` with panel-specific `@media print` styles. Add to: EABriefingPanel, SurvivalPacketPanel, ForecastPanel, SupportPatternsPanel.

**New files:**
- `apps/web/src/components/PrintButton.tsx`
- `apps/web/src/print.css` — consolidated print styles for all panels

**Modified files:**
- 4 panel components — add PrintButton
- Existing `PlanViewer.tsx` — migrate inline print button to shared component

### 3C. Onboarding Flow (F-10)

**Problem:** New teacher sees 9 tabs with no guidance on workflow order.

**Solution:** First-visit overlay (checked via `localStorage` flag) that walks through the 3 tab groups with 3 steps: "Start with Prep → Plan your day with Ops → Review and communicate with Review." Dismissable, re-accessible from a help icon in the header.

**New files:**
- `apps/web/src/components/OnboardingOverlay.tsx`

**Modified files:**
- `apps/web/src/App.tsx` — render overlay on first visit

### 3D. Server Decomposition

**Problem:** `server.ts` is 1292 lines with all routing in one file.

**Solution:** Extract into route modules: `routes/differentiate.ts`, `routes/tomorrow-plan.ts`, `routes/family-message.ts`, etc. Each module exports an Express Router. `server.ts` becomes a slim shell that mounts routers and middleware.

**Modified files:**
- `services/orchestrator/server.ts` — extract routes
- New `services/orchestrator/routes/*.ts` — one file per prompt class

### 3E. Backend Hardening

**Problem:** No retry, no observability, no prompt injection defense (from original gap analysis G-07, G-08, G-09).

**Solution:**
- **Retry with backoff** on inference calls (max 2 retries, exponential backoff)
- **Request logging middleware** — structured JSON logs with request ID, latency, route, status
- **Input sanitization** — strip known prompt injection patterns from teacher free-text before prompt assembly

**New files:**
- `services/orchestrator/middleware/retry.ts`
- `services/orchestrator/middleware/requestLogger.ts`
- `services/orchestrator/middleware/inputSanitizer.ts`

---

## Phase Dependency Map

```
Phase 1A (Today Dashboard) ──────┐
Phase 1B (Visual Identity)       │
Phase 1C (Entrance Motion)       ├── Hackathon submission milestone
Phase 1D (Strip Dev Metadata)    │
Phase 1E (Forecast Timeline)  ───┘
         │
         ▼
Phase 2A (History/Recall)
Phase 2B (Student-Language)
Phase 2C (Draft Persistence)  ── Teacher trust milestone
Phase 2D (Multi-Student Batch)
Phase 2E (Pending Badges)
         │
         ▼
Phase 3A (File Upload)
Phase 3B (Print/Export All)
Phase 3C (Onboarding)        ── Operational depth milestone
Phase 3D (Server Decomposition)
Phase 3E (Backend Hardening)
```

**Cross-phase dependencies:**
- 1A (TodayPanel) → 2E (Pending Badges) shares the debt register data. Phase 1A fetches it; Phase 2E lifts it to AppContext.
- 1E (ForecastTimeline) → 1A (TodayPanel) reuses the timeline component.
- 2A (History) requires new GET endpoints that are independent of all Phase 1 work.

---

## What This Roadmap Does NOT Include

Per CLAUDE.md hard boundaries and spec out-of-scope:
- No student-facing features
- No school-wide analytics dashboard
- No autonomous outbound messaging
- No LMS/SIS integrations
- No diagnosis or risk scoring
- No user account system (classroom-code auth remains)

Per YAGNI:
- No real-time collaboration or WebSocket features
- No offline/PWA mode (local-first via SQLite is sufficient)
- No settings/preferences screen (embedded in forms remains sufficient through Phase 2)

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Demo script runs clean, no generic screens | Yes/No |
| 1 | Morning dashboard loads (no model call) | <500ms |
| 1 | Existing eval suite still passes | 62/64 |
| 2 | Teacher can recall any output from past 7 days | Yes/No |
| 2 | Family message language auto-selects correctly | 100% for students with `family_language` set |
| 2 | Form state survives tab switch + return | Yes/No |
| 3 | PDF artifact upload → differentiation works | Yes/No |
| 3 | All output panels have print action | 9/9 |
| 3 | server.ts is <200 lines | Yes/No |
