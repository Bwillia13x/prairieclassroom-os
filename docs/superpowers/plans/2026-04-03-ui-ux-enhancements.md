# UI/UX Enhancement Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate PrairieClassroom OS from functional prototype to polished, demo-ready product across 11 UI/UX enhancement areas.

**Architecture:** All enhancements are CSS-first + minimal React changes. New tokens in `index.css`, shared utility components for loading/empty states, ARIA semantics on the app shell, and targeted component edits. No new dependencies. No routing library. No state management changes.

**Tech Stack:** Vite + React 19 + TypeScript + CSS custom properties (co-located `.css` files)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/index.css` | Modify | Add section/variant tokens, dark mode overrides, skeleton animation keyframes, print CSS, mobile breakpoints |
| `src/App.css` | Modify | Tab grouping, ARIA-friendly tab styling, mobile nav, classroom context bar, responsive breakpoints |
| `src/App.tsx` | Modify | Tab grouping with ARIA, classroom context bar, aria-live result regions, success toast state, focus management |
| `src/components/PlanViewer.css` | Modify | Replace hardcoded hex with tokens |
| `src/components/PlanViewer.tsx` | Modify | Add keyboard handler on clickable cards, print button |
| `src/components/PatternReport.css` | Modify | Replace hardcoded hex with tokens |
| `src/components/InterventionCard.css` | Modify | Replace hardcoded hex with tokens |
| `src/components/InterventionLogger.css` | Modify | Replace hardcoded hex with tokens |
| `src/components/MessageDraft.css` | Modify | Replace hardcoded hex with tokens |
| `src/components/EABriefing.css` | Modify | Extend print CSS to hide app shell |
| `src/components/VariantCard.tsx` | Modify | Replace hardcoded VARIANT_COLORS with CSS custom properties |
| `src/components/VariantCard.css` | Modify | Add variant-type color classes |
| `src/components/MessageComposer.tsx` | Modify | Add prefill banner with visual feedback, inline validation |
| `src/components/MessageComposer.css` | Modify | Prefill banner styles, validation styles |
| `src/components/InterventionLogger.tsx` | Modify | Add prefill highlight animation |
| `src/components/InterventionLogger.css` | Modify | Prefill highlight styles |
| `src/components/ArtifactUpload.css` | Modify | Validation styles, mobile touch targets |
| `src/components/SimplifiedViewer.css` | Modify | Mobile form-row stacking |
| `src/components/VocabCardGrid.css` | Modify | Mobile form-row stacking |

---

### Task 1: Design Token Consistency — Add Section & Variant Tokens

**Files:**
- Modify: `src/index.css` (lines 1-95)

This task adds all missing semantic tokens so subsequent tasks can reference them instead of hardcoded hex.

- [ ] **Step 1: Add section-semantic and variant-type tokens to `:root`**

In `src/index.css`, after the existing semantic text tokens (line 33), add:

```css
  /* Section border colors (plan, pattern, intervention, briefing) */
  --color-section-watchpoint: #f59e0b;
  --color-section-priority: #3b82f6;
  --color-section-ea: #8b5cf6;
  --color-section-family: #10b981;
  --color-section-theme: #6366f1;
  --color-section-gap: #ef4444;
  --color-section-trend: #22c55e;
  --color-section-focus: #f59e0b;

  /* Variant type badge colors */
  --color-variant-core: #2563eb;
  --color-variant-eal: #7c3aed;
  --color-variant-chunked: #d97706;
  --color-variant-ea-group: #16a34a;
  --color-variant-extension: #dc2626;

  /* Approve / action button */
  --color-approve: #059669;
  --color-approve-hover: #047857;
```

- [ ] **Step 2: Add dark mode overrides for the new tokens**

In `src/index.css`, inside the `@media (prefers-color-scheme: dark)` block (after line 90), add:

```css
    /* Section borders — slightly brighter for dark bg */
    --color-section-watchpoint: #fbbf24;
    --color-section-priority: #60a5fa;
    --color-section-ea: #a78bfa;
    --color-section-family: #34d399;
    --color-section-theme: #818cf8;
    --color-section-gap: #f87171;
    --color-section-trend: #4ade80;
    --color-section-focus: #fbbf24;

    --color-variant-core: #60a5fa;
    --color-variant-eal: #a78bfa;
    --color-variant-chunked: #fbbf24;
    --color-variant-ea-group: #4ade80;
    --color-variant-extension: #f87171;

    --color-approve: #34d399;
    --color-approve-hover: #10b981;
```

- [ ] **Step 3: Verify build still works**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web && npx vite build --mode development 2>&1 | tail -5`
Expected: Build success, no errors.

---

### Task 2: Replace Hardcoded Colors in Component CSS

**Files:**
- Modify: `src/components/PlanViewer.css` (lines 127-139, 193-194)
- Modify: `src/components/PatternReport.css` (lines 57-60)
- Modify: `src/components/InterventionCard.css` (lines 40-41, 46-47)
- Modify: `src/components/InterventionLogger.css` (line 24)
- Modify: `src/components/MessageDraft.css` (lines 25, 66-67, 76)
- Modify: `src/components/EABriefing.css` (lines 201, 205, 209)

- [ ] **Step 1: PlanViewer.css — replace section border colors**

Replace:
```css
.plan-card--watchpoint { border-left: 3px solid #f59e0b; }
.plan-card--priority { border-left: 3px solid #3b82f6; }
.plan-card--ea { border-left: 3px solid #8b5cf6; }
.plan-card--family { border-left: 3px solid #10b981; }
```
With:
```css
.plan-card--watchpoint { border-left: 3px solid var(--color-section-watchpoint); }
.plan-card--priority { border-left: 3px solid var(--color-section-priority); }
.plan-card--ea { border-left: 3px solid var(--color-section-ea); }
.plan-card--family { border-left: 3px solid var(--color-section-family); }
```

Replace clickable hover:
```css
.plan-card--clickable:hover {
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}
```
With:
```css
.plan-card--clickable:hover {
  border-color: var(--color-section-family);
  box-shadow: 0 0 0 1px var(--color-section-family);
}
```

- [ ] **Step 2: PatternReport.css — replace section border colors**

Replace:
```css
.pattern-section--themes { border-left: 3px solid #6366f1; }
.pattern-section--gaps { border-left: 3px solid #ef4444; }
.pattern-section--trends { border-left: 3px solid #22c55e; }
.pattern-section--focus { border-left: 3px solid #f59e0b; }
```
With:
```css
.pattern-section--themes { border-left: 3px solid var(--color-section-theme); }
.pattern-section--gaps { border-left: 3px solid var(--color-section-gap); }
.pattern-section--trends { border-left: 3px solid var(--color-section-trend); }
.pattern-section--focus { border-left: 3px solid var(--color-section-focus); }
```

- [ ] **Step 3: InterventionCard.css — replace field border colors**

Replace:
```css
  border-left: 3px solid #3b82f6;
```
(line 40) with:
```css
  border-left: 3px solid var(--color-section-priority);
```

Replace:
```css
.intervention-field--outcome .intervention-field-value {
  border-left-color: #10b981;
}
```
With:
```css
.intervention-field--outcome .intervention-field-value {
  border-left-color: var(--color-section-family);
}
```

- [ ] **Step 4: InterventionLogger.css — replace prefill border**

Replace:
```css
  border-left: 3px solid #3b82f6;
```
(line 24) with:
```css
  border-left: 3px solid var(--color-section-priority);
```

- [ ] **Step 5: MessageDraft.css — replace draft body border and approve button**

Replace `.draft-body` border-left:
```css
  border-left: 3px solid #10b981;
```
With:
```css
  border-left: 3px solid var(--color-section-family);
```

Replace `.btn-approve`:
```css
.btn-approve {
  ...
  background: #059669;
  ...
}
.btn-approve:hover {
  background: #047857;
}
```
With:
```css
.btn-approve {
  ...
  background: var(--color-approve);
  ...
}
.btn-approve:hover {
  background: var(--color-approve-hover);
}
```

- [ ] **Step 6: EABriefing.css — replace card border colors**

Replace:
```css
.ea-card--schedule { border-left: 3px solid #8b5cf6; }
.ea-card--watch { border-left: 3px solid #3b82f6; }
.ea-card--followup { border-left: 3px solid #f59e0b; }
```
With:
```css
.ea-card--schedule { border-left: 3px solid var(--color-section-ea); }
.ea-card--watch { border-left: 3px solid var(--color-section-priority); }
.ea-card--followup { border-left: 3px solid var(--color-section-watchpoint); }
```

- [ ] **Step 7: VariantCard.tsx — replace inline VARIANT_COLORS with CSS classes**

Replace the `VARIANT_COLORS` object and inline `style={{ background: color }}` with CSS class-based approach.

In `VariantCard.tsx`, remove the `VARIANT_COLORS` record and change the badge to:
```tsx
<span className={`variant-badge variant-badge--${variant.variant_type}`}>
  {label}
</span>
```

In `VariantCard.css`, add after `.variant-badge`:
```css
.variant-badge--core { background: var(--color-variant-core); }
.variant-badge--eal_supported { background: var(--color-variant-eal); }
.variant-badge--chunked { background: var(--color-variant-chunked); }
.variant-badge--ea_small_group { background: var(--color-variant-ea-group); }
.variant-badge--extension { background: var(--color-variant-extension); }
```

- [ ] **Step 8: Verify build**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web && npx vite build --mode development 2>&1 | tail -5`

---

### Task 3: Keyboard Accessibility on Clickable Cards

**Files:**
- Modify: `src/components/PlanViewer.tsx` (lines 129-143)

- [ ] **Step 1: Add onKeyDown handler to clickable family followup cards**

In `PlanViewer.tsx`, on the clickable `<div>` for family followups (around line 130), add an `onKeyDown` handler alongside the existing `onClick`:

```tsx
onKeyDown={
  onFollowupClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFollowupClick({
            student_ref: f.student_ref,
            reason: f.reason,
            message_type: f.message_type,
          });
        }
      }
    : undefined
}
```

---

### Task 4: Tab ARIA Semantics

**Files:**
- Modify: `src/App.tsx` (lines 286-329, and each tabpanel region)
- Modify: `src/App.css` (tab styling)

- [ ] **Step 1: Add ARIA roles to the tab navigation**

In `App.tsx`, change the `<nav>` element:

From:
```tsx
<nav className="app-tabs">
```
To:
```tsx
<nav className="app-tabs" role="tablist" aria-label="Classroom tools">
```

Change each tab `<button>` to include ARIA attributes. Example for the first tab:

From:
```tsx
<button
  className={`tab-btn ${activeTab === "differentiate" ? "tab-btn--active" : ""}`}
  onClick={() => setActiveTab("differentiate")}
>
  Differentiate
</button>
```
To:
```tsx
<button
  role="tab"
  id="tab-differentiate"
  aria-selected={activeTab === "differentiate"}
  aria-controls="panel-differentiate"
  className={`tab-btn ${activeTab === "differentiate" ? "tab-btn--active" : ""}`}
  onClick={() => setActiveTab("differentiate")}
>
  Differentiate
</button>
```

Apply the same pattern to all 7 tabs, using ids: `tab-differentiate`, `tab-tomorrow-plan`, `tab-family-message`, `tab-log-intervention`, `tab-language-tools`, `tab-support-patterns`, `tab-ea-briefing`.

- [ ] **Step 2: Wrap each tab content in a tabpanel div**

Wrap each tab's content area with a `role="tabpanel"` div. Example for Differentiate tab:

```tsx
{activeTab === "differentiate" && classrooms.length > 0 && (
  <div role="tabpanel" id="panel-differentiate" aria-labelledby="tab-differentiate">
    <div className={result ? "split-pane" : ""}>
      ...existing content...
    </div>
  </div>
)}
```

Apply the same pattern to all 7 tab panels.

---

### Task 5: Tab Grouping & Nav Redesign

**Files:**
- Modify: `src/App.tsx` (tab nav section)
- Modify: `src/App.css` (tab group styling)

- [ ] **Step 1: Group tabs into semantic clusters in the markup**

In `App.tsx`, restructure the tab nav into groups using `<div>` wrappers with aria-labels:

```tsx
<nav className="app-tabs" role="tablist" aria-label="Classroom tools">
  <div className="tab-group" role="presentation">
    <span className="tab-group-label">Lesson Prep</span>
    <button role="tab" id="tab-differentiate" ...>Differentiate</button>
    <button role="tab" id="tab-language-tools" ...>Language Tools</button>
  </div>
  <div className="tab-group" role="presentation">
    <span className="tab-group-label">Daily Ops</span>
    <button role="tab" id="tab-tomorrow-plan" ...>Tomorrow Plan</button>
    <button role="tab" id="tab-ea-briefing" ...>EA Briefing</button>
    <button role="tab" id="tab-log-intervention" ...>Log Intervention</button>
  </div>
  <div className="tab-group" role="presentation">
    <span className="tab-group-label">Review</span>
    <button role="tab" id="tab-family-message" ...>Family Message</button>
    <button role="tab" id="tab-support-patterns" ...>Support Patterns</button>
  </div>
</nav>
```

- [ ] **Step 2: Add tab-group styles**

In `App.css`, add:

```css
.tab-group {
  display: flex;
  align-items: center;
  gap: 0;
}

.tab-group + .tab-group {
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--color-border);
}

.tab-group-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  padding: 0 0.5rem 0 0;
  white-space: nowrap;
  user-select: none;
}
```

---

### Task 6: Active Classroom Context Bar

**Files:**
- Modify: `src/App.tsx` (header section, add classroom display)
- Modify: `src/App.css` (context bar styling)

- [ ] **Step 1: Add a classroom context indicator to the header**

In `App.tsx`, find the selected classroom profile and display it in the header. After the `const studentStubs = ...` line, add:

```tsx
const activeClassroomProfile = classrooms.find((c) => c.classroom_id === msgClassroom);
```

Then in the header JSX, after the `<p className="app-subtitle">`:

```tsx
{activeClassroomProfile && (
  <div className="classroom-context">
    <span className="classroom-context-label">Active classroom:</span>{" "}
    <span className="classroom-context-value">
      Grade {activeClassroomProfile.grade_band} — {activeClassroomProfile.subject_focus.replace(/_/g, " ")}
    </span>
    <span className="classroom-context-id">{activeClassroomProfile.classroom_id}</span>
  </div>
)}
```

- [ ] **Step 2: Style the context bar**

In `App.css`, add:

```css
.classroom-context {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.8rem;
}

.classroom-context-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.classroom-context-value {
  color: var(--color-text);
  font-weight: 600;
}

.classroom-context-id {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 0.72rem;
}
```

---

### Task 7: Loading Skeletons & Progress Indicators

**Files:**
- Modify: `src/index.css` (add keyframe + skeleton utility classes)
- Modify: `src/App.tsx` (add skeleton placeholders per tab while loading)
- Modify: `src/App.css` (skeleton layout)

- [ ] **Step 1: Add skeleton keyframe animation and utility classes to index.css**

At the end of `src/index.css`, add:

```css
/* Skeleton loading animation */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.15; }
}

.skeleton-line {
  height: 0.85rem;
  background: var(--color-border);
  border-radius: 4px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-line--short { width: 40%; }
.skeleton-line--medium { width: 65%; }
.skeleton-line--long { width: 90%; }
.skeleton-line--full { width: 100%; }

.skeleton-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.skeleton-heading {
  height: 1.1rem;
  width: 50%;
  background: var(--color-border);
  border-radius: 4px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-info);
  border: 1px solid var(--color-border-info);
  border-radius: var(--radius);
  font-size: 0.85rem;
  color: var(--color-text-info);
}

.loading-indicator::before {
  content: "";
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-border-info);
  border-top-color: var(--color-text-info);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-indicator--planning {
  background: var(--color-bg-accent);
  border-color: var(--color-border-accent);
  color: var(--color-text-accent);
}

.loading-indicator--planning::before {
  border-color: var(--color-border-accent);
  border-top-color: var(--color-text-accent);
}
```

- [ ] **Step 2: Add skeleton placeholders in App.tsx**

In `App.tsx`, for each tab's result section, add a loading skeleton that appears when `loading` is true and result is null. Example for the Differentiate tab:

After the `{error && result === null && ...}` line, add:

```tsx
{loading && result === null && (
  <div className="skeleton-result" aria-busy="true" aria-label="Loading differentiated variants">
    <div className="skeleton-heading" />
    <div className="loading-indicator">Differentiating lesson into multiple variants...</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginTop: "0.75rem" }}>
      {[1, 2, 3].map((n) => (
        <div key={n} className="skeleton-card">
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--long" />
          <div className="skeleton-line skeleton-line--medium" />
          <div className="skeleton-line skeleton-line--full" />
        </div>
      ))}
    </div>
  </div>
)}
```

For Tomorrow Plan (planning-tier — use the `--planning` variant):

```tsx
{loading && planResult === null && (
  <div className="skeleton-result" aria-busy="true" aria-label="Generating tomorrow plan">
    <div className="loading-indicator loading-indicator--planning">Deep reasoning in progress — generating your support plan...</div>
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="skeleton-card">
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--long" />
          <div className="skeleton-line skeleton-line--medium" />
        </div>
      ))}
    </div>
  </div>
)}
```

Apply similar patterns for:
- Family Message: `loading && msgResult === null` — "Drafting family message..."
- Log Intervention: `loading && interventionResult === null` — "Structuring your intervention note..."
- Support Patterns: `loading && patternResult === null` — use `--planning` variant, "Analyzing intervention patterns..."
- EA Briefing: `loading && briefingResult === null` — "Generating EA daily briefing..."

Language Tools skeletons are simpler since they're inline in their own components.

---

### Task 8: Empty States with Guidance

**Files:**
- Modify: `src/App.tsx` (add empty state sections per tab)
- Modify: `src/App.css` (empty state styling)

- [ ] **Step 1: Add empty state CSS**

In `App.css`, add:

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1.5rem;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  margin-top: 0.5rem;
}

.empty-state-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.empty-state-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.empty-state-description {
  font-size: 0.85rem;
  max-width: 360px;
  line-height: 1.5;
}
```

- [ ] **Step 2: Add empty states to result panes**

In `App.tsx`, for each tab, when `!loading && result === null && !error`, show an empty state. Example for Differentiate:

```tsx
{!loading && result === null && !error && (
  <div className="empty-state">
    <span className="empty-state-icon">&#9998;</span>
    <div className="empty-state-title">No variants yet</div>
    <p className="empty-state-description">
      Upload a lesson artifact and select a classroom to generate differentiated versions for your students.
    </p>
  </div>
)}
```

Empty state content per tab:
- **Tomorrow Plan:** icon &#128197;, "No plan yet", "Reflect on today to generate a structured support plan for tomorrow. The planning model uses deep reasoning."
- **Family Message:** icon &#9993;, "No draft yet", "Select a student and provide context to draft a plain-language family message. You'll review it before copying."
- **Log Intervention:** icon &#128221;, "No intervention logged", "Select students and describe what happened. The system structures your note for classroom memory."
- **Support Patterns:** icon &#128202;, "No patterns analyzed", "Run pattern detection to review recurring themes, gaps, and trends from your intervention history."
- **EA Briefing:** icon &#128203;, "No briefing generated", "Generate a printable daily briefing for the educational assistant. Synthesizes today's plan, recent interventions, and pattern insights."

Language Tools don't need empty states since the form is the primary content.

---

### Task 9: Print CSS for PlanViewer

**Files:**
- Modify: `src/components/PlanViewer.css` (add print styles)
- Modify: `src/components/PlanViewer.tsx` (add print button)

The EA Briefing already has print CSS and a print button (EABriefing.css:251-266, EABriefing.tsx:148-153). Now add the same for PlanViewer.

- [ ] **Step 1: Add print button to PlanViewer.tsx**

At the end of the PlanViewer component, just before the closing `</div>`, add:

```tsx
<button
  className="plan-print"
  onClick={() => window.print()}
>
  Print Plan
</button>
```

- [ ] **Step 2: Add print styles to PlanViewer.css**

At the end of `PlanViewer.css`, add:

```css
.plan-print {
  margin-top: 1rem;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.plan-print:hover {
  background: var(--color-bg-muted);
}

@media print {
  .plan-print,
  .plan-meta,
  .plan-thinking,
  .plan-card-intervention-link,
  .plan-card-action-hint {
    display: none !important;
  }

  .plan-viewer {
    border: none;
    box-shadow: none;
    padding: 0;
  }
}
```

- [ ] **Step 3: Extend the EA Briefing print CSS to also hide the app shell globally**

In `EABriefing.css`, the existing `@media print` block hides `.app-header` and `.app-tabs`. These global selectors are already there, which is fine — PlanViewer's print CSS doesn't need to duplicate them. But add to the existing EA print block:

```css
@media print {
  .ea-briefing-form,
  .ea-briefing-print,
  .ea-briefing-disclaimer,
  .ea-briefing-meta,
  .app-header,
  .app-tabs,
  .classroom-context {
    display: none !important;
  }
  ...
}
```

---

### Task 10: Prefill Visual Feedback

**Files:**
- Modify: `src/components/MessageComposer.tsx` (add prefill banner)
- Modify: `src/components/MessageComposer.css` (prefill banner + field highlight styles)
- Modify: `src/components/InterventionLogger.css` (prefill highlight animation)
- Modify: `src/index.css` (add highlight keyframe)

- [ ] **Step 1: Add highlight animation keyframe to index.css**

At the end of `src/index.css`:

```css
@keyframes prefill-highlight {
  0% { background: var(--color-bg-info); }
  100% { background: transparent; }
}

.prefill-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: var(--color-bg-info);
  border: 1px solid var(--color-border-info);
  border-radius: var(--radius);
  font-size: 0.82rem;
  color: var(--color-text-info);
  margin-bottom: 1rem;
}

.prefill-banner-text {
  flex: 1;
  line-height: 1.4;
}

.prefill-banner-dismiss {
  background: none;
  border: none;
  color: var(--color-text-info);
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
}

.prefill-banner-dismiss:hover {
  opacity: 1;
}

.field--prefilled input,
.field--prefilled select,
.field--prefilled textarea {
  animation: prefill-highlight 2s ease-out;
}
```

- [ ] **Step 2: Add prefill banner to MessageComposer.tsx**

In `MessageComposer.tsx`, add a state for dismissing the banner and render it when `prefill` is present:

After the existing state declarations, add:
```tsx
const [prefillDismissed, setPrefillDismissed] = useState(false);
```

Reset dismissed state when prefill changes — add to the existing `useEffect`:
```tsx
useEffect(() => {
  if (prefill) {
    setStudentRef(prefill.student_ref);
    setMessageType(...);
    setContext(prefill.reason);
    setPrefillDismissed(false);
  }
}, [prefill]);
```

In the JSX, after `<p className="composer-description">...`, add:

```tsx
{prefill && !prefillDismissed && (
  <div className="prefill-banner">
    <span className="prefill-banner-text">
      Pre-filled from plan: <strong>{prefill.student_ref}</strong> — {prefill.message_type?.replace(/_/g, " ")}
    </span>
    <button className="prefill-banner-dismiss" onClick={() => setPrefillDismissed(true)} aria-label="Dismiss">
      &times;
    </button>
  </div>
)}
```

Add `field--prefilled` class to fields when prefill is active:

```tsx
<div className={`field${prefill && !prefillDismissed ? " field--prefilled" : ""}`}>
```

Apply to the Student, Message Type, and Context fields (the ones that get prefilled).

- [ ] **Step 3: Enhance InterventionLogger prefill**

The InterventionLogger already has a `logger-context` banner (lines 64-73), which is good. Add the highlight animation to its prefilled fields.

In `InterventionLogger.css`, add:

```css
.logger-context {
  animation: prefill-highlight 2s ease-out;
}
```

---

### Task 11: Aria-live Result Regions & Focus Management

**Files:**
- Modify: `src/App.tsx` (aria-live wrapper, focus management after results)

- [ ] **Step 1: Add aria-live to result regions**

In `App.tsx`, wrap each tab's result + skeleton + empty-state area in an `aria-live` div. This goes inside each tabpanel, around the content that changes dynamically:

```tsx
<div aria-live="polite" aria-atomic="false">
  {error && result === null && <div className="error-banner">...</div>}
  {loading && result === null && <div className="skeleton-result" ...>...</div>}
  {!loading && result === null && !error && <div className="empty-state">...</div>}
  {result && <VariantGrid ... />}
</div>
```

- [ ] **Step 2: Add focus management after successful results**

In `App.tsx`, add a ref and useEffect to focus the result heading when results appear. Use a single ref:

```tsx
import { useState, useEffect, useRef } from "react";

// At top of App component:
const resultRef = useRef<HTMLDivElement>(null);
```

In each handler (e.g., `handleDifferentiate`), after `setResult(resp)`:

```tsx
setTimeout(() => resultRef.current?.focus(), 100);
```

On each result component's wrapper `<div>`, add `ref={resultRef} tabIndex={-1}` when it's the currently active tab's result. Since only one tab is visible at a time, a single ref works — attach it to the outermost result wrapper of the active tab.

---

### Task 12: Success Toast State

**Files:**
- Modify: `src/App.tsx` (add success toast state)
- Modify: `src/App.css` (toast styling)
- Modify: `src/index.css` (toast animation keyframe)

- [ ] **Step 1: Add toast animation to index.css**

```css
@keyframes toast-in {
  0% { opacity: 0; transform: translateY(-0.5rem); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes toast-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
```

- [ ] **Step 2: Add toast styles to App.css**

```css
.success-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: var(--color-bg-success);
  border: 1px solid var(--color-border-success);
  color: var(--color-text-success);
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: var(--shadow-md);
  animation: toast-in 0.2s ease-out, toast-out 0.3s ease-in 2.5s forwards;
}
```

- [ ] **Step 3: Add success toast state in App.tsx**

Add state:
```tsx
const [successMsg, setSuccessMsg] = useState<string | null>(null);
```

Show and auto-clear:
```tsx
function showSuccess(msg: string) {
  setSuccessMsg(msg);
  setTimeout(() => setSuccessMsg(null), 3000);
}
```

In each handler, after setting the result:
- `handleDifferentiate`: `showSuccess("Variants generated")`
- `handleTomorrowPlan`: `showSuccess("Plan generated")`
- `handleFamilyMessage`: `showSuccess("Message drafted")`
- `handleIntervention`: `showSuccess("Intervention logged")`
- `handleSimplify`: `showSuccess("Text simplified")`
- `handleVocabCards`: `showSuccess("Cards generated")`
- `handleSupportPatterns`: `showSuccess("Patterns analyzed")`
- `handleEABriefing`: `showSuccess("Briefing generated")`

In the JSX, just inside `<div className="app-shell">`:
```tsx
{successMsg && <div className="success-toast" role="status">{successMsg}</div>}
```

---

### Task 13: Mobile Responsive Polish

**Files:**
- Modify: `src/App.css` (mobile nav, touch targets)
- Modify: `src/components/ArtifactUpload.css` (mobile touch targets)
- Modify: `src/components/SimplifiedViewer.css` (mobile form-row stacking)
- Modify: `src/components/VocabCardGrid.css` (mobile form-row stacking)

- [ ] **Step 1: Add mobile nav styles in App.css**

```css
@media (max-width: 600px) {
  .app-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 0;
    flex-wrap: nowrap;
  }

  .app-tabs::-webkit-scrollbar {
    display: none;
  }

  .tab-group {
    flex-shrink: 0;
  }

  .tab-group + .tab-group {
    margin-left: 0.25rem;
    padding-left: 0.5rem;
  }

  .tab-group-label {
    display: none;
  }

  .tab-btn {
    padding: 0.6rem 0.75rem;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .app-shell {
    padding: 1rem 0.75rem;
  }

  .classroom-context {
    flex-wrap: wrap;
    font-size: 0.75rem;
  }

  .classroom-context-id {
    width: 100%;
  }
}
```

- [ ] **Step 2: Add mobile touch target sizes**

In `ArtifactUpload.css`, add:

```css
@media (max-width: 600px) {
  .btn-primary {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    width: 100%;
  }

  .field input,
  .field textarea,
  .field select {
    padding: 0.65rem 0.75rem;
    font-size: 1rem;
  }
}
```

- [ ] **Step 3: Stack form-row on mobile**

In `SimplifiedViewer.css`, add:
```css
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }
}
```

In `VocabCardGrid.css`, add:
```css
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }
}
```

---

### Task 14: Inline Validation on Required Fields

**Files:**
- Modify: `src/index.css` (validation styles)
- Modify: `src/components/ArtifactUpload.tsx` (validation on blur)
- Modify: `src/components/TeacherReflection.tsx` (validation on blur)

- [ ] **Step 1: Add validation CSS to index.css**

```css
.field--error input,
.field--error textarea,
.field--error select {
  border-color: var(--color-border-danger);
}

.field--error input:focus,
.field--error textarea:focus,
.field--error select:focus {
  outline-color: var(--color-text-danger);
}

.field-error-hint {
  font-size: 0.78rem;
  color: var(--color-text-danger);
  margin-top: 0.2rem;
}
```

- [ ] **Step 2: Add blur validation to ArtifactUpload.tsx**

Add `touched` state for fields that need validation:

```tsx
const [touched, setTouched] = useState<Record<string, boolean>>({});
```

On the Title input, add:
```tsx
onBlur={() => setTouched((t) => ({ ...t, title: true }))}
```

Wrap the field div:
```tsx
<div className={`field${touched.title && !title.trim() ? " field--error" : ""}`}>
```

After the input, add:
```tsx
{touched.title && !title.trim() && (
  <span className="field-error-hint">Title is required</span>
)}
```

Same for the "Lesson Content" textarea:
```tsx
onBlur={() => setTouched((t) => ({ ...t, rawText: true }))}
```
```tsx
<div className={`field${touched.rawText && !rawText.trim() ? " field--error" : ""}`}>
```
```tsx
{touched.rawText && !rawText.trim() && (
  <span className="field-error-hint">Lesson content is required</span>
)}
```

- [ ] **Step 3: Add blur validation to TeacherReflection.tsx**

Same pattern for the reflection textarea:

```tsx
const [touched, setTouched] = useState(false);
```

On textarea:
```tsx
onBlur={() => setTouched(true)}
```

Field wrapper:
```tsx
<div className={`field${touched && !reflection.trim() ? " field--error" : ""}`}>
```

Error hint:
```tsx
{touched && !reflection.trim() && (
  <span className="field-error-hint">Reflection is required</span>
)}
```

---

### Task 15: Final Build Verification

- [ ] **Step 1: Run full build**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/apps/web && npx vite build --mode development 2>&1 | tail -10`
Expected: Build success, no TypeScript errors, no CSS errors.

- [ ] **Step 2: Run existing eval suite**

Run: `cd /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev && npx vitest run 2>&1 | tail -20`
Expected: All existing tests pass (42 evals, zero regressions).

---

Plan complete and saved to `docs/superpowers/plans/2026-04-03-ui-ux-enhancements.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
