# Decision Log

Use this file as a lightweight ADR register.

## Template

### YYYY-MM-DD — Title
- **Decision:**
- **Why:**
- **Alternatives considered:**
- **Consequences:**
- **What would change this:**

---

### 2026-04-17 (round 3) — Route-scoped Gemma tool calling

- **Decision:** Make the existing `tool_call_capable` router flag operational for `differentiate_material` and `prepare_tomorrow_plan`. The orchestrator now discovers route-scoped local tools, sends tool definitions to the inference service, executes returned tool calls in TypeScript, and makes one provider-native follow-up generation before route parsers validate final JSON. Current tools are `lookup_curriculum_outcome` (local Alberta curriculum catalog) and `query_intervention_history` (active classroom SQLite memory). The Python harness forwards tools to hosted Gemini (`function_declarations`), Ollama (`tools` on `/api/chat`), and Vertex's OpenAI-compatible chat payload (`tools` + `tool_choice: auto`), and extracts tool calls from provider responses.
- **Why:** The router already declared two routes as tool-call capable, but the field was aspirational. Gemma 4 function calling is a strong hackathon proof point only if the product has a real bounded tool path and keeps execution inside the product's safety boundaries.
- **Alternatives considered:** (A) Leave F2 until a full provider-native function-response loop could be implemented. Rejected because the one-session path can still make the flag honest in mock and local orchestration while forwarding provider-native definitions. (B) Put curriculum lookup directly into every differentiation prompt. Rejected because explicit tools make the Gemma-specific architecture clearer and keep optional lookup separate from teacher-selected curriculum injection. (C) Add broad web curriculum search. Rejected because it would increase latency and trust risk; the Alberta catalog is intentionally local and bounded.
- **Consequences:** Tool schemas now live in `services/orchestrator/types.ts`; the executable registry is in `services/orchestrator/tool-registry.ts`; `callInference()` owns the tool turn and cumulative latency/token accounting; backend tests cover Gemini/Ollama/Vertex payload shapes; `diff-015-tool-calling-curriculum` exercises the route in evals. Follow-up provider calls now carry structured `tool_interactions[]`: Gemini receives `function_response` parts, Ollama receives `role: "tool"` messages, and Vertex receives OpenAI-compatible tool result messages.
- **What would change this:** Hosted Gemma proof runs showing that native function-response history is unreliable with the current Gemma API shape. That would require revisiting the provider-specific history builders.

---

### 2026-04-17 (round 2) — Three-layer material hierarchy and accent desaturation

- **Decision:** Round 1 of the institutional repositioning reached the right *register* (neutral canvas, Alberta navy, sans-only) but still read as blocky and cartoony because every content card was floating directly on the page canvas with no mediating surface between them. Round 2 introduces a **three-layer material hierarchy**: a darker, slightly-cooler page canvas (Layer 0, `--color-bg`); a new application workspace surface (Layer 1, `--color-workspace`) that wraps all panel content in a rounded, elevated frame; and the existing content cards (Layer 2, `--color-surface`) which now sit *on* the workspace rather than floating in the void. The primary navy accent is also desaturated (`#0f4c9e` → `#1b4b80` light, `#6ea3e6` → `#7aa7d9` dark) for a more mature, "considered" feel. The `BrandMark` SVG is refined from a filled-navy-square-with-stripes (generic app-icon idiom) to a small three-line prairie-horizon monogram that reads as wordmark-forward.
- **Why:** User feedback on round 1 — "the design still feels blocky/cartoony, the way main page elements sit on the background feels ill-thought-out, we might need three layers here instead of the current 2." The diagnosis was correct: a two-layer system (canvas + cards) cannot produce material depth no matter how carefully the colors are tuned. Every rectangle reads as a discrete block because there's no semantic *container* between the page itself and the content objects. Apple's Human Interface Guidelines ("materials" — regular/thin/thick) and institutional-product conventions (Gmail, Notion, Linear, PowerSchool) all use a three-tier material stack for exactly this reason. Additionally, fully-saturated `#0f4c9e` navy was reading as "generic app blue" rather than "considered institutional navy" — a small desaturation shift (-10% saturation) moves the hue from default-SaaS to Alberta-government adjacent.
- **Alternatives considered:** (A) Add decorative textures (subtle noise, paper grain) to the existing two-layer canvas to simulate depth. Rejected because dark-mode-contract §6 already prohibits grain in dark mode, and light-mode texture alone creates theme asymmetry. Also, texture masks the lack of material hierarchy rather than fixing it. (B) Increase shadow prominence on all cards to anchor them to the canvas. Rejected because heavy shadows under-elevate the workspace relative to individual cards — the result is cards that look "stuck" to a flat canvas, not cards *on* a surface. (C) Keep two layers but add a `max-width` content frame with visible borders. Rejected because a bordered frame is still a single surface; it doesn't provide the tonal stepping that makes cards feel grounded. (D) Preserve the round-1 fully-saturated navy and only add the workspace layer. Rejected because the "cartoony" feedback included the saturated-blue elements specifically; a material hierarchy alone wouldn't address the accent-saturation critique.
- **Consequences:**
  - New `--color-workspace` token in `apps/web/src/styles/tokens.css` (light `#f4f6fa` / dark `#12161e`). Sits between `--color-bg` (darker) and `--color-surface` (lighter).
  - `--color-bg` darkened from `#f7f8fa` → `#e8ebf0` (light) and `#0e1116` → `#070a0f` (dark) so the workspace has visible canvas around it.
  - `--color-surface-muted` retuned for the new layer stack (`#f1f3f6` → `#eef1f5` light; `#12161d` → `#151a22` dark).
  - `--color-border-*`, `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-bg-accent`, `--color-text-accent`, `--color-border-accent`, `--color-section-priority`, `--color-section-focus`, and the `prefers-contrast: more` accent fallback all retuned for the desaturated navy family. Token *names* unchanged; the shared `--ds-*` alias layer inherits the shift automatically.
  - `.app-main` in `apps/web/src/styles/shell.css` transformed from a bare flex container into the Layer-1 workspace: `background: var(--color-workspace)`, `border-radius: var(--radius-xl)`, `box-shadow: var(--shadow-lg)`, `padding: var(--space-6)`, plus a `::before` pseudo-element carrying the inner-stroke catchlight. The existing `.app-main` flex behavior (`gap`, `padding-top`, tabpanel children) is preserved.
  - `base.css` body background simplified to a flat `var(--color-bg)` — the single-layer linear-gradient top-fade from round 1 is retired because the workspace surface now provides all visual framing.
  - `.empty-state` in `primitives.css` softened: dashed border → solid thin border, linear-gradient background → flat `--color-surface`, `backdrop-filter: blur(12px)` removed. As Layer-2 content on a real workspace, the empty state reads cleanly without the round-1 compensatory effects.
  - `.empty-state-steps` reset to `--color-surface-muted` (Layer 2b inset) so nested lists read as inset panels rather than duplicate cards.
  - `BrandMark.tsx` rewritten: filled navy square with stacked stripes (app-icon idiom) → three-line prairie-horizon monogram on transparent background (wordmark-forward institutional idiom). SVG viewBox retuned from 260×44 to 280×40; dimensions reduce visual weight of the mark relative to the wordmark.
  - `docs/dark-mode-contract.md` §1 rewritten with a new material-hierarchy table; §6 body-background note updated.
  - Downstream impact: every panel's first-impression shifts from *floating blocks on a color* to *content cards on a framed workspace on a page*. The hierarchy now mirrors institutional-product convention.
- **What would change this:** Real user feedback from Alberta teachers, principals, or board reviewers indicating that (a) the workspace frame feels cluttered or over-elaborated versus the cleaner two-layer model, or (b) the darker canvas (`#e8ebf0`) feels gloomy on low-ambient-light classrooms. Mitigation before a rollback: lighten `--color-bg` back toward `#eef1f5` while keeping the workspace token and elevation. The three-layer *architecture* should be preserved even if the specific tonal values are tuned further.

---

### 2026-04-17 — Institutional repositioning of the visual identity

- **Decision:** Retire the warm-cream + Prairie-cognac + Fraunces-display-serif visual identity in favor of an **institutional neutral canvas + Alberta-navy primary + single humanist sans** palette. Changes land entirely at the token and one-file-per-concern layer: `apps/web/src/styles/tokens.css` is rewritten end-to-end (colors, type scale, radii), `apps/web/src/styles/base.css` replaces the four-layer radial gradient body wash with a single flat top-fade, `apps/web/src/styles/shell.css` retires the dead `.app-title-os` monospace-pill CSS and re-tunes the dark-mode logo filter for the neutral canvas. The Prairie cognac survives as `--color-brand-highlight` for brand-mark use only; it is not a primary UI accent. Token names are preserved — the shift is values-only, so no component CSS call sites change.
- **Why:** The product sits in front of Alberta K-6 teachers, principals, Learning Services reviewers, and school-board stakeholders. Alberta institutional software (alberta.ca, MyPass, PowerSchool, Edsby, MyEdBC, LearnAlberta, CBE, EPSB) converges on a shared visual grammar: white/light-neutral canvas, navy or green primary, clean humanist sans, minimal gradients, no editorial display serifs. The prior identity hit the opposite on every axis and was reading as *editorial/lifestyle/consulting-studio brand* rather than *trusted government-adjacent education software*. Reviewer first-impression trust is the single largest barrier to pilot entry in this sector and is carried largely by visual register.
- **Alternatives considered:** (A) Dual-theme preservation — ship a new `data-theme="institutional"` alongside the existing warm palette and let context pick. Rejected as duplication of the contrast-gate matrix, QA surface, and component assumptions; also risks leaving the warm palette as the default seen by accidental reviewers. (B) Emergency minimum shift — only recolor `--color-bg`, `--color-accent`, and retire the serif. Rejected because the cream semantic-family backgrounds (`--color-bg-sun`, `--color-bg-sage`, etc.) would have remained and continued to pull the register back toward the retired aesthetic. (C) Keep the warm palette and add density/chrome to compensate. Rejected — the register mismatch is about *color semiotics*, not information density.
- **Consequences:**
  - `apps/web/src/styles/tokens.css` rewritten end-to-end (~275 lines). All `light-dark(...)` token *names* preserved so the contrast gate and the shared `--ds-*` alias layer (`apps/web/src/tokens.css`) continue to work unchanged.
  - `--font-serif` now aliases `--font-sans` (single humanist sans family, Inter → Public Sans → system). The 18 component files that consumed `var(--font-serif)` for display headlines inherit the shift with zero per-file edits.
  - Display type sizes tightened: `--text-2xl` 2.25rem → 1.75rem, `--text-3xl` 3.25rem → 2.25rem, `--text-xl` 1.625rem → 1.375rem. This retires the magazine-editorial display scale.
  - Radius scale tightened (`--radius-sm` 12 → 8, button radii 14/10/16 → 8/6/10) for a more conservative engineered feel.
  - `base.css` body gradient collapsed from a four-layer radial accent wash to a single neutral top fade.
  - `shell.css` dark-mode logo filter re-tuned from `brightness(2.2) drop-shadow(...)` to `brightness(1.35) contrast(1.05)` for the neutral dark canvas. The `.app-title-os` pill CSS (dead — no JSX consumer) is removed.
  - `docs/dark-mode-contract.md` §1 rewritten and several downstream sections updated. The guidance now directs contributors to "push back" against any pressure to restore cream surfaces or cognac as a primary UI accent (inversion of the prior direction).
  - The `prairiegem-logo.png` brand-mark asset is **out of scope for this change** — it still displays "PrairieClassroom AI" with a cognac wordmark. A future asset refresh should regenerate the logo in the institutional palette (Alberta navy primary, cognac demoted to an optional mark element).
  - The `prairie-signal-design-SKILL.md` skill file remains on disk with its original "warm off-white / soft cream / restrained serif accent" guidance. That skill was authored for the *PrairieSignal consulting-studio* brand and is intentionally distinct from the *PrairieClassroom* product brand after this repositioning. Leaving it in place is correct; do not invoke it when designing classroom-product surfaces.
  - Semantic families (`--color-bg-sun`, `-sage`, `-slate`, `-forest`, `-analysis`, `-provenance`, `-pending`) retained by name but retuned to near-neutral tints with a hint of semantic hue. This preserves the 18+ consumer call sites' semantic intent while removing the cream-on-cream indistinguishability that added visual noise.
  - Contrast gate (`npm run check:contrast`) must pass. If specific pairs fail post-migration, the standing §4.1 guidance (adjust lightness within the same hue family, never shift hue) still applies — just within the new navy/neutral hue family instead of the retired cognac family.
- **What would change this:** Real user feedback from Alberta teachers, principals, or board reviewers indicating that the institutional palette reads as *too generic* or *not recognizably Prairie* to the point of eroding brand recall. The mitigation path before a full reversal would be to expand `--color-brand-highlight` cognac use in secondary-emphasis placements (decorative rules, hover-state warmth, section eyebrows) rather than bringing it back as a primary UI accent.

---

### 2026-04-16 — Teacher Quality-of-Life Tier 1 sprint

- **Decision:** Ship four additive UI conveniences on top of the existing 12-panel surface: (1) a `Cmd/Ctrl+K` command palette indexing panels, classrooms, and per-student actions, (2) a persistent `Tomorrow Plan` header chip with per-item remove popover, (3) a visible `Resume your draft?` affordance on four free-text panels via an extended `useFormPersistence` hook, (4) a `?`-key keyboard shortcut cheat-sheet with a footer trigger for mouse users.
- **Why:** The app is production-hardened but teachers pay a per-session navigation tax (rebuilding context after interruption, hunting across panels, re-typing lost drafts). Each intervention targets a high-frequency friction point with no backend or schema change.
- **Alternatives considered:** Adding a single global "home" dashboard with smart routing (heavier UX churn); per-panel next-step chips (Tier 2 — deferred); full voice-input pipeline for hallway use (Tier 3 — deferred). Tier 1 picks the smallest additive set with the clearest daily payback.
- **Consequences:**
  - New `prairieclassroom.palette.recents` localStorage namespace introduced (first use of the `prairieclassroom.` prefix — reserve it for future palette-owned keys).
  - `useFormPersistence` now accepts a fourth-argument options object (`autoRestore`, `minChars`, `maxAgeMs`); default values preserve existing behavior. New return fields: `restore`, `dismiss`, `hasPendingDraft`. Stored shape gains a private `__ts` timestamp.
  - New reducer action `REMOVE_TOMORROW_NOTE` complements the existing `APPEND_TOMORROW_NOTE` / `CLEAR_TOMORROW_NOTES` pair.
  - New components under `apps/web/src/components/`: `CommandPalette`, `TomorrowChip`, `DraftRestoreChip`, `ShortcutSheet`. New hook: `usePaletteEntries`.
  - Header gains a `⌘K` button and a `Tomorrow · N` chip; footer gains a `?` button.
  - 24 new unit tests added across the four features; full suite passes at 1159 tests / 103 files.
- **What would change this:** Real teacher usage data (session events already collected via `useSessionContext`) showing that either (a) the palette is rarely invoked — in which case shift investment to Tier 2 context-aware next-step chips, or (b) drafts are frequently discarded before threshold — in which case lower `minChars` or remove the threshold entirely.

---

### 2026-04-14 — OutputActionBar shared component and dual-step family-message approval

- **Decision:** Introduce `OutputActionBar` as a shared UI component (`apps/web/src/components/shared/OutputActionBar.tsx`) that renders a consistent row of output actions (Print, Copy, Download, Save to Tomorrow, Share with EA, Review approval) below the `FeedbackCollector` in every generation panel. Require family-message approval to go through a two-step `MessageApprovalDialog` rather than a single confirm button.
- **Why:** Eight generation panels had no consistent affordance for acting on outputs once generated. Ad-hoc per-panel buttons created maintenance divergence and inconsistent teacher affordance. The dual-step approval ceremony for family messages reflects the legal and communication weight of school-to-family correspondence — a single button underplays that weight.
- **Alternatives considered:** Per-panel action buttons with no shared contract (current state before this plan); a floating toolbar. Per-panel buttons were already diverging; a floating toolbar adds positioning complexity without adding clarity.
- **Consequences:** All eight panels (Differentiate, TomorrowPlan, SupportPatterns, EABriefing, Forecast, SurvivalPacket, LanguageTools, FamilyMessage) now render a consistent `OutputActionBar`. New supporting hooks: `useCopyToClipboard` (clipboard API + execCommand fallback) and `useDownloadBlob` (blob URL + filename sanitization). New `tomorrowNotes: TomorrowNote[]` AppState slot persisted to localStorage enables cross-panel "Save to Tomorrow" aggregation.
- **What would change this:** Evidence that teachers need different action sets per panel would motivate a richer per-panel action registry rather than the current per-panel `actions` prop.

---

### 2026-04-13 — Bounded Alberta curriculum catalog for prompt alignment

- **Decision:** Add a local Alberta curriculum registry backed by `data/curriculum/alberta/catalog.json`, expose it through read-only `/api/curriculum/*` routes, and let differentiation plus vocabulary-card requests carry an optional `curriculum_selection` that references one catalog entry and up to three official focus statements.
- **Why:** The product is built specifically for Alberta classrooms, so leaving curriculum entirely implicit makes outputs harder to trust and harder to steer. A bounded local catalog gives teachers real Alberta anchors without forcing every prompt through live web retrieval or opening the door to broad, noisy curriculum scraping.
- **Alternatives considered:** Keep curriculum as free-text teacher goals only, or fetch Alberta curriculum pages live at generation time. Free-text goals were too loose for reliable alignment; live fetches would add latency, parsing drift, and prompt-size variability to otherwise fast classroom flows.
- **Consequences:** The UI now exposes optional curriculum selection in the differentiate and vocabulary workflows. Worksheet extraction returns curriculum suggestions inferred from classroom context and extracted text. Social Studies grades 4-6 are explicitly marked `optional` in the seed catalog to reflect the 2025-26 / 2026-27 rollout nuance, so downstream prompts can carry that context instead of implying universal implementation.
- **What would change this:** A future production deployment that needs broader jurisdiction coverage or full strand/outcome depth would likely move the catalog into a versioned content pipeline or database, with richer metadata and update automation rather than a hand-curated local JSON seed.

---

### 2026-04-12 — Letterpress Tactility for cards and buttons

**Context:** The 2026-04-12 light-palette editorial-letterpress sprint
(see `docs/superpowers/specs/2026-04-12-light-palette-editorial-letterpress-design.md`)
committed the color system to a paper-and-ink metaphor. Cards and buttons,
however, still carried generic SaaS dashboard interaction patterns:
bouncy `translateY(-2px) scale(1.02)` hover transforms, hardcoded
accent-tied glow shadows that silently drifted when the palette was
refined, frosted glass blur on `.surface-panel`/`.form-panel`, missing
`:focus-visible` and `:active` states, and no shared component primitive
for structured cards.

**Decision:** Introduced a "Letterpress Tactility" direction. Killed
bouncy transforms (translateY max 1px, no scale). Replaced hardcoded
rgba button shadows with derived `--shadow-sm/md/xs` tokens so future
palette shifts track automatically. Added `:focus-visible` (shared token
with form fields), `:active` press states, `prefers-reduced-motion`
fallback, `.btn--danger` and `.btn--link` variants, size modifiers,
icon-only modifier, loading state with absolute spinner, and a
general-purpose `<Card>` React primitive with variants, tones,
composition API, and accent stripe. Killed `backdrop-filter: blur` on
`.surface-panel` and `.form-panel` (frosted glass is not letterpress);
replaced the depth cue with an inset top-edge warm-white highlight.

**Scope:** `apps/web/src/styles/primitives.css`,
`apps/web/src/styles/tokens.css`, `apps/web/src/tokens.css`,
`apps/web/src/components/shared/{ActionButton,StatusCard,Card,IconButton,index}.{tsx,ts,css}`,
plus three reference panel migrations:

- Today (`apps/web/src/panels/TodayPanel.tsx` — priority and forecast cards)
- Differentiate (`apps/web/src/panels/DifferentiatePanel.tsx` and the
  `ArtifactUpload.tsx` sub-component — form rail and result summary)
- InterventionLogger (`apps/web/src/components/InterventionLogger.tsx`
  — form rail)

Each migration also stripped stale surface declarations from the
panel's own CSS file (padding, box-shadow, background, border, radius)
that would otherwise have fought Card's styles. The remaining nine
panels benefit passively from the `primitives.css` class refresh —
explicit component-level migration is deferred as opportunistic future
work.

**Justification for killing `backdrop-filter: blur`:** Frosted glass is
a Material 3 / visionOS idiom. The letterpress metaphor requires cards
that sit on paper, not float on blur. The inset top-edge highlight
combined with the existing warm shadow ladder delivers the
"ink-pressed-into-paper" lift without the compositing cost or the
silent conflict with `prefers-reduced-transparency: reduce` (which the
old blur ignored).

**Non-goals:** No new animation framework, no shadcn-style component
library rewrite, no palette changes, no global migration of all 20+
raw-class call sites in one sprint.

**Known follow-ups (not blockers):**

- The Task 11 (InterventionLogger) commit message mentions a Delete
  button migration that did not happen — there is no Delete button in
  that file. The CSS and Save button work in that commit are correct;
  only the message is misleading. Future readers should ignore that
  sentence.
- Card composition with `accent` and named slots (`Card.Body`) has
  asymmetric left-padding when the slot's own padding combines with
  the accent stripe's outer `padding-left`. Not visible in the
  reference panels (none use the combination), but a future migration
  that does will need a small layout adjustment.
- Some tests for migrated panels are smoke-import-only — there is no
  unit-level coverage of `Card`/`ActionButton` rendered inside
  `TodayPanel`, `DifferentiatePanel`, or `InterventionLogger`. Adding
  panel-level RTL tests is a separate sprint.
- The `prefers-reduced-transparency: reduce` override on
  `--color-surface-glass` no longer reaches `.surface-panel` because
  the panel doesn't consume `--color-surface-glass`. This was already
  true before this sprint and is not made worse — flagged here for
  awareness only.

---

### 2026-04-12 — Endpoint role scopes for adult workflows

- **Decision:** Add optional `X-Classroom-Role` handling to classroom-code auth, enforce route-level role scopes for teacher-only and teacher/EA API surfaces, and extend the generated API inventory with a `Role scope` column.
- **Why:** The operating system needs a concrete adult-boundary layer before real-data rehearsal. Classroom-code access alone cannot distinguish teacher-owned raw history and generation routes from scoped EA coordination routes.
- **Alternatives considered:** Wait for a full account/SSO system, or keep role boundaries documentation-only. Full identity is still outside the local-first pilot scope; documentation-only boundaries were too weak for the next readiness step.
- **Consequences:** Missing role headers default to `teacher` for backwards compatibility. Invalid role headers return `classroom_role_invalid`; disallowed roles return `classroom_role_forbidden`. Teacher-only routes cover generation, schedule writes, raw history, health, and student summaries. Teacher/EA routes cover Today, EA briefing, debt register, feedback, and session summaries. Substitute and reviewer roles are declared but intentionally receive no raw endpoint access until dedicated bounded views exist.
- **What would change this:** A school-managed deployment, multi-teacher accounts, or external sharing would require real identity, invitation state, per-user audit logs, and persistence-backed role assignment rather than header-based local role scoping.

---

### 2026-04-12 — Exact API inventory and memory lifecycle controls

- **Decision:** Extend the generated inventory to exact Express endpoint parsing and add `docs/api-surface.md` as a deterministic endpoint table. Add `npm run memory:admin` for per-classroom SQLite summary, export, structural anonymization, backup, purge, and restore.
- **Why:** Route-base counts were useful but not enough to prevent endpoint-level documentation drift. Real-data pilot readiness also needed concrete operator controls for memory export, de-identification, deletion, and recovery instead of documentation-only blockers.
- **Alternatives considered:** Keep endpoint tables manually maintained in CLAUDE/README, or wait for a full OpenAPI generator. Manual tables had already drifted; OpenAPI generation would require broader route/schema refactoring than the current risk justified. For memory controls, a UI was deferred because pilot operators need safe local CLI controls first.
- **Consequences:** `npm run system:inventory:check` now fails if `docs/api-surface.md` drifts from the route files. Memory lifecycle operations are available without introducing hosted storage or external services. `purge` and `restore` require `--confirm`; anonymized exports still carry a free-text review warning because structural replacement cannot guarantee complete de-identification.
- **What would change this:** A move to multi-user or school-managed deployment would require persistence-backed role assignment, retention policy enforcement in schema, and authenticated audit logs rather than local-only CLI controls.

---

### 2026-04-12 — Canonical inventory and pilot-readiness guardrails

- **Decision:** Add code-derived system inventory tooling (`npm run system:inventory`, `npm run system:inventory:check`) and an operator status command (`npm run ops:status`). Add `docs/system-inventory.md` as the generated surface inventory and introduce `docs/pilot-readiness.md` plus expanded safety-governance rules for real classroom data.
- **Why:** The system had reached a stage where documentation drift was becoming a credibility risk: canonical docs could disagree about panel counts, prompt-class counts, and proof posture. The next strategic gap is not another workflow; it is pilot-readiness, role boundaries, data lifecycle control, and proof claims that remain tied to artifacts.
- **Alternatives considered:** Manually updating the README and CLAUDE count only. That fixes the immediate mismatch but does not prevent future drift. Building full route-contract generation now was deferred because the first useful guardrail is panel/prompt/tier claim validation.
- **Consequences:** Public and operator docs now have a generated inventory source. Readiness docs explicitly block real classroom data until adult roles, export/delete/anonymize/backup controls, incident handling, and human validation artifacts exist.
- **What would change this:** If route-level documentation starts drifting, extend the inventory helper to parse exact endpoint methods and compare them against `docs/prompt-contracts.md` and `docs/architecture.md`.

---

### 2026-04-04 — Substitute Teacher Survival Packet

- **Decision:** Add `generate_survival_packet` as the 11th prompt class. Planning tier with thinking enabled. Retrieval pulls from all 7 SQLite tables plus the classroom profile. Output structured into 6 named sections + heads_up array. Sub_ready authorization gate on the classroom profile. Persisted to new `survival_packets` SQLite table.
- **Why:** The substitute teacher scenario is the single highest real-world-impact feature in the roadmap. When a teacher is absent, the classroom's accumulated memory becomes inaccessible at the exact moment it's most needed. This is the first feature that makes classroom memory transferable between adults without requiring the teacher to manually write briefing notes.
- **Alternatives considered:** (1) Reuse EA briefing with expanded scope — insufficient because the substitute needs routines, family comms, and day plan sections that the EA briefing doesn't cover. (2) Generate per-section with separate calls — 6x latency and loses cross-section coherence. (3) Deterministic output without model — would miss the synthesis and simplification that makes the packet actionable.
- **Consequences:** The comprehensive retrieval function (buildSurvivalContext) is the most expensive query in the system — it touches all 7 tables. Acceptable because this runs once per absence, not per request. max_tokens set to 8192 to accommodate the 6-section output. New survival_packets table adds an 8th persistence layer.
- **What would change this:** Evidence that substitutes need a different format (e.g., audio briefing, per-block cards instead of document). Or if real inference shows the 6-section output exceeds model capacity, in which case we'd split into 2 calls (operational sections + student sections).

---

### 2026-04-04 — Schedule data model enrichment

- **Decision:** Extend ScheduleBlockInputSchema with optional `ea_student_refs` (which students the EA supports per block) and UpcomingEventSchema with optional `event_date`. Add `sub_ready` boolean flag to ClassroomProfile. Add GET/PUT `/api/classrooms/:id/schedule` endpoints. Persist schedule updates to the classroom JSON file.
- **Why:** The Substitute Survival Packet and EA Cognitive Load Balancer both need richer schedule data than the current boolean `ea_available`. Explicit EA-student assignments per block enable load calculation and substitution handoff. The `sub_ready` flag is the pre-authorization gate for survival packet generation. Date-aware events allow temporal filtering.
- **Alternatives considered:** (1) Separate SQLite table for schedules — adds complexity without clear benefit since schedules are classroom-scoped and change infrequently. (2) Day-of-week schedule variants — deferred; a single default schedule covers most use cases for now. (3) No persistence (in-memory only) — breaks local-first promise.
- **Consequences:** All existing data validates without changes (new fields are optional). Demo classroom enriched with EA assignments from Ms. Fehr's actual support pattern. Schedule PUT writes directly to JSON — fine for single-user local deployments but would need a different strategy for multi-user.
- **What would change this:** Multi-user deployment requiring concurrent schedule edits, or evidence that day-of-week schedule variants are needed for the EA Load Balancer.

---

### 2026-04-03 — Final review hardening pass

- **Decision:** Applied 20+ improvements from a comprehensive code review: auth gap fix on GET endpoint, enum validation on family message type, ESLint config, CORS restriction, database indexes, graceful shutdown, json_each for student ref queries, server-driven student lists, LocalBackend extract_json, empty-candidate logging, VertexAI error codes, SkeletonLoader extraction, aria-describedby/aria-label a11y, pinned Python deps, .env.example, and 2 new eval cases (cold-memory, non-English message).
- **Why:** Pre-production hardening. The auth gap on the pattern report GET endpoint was the most critical — student behavioral data was accessible without a classroom code. The enum validation bug would silently accept invalid message types.
- **Alternatives considered:** Shipping as-is for demo. But the auth gap is a real privacy concern even for synthetic data, and the other fixes are low-risk improvements.
- **Consequences:** Eval count rises to 44. CORS now restricts to configured origin. Three of five synthetic classrooms remain unauthenticated by design (no access_code set).
- **What would change this:** If CORS origin needs to change for deployment, set CORS_ORIGIN env var. If auth is needed on all classrooms, add access_code to charlie/delta/echo JSON files.

---

### 2026-04-03 — Submission artifacts reflect full system state

- **Decision:** Update README, Kaggle writeup, demo script, and eval report to reflect all 13 sprints of work including Vertex AI backend, Zod validation, and classroom-code auth.
- **Why:** The original README was a pre-dev starter doc. The Kaggle writeup's "What's Not Built" section was outdated (Vertex AI backend now exists). A judge or collaborator cloning the repo should understand the full system from the README alone.
- **Alternatives considered:** Separate README for each audience (judges vs. developers). Leaving the writeup as-is with a changelog appendix.
- **Consequences:** README is now the primary entry point with quick-start instructions. Writeup accurately describes 3 inference backends, Zod validation, and auth. Sprint history table in README shows the full 13-sprint arc.
- **What would change this:** Moving to a hosted documentation site, or splitting the repo into separate user-facing and developer-facing docs.

---

### 2026-04-03 — Classroom-code authentication model

- **Decision:** Add optional `access_code` field to ClassroomProfile. API requests to classroom-specific routes require an `X-Classroom-Code` header matching the classroom's code. Demo classroom bypasses auth. Classrooms without an access_code are open.
- **Why:** The state assessment identified no authentication as a critical gap. Student names and intervention records are accessible to anyone on the network. A simple classroom code provides basic access control without the complexity of user accounts.
- **Alternatives considered:** Full user account system (overkill for local-first MVP). API key per deployment (doesn't differentiate classroom access). No auth (status quo, privacy risk).
- **Consequences:** Two test classrooms (alpha, bravo) now have access codes. Demo classroom is open for demo mode. Auth middleware runs before route handlers on all classroom-specific endpoints. UI needs a code entry mechanism (deferred to UI polish).
- **What would change this:** A multi-teacher deployment requiring per-user access control, or integration with school SSO.

---

### 2026-04-03 — WAL checkpoint management

- **Decision:** Add `checkpointAll()` function that runs `PRAGMA wal_checkpoint(TRUNCATE)` on all open SQLite connections. Called on server startup and every 5 minutes via `setInterval`.
- **Why:** WAL files were growing to 3.9MB for a 4KB database because checkpointing never happened. TRUNCATE mode resets the WAL file to zero bytes after checkpointing.
- **Alternatives considered:** Checkpoint on every write (too frequent, adds latency). Manual checkpoint only (requires developer action). Disable WAL mode (loses concurrent read/write benefit).
- **Consequences:** WAL files stay small. `closeAll()` now checkpoints before closing connections. Minimal CPU overhead from periodic checkpointing.
- **What would change this:** Moving to a multi-process server where WAL checkpointing needs coordination.

---

### 2026-04-03 — Zod for runtime schema validation

- **Decision:** Convert all 8 TypeScript interface schema files to Zod schemas. Add request validation middleware to all orchestrator POST routes. Each schema file exports both the Zod object (for validation) and the inferred type (for compile-time use).
- **Why:** The state assessment identified no input validation as a critical gap. TypeScript interfaces provide compile-time safety but zero runtime protection. Malformed API requests could crash the server or produce garbage output. Zod provides runtime validation that catches type mismatches, missing fields, and invalid enum values at the API boundary.
- **Alternatives considered:** joi (heavier, separate type definitions). io-ts (less ergonomic). Manual validation (already existed, incomplete and inconsistent). ArkType (newer, less ecosystem support).
- **Consequences:** All `import type` consumers are unaffected — Zod inferred types are structurally identical. Request bodies are validated before reaching route handlers. Validation errors return 400 with field-level detail. Zod v4 added to root dependencies.
- **What would change this:** A project-wide move away from TypeScript, or Zod's maintenance status changing.

---

### 2026-04-03 — Vertex AI as Gemma inference backend

- **Decision:** Use Vertex AI via the `google-genai` SDK for real Gemma 4 inference. Both model tiers (`gemma-4-4b-it` live, `gemma-4-27b-it` planning) are called through the same SDK. The harness `--mode api` flag activates this backend.
- **Why:** Vertex AI provides both model tiers without local GPU requirements. AI Studio has limited quota. Local inference requires significant GPU hardware. Vertex AI is production-grade and supports thinking mode.
- **Alternatives considered:** AI Studio free tier (rate limits too low for eval runs at the time). Local inference via transformers (requires 16GB+ VRAM for 27B). Gemini API-hosted Gemma 4 (acceptable for synthetic hackathon validation, but not the privacy-first school deployment path).
- **Consequences:** Requires a GCP project with Vertex AI API enabled and Gemma model access. `GOOGLE_CLOUD_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS` environment variables must be set. Adds `google-genai` to Python dependencies. Real inference latency will be higher than mock.
- **What would change this:** Gemma models becoming available on a simpler/cheaper API, or a need for offline-only operation where local inference is required.

---

### 2026-04-05 — extract_json() control character sanitization for real model output

- **Decision:** Add `_sanitize_json_control_chars()` that escapes bare control characters (tabs, newlines, etc.) inside JSON string values before returning from `extract_json()`.
- **Why:** Run 2 of real evals revealed that Gemma 3 4B sometimes emits unescaped control characters inside JSON string values (e.g., literal tabs or newlines inside `student_facing_instructions`). These are valid in Python strings but illegal in JSON, causing `json.loads()` to fail with "Bad control character in string literal." The sanitizer walks the string tracking quote state and escapes control chars only inside string values.
- **Alternatives considered:** Post-processing in each orchestrator parser (duplicates logic across 11 parsers). Regex-based replacement (can't distinguish control chars inside vs outside strings). Requesting `response_mime_type: "application/json"` from the endpoint (not reliably supported by vLLM-served Gemma).
- **Consequences:** Adds ~0.1ms per response (character walk is O(n) on output length). 4 new test cases cover tab, newline, already-escaped, and array contexts.
- **What would change this:** Vertex AI vLLM endpoints supporting reliable structured output mode, making control character sanitization unnecessary.

---

### 2026-04-05 — extract_json() unified bracket matching replaces early-return path

- **Decision:** Remove the early-return path in `extract_json()` that returned text as-is when it started with `{` or `[`. Replace with a single code path that always finds the outermost bracket pair (preferring whichever bracket type appears first in the text).
- **Why:** The early-return path didn't strip trailing prose. Real model output like `{"key": "value"}\nI hope this helps!` would return the full string including prose, causing downstream `json.loads()` to fail. While this bug didn't manifest in the first real eval run (Gemma 3's output was cleaner than expected), it's a ticking time bomb.
- **Alternatives considered:** Adding a separate trailing-prose strip after the early return (would duplicate the `rfind` logic). Keeping the early return and just adding `rfind` there (inconsistent code paths for the same operation).
- **Consequences:** All 20 extract_json tests pass including the previously-bug-documenting test case which now asserts correct behavior. The new array trailing-prose test also passes.
- **What would change this:** Evidence that the unified path is slower on large inputs (unlikely — it's a single `find` + `rfind`), or edge cases where the earliest bracket isn't the JSON boundary.

---

### 2026-04-05 — First real-inference baseline: 56/64 (87.5%), zero safety failures

- **Decision:** Accept 56/64 as the Phase A baseline. All 8 failures categorized: 7 latency (mock-calibrated thresholds too tight for real 27B inference), 1 content quality (missing EA name in survival packet due to retrieval gap). After fixes: 7 latency thresholds adjusted, survival context now includes classroom notes.
- **Why:** The 87.5% pass rate exceeds the 85% exit criteria. Zero parse/schema and zero safety failures on the first real run is a strong signal that the prompt contracts, JSON extraction, and safety framing work under real inference conditions.
- **Alternatives considered:** Re-running before fixing to get a "clean" baseline (unnecessary — the failures are well-understood and documented).
- **Consequences:** Planning tier latency budgets are now 60-150s (up from 5-30s). The survival context is richer. The extract_json bug is fixed proactively. Re-run will establish the post-fix baseline.
- **What would change this:** Evidence that the latency thresholds are too generous (should tighten once endpoint is warm), or that classroom notes injection degrades survival packet quality by adding noise.

---

### 2026-04-05 — Both Vertex AI endpoints operational (Phase A G-01 Task 8)

- **Decision:** Both self-deployed Gemma 3 endpoints are confirmed operational and responding to smoke tests. Live tier (4B on A100 80GB) responds in ~2s. Planning tier (27B on A100 80GB) responds in ~5-8s. No GPU quota issues encountered — A100 80GB quota was available.
- **Why:** The planning endpoint was previously blocked with "Dedicated endpoint DNS is empty." The deployment operation (`4140943352084299776`) completed successfully within ~9 minutes of submission. The earlier sessions observed it too early.
- **Alternatives considered:** Managed Gemma API via `generate_content` was the documented fallback if GPU quota blocked deployment. Not needed.
- **Consequences:** Real-inference eval suite (Task 9) is unblocked. Thinking mode returns `thinking=no` from the vLLM endpoint — reasoning traces are not exposed. This is a known limitation documented in the prior ADR. Safety and content quality evals that depend on thinking output will need adjusted assertions.
- **What would change this:** Vertex AI exposing reasoning traces from vLLM-served Gemma 3, or a switch to a different serving stack that supports them.

---

### 2026-04-05 — Vertex real path uses self-deployed Gemma 3 endpoints

- **Decision:** Keep Vertex AI as the real provider, but stop using publisher-model `generate_content` calls. Real inference now targets two long-lived self-deployed Model Garden endpoints via `PredictionServiceClient.raw_predict`: `google/gemma3@gemma-3-4b-it` for the live tier and `google/gemma3@gemma-3-27b-it` for the planning tier.
- **Why:** The project's real gate was blocked by unavailable Gemma publisher-model IDs. Model Garden deployment configs exist for Gemma 3 in `us-central1`, and the verified vLLM configs expose a chat-completions sample request that preserves the prompt split and multimodal surface we already need.
- **Alternatives considered:** Keep waiting on publisher-model availability (blocks all real baselines). Switch to a non-Gemma Vertex model (breaks model intent). Switch providers (adds a second real-provider path and more operational drift).
- **Consequences:** Real mode now requires `PRAIRIE_VERTEX_BACKEND=endpoint`, `PRAIRIE_VERTEX_ENDPOINT_LIVE`, and `PRAIRIE_VERTEX_ENDPOINT_PLANNING`. The repo adds an explicit provisioning script and the real gate probes endpoint reachability before starting local services. Thinking mode remains a contract flag, but endpoint-backed Gemma does not currently expose separate reasoning traces the way the old SDK path did.
- **What would change this:** A supported, project-accessible Gemma publisher-model path on Vertex that preserves the same multimodal and structured-output needs more simply than endpoint deployment.

---

### 2026-04-03 — JSON extraction utility for real model output

- **Decision:** Add an `extract_json` function in the inference harness that strips markdown fences, finds JSON structures in prose output, and fixes trailing commas before returning to the orchestrator.
- **Why:** Real model output rarely arrives as clean JSON. Common patterns include markdown ` ```json ``` ` wrapping, leading/trailing prose, and trailing commas. The mock backend always returned clean JSON, masking this issue.
- **Alternatives considered:** Forcing structured output via API's `response_mime_type` (not all Gemma API endpoints support this reliably). Fixing only in orchestrator parsers (duplicates logic across 8 parsers). No extraction, just retry on failure (wastes API calls).
- **Consequences:** JSON extraction happens once in the harness before returning to Flask, so all 8 prompt classes benefit. Orchestrator parsers remain as-is and serve as a second layer of defense.
- **What would change this:** Vertex AI Gemma endpoints supporting `response_mime_type: "application/json"` reliably, making extraction unnecessary.

---

### 2026-04-03 — Tomorrow plan prompt contract v0.1.0
- **Decision:** The tomorrow plan prompt uses a structured system prompt defining 5 output sections (transition watchpoints, support priorities, EA actions, prep checklist, family followups) with explicit JSON object format, plus a user prompt injecting classroom context and teacher reflection.
- **Why:** Structured output constraints ensure consistent plan sections. Enumerating sections explicitly prevents the model from omitting critical planning areas. Teacher reflection is the primary input signal.
- **Alternatives considered:** Free-form plan narrative (harder to display, less actionable). Separate calls per section (5× latency, loses cross-section coherence). Multi-turn conversation (too slow for end-of-day teacher workflow).
- **Consequences:** Parse layer must validate JSON object structure. Plan viewer UI can render each section independently. Thinking mode is enabled for this route since planning requires multi-step reasoning.
- **What would change this:** Evidence that real Gemma 4 output requires different prompting structure, or that section-by-section calls produce higher-quality plans.

---

### 2026-04-03 — Thinking mode for planning route only
- **Decision:** Tomorrow plan uses thinking mode on the planning model tier. Differentiation continues without thinking.
- **Why:** Planning requires synthesizing multiple inputs (reflection, routines, student profiles, constraints) into a coherent plan. Thinking mode adds reasoning chain visibility. Differentiation is more formulaic and benefits from speed over depth.
- **Alternatives considered:** Thinking for all routes (too slow for live tasks). No thinking anywhere (misses planning quality benefit).
- **Consequences:** API response includes `thinking_summary` field. UI exposes thinking in a disclosure element for teacher transparency.
- **What would change this:** Evidence that differentiation quality improves significantly with thinking, or that planning latency with thinking exceeds teacher patience.

---

### 2026-04-03 — Tabbed UI for workflow modes
- **Decision:** The web UI uses a tab navigation (Differentiate / Tomorrow Plan) rather than a single-page flow.
- **Why:** Teachers may want to differentiate materials and generate plans in separate sessions. Tab navigation keeps each workflow clean and focused. Both tabs share the classroom selector pattern.
- **Alternatives considered:** Single flow wizard (forces a linear path). Sidebar navigation (overkill for 2 features). Modal overlays (poor UX for complex forms).
- **Consequences:** Each tab manages its own state. Classrooms are loaded once on mount and shared. Future tabs (family messaging, intervention logging) can be added without refactoring.
- **What would change this:** User research showing teachers prefer a unified flow, or the addition of cross-workflow dependencies (e.g., plan referencing today's differentiation).

---

### 2026-04-02 — Teacher/EA workflow is the primary MVP
- **Decision:** The first version will optimize for teacher and educational-assistant use, not student chat.
- **Why:** Classroom complexity is primarily a coordination and workload problem.
- **Alternatives considered:** Student tutoring-first interface; admin analytics-first interface.
- **Consequences:** Product demos should focus on classroom operations.
- **What would change this:** Strong evidence that the teacher loop is too narrow to demonstrate impact.

---

### 2026-04-02 — TypeScript for app/orchestrator, Python for inference
- **Decision:** Use TypeScript for the web app, orchestrator, shared schemas, and eval harness. Use Python for the Gemma inference layer only.
- **Why:** TypeScript provides type safety for schemas and UI. Python is required for HuggingFace transformers and the Gemma model ecosystem. Keeping the boundary clean (TS ↔ Python via HTTP/IPC) avoids dual-runtime complexity in most of the codebase.
- **Alternatives considered:** All-Python (weaker UI tooling for hackathon). All-TypeScript (no mature local Gemma inference library). Rust (overkill for MVP).
- **Consequences:** The inference service must expose an HTTP or IPC interface that the TS orchestrator can call. Mock mode in the harness allows TS-side development without running the Python service.
- **What would change this:** A mature TypeScript Gemma inference library emerging, or a decision to use only API-based Gemma access.

---

### 2026-04-02 — Vite + React for the teacher UI
- **Decision:** Use Vite + React for `apps/web/`, not Next.js or other SSR frameworks.
- **Why:** Hackathon context favors fast scaffolding, simple deployment, and minimal boilerplate. The app is local-first and teacher-facing, so SSR/SEO features are irrelevant. Vite provides fast HMR and minimal config.
- **Alternatives considered:** Next.js (unnecessary complexity for a local-first tool), SvelteKit (smaller ecosystem for rapid prototyping).
- **Consequences:** No server-side rendering. API routes handled by a separate service layer.
- **What would change this:** A requirement for server-rendered pages or deployment to a public-facing web service.

---

### 2026-04-02 — SQLite for local classroom memory
- **Decision:** Use SQLite as the local storage backend for classroom memory, intervention records, and generated outputs.
- **Why:** SQLite is local-first, zero-config, file-portable, and supports real queries. It aligns with the project's privacy and local-deployment principles. It is sufficient for hackathon-scale data.
- **Alternatives considered:** Flat JSON files (fragile for queries, no referential integrity). PostgreSQL (requires a server, unnecessary for MVP). IndexedDB (browser-only, limits backend retrieval).
- **Consequences:** The retrieval layer (Sprint 3) can build on SQL queries before adding vector search. Data portability is easy — one `.sqlite` file per classroom.
- **What would change this:** A need for concurrent multi-user writes or server-hosted deployment at scale.

---

### 2026-04-02 — Provisional Gemma 4 model checkpoints
- **Decision:** Default to `google/gemma-4-4b-it` (live route) and `google/gemma-4-27b-it` (planning route).
- **Why:** The roadmap references E4B-it and 26B-A4B-it as the target models. These are the closest identifiers based on available Gemma 4 documentation. The harness is designed to be model-ID-agnostic, so changing checkpoints is a config change.
- **Alternatives considered:** E2B-it for live (even smaller but may lack quality). 31B-it for planning (larger but higher hardware requirements).
- **Consequences:** Hardware requirements for local inference are moderate (4B fits on consumer GPU; 27B needs ~16GB+ VRAM or quantization). Mock mode eliminates this dependency during development.
- **What would change this:** Official model catalog publication confirming exact checkpoint names and hardware profiles.

---

### 2026-04-02 — Thinking mode opt-in only for planning tasks
- **Decision:** Enable Gemma 4 thinking mode only for `prepare_tomorrow_plan` and other high-stakes synthesis tasks. All other prompt classes run with thinking disabled.
- **Why:** Thinking mode adds latency and token cost. It is justified for planning (which requires multi-step reasoning over classroom context) but counterproductive for differentiation, messaging, and logging where speed matters.
- **Alternatives considered:** Thinking on by default (too slow for live tasks). Thinking off everywhere (misses the best use of the planning model's capabilities).
- **Consequences:** The routing table must explicitly flag thinking per prompt class. The inference harness must support toggling thinking mode.
- **What would change this:** Evidence that differentiation quality improves significantly with thinking mode on the small model.

---

### 2026-04-02 — Monorepo workspace structure
- **Decision:** Organize as a pnpm/npm workspace monorepo with `apps/`, `services/`, `packages/`, and `evals/` top-level directories.
- **Why:** The roadmap explicitly calls for separation of interface, orchestration, memory, evaluation, and documentation. A workspace monorepo keeps these concerns separate while allowing shared type imports.
- **Alternatives considered:** Flat directory (loses architectural clarity important for submission). Separate repos (overhead for a hackathon team of one).
- **Consequences:** Shared schemas in `packages/shared/` are importable by all TS packages. Python inference stays in `services/inference/` with its own `requirements.txt`.
- **What would change this:** The project growing beyond hackathon scale and needing independent deployment pipelines.

---

### 2026-04-02 — Flask HTTP bridge for inference service
- **Decision:** Wrap the Python Gemma harness in a lightweight Flask HTTP server (`services/inference/server.py`) rather than using IPC or embedding Python in Node.
- **Why:** Clean HTTP boundary between TypeScript orchestrator and Python inference. Flask is zero-config, the API surface is one endpoint (`POST /generate`), and it works identically in mock and local modes. The orchestrator calls it via `fetch`.
- **Alternatives considered:** gRPC (overkill for single-endpoint MVP). Subprocess/stdin piping (fragile, harder to test). Embedding Python via node-python (complex build dependency).
- **Consequences:** Requires starting two processes for development (inference + orchestrator). Vite dev server proxies `/api` to orchestrator, orchestrator calls inference at `:3200`.
- **What would change this:** Performance requirements demanding sub-millisecond IPC, or a move to fully API-based Gemma access.

---

### 2026-04-02 — Differentiation prompt contract v0.1.0
- **Decision:** The differentiation prompt uses a structured system prompt defining 5 variant types with explicit JSON output format, plus a user prompt injecting classroom context and artifact content.
- **Why:** Structured output constraints reduce parsing failures. Enumerating variant types explicitly ensures the model produces all 5 and doesn't invent its own categories. Injecting classroom context (students, scaffolds, routines) makes outputs classroom-specific rather than generic.
- **Alternatives considered:** Free-form prose output (harder to parse, less schema-stable). Separate calls per variant (5× latency). Tool-call-based generation (adds complexity with no Sprint 1 benefit).
- **Consequences:** Parse layer must handle markdown fencing and validate structure. Mock inference response updated to return full 5-variant JSON for realistic testing.
- **What would change this:** Evidence that real Gemma 4 output requires different prompting structure, or that variant quality improves with per-variant calls.

---

### 2026-04-02 — Express for orchestrator API server
- **Decision:** Use Express.js (v5) for the orchestrator API server in TypeScript.
- **Why:** Minimal boilerplate, well-known API, runs directly with `tsx`. The orchestrator needs only a few routes (`/api/classrooms`, `/api/differentiate`, `/api/health`). Express v5 supports async handlers natively.
- **Alternatives considered:** Hono (lighter but less ecosystem support for rapid prototyping). Fastify (more ceremony than needed). tRPC (type-safe but overkill when the primary consumer is a simple React app).
- **Consequences:** CORS enabled for local dev. Vite proxy handles the browser-to-API path.
- **What would change this:** Need for WebSocket support (would add socket.io or switch to a framework with built-in WS).

---

### 2026-04-03 — SQLite per-classroom memory files

- **Decision:** Use one SQLite database file per classroom, stored in `data/memory/{classroom_id}.sqlite`, with three tables: generated_plans, generated_variants, family_messages.
- **Why:** Per-classroom files align with local-first portability — a teacher can carry their classroom's entire history as a single file. JSON blobs in TEXT columns avoid relational joins while supporting recency-based retrieval via indexed columns.
- **Alternatives considered:** Single shared database (loses portability story). JSON flat files (fragile for queries). PostgreSQL (requires a server).
- **Consequences:** Connection manager caches open connections by classroom_id. Memory retrieval is by classroom + recency, not cross-classroom analytics.
- **What would change this:** A need for cross-classroom queries or multi-user concurrent writes.

---

### 2026-04-03 — prompt_class field for inference dispatch

- **Decision:** Add a `prompt_class` string field to `GenerationRequest` so the mock backend can dispatch to the correct canned response per prompt class.
- **Why:** Family messaging (no thinking, no tools, no images) would otherwise fall through to the differentiation mock response. Explicit dispatch by prompt class is more reliable than heuristic detection.
- **Alternatives considered:** Detect from prompt content (fragile). Separate endpoints per prompt class (breaks the unified /generate interface).
- **Consequences:** Backward-compatible — prompt_class defaults to None, existing calls unchanged. Real model inference ignores this field.
- **What would change this:** Moving to real model inference where the model determines output format from the prompt.

---

### 2026-04-03 — Family message approval is UX audit, not access control

- **Decision:** The `teacher_approved` field on `FamilyMessageDraft` is an audit record. There is no outbound messaging system to gate. The teacher manually copies the approved text to their own communication channel.
- **Why:** Building a send system introduces complexity and safety risk beyond MVP scope. The safety governance doc requires "no external send without approval" — the simplest way to enforce this is to not have send functionality at all.
- **Alternatives considered:** Email integration (too complex, privacy risk). SMS gateway (cost, privacy). Auto-send with approval toggle (violates safety principle).
- **Consequences:** UI shows "Approve & Copy" rather than "Send". Approval timestamp is recorded for audit.
- **What would change this:** A clear need for integrated messaging with proper consent infrastructure.

---

### 2026-04-03 — Intervention logging: model-structured approach

- **Decision:** Interventions use a model-structured approach: teacher writes free-text, Gemma (live tier, no thinking) extracts observation, action_taken, outcome, and follow_up_needed into a structured InterventionRecord. Teacher reviews the structured result; it saves to classroom memory automatically.
- **Why:** Matches the prompt-in/structured-out pattern of the other three workflows. Keeps the UX fast — teachers write naturally, not in forms. Demonstrates Gemma doing useful NLP work (structuring observations vs. just generating text).
- **Alternatives considered:** Form-first with no model (no NLP value, more friction). Hybrid form + model (more UI complexity for marginal benefit).
- **Consequences:** The mock response needs a prompt_class dispatch. Intervention records feed back into tomorrow plan prompts via retrieval injection.
- **What would change this:** Evidence that teachers prefer structured forms over free-text, or that model structuring is unreliable with real Gemma output.

---

### 2026-04-03 — Intervention retrieval injection into tomorrow plans

- **Decision:** Recent interventions are summarized and injected into the tomorrow plan prompt as a RECENT INTERVENTIONS section, alongside the existing CLASSROOM MEMORY section.
- **Why:** This closes the MVP loop: plan → act → log → next plan informed by outcomes. Without this, interventions are a dead-end log. The spec explicitly requires "classroom memory that actually improves outputs."
- **Alternatives considered:** No injection (simpler but breaks the loop). Full intervention detail injection (too much context, risk of prompt bloat).
- **Consequences:** The tomorrow-plan prompt builder accepts an additional interventionSummary parameter. The server route retrieves recent interventions before building the prompt.
- **What would change this:** Evidence that intervention context degrades plan quality, or that the prompt is too long with both plan and intervention summaries.

---

### 2026-04-03 — Plan-to-intervention UI bridge

- **Decision:** PlanViewer support priority cards include a "Log Intervention" button that pre-fills the InterventionLogger with the student ref, suggested action, and reason from the plan.
- **Why:** Mirrors the plan-to-message bridge from Sprint 3. Reduces friction in the plan → act → log loop. Teachers don't have to re-type context that already exists in the plan.
- **Alternatives considered:** No bridge, standalone intervention tab only (simpler but more friction). Auto-logging from plans (violates teacher-in-the-loop principle).
- **Consequences:** PlanViewer accepts an onInterventionClick callback. InterventionLogger accepts an optional prefill prop.
- **What would change this:** User research showing the bridge is confusing or that teachers prefer to log interventions independently of plans.

---

### 2026-04-04 — Language tools use live tier with no thinking

- **Decision:** Both `simplify_for_student` and `generate_vocab_cards` use the live model tier (gemma-4-4b-it) with thinking off and no retrieval.
- **Why:** Simplification and vocab card generation are single-artifact transformations — no multi-step reasoning or memory required. Speed is critical since teachers use these in-class, not during planning.
- **Alternatives considered:** Planning tier with thinking (unnecessary reasoning overhead for text transformation). Retrieval of student EAL profiles (useful future enhancement, but over-engineers Sprint 5 MVP).
- **Consequences:** Both routes complete in <1 second on mock, expected <5s on real models. No SQLite persistence — outputs are ephemeral, generated on demand.
- **What would change this:** Evidence that quality improves significantly with thinking, or a decision to persist simplified outputs per student for longitudinal tracking.

---

### 2026-04-04 — Support pattern detection uses planning tier with thinking

- **Decision:** `detect_support_patterns` uses the planning model tier (gemma-4-27b-it) with thinking enabled, the same configuration as tomorrow-plan. It retrieves interventions, plans, and follow-up states from classroom memory.
- **Why:** Pattern detection requires synthesizing across 10+ records to identify recurring themes, gaps, and trends. This is multi-step reasoning over accumulated data — the same class of problem that justified thinking mode for tomorrow-plan. The live tier lacks the context window and reasoning depth for cross-record synthesis.
- **Alternatives considered:** Live tier without thinking (insufficient for multi-record synthesis). Live tier with thinking (small model may miss subtle cross-record patterns). No thinking on planning tier (loses the reasoning trace that helps teachers understand why a pattern was identified).
- **Consequences:** Pattern reports take longer to generate (~5-10s real inference). Thinking summary is exposed in a disclosure element so teachers can review the model's reasoning. This is an end-of-day review tool, not a live-instruction tool, so latency is acceptable.
- **What would change this:** Evidence that the planning tier's reasoning adds no quality over the live tier for pattern detection, or that teachers find the latency unacceptable.

---

### 2026-04-04 — Pattern detection framed as teacher-documentation reflection, not student inference

- **Decision:** All pattern detection output uses observational language: "Your records show...", "You've documented..." Patterns are attributed to the teacher's own notes, not presented as model judgments about students. No diagnostic labels, risk scores, or clinical terminology.
- **Why:** The safety governance doc explicitly flags "a feature that begins to infer student state" as requiring careful handling. Pattern detection is the first feature that reads across multiple records and could easily drift into pseudo-diagnosis territory. The framing as "reflecting your own documentation back to you" keeps the teacher as the expert and the system as a memory assistant.
- **Alternatives considered:** Risk-scored output with student rankings (violates hard boundaries). Clinical pattern language like "behavioral regression" (violates safety governance). Neutral but unattributed patterns (ambiguous whether the system is diagnosing).
- **Consequences:** Mock responses and prompt contract embed safety language throughout. Evals include explicit checks for 15+ forbidden clinical/diagnostic terms. The UI description emphasizes "This reflects your own documentation — not a diagnosis."
- **What would change this:** A formal partnership with school psychologists who validate that the safety framing is sufficient, or evidence that the observational framing limits the feature's usefulness.

---

### 2026-04-04 — Pattern reports persisted for cross-feature data flow

- **Decision:** Pattern reports (previously ephemeral in Sprint 6) are now persisted to a `pattern_reports` table in classroom SQLite. The most recent report is automatically retrieved and injected into tomorrow-plan prompts as a PATTERN INSIGHTS section.
- **Why:** This closes the final data loop: interventions -> patterns -> plans -> interventions. Without persistence, pattern insights exist only during the teacher's review session and are lost before the next planning cycle. Persisting them makes the "classroom OS" metaphor real — the system connects findings across features.
- **Alternatives considered:** On-the-fly pattern generation during plan building (double inference latency, defeats the purpose of the separate review step). Passing pattern report IDs manually (adds friction, breaks the seamless loop). No injection (patterns remain informational-only, no downstream impact on planning).
- **Consequences:** The SQLite schema gains a 5th table. Tomorrow-plan prompts are longer when pattern context exists. The response includes `pattern_informed: boolean` for UI indication. A new GET endpoint (`/api/support-patterns/latest/:classroomId`) exposes persisted reports.
- **What would change this:** Evidence that pattern injection degrades plan quality, or that teachers prefer to manually control which patterns inform the plan.

---

### 2026-04-04 — Pattern insight injection preserves safety framing through the chain

- **Decision:** The `summarizePatternInsights()` function preserves the observational framing from Sprint 6 when injecting pattern context into tomorrow-plan prompts. All pattern summaries use "your records show" attribution, and the system prompt instructs the model to continue this framing.
- **Why:** Pattern detection was carefully safety-framed (Sprint 6, ADR). That framing must carry through when pattern data crosses into planning — otherwise, the planning model could reframe observational patterns as diagnoses. The chain of safety must be unbroken: teacher documentation -> pattern detection (observational) -> plan injection (observational) -> plan output (observational).
- **Alternatives considered:** Raw pattern data injection without framing (model might infer diagnostic language). Separate safety prompt for pattern-informed plans (duplicates safety rules, harder to maintain).
- **Consequences:** The pattern summary is structured with clear sections (HIGH-PRIORITY FOCUS, RECURRING THEMES, etc.) that maintain attribution. Safety evals for pattern-informed plans include the same 15 forbidden terms as pattern detection evals.
- **What would change this:** Evidence that the framing is insufficient and the planning model produces diagnostic language despite the safety prompt.

---

### 2026-04-03 — EA daily briefing uses live tier, no persistence

- **Decision:** The EA briefing uses the live model tier (gemma-4-4b-it) with no thinking, and is not persisted to SQLite. It synthesizes data from three existing sources (plans, interventions, pattern reports).
- **Why:** The briefing is a formatting/synthesis task, not deep reasoning — the planning tier already did the hard work. No persistence prevents briefings from becoming shadow student records. EAs regenerate on demand each morning.
- **Alternatives considered:** Planning tier with thinking (unnecessary — the source data is already reasoned over). Persist to a `briefings` table (risk of briefings becoming quasi-reports about students). Cache with TTL (over-engineered for local-first app).
- **Consequences:** No new SQLite table. Briefings pull from three existing tables via `buildEABriefingContext()`. The briefing is the second cross-feature synthesis view after pattern-informed planning.
- **What would change this:** Evidence that synthesis quality requires the planning tier, or EA feedback requesting briefing history for shift handoffs.

---

### 2026-04-03 — EA briefing observational framing matches pattern chain

- **Decision:** EA briefings use the same observational attribution as pattern reports and pattern-informed plans: "The teacher's plan notes..." rather than "This student has..." The same 15 forbidden diagnostic terms apply.
- **Why:** The EA briefing reads pattern data and intervention records — the same data that Sprint 6/7 carefully safety-framed. The framing must carry through to the briefing or we'd break the safety chain at the final display layer.
- **Alternatives considered:** Simplified safety rules for briefings (inconsistent, harder to maintain). No safety rules (dangerous — EA briefings about individual students need the same care as pattern reports).
- **Consequences:** The prompt contract includes the full forbidden terms list. Safety evals check the briefing output for all 15 terms.
- **What would change this:** Evidence that the observational framing makes briefings less useful for EAs, or school feedback that briefings need a different tone.

---

### 2026-04-04 — Simplification and vocab cards are ephemeral (not persisted)

- **Decision:** Language tool outputs (SimplifiedOutput, VocabCardSet) are returned directly to the UI but not stored in classroom SQLite.
- **Why:** These are on-demand transformations, not longitudinal records. A teacher simplifies a passage for today's lesson or generates vocab cards for this week — storing every generation adds complexity without MVP value.
- **Alternatives considered:** Persist to a `language_outputs` table (premature for MVP). Cache in memory with TTL (over-engineered for local-first app).
- **Consequences:** No retrieval injection of language tool history into tomorrow plans. Future sprints can add persistence if teachers want to reuse/share simplified content.
- **What would change this:** Teacher feedback requesting "save this simplification for reuse" or a need to track which simplification levels students are receiving over time.

---

### 2026-04-03 — Demo seed data uses production store functions

- **Decision:** The demo seed script (`data/demo/seed.ts`) populates classroom memory by calling the same `saveIntervention`, `savePlan`, `savePatternReport`, and `saveFamilyMessage` functions that the live system uses.
- **Why:** If seed data bypassed the store layer (e.g., raw SQL inserts), the demo could work even if the store functions were broken. Using production code paths means the seed script is also an integration test — if the store functions have bugs, the seed will fail. This approach caught a real bug in `db.ts` where `import.meta.dirname` was undefined in tsx's CJS mode.
- **Alternatives considered:** Raw SQLite inserts (faster but bypass validation). JSON fixture loading (simpler but doesn't test the real persistence path).
- **Consequences:** Seed script depends on `services/memory/store.ts` and `services/memory/db.ts`. Any schema changes to the store layer require updating the seed data.
- **What would change this:** A need for seed data that represents states the store functions can't produce (e.g., partially corrupted records for error-handling demos).

---

## 2026-04-04 — Phase 1: Debt Register as deterministic retrieval (no model)

**Decision:** The Complexity Debt Register uses pure SQL queries and TypeScript logic instead of a model prompt class.

**Rationale:** Every debt category maps to a deterministic query (stale follow-ups, unapproved messages, etc.). A model would add inference where we want precision. SQL counts stale items more reliably than a 4b model would.

**Evidence that would change this:** If teachers want natural-language debt summaries with contextual recommendations (beyond suggested actions), a model-generated summary layer could be added on top of the deterministic scan.

## 2026-04-04 — Phase 1: Scaffold Decay as separate prompt class (not extension of support-patterns)

**Decision:** Scaffold decay detection is a new prompt class (`detect_scaffold_decay`) rather than an extension of the existing `detect_support_patterns` workflow.

**Rationale:** The pattern report is already complex (recurring themes, follow-up gaps, positive trends, suggested focus). Adding scaffold decay analysis would make it too large. Additionally, scaffold decay is per-student and time-windowed differently — it needs 10+ records for a single student, while pattern detection works across the whole classroom.

**Evidence that would change this:** If the two workflows are always run together and users find it confusing to have separate reports, they could be merged under a unified "classroom intelligence" workflow.

---

### 2026-04-10 — Production Hardening Sprint

- **Decision:** Comprehensive security, resilience, testing, and documentation hardening across the full stack. Changes include: classroomId path traversal validation (regex + guard in db.ts and server.ts), health endpoint 5s abort timeout, rate limiting (200 global / 10 auth per minute per IP:classroom), safe JSON deserialization in all 15 memory retrieval call sites, atomic writes for schedule persistence (write-then-rename), security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control), accessibility audit and fixes (aria-invalid, explicit button types), 166 new schema validation tests covering all 14 Zod schemas, prompt builder and parser unit tests for all 12 prompt classes, web API client tests, architecture.md rewrite to match implemented system, and three new reference docs (database-schema.md, classroom-profile-schema.md, eval-inventory.md).
- **Why:** Independent assessment graded the system B+ to A- for hackathon submission but identified gaps that would block classroom use: no path traversal protection, no rate limiting on access codes, zero test coverage on shared schemas and prompt builders, stale architecture documentation, and no resilience against corrupted database records. The product goal shifted from "hackathon-ready" to "classroom-ready OS."
- **Alternatives considered:** (1) Minimal security-only sprint — would leave test coverage and documentation gaps that make the system fragile to future changes. (2) Full production deployment hardening (Sentry, branded types, migration framework, multi-instance support) — deferred as unnecessary for initial classroom pilot. (3) Helmet.js for security headers — rejected as over-dependency for 5 simple headers.
- **Consequences:** Test count increased from 190 to 500+. Schema and prompt builder contracts are now regression-protected. Path traversal and brute-force attack vectors are closed. Memory retrieval can now survive corrupted records. Architecture documentation matches the actual implemented system for the first time. All three new reference docs reduce operator onboarding friction.
- **What would change this:** Evidence from classroom pilots that additional hardening is needed (e.g., rate limits too restrictive for real usage, security headers causing CORS issues with specific browsers, schema tests catching false positives from legitimate schema evolution).

---

### 2026-04-11 — Comprehensive Review and Hardening

- **Decision:** Seven-round review covering security, error handling, type safety, component architecture, prompt safety, eval infrastructure, and test coverage. Key structural changes: (1) Auth middleware added to RouteDeps and applied at the router handler level for GET endpoints where app-level middleware can't extract classroomId from URL params. (2) All route error handling standardized to use `handleRouteError`/`sendClassroomNotFound`/`sendRouteError` — eliminated all manual `res.status(N).json()` calls. (3) Web layer types rewritten as re-exports from `@prairie/shared` instead of manual duplicates. (4) DrillDownDrawer decomposed from 538 → 133 lines across 4 sub-view files. (5) Prompt injection detection expanded from 6 to 16 regex rules. (6) Eval runner split into runner-types, runner-validators, and runner-config modules. (7) `isValidClassroomId` guard added to every GET endpoint that accepts a classroom ID URL parameter. (8) Integration tests added exercising orchestrator → mock inference → response parsing round-trip.
- **Why:** Independent review identified 4 critical security vulnerabilities (unauthenticated GET endpoints exposing classroom analytical data), inconsistent error responses that broke the web client's error categorization logic, 31 manually duplicated types that could drift from shared schemas, and 11 of 18 API routes with zero test coverage. The root cause of the auth bypass was an Express middleware ordering subtlety: `app.use("/path", authMiddleware)` runs before the sub-router parses `:classroomId` params, so `req.params.classroomId` is undefined at that level and the middleware silently skips auth for GET requests.
- **Alternatives considered:** (1) Fix only the 4 critical auth endpoints without standardizing the rest — would leave 5 more routes without input validation, creating future vulnerability surface. (2) Use branded ClassroomId types instead of runtime validation — stronger type safety but requires changes to all call sites and doesn't protect against malformed URL params at the HTTP boundary. (3) Generate web types at build time with a codegen step — adds build complexity; `import type` re-exports achieve the same result with zero runtime cost and no tooling.
- **Consequences:** Test count increased from 568 to 595 (27 test files). Every GET endpoint in the system now validates classroomId format before processing. Error responses are structurally uniform (category, retryable, detail_code), enabling the web client's auth retry and error display logic to work consistently. The web layer's type file cannot drift from shared schemas. The eval runner's validators are independently testable. The extract-worksheet schema is now accessible via the @prairie/shared barrel export.
- **What would change this:** If Express 5 changes sub-router param resolution behavior. If the web app needs to validate server responses at runtime (would need Zod schemas, not just type imports). If the prompt injection rule set causes false positives in multilingual classroom text (the rules are English-biased and may need localization for French immersion classrooms).

---

### 2026-04-12 — Maintenance host is hardware-infeasible for the full Ollama lane

- **Decision:** Record explicitly that the current maintenance host (Apple M1, 8 GiB RAM, ~6.76 GiB free disk) cannot run the full dual-speed Ollama lane regardless of whether Ollama itself is installed. The planning-tier `gemma4:27b` model requires substantially more RAM than 8 GiB under any reasonable quantization and its weights substantially exceed the available free disk. Update `docs/pilot/claims-ledger.md`, `docs/development-gaps.md` G-02, and the CLAUDE.md framing so future sessions and public copy describe "commodity Alberta hardware" as "≥ 16 GiB RAM and ≥ 40 GiB free disk" rather than "any Alberta school laptop." The `gemma4:4b` live-tier model may still be feasible on this host; a live-tier-only Ollama configuration would exercise 7 of the 13 prompt classes and could produce a partial privacy-first proof artifact if we later decide to pursue it.
- **Why:** The strategic assessment on 2026-04-11 treated the Ollama lane as "host-blocked on Ollama install + model pull." The 2026-04-12 non-destructive `host:preflight:ollama` run (artifact `output/host-preflight/2026-04-12T16-10-14-124Z.json`) revealed the block is structurally stronger — the host cannot fit the planning-tier weights into RAM or onto disk. Continuing to describe the Ollama lane as "unblockable by installing Ollama" on this host would be factually misleading, and a future sprint could waste hours trying to install and pull models that the machine physically cannot run. Capturing this as a decision-log entry rather than only a gap-doc update is appropriate because it changes the definition of "commodity hardware" the project is willing to claim publicly.
- **Alternatives considered:** (1) Ignore the finding and continue to treat Ollama as an operational TODO on this host — rejected because it would make the next person to try the lane waste meaningful time discovering the same constraint. (2) Build a live-tier-only Ollama configuration immediately to produce a partial proof — deferred because a live-tier-only proof covers only 7/13 prompt classes and would invite confusion about which parts of the system are "privacy-first proven" and which are not; if this is pursued it should be framed as "partial privacy proof" with explicit claims-ledger rows, not as a general solution. (3) Buy / rent different hardware — explicitly outside the zero-cost boundary and not authorized. (4) Rework the dual-speed architecture to allow the 4B live model to serve planning-tier prompts at lower quality — rejected, planning tier is planning tier for a reason.
- **Consequences:** `docs/pilot/claims-ledger.md` gains a `contradicted` row for "Ollama lane is feasible on the current maintenance host" and the existing `unsupported` row for "commodity Alberta hardware" gains a footnote defining the minimum viable hardware profile. `docs/development-gaps.md` G-02 "What remains" gains a fork — either pick a host with ≥ 16 GiB RAM + ≥ 40 GiB disk for the full lane, or run a live-tier-only configuration on this host with explicit scope limits. Public copy must not describe 8-GiB MacBook Airs as a target deployment host. The privacy-first narrative can still hold, but it must specify the hardware profile that supports it.
- **What would change this:** A host with the minimum profile becoming available for Ollama execution. Gemma model quantizations that genuinely fit a 27B-equivalent into 8 GiB (unlikely without significant quality loss). A decision to redesign the dual-speed architecture to consolidate on the 4B model for both tiers (would require a full prompt-contract review and is a much larger move than closing G-02).

---

### 2026-04-12 — EA Cognitive Load Balancer (Phase 2 capability)

- **Decision:** Add a 13th prompt class `balance_ea_load` (planning tier, thinking on, retrieval required) that produces a per-block EA cognitive-load profile for tomorrow's schedule, with a `load_level` enum of `low | medium | high | break`, per-block `load_factors`, optional `redistribution_suggestion` strings, and cross-block `alerts`. Retrieval is shared with the complexity forecast via `buildForecastContext`. The prompt class ships with a full end-to-end surface: Zod schema (`packages/shared/schemas/ea-load.ts`), orchestrator route (`/api/ea-load`, teacher+EA scope), prompt builder and parser (`services/orchestrator/ea-load.ts`), mock fixture (`MOCK_EA_LOAD` + thinking variant in `services/inference/harness.py`), three eval cases (schema, safety, prompt injection), a 12th web panel (`EALoadPanel`), and coverage in `prompt-contracts.md`. The parser enforces the invariant that blocks where `ea_available` is false always report `load_level: "break"`, regardless of what the model returned.
- **Why:** The EA Cognitive Load Balancer was one of the two remaining Phase 2 capabilities in `docs/future-development.md` and the more strategically distinctive of the two — inclusive education in Alberta leans heavily on Educational Assistants, and no other classroom tool models EA load as a first-class signal. Shipping it closes the gap between the four Phase-1 capabilities (forecast, scaffold decay, survival packet, debt register — all already shipped) and the EA-coordination story the project has been framing since the initial sprint. Cross-Adult Handoff Protocol, the other unshipped Phase 2 capability, is deferred because it requires multi-user real-time delivery and only earns its complexity once a real teacher asks for it.
- **Alternatives considered:** (1) Extend the existing EA Briefing panel with a load section instead of a new prompt class — rejected because EA Briefing is live tier (no thinking) and uses different retrieval, while load analysis needs deliberate cross-block reasoning. (2) Compute load deterministically from schedule metadata alone (no LLM) — rejected because the intervention history adds per-student intensity signal that is the whole point of modeling EA load over time. (3) Introduce a new memory table for persisted load profiles — rejected; the profile is always computed fresh from current schedule + memory, mirroring how the Debt Register avoids stale debt-about-debt.
- **Consequences:** Prompt-class count rises from 12 to 13, planning-tier count from 5 to 6, primary panel count from 11 to 12, API endpoint count from 33 to 34. `docs/system-inventory.md` and `docs/api-surface.md` regenerated. Test count rises (9 ea-load tests covering prompt shape, parser invariants, and cross-classroom alias scrubbing; 8 new schema tests for the `EALoadProfile` / `EALoadBlock` / `EALoadLevel` schemas). Eval count rises from 117 to 120 (three `eal-*` cases). The `apps/web/src/appReducer.ts` tab order now includes `ea-load` inside the Ops nav group.
- **What would change this:** Evidence from a real teacher pilot that EA load profiles produce friction rather than clarity — either too generic to be decision-useful, too accusatory in framing even after operational rewording, or too noisy when the `load_factors` are thin. If that happens, the first move is to tighten the prompt's "load factors" instructions; only after that fails does the capability move into deferral status.

---

### 2026-04-10 — SQLite Migration Framework

- **Decision:** Replace the inline `CREATE TABLE IF NOT EXISTS` schema in `services/memory/db.ts` with a versioned migration framework. Migrations are numbered SQL files in `services/memory/migrations/`, tracked in a `_migrations` table per database, and run inside transactions with rollback on failure. The current schema becomes migration 001.
- **Why:** Without migrations, any schema change (adding columns, renaming tables, new indexes) requires deleting the classroom's `.sqlite` file and losing all accumulated memory. In a classroom context, this memory represents weeks of intervention logs, plans, patterns, and family message drafts. A teacher who upgrades PrairieClassroom OS should not lose their classroom's history.
- **Alternatives considered:** (1) Continue with CREATE IF NOT EXISTS and manual ALTER TABLE scripts — fragile, no version tracking, easy to miss a database. (2) Full ORM with auto-migration (Drizzle, Prisma) — too heavyweight for per-classroom SQLite files. (3) Embedded migration in application code instead of SQL files — harder to audit and version.
- **Consequences:** The `getDb()` function now calls `runMigrations(db)` on first open instead of executing inline DDL. Existing databases are backward-compatible because migration 001 uses `IF NOT EXISTS`. Future schema changes are added as 002, 003, etc. Migration state is per-database (each classroom's SQLite file tracks its own version independently). The _migrations table adds ~100 bytes per database.
- **What would change this:** If classroom databases are moved to a shared PostgreSQL instance, the migration framework should be replaced with a proper migration tool (e.g., Drizzle Kit) that supports concurrent multi-instance migrations.

---

### 2026-04-14 — Intervention Quick-Capture shipped

- **Intervention Quick-Capture shipped.** Primary capture path is now the chip-first `QuickCaptureTray`. Legacy `InterventionLogger` preserved in a `<details>` expansion for structured flows and Tomorrow-Plan prefill (auto-opens when prefill present). No schema, API, or orchestrator changes — frontend-only addition on top of existing `logIntervention` contract.
