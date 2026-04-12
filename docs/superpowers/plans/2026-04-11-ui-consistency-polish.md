# UI Consistency & Polish Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize all 10 panels to the shared workspace recipe (PageIntro + WorkspaceLayout + ContextualHint + SkeletonLoader + EmptyStateCard + ErrorBanner + ResultBanner + OutputFeedback), add panel transition animation, reduce mobile header height, add keyboard shortcut hints, and add date-group headers to HistoryDrawer.

**Architecture:** Pure frontend changes in `apps/web/src/`. Four panels (LanguageTools, SurvivalPacket, EABriefing, SupportPatterns) are refactored to use the shared layout components already used by the other 6 panels. CSS-only changes for panel transitions and mobile header. HistoryDrawer gets a date-grouping utility.

**Tech Stack:** React 18, Vite, CSS custom properties (no build-time CSS processing), vitest for tests.

---

### Task 1: Normalize LanguageToolsPanel to workspace recipe

This is the most inconsistent panel — no PageIntro, no WorkspaceLayout, no section wrapper, no empty states. It has two sub-tools (Simplify + VocabCards) that need to be organized into a tabbed rail/canvas layout.

**Files:**
- Modify: `apps/web/src/panels/LanguageToolsPanel.tsx`

- [ ] **Step 1: Rewrite LanguageToolsPanel to use the shared workspace recipe**

Replace the entire file content. The two sub-tools become a toggled rail with a shared result canvas. This matches how every other panel in the app works.

```tsx
import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { simplifyText, generateVocabCards } from "../api";
import SimplifiedViewer from "../components/SimplifiedViewer";
import VocabCardGrid from "../components/VocabCardGrid";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import SkeletonLoader from "../components/SkeletonLoader";
import ResultBanner from "../components/ResultBanner";
import type { SimplifyResponse, VocabCardsResponse } from "../types";

type LanguageTool = "simplify" | "vocab";

export default function LanguageToolsPanel() {
  const { profile, showSuccess } = useApp();
  const simplify = useAsyncAction<SimplifyResponse>();
  const vocab = useAsyncAction<VocabCardsResponse>();
  const [activeTool, setActiveTool] = useState<LanguageTool>("simplify");
  const [simplifyKey, setSimplifyKey] = useState(0);
  const [vocabKey, setVocabKey] = useState(0);

  async function handleSimplify(sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") {
    const resp = await simplify.execute((signal) =>
      simplifyText({ source_text: sourceText, grade_band: gradeBand, eal_level: ealLevel }, signal)
    );
    if (resp) showSuccess("Text simplified");
    if (resp) setSimplifyKey((k) => k + 1);
  }

  async function handleVocabCards(artifactText: string, subject: string, targetLanguage: string, gradeBand: string) {
    const resp = await vocab.execute((signal) =>
      generateVocabCards({
        artifact_text: artifactText,
        subject,
        target_language: targetLanguage,
        grade_band: gradeBand,
      }, signal)
    );
    if (resp) showSuccess("Cards generated");
    if (resp) setVocabKey((k) => k + 1);
  }

  const activeAction = activeTool === "simplify" ? simplify : vocab;
  const activeKey = activeTool === "simplify" ? simplifyKey : vocabKey;
  const activeType = activeTool === "simplify" ? "simplify" : "vocab-cards";

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Prep Workspace"
        title="Language Support Tools"
        sectionTone="sage"
        sectionIcon="pencil"
        breadcrumb={{ group: "Prep", tab: "Language Tools" }}
        description="Simplify classroom text for EAL learners or generate bilingual vocabulary cards from any lesson content."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Language prep", tone: "sun" },
          { label: "EAL-ready output", tone: "sage" },
          { label: "Bilingual support", tone: "provenance" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="language-tools"
              title="Language Tools"
              description="Simplify text for EAL learners or generate bilingual vocabulary cards from any lesson content."
              tone="sage"
            />
            <div className="language-tool-toggle">
              <button
                type="button"
                className={`language-tool-toggle__btn${activeTool === "simplify" ? " language-tool-toggle__btn--active" : ""}`}
                onClick={() => setActiveTool("simplify")}
                aria-pressed={activeTool === "simplify"}
              >
                Simplify Text
              </button>
              <button
                type="button"
                className={`language-tool-toggle__btn${activeTool === "vocab" ? " language-tool-toggle__btn--active" : ""}`}
                onClick={() => setActiveTool("vocab")}
                aria-pressed={activeTool === "vocab"}
              >
                Vocab Cards
              </button>
            </div>
            {activeTool === "simplify" ? (
              <SimplifiedViewer onSubmit={handleSimplify} result={null} loading={simplify.loading} />
            ) : (
              <VocabCardGrid onSubmit={handleVocabCards} result={null} loading={vocab.loading} />
            )}
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={activeAction.loading && activeAction.result === null}>
            {activeAction.error && activeAction.result === null ? (
              <ErrorBanner message={activeAction.error} onDismiss={activeAction.reset} />
            ) : null}
            {activeAction.loading && activeAction.result === null ? (
              <SkeletonLoader
                variant={activeTool === "vocab" ? "grid" : "single"}
                message={activeTool === "simplify" ? "Simplifying text for EAL learners..." : "Generating bilingual vocabulary cards..."}
                label={activeTool === "simplify" ? "Simplifying text" : "Generating vocabulary cards"}
              />
            ) : null}
            {!activeAction.loading && activeAction.result === null && !activeAction.error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="language" />}
                title={activeTool === "simplify" ? "No simplified text yet" : "No vocabulary cards yet"}
                description={activeTool === "simplify"
                  ? "Paste classroom text and select the EAL level to generate a simplified version with key vocabulary and visual cue suggestions."
                  : "Paste lesson content and choose a target language to generate bilingual vocabulary cards for EAL students."
                }
              />
            ) : null}
            {simplify.result && activeTool === "simplify" ? (
              <>
                <ResultBanner label="Text simplified" generatedAt={Date.now()} />
                <SimplifiedViewer onSubmit={handleSimplify} result={simplify.result} loading={simplify.loading} />
                <OutputFeedback outputId={`simplify-${simplifyKey}`} outputType="simplify" />
              </>
            ) : null}
            {vocab.result && activeTool === "vocab" ? (
              <>
                <ResultBanner label={`${vocab.result.card_set.cards.length} cards generated`} generatedAt={Date.now()} />
                <VocabCardGrid onSubmit={handleVocabCards} result={vocab.result} loading={vocab.loading} />
                <OutputFeedback outputId={`vocab-${vocabKey}`} outputType="vocab-cards" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
```

**Important design note:** `SimplifiedViewer` and `VocabCardGrid` currently render both the form AND the result inline. For the rail/canvas split, the rail renders the component with `result={null}` (form-only mode) while the canvas renders with the actual result. These components already handle `result === null` by hiding the result section, so this works without modifying them.

- [ ] **Step 2: Add the tool-toggle CSS**

Create a small CSS block for the language tool toggle. Add this to `apps/web/src/App.css` at the end (after the existing `.section-divider` rule):

```css
.language-tool-toggle {
  display: flex;
  gap: 0.35rem;
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-surface) 84%, transparent);
  box-shadow: var(--shadow-sm);
}

.language-tool-toggle__btn {
  flex: 1;
  min-height: 36px;
  padding: 0.45rem 0.75rem;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.language-tool-toggle__btn:hover {
  color: var(--color-text);
}

.language-tool-toggle__btn--active {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  box-shadow: 0 8px 16px rgba(183, 128, 45, 0.18);
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No type errors related to LanguageToolsPanel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/panels/LanguageToolsPanel.tsx apps/web/src/App.css
git commit -m "refactor(web): normalize LanguageToolsPanel to workspace recipe

Add PageIntro, WorkspaceLayout, ContextualHint, SkeletonLoader,
EmptyStateCard, ResultBanner, and OutputFeedback. Split two sub-tools
into a toggled rail with shared result canvas."
```

---

### Task 2: Normalize SurvivalPacketPanel to workspace recipe

Uses raw `.split-pane` and inline SVG empty state instead of the shared components.

**Files:**
- Modify: `apps/web/src/panels/SurvivalPacketPanel.tsx`

- [ ] **Step 1: Rewrite SurvivalPacketPanel to use WorkspaceLayout and shared components**

Replace the entire file:

```tsx
import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateSurvivalPacket } from "../api";
import SurvivalPacketView from "../components/SurvivalPacket";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import ContextualHint from "../components/ContextualHint";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ResultBanner from "../components/ResultBanner";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import type { SurvivalPacketResponse } from "../types";

export default function SurvivalPacketPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess, streaming } = useApp();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<SurvivalPacketResponse>();
  const streamer = useStreamingRequest({
    sectionLabels: ["Schedule", "Student profiles", "Emergency info"],
  });
  const [resultKey, setResultKey] = useState(0);

  if (classrooms.length === 0) return null;

  async function handleSubmit() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toISOString().split("T")[0];

    const resp = await streamer.execute(() =>
      execute((signal) =>
        generateSurvivalPacket(activeClassroom, targetDate, undefined, undefined, signal)
      )
    );
    if (resp) showSuccess("Survival packet generated");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Prepare the Substitute Packet"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "Sub Packet" }}
        description="Create a print-ready packet that packages routines, student supports, family communication constraints, and the simplified day plan for substitute coverage."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Sub coverage", tone: "sun" },
          { label: "Print-ready packet", tone: "slate" },
          { label: "Protected classroom aware", tone: "pending" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="survival-packet"
              title="Substitute Packet"
              description="Generate a print-ready document for substitute coverage. Includes routines, student supports, and a simplified day plan."
              tone="slate"
            />
            <div className="form-panel">
              <h2>Substitute Survival Packet</h2>
              <p className="form-description">
                Generate a print-ready packet for a substitute covering your classroom tomorrow.
              </p>
              <div className="field">
                <label htmlFor="sp-classroom">Classroom</label>
                <select
                  id="sp-classroom"
                  value={activeClassroom}
                  onChange={(e) => setActiveClassroom(e.target.value)}
                >
                  {classrooms.map((c) => (
                    <option key={c.classroom_id} value={c.classroom_id}>
                      Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                disabled={loading || !activeClassroom}
                onClick={handleSubmit}
              >
                {loading ? "Generating Packet..." : "Generate Survival Packet"}
              </button>
            </div>
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              streaming.phase !== "idle"
                ? <StreamingIndicator onCancel={cancel} />
                : <SkeletonLoader variant="stack" message="Building substitute survival packet..." label="Generating survival packet" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="packet" />}
                title="No packet yet"
                description="Select a classroom and generate a full survival packet for tomorrow's substitute."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Survival packet generated" generatedAt={Date.now()} />
                <SurvivalPacketView packet={result.packet} />
                <OutputFeedback outputId={`packet-${resultKey}`} outputType="survival-packet" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/panels/SurvivalPacketPanel.tsx
git commit -m "refactor(web): normalize SurvivalPacketPanel to workspace recipe

Replace raw split-pane and inline SVG empty state with WorkspaceLayout,
ContextualHint, EmptyStateCard with EmptyStateIllustration, and
ResultBanner."
```

---

### Task 3: Normalize EABriefingPanel to workspace recipe

Currently delegates layout entirely to the `EABriefing` component which manages its own split. The panel needs WorkspaceLayout, ContextualHint, SkeletonLoader, EmptyStateCard, and ResultBanner.

**Files:**
- Modify: `apps/web/src/panels/EABriefingPanel.tsx`
- Modify: `apps/web/src/components/EABriefing.tsx` (extract form vs result rendering)

- [ ] **Step 1: Split EABriefing component into form-only and result-only modes**

The `EABriefing` component currently manages both the form and result in a self-splitting layout. We need it to accept a `mode` prop so the panel can render form in the rail and result in the canvas.

Modify `apps/web/src/components/EABriefing.tsx` — replace the component:

```tsx
import { useState } from "react";
import type { ClassroomProfile, EABriefingResponse } from "../types";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import "./EABriefing.css";

// ─── Form-only component for the workspace rail ───

interface FormProps {
  classrooms: ClassroomProfile[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, eaName?: string) => void;
  loading: boolean;
}

export function EABriefingForm({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: FormProps) {
  const [eaName, setEaName] = useState("");

  return (
    <div className="ea-briefing-form form-panel">
      <h2>Generate EA Daily Briefing</h2>
      <p className="ea-briefing-description form-description">
        Build a coordination brief for the educational assistant from the current classroom plan, intervention history, and watch-list context.
      </p>

      <div className="field">
        <label htmlFor="ea-classroom">Classroom</label>
        <select
          id="ea-classroom"
          value={selectedClassroom}
          onChange={(e) => onClassroomChange(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ea-name">EA Name <span className="field-optional">(optional)</span></label>
        <input
          id="ea-name"
          type="text"
          value={eaName}
          onChange={(e) => setEaName(e.target.value)}
          placeholder="e.g. Ms. Chen"
        />
      </div>

      <button
        className="btn btn--primary"
        onClick={() => onSubmit(selectedClassroom, eaName || undefined)}
        disabled={loading}
        type="button"
      >
        {loading ? "Generating..." : "Generate Briefing"}
      </button>
    </div>
  );
}

// ─── Result-only component for the workspace canvas ───

interface ResultProps {
  result: EABriefingResponse;
}

export function EABriefingResult({ result }: ResultProps) {
  return (
    <div className="ea-briefing-result">
      <header className="ea-briefing-header">
        <h2>Daily Briefing — {result.briefing.classroom_id}</h2>
        <p className="ea-briefing-meta">
          {result.briefing.date}
        </p>
        <OutputMetaRow
          items={[
            { label: "Coordination document", tone: "analysis" },
            { label: "Retrieval-backed", tone: "provenance" },
            { label: "Print-ready", tone: "accent" },
          ]}
          compact
        />
      </header>

      <p className="ea-briefing-disclaimer">
        This is a coordination document synthesized from the teacher's plan and records — not a diagnosis or student report.
      </p>

      {result.briefing.teacher_notes_for_ea && (
        <section className="ea-section ea-section--notes">
          <h3><span className="ea-icon">📋</span> Teacher's Notes for Today</h3>
          <p className="ea-notes-text">{result.briefing.teacher_notes_for_ea}</p>
        </section>
      )}

      {result.briefing.schedule_blocks.length > 0 && (
        <section className="ea-section ea-section--schedule">
          <h3><span className="ea-icon">🕐</span> Today's Schedule</h3>
          <div className="ea-cards">
            {result.briefing.schedule_blocks.map((block, i) => (
              <div key={i} className="ea-card ea-card--schedule">
                <div className="ea-card-label">
                  {block.time_slot}
                  {block.student_refs.length > 0 && (
                    <span className="ea-card-tag"> · {block.student_refs.join(", ")}</span>
                  )}
                </div>
                <p>{block.task_description}</p>
                {block.materials_needed.length > 0 && (
                  <p className="ea-card-materials">
                    Materials: {block.materials_needed.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {result.briefing.student_watch_list.length > 0 && (
        <section className="ea-section ea-section--watch">
          <h3><span className="ea-icon">👁</span> Student Watch List</h3>
          <div className="ea-cards">
            {result.briefing.student_watch_list.map((item, i) => (
              <div key={i} className="ea-card ea-card--watch">
                <div className="ea-card-label">{item.student_ref}</div>
                <p className="ea-card-context">{item.context_summary}</p>
                <p className="ea-card-approach">{item.suggested_approach}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.briefing.pending_followups.length > 0 && (
        <section className="ea-section ea-section--followups">
          <h3><span className="ea-icon">⏰</span> Pending Follow-ups</h3>
          <div className="ea-cards">
            {result.briefing.pending_followups.map((f, i) => (
              <div key={i} className="ea-card ea-card--followup">
                <div className="ea-card-label">
                  {f.student_ref}
                  <span className="ea-card-tag"> · {f.days_since} days ago</span>
                </div>
                <p className="ea-card-observation">{f.original_observation}</p>
                <p className="ea-card-action">{f.suggested_action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <PrintButton label="Print Briefing" />
    </div>
  );
}

// ─── Legacy default export for backwards compat (unused after panel refactor) ───

interface Props {
  classrooms: ClassroomProfile[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, eaName?: string) => void;
  loading: boolean;
  result: EABriefingResponse | null;
}

export default function EABriefing({
  classrooms,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  result,
}: Props) {
  return (
    <div className={`ea-briefing${result ? " ea-briefing--split" : ""}`}>
      <EABriefingForm
        classrooms={classrooms}
        selectedClassroom={selectedClassroom}
        onClassroomChange={onClassroomChange}
        onSubmit={onSubmit}
        loading={loading}
      />
      {result && <EABriefingResult result={result} />}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite EABriefingPanel to use WorkspaceLayout and the split components**

Replace `apps/web/src/panels/EABriefingPanel.tsx`:

```tsx
import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEABriefing } from "../api";
import { EABriefingForm, EABriefingResult } from "../components/EABriefing";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ResultBanner from "../components/ResultBanner";
import type { EABriefingResponse } from "../types";

export default function EABriefingPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<EABriefingResponse>();
  const [resultKey, setResultKey] = useState(0);

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, eaName?: string) {
    const resp = await execute((signal) =>
      generateEABriefing({ classroom_id: classroomId, ea_name: eaName }, signal)
    );
    if (resp) showSuccess("Briefing generated");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Build the EA Briefing"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "EA Briefing" }}
        description="Generate one briefing that packages schedule blocks, student watch items, pending follow-ups, and the teacher's notes into a shared coordination artifact."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "EA coordination", tone: "sun" },
          { label: "Coordination document", tone: "analysis" },
          { label: "Print-ready", tone: "slate" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="ea-briefing"
              title="EA Briefing"
              description="Build a coordination document for the educational assistant that combines the day plan, student watch items, and pending follow-ups."
              tone="slate"
            />
            <EABriefingForm
              classrooms={classrooms}
              selectedClassroom={activeClassroom}
              onClassroomChange={setActiveClassroom}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              <SkeletonLoader variant="stack" message="Building EA coordination briefing..." label="Generating EA briefing" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="briefing" />}
                title="No briefing yet"
                description="Select a classroom and optionally add the EA's name, then generate the coordination document for today."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Briefing generated" generatedAt={Date.now()} />
                <EABriefingResult result={result} />
                <OutputFeedback outputId={`briefing-${resultKey}`} outputType="ea-briefing" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No type errors. The legacy default export in EABriefing.tsx means any other import paths still work.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/panels/EABriefingPanel.tsx apps/web/src/components/EABriefing.tsx
git commit -m "refactor(web): normalize EABriefingPanel to workspace recipe

Split EABriefing component into EABriefingForm and EABriefingResult
named exports. Panel now uses WorkspaceLayout, ContextualHint,
SkeletonLoader, EmptyStateCard, and ResultBanner."
```

---

### Task 4: Normalize SupportPatternsPanel to workspace recipe

Currently has PageIntro but no WorkspaceLayout, SkeletonLoader, or EmptyStateCard — delegates everything to PatternReport which manages its own split layout.

**Files:**
- Modify: `apps/web/src/panels/SupportPatternsPanel.tsx`
- Modify: `apps/web/src/components/PatternReport.tsx` (extract form vs result)

- [ ] **Step 1: Split PatternReport into form and result components**

Modify `apps/web/src/components/PatternReport.tsx` — add named exports for form and result, keep legacy default:

```tsx
import { useState } from "react";
import type {
  SupportPatternsResponse,
  InterventionPrefill,
  FamilyMessagePrefill,
} from "../types";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import "./PatternReport.css";

// ─── Form-only component for the workspace rail ───

interface FormProps {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, studentFilter?: string, timeWindow?: number) => void;
  loading: boolean;
}

export function PatternReportForm({
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
}: FormProps) {
  const [studentFilter, setStudentFilter] = useState("");
  const [timeWindow, setTimeWindow] = useState(10);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(selectedClassroom, studentFilter || undefined, timeWindow);
  }

  return (
    <form className="pattern-form form-panel" onSubmit={handleSubmit}>
      <h2>Review Support Patterns</h2>
      <p className="pattern-form-description form-description">
        Review patterns across your intervention records and support plans.
        This reflects your own documentation — not a diagnosis.
      </p>

      <div className="field">
        <label htmlFor="pat-classroom">Classroom</label>
        <select
          id="pat-classroom"
          value={selectedClassroom}
          onChange={(e) => onClassroomChange(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.classroom_id} value={c.classroom_id}>
              Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pat-student">Filter by student (optional)</label>
        <select
          id="pat-student"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        >
          <option value="">All students</option>
          {students.map((s) => (
            <option key={s.alias} value={s.alias}>
              {s.alias}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pat-window">Time window</label>
        <select
          id="pat-window"
          value={timeWindow}
          onChange={(e) => setTimeWindow(Number(e.target.value))}
        >
          <option value={5}>Last 5 records</option>
          <option value={10}>Last 10 records</option>
          <option value={20}>Last 20 records</option>
        </select>
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? "Analyzing Patterns..." : "Detect Patterns"}
      </button>
    </form>
  );
}

// ─── Result-only component for the workspace canvas ───

interface ResultProps {
  result: SupportPatternsResponse;
  onInterventionClick?: (prefill: InterventionPrefill) => void;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
}

export function PatternReportResult({ result, onInterventionClick, onFollowupClick }: ResultProps) {
  const report = result.report;

  return (
    <div>
      <header className="pattern-header">
        <h2>Pattern Report</h2>
        <p className="pattern-meta">
          {report.classroom_id}
          {report.student_filter && ` · ${report.student_filter}`}
          {" · "}last {report.time_window} records
        </p>
        <OutputMetaRow
          items={[
            { label: "Analysis suite", tone: "analysis" },
            { label: "Retrieval-backed", tone: "provenance" },
            { label: "Teacher review only", tone: "pending" },
          ]}
          compact
        />
      </header>

      {result.thinking_summary && (
        <details className="pattern-thinking">
          <summary>Model Thinking</summary>
          <pre>{result.thinking_summary}</pre>
        </details>
      )}

      {report.recurring_themes.length > 0 && (
        <section className="pattern-section pattern-section--themes">
          <h3>Recurring Themes</h3>
          {report.recurring_themes.map((theme, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">
                {theme.theme}
                <span className="pattern-card-tag">
                  {" · "}{theme.student_refs.join(", ")} · {theme.evidence_count} records
                </span>
              </div>
              {theme.example_observations.map((obs, j) => (
                <p key={j} className="pattern-evidence">"{obs}"</p>
              ))}
            </div>
          ))}
        </section>
      )}

      {report.follow_up_gaps.length > 0 && (
        <section className="pattern-section pattern-section--gaps">
          <h3>Follow-up Gaps</h3>
          {report.follow_up_gaps.map((gap, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">
                {gap.student_refs.join(", ")}
                <span className="pattern-card-tag"> · {gap.days_since} days ago</span>
              </div>
              <p>{gap.observation}</p>
              {onInterventionClick && gap.student_refs.length > 0 && (
                <button
                  className="pattern-card-action-btn"
                  aria-label={`Log follow-up for ${gap.student_refs.join(", ")}`}
                  onClick={() =>
                    onInterventionClick({
                      student_ref: gap.student_refs[0],
                      suggested_action: "Follow up on previous intervention",
                      reason: gap.observation,
                    })
                  }
                  type="button"
                >
                  Log Follow-up
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {report.positive_trends.length > 0 && (
        <section className="pattern-section pattern-section--trends">
          <h3>Positive Trends</h3>
          {report.positive_trends.map((trend, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">{trend.student_ref}</div>
              <p>{trend.description}</p>
              {trend.evidence.map((ev, j) => (
                <p key={j} className="pattern-evidence">"{ev}"</p>
              ))}
              {onFollowupClick && (
                <button
                  className="pattern-card-action-btn"
                  aria-label={`Share positive trend for ${trend.student_ref} with family`}
                  onClick={() =>
                    onFollowupClick({
                      student_ref: trend.student_ref,
                      reason: trend.description,
                      message_type: "praise",
                    })
                  }
                  type="button"
                >
                  Share with family
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {report.suggested_focus.length > 0 && (
        <section className="pattern-section pattern-section--focus">
          <h3>Suggested Focus</h3>
          {report.suggested_focus.map((focus, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-card-label">
                {focus.student_ref}{" "}
                <span className={`priority-badge priority-badge--${focus.priority}`}>
                  {focus.priority}
                </span>
              </div>
              <p>{focus.reason}</p>
              <p><strong>Next step:</strong> {focus.suggested_action}</p>
              {onInterventionClick && (
                <button
                  className="pattern-card-action-btn"
                  aria-label={`Log intervention for ${focus.student_ref}`}
                  onClick={() =>
                    onInterventionClick({
                      student_ref: focus.student_ref,
                      suggested_action: focus.suggested_action,
                      reason: focus.reason,
                    })
                  }
                  type="button"
                >
                  Log Intervention
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <PrintButton label="Print Report" />
    </div>
  );
}

// ─── Legacy default export ───

interface Props {
  classrooms: { classroom_id: string; grade_band: string; subject_focus: string }[];
  students: { alias: string }[];
  selectedClassroom: string;
  onClassroomChange: (id: string) => void;
  onSubmit: (classroomId: string, studentFilter?: string, timeWindow?: number) => void;
  loading: boolean;
  result: SupportPatternsResponse | null;
  onInterventionClick?: (prefill: InterventionPrefill) => void;
  onFollowupClick?: (prefill: FamilyMessagePrefill) => void;
}

export default function PatternReport({
  classrooms,
  students,
  selectedClassroom,
  onClassroomChange,
  onSubmit,
  loading,
  result,
  onInterventionClick,
  onFollowupClick,
}: Props) {
  return (
    <div className={`pattern-report${result ? " pattern-report--split" : ""}`}>
      <PatternReportForm
        classrooms={classrooms}
        students={students}
        selectedClassroom={selectedClassroom}
        onClassroomChange={onClassroomChange}
        onSubmit={onSubmit}
        loading={loading}
      />
      {result && (
        <PatternReportResult
          result={result}
          onInterventionClick={onInterventionClick}
          onFollowupClick={onFollowupClick}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite SupportPatternsPanel to use WorkspaceLayout**

Replace `apps/web/src/panels/SupportPatternsPanel.tsx`:

```tsx
import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { detectSupportPatterns } from "../api";
import { PatternReportForm, PatternReportResult } from "../components/PatternReport";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ResultBanner from "../components/ResultBanner";
import type { SupportPatternsResponse, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function SupportPatternsPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<SupportPatternsResponse>();
  const [resultKey, setResultKey] = useState(0);

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, studentFilter?: string, timeWindow?: number) {
    const resp = await execute((signal) =>
      detectSupportPatterns({
        classroom_id: classroomId,
        student_filter: studentFilter,
        time_window: timeWindow,
      }, signal)
    );
    if (resp) showSuccess("Patterns analyzed");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Review Workspace"
        title="Review Classroom Support Patterns"
        sectionTone="forest"
        sectionIcon="check"
        breadcrumb={{ group: "Review", tab: "Support Patterns" }}
        description="Scan recurring themes, follow-up gaps, positive trends, and suggested focus areas across recent records without losing the evidence behind them."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Pattern review", tone: "sun" },
          { label: "Evidence-led analysis", tone: "provenance" },
          { label: "Teacher review", tone: "forest" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="support-patterns"
              title="Support Patterns"
              description="Analyze your own intervention records to surface recurring themes, follow-up gaps, and positive trends. This reflects your documentation — not a diagnosis."
              tone="forest"
            />
            <PatternReportForm
              classrooms={classrooms}
              students={students}
              selectedClassroom={activeClassroom}
              onClassroomChange={setActiveClassroom}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              <SkeletonLoader variant="stack" message="Analyzing support patterns across records..." label="Detecting support patterns" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="patterns" />}
                title="No patterns analyzed yet"
                description="Select a classroom, optionally filter by student, and run the analysis to surface recurring themes and follow-up gaps."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Patterns analyzed" generatedAt={Date.now()} />
                <PatternReportResult
                  result={result}
                  onInterventionClick={onInterventionClick}
                  onFollowupClick={onFollowupClick}
                />
                <OutputFeedback outputId={`patterns-${resultKey}`} outputType="support-patterns" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/panels/SupportPatternsPanel.tsx apps/web/src/components/PatternReport.tsx
git commit -m "refactor(web): normalize SupportPatternsPanel to workspace recipe

Split PatternReport into PatternReportForm and PatternReportResult
named exports. Panel now uses WorkspaceLayout, ContextualHint,
SkeletonLoader, EmptyStateCard, and ResultBanner."
```

---

### Task 5: Add panel-exit CSS transition

Currently `panel-enter` animates content in but there's no exit — old panels vanish instantly.

**Files:**
- Modify: `apps/web/src/styles/shell.css`

- [ ] **Step 1: Add a panel-exit animation and update the panel-enter timing**

In `apps/web/src/styles/shell.css`, find the existing panel animation block and replace it:

Find this block:
```css
.app-main > [role="tabpanel"]:not([hidden]) {
  animation: panel-enter var(--motion-base) var(--ease-standard) both;
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.998);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

Replace with:
```css
.app-main > [role="tabpanel"]:not([hidden]) {
  animation: panel-enter var(--motion-base) var(--ease-standard) both;
  animation-delay: 60ms;
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.998);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.app-main > [role="tabpanel"][hidden] {
  display: none;
}
```

The 60ms delay on the enter animation creates a subtle breathing room between the old panel hiding and the new one appearing, reducing the visual "snap". The `[hidden]` rule is explicit to prevent any flash.

- [ ] **Step 2: Update the reduced-motion fallback in motion.css**

In `apps/web/src/motion.css`, the existing reduced-motion rule already covers `panel-enter`:

```css
@media (prefers-reduced-motion: reduce) {
  .motion-stagger > *,
  .app-main > [role="tabpanel"]:not([hidden]) {
    animation: none !important;
  }
}
```

This already works — no change needed. Verify the rule is still present.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles/shell.css
git commit -m "polish(web): add 60ms enter delay to panel transitions

Creates a subtle breathing gap between panel hide and show, reducing
the visual snap on tab switches."
```

---

### Task 6: Reduce mobile header height at <=600px

The sticky header + nav consumes ~140px on mobile. On small screens, the secondary tab row should not render since mobile nav already has subtabs.

**Files:**
- Modify: `apps/web/src/styles/shell.css`

- [ ] **Step 1: Hide the secondary tabs row on mobile**

In `apps/web/src/styles/shell.css`, within the existing `@media (max-width: 600px)` block, the `.shell-nav` is already set to `display: none`. This hides the entire nav including the group pills AND the secondary tabs. That's correct — the mobile bottom nav already provides both.

The header height is driven by `.app-header__inner` padding and `.shell-bar` min-height. Reduce both at 600px.

Find the existing `@media (max-width: 600px)` block and add these rules (insert just before the closing `}` of that media query):

```css
  .shell-bar {
    min-height: 52px;
  }

  .shell-classroom-anchor {
    display: none;
  }
```

**Wait** — hiding the classroom pill on mobile removes the ability to switch classrooms. Instead, we should keep it but compress it. Replace the above with:

```css
  .shell-bar {
    min-height: 48px;
    gap: var(--space-1);
  }
```

This reduces the bar from 64px + gap to 48px + tighter gap, saving ~24px of header height.

- [ ] **Step 2: Verify mobile nav still renders correctly**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No errors (CSS-only change, but typecheck confirms no build breakage).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles/shell.css
git commit -m "polish(web): reduce mobile header height at 600px breakpoint

Tighten shell-bar min-height from 64px to 48px and reduce gap on
small screens, reclaiming ~24px of viewport for content."
```

---

### Task 7: Add keyboard shortcut hint badges to desktop nav

Number keys 1-0 jump to tabs but are completely undiscoverable.

**Files:**
- Modify: `apps/web/src/App.tsx` (add `<kbd>` to secondary tab buttons)
- Modify: `apps/web/src/styles/shell.css` (style the kbd badges)

- [ ] **Step 1: Add `<kbd>` hint badges to the secondary tab buttons in App.tsx**

In `apps/web/src/App.tsx`, find the secondary tab rendering block — the `secondaryTabs.map` inside the `shell-nav__tabs` div. The current code:

```tsx
{secondaryTabs.map((tab) => {
  const count = getTabBadgeCount(tab, debtCounts);
  return (
    <button
      key={tab}
      role="tab"
      id={`tab-${tab}`}
      aria-selected={activeTab === tab}
      aria-controls={`panel-${tab}`}
      tabIndex={activeTab === tab ? 0 : -1}
      className={`shell-nav__tab${activeTab === tab ? " shell-nav__tab--active" : ""}`}
      onClick={() => setActiveTab(tab)}
      type="button"
    >
      <span>{TAB_META[tab].label}</span>
      {count > 0 ? <span className="shell-nav__badge">{count}</span> : null}
    </button>
  );
})}
```

Replace with:

```tsx
{secondaryTabs.map((tab) => {
  const count = getTabBadgeCount(tab, debtCounts);
  const tabIndex1Based = TAB_ORDER.indexOf(tab) + 1;
  const shortcutKey = tabIndex1Based <= 9 ? String(tabIndex1Based) : "0";
  return (
    <button
      key={tab}
      role="tab"
      id={`tab-${tab}`}
      aria-selected={activeTab === tab}
      aria-controls={`panel-${tab}`}
      tabIndex={activeTab === tab ? 0 : -1}
      className={`shell-nav__tab${activeTab === tab ? " shell-nav__tab--active" : ""}`}
      onClick={() => setActiveTab(tab)}
      type="button"
    >
      <span>{TAB_META[tab].label}</span>
      {count > 0 ? <span className="shell-nav__badge">{count}</span> : null}
      <kbd className="shell-nav__kbd" aria-hidden="true">{shortcutKey}</kbd>
    </button>
  );
})}
```

- [ ] **Step 2: Add CSS for the keyboard hint badges**

In `apps/web/src/styles/shell.css`, add right after the existing `.shell-nav__badge` block:

```css
.shell-nav__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-muted);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  opacity: 0;
  transition: opacity var(--motion-fast) var(--ease-standard);
}

.shell-nav__tabs:hover .shell-nav__kbd,
.shell-nav__tab:focus-visible .shell-nav__kbd {
  opacity: 1;
}

@media (max-width: 600px) {
  .shell-nav__kbd {
    display: none;
  }
}
```

The badges are hidden by default and only appear on hover over the tabs row or focus-visible on a tab, keeping the UI clean while making shortcuts discoverable.

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles/shell.css
git commit -m "feat(web): add keyboard shortcut hint badges to secondary nav tabs

Show <kbd> badges (1-0) on hover over the tab row. Hidden by default,
revealed on hover/focus for discoverability. Hidden on mobile."
```

---

### Task 8: Add date-group headers to HistoryDrawer

History items are a flat list with raw timestamps. Add "Today", "Yesterday", "This week", "Earlier" group headers.

**Files:**
- Modify: `apps/web/src/components/HistoryDrawer.tsx`
- Modify: `apps/web/src/components/HistoryDrawer.css`

- [ ] **Step 1: Read the current HistoryDrawer implementation**

Before editing, read the full file at `apps/web/src/components/HistoryDrawer.tsx` to understand the current generic structure.

- [ ] **Step 2: Add a date-grouping utility function and render group headers**

In `apps/web/src/components/HistoryDrawer.tsx`, add a `groupByDate` helper and update the render to insert group headers.

Add the helper function at the top of the file (after imports):

```tsx
function getDateGroup(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This week";
  return "Earlier";
}
```

Then, in the render section where items are mapped, wrap the list to insert group headers. The exact edit depends on the current code structure — find the `.map()` call that renders history items and wrap it:

```tsx
// Build grouped entries
const grouped: { group: string; items: T[] }[] = [];
let lastGroup = "";
for (const item of items) {
  const ts = getTimestamp(item);
  const group = getDateGroup(ts);
  if (group !== lastGroup) {
    grouped.push({ group, items: [item] });
    lastGroup = group;
  } else {
    grouped[grouped.length - 1].items.push(item);
  }
}
```

Then render:

```tsx
{grouped.map((section) => (
  <div key={section.group}>
    <div className="history-drawer-group-label">{section.group}</div>
    {section.items.map((item) => (
      <button
        key={getKey(item)}
        className="history-drawer-item"
        onClick={() => onSelect(item)}
        type="button"
      >
        <span className="history-drawer-item-text">{renderItem(item)}</span>
        <span className="history-drawer-item-time">
          {new Date(getTimestamp(item)).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </button>
    ))}
  </div>
))}
```

**Note:** The exact implementation depends on reading the current HistoryDrawer code in Step 1. The code above shows the pattern — adapt to the actual component structure.

- [ ] **Step 3: Add CSS for the group label**

In `apps/web/src/components/HistoryDrawer.css`, add:

```css
.history-drawer-group-label {
  padding: 0.5rem 0.75rem 0.25rem;
  font-size: 0.65rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/HistoryDrawer.tsx apps/web/src/components/HistoryDrawer.css
git commit -m "feat(web): add date-group headers to HistoryDrawer

Group history items by Today, Yesterday, This week, and Earlier.
Improves scanability for panels with history (Plan, Message, Intervention)."
```

---

### Task 9: Run full validation suite

**Files:** None — validation only.

- [ ] **Step 1: Run typecheck**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Run lint**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run lint`
Expected: 0 errors (warnings acceptable).

- [ ] **Step 3: Run tests**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npm run test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit any lint/type fixes if needed**

Only if previous steps revealed issues.
