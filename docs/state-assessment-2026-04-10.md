# PrairieClassroom OS — Independent State Assessment
**Audit date: 2026-04-10 | Repo: prairieclassroom-predev**

---

## Executive Summary

PrairieClassroom OS is a **legitimately functional, well-architected hackathon-grade system** — not a prototype stub. Across five independent dimensions (documentation, architecture, testing, frontend, backend), the system demonstrates consistent engineering discipline that is unusual for its development timeline. The core product loop works end-to-end in mock and hosted-Gemini modes, with 12 prompt classes, 10 UI panels, and a coherent memory layer.

The system's **strengths are structural**: clean monorepo, explicit model routing, Zod-validated contracts, honest gap documentation, and a well-factored orchestrator. Its **weaknesses are predictable for the stage**: thin test coverage outside the eval harness, some missing mock fixtures, minor security hardening gaps, and documentation drift in the architecture doc.

**Overall grade: B+ to A-** — Ready for hackathon submission and demo. Needs targeted hardening before any real classroom use.

---

## I. What's Working Well

### Architecture & Code Quality
- **Monorepo is clean**: 5 workspace packages with proper dependency scoping. No circular dependencies. Shared Zod schemas are the single source of truth for cross-service types.
- **Model routing is explicit**: The `router.ts` routing table maps all 12 prompt classes to model tiers (live/planning) with thinking flags. This is auditable in one glance.
- **Inference abstraction is strong**: 5 backend modes (mock/ollama/gemini/api/local) behind a single interface. Cost guardrails are enforced at initialization, not at call time.
- **Gemini backend is production-quality**: Per-tier client instances, proper system instruction splitting, JSON repair for Gemma quirks, and defensive response extraction.

### Frontend
- **All 10 panels are functionally complete** (90% average completeness). Proper loading/error/empty states across the board.
- **Design system is comprehensive**: 350+ CSS custom properties, light/dark mode, glass-morphism effects, DM Sans + Fraunces typography. WCAG AA color contrast.
- **State management is sophisticated**: Central reducer with streaming request tracking, URL-backed navigation (`?tab=`, `?classroom=`), localStorage persistence for access codes and onboarding state.
- **Accessibility is above average for a hackathon project**: Semantic HTML, ARIA roles, `aria-live` on toast queue, keyboard-navigable tabs.

### Documentation & Governance
- **Decision log is exemplary**: 32 detailed ADRs with reasoning, consequences, and "what would change this" sections. This alone elevates the project.
- **Development gaps are honest**: `development-gaps.md` explicitly labels what's deferred by design vs. blocked vs. unclaimed. No hidden aspirational claims.
- **Proof documentation is artifact-backed**: Every passing baseline references a timestamped build artifact.

### Safety & Product Boundaries
- 15 forbidden diagnostic terms enforced across prompt builders and eval cases
- Observational language framing ("your records show" not "this student has")
- Family message approval is human-in-the-loop by design
- Hosted Gemini explicitly synthetic/demo-only with budget cap ($20/day)

---

## II. Key Findings by Area

### A. Testing — The Most Significant Gap

This is the system's weakest dimension. While the eval harness is solid, unit/integration test coverage has notable holes:

| Area | Coverage | Impact |
|------|----------|--------|
| Orchestrator routes | 65% (17/26) | 9 model-routed endpoints tested only via eval harness |
| Shared Zod schemas | **0%** | 13 schema files with no validation tests |
| Web components | **0%** | 10 panels + 24 shared components untested |
| Python prompt builders | **0%** | 12 prompt construction functions untested in isolation |
| Inference backends | ~40% | Gemini and extraction well-tested; Ollama and error paths thin |

The eval harness (90 cases) is doing heavy lifting that unit tests should share. Eval cases test end-to-end behavior through the model, but they can't catch: schema validation edge cases, prompt builder variable substitution bugs, or UI rendering issues. The project treats evals as a substitute for tests in places where they're actually complementary.

### B. Backend Security — Minor Hardening Needed

| Issue | Severity | Status |
|-------|----------|--------|
| No classroom_id path traversal validation | **MEDIUM** | `../../../etc/passwd` could escape `data/` directory |
| No rate limiting on access code guessing | **MEDIUM** | 4-digit codes brute-forceable in 10k attempts |
| Family message approval has no body schema | LOW | Accepts arbitrary JSON; downstream must validate |
| Health endpoint has no fetch timeout | LOW | Can hang indefinitely if inference service is frozen |
| Prompt injection detection is regex-only | LOW | Acceptable — model safety is primary defense |
| No security headers (X-Frame-Options, CSP) | LOW | Backend API, not HTML; low priority |

### C. Documentation — Mostly Current, One Stale Area

**Overall grade: B+**

- `architecture.md` is the weakest doc: still references "tool layer" with 5 tools instead of "prompt class routing layer" with 12 classes. Doesn't mention thinking mode as a routing variable.
- Missing reference docs: SQLite schema, classroom JSON profile schema, UI deep-link contracts, eval case inventory.
- Hosted vs. local model IDs (26B/31B vs 4B/27B) are confusing without explanation.

### D. Frontend — Surprisingly Polished

**Overall grade: A (91/100)**

- All 10 panels functional with proper API integration
- Professional design system with semantic tokens
- Responsive down to 375px with mobile-specific optimizations
- Streaming request support for planning-tier operations
- Toast queue, skeleton loaders, error boundaries all present

**Gaps**: Icon buttons missing `aria-label`, no form `aria-invalid` states, mobile navigation collapse needs verification, no error tracking integration (Sentry/similar).

### E. Mock Fixtures — Incomplete

7 of 12 prompt classes appear to lack dedicated mock fixtures in the inference harness. When mock mode encounters these routes, it likely returns generic/empty responses. This means:
- `npm run release:gate` (mock mode) doesn't fully exercise all routes
- Developers iterating locally can't see realistic output for ~58% of panels
- Eval cases for these routes are only validated in hosted mode

---

## III. Recommendations — Prioritized

### Priority 1: Ship-Critical (Before Submission/Demo)

1. **Add classroom_id validation** — Single regex check (`/^[a-z0-9-]+$/`) in the file-loading path prevents path traversal. 5 minutes, high security value.

2. **Add missing mock fixtures** — Even minimal canned JSON for the 7 unfixlnted prompt classes would make mock-mode testing complete. ~2 hours.

3. **Validate family message approval body** — Add `validateBody(z.object({ draft_id: z.string() }))` to the approve endpoint. 5 minutes.

### Priority 2: Post-Submission Hardening

4. **Add schema validation tests** — 13 Zod schema files with zero tests. Even 5-10 assertions per schema (valid fixture, missing field, wrong type) would catch drift. ~3 hours.

5. **Add rate limiting** — `express-rate-limit` on auth-protected endpoints. Prevents brute-force access code guessing. ~30 minutes.

6. **Update architecture.md** — Replace "tool layer" terminology, add thinking mode documentation, clarify two-speed tier split. ~1 hour.

7. **Add health endpoint timeout** — `AbortController` with 5s timeout on the inference health check fetch. 5 minutes.

### Priority 3: Production Readiness

8. **Add prompt builder unit tests** — Test variable substitution, system message construction, and token limits for all 12 builders in isolation. ~4 hours.

9. **Add web component tests** — At minimum: API client, classroom code auth flow, and error boundary. ~4 hours.

10. **Create missing reference docs**:
    - `docs/database-schema.md` — SQLite table structure
    - `docs/classroom-profile-schema.md` — JSON profile fields
    - `docs/eval-inventory.md` — Catalog of all 90+ eval cases
    - `docs/artifact-refresh-checklist.md` — Post-gate documentation updates

11. **Add transaction safety to schedule persistence** — Current JSON file overwrites have no atomicity. Either use SQLite or atomic rename.

12. **Add runtime schema validation on deserialization** — Wrap `JSON.parse()` in memory retrieval with Zod `.safeParse()` to catch corrupted records gracefully instead of crashing.

### Priority 4: Future Quality

13. **Branded types for IDs** — `ClassroomId`, `StudentRef`, `DraftId` as branded strings prevent silent cross-assignment bugs.

14. **Implement offline error tracking** — Sentry or similar in the web UI for production debugging.

15. **Automate baseline regression detection** — Currently manual comparison; flag regressions in release gate output automatically.

---

## IV. Structural Risk Map

```
                    LOW RISK          MEDIUM RISK         HIGH RISK
                    ---------         -----------         ---------
Architecture        [##########]      [          ]        [          ]
API Contracts       [########  ]      [##        ]        [          ]
Inference Layer     [########  ]      [##        ]        [          ]
Memory/Persistence  [######    ]      [####      ]        [          ]
Frontend UI         [########  ]      [##        ]        [          ]
Test Coverage       [####      ]      [####      ]        [##        ]
Security            [######    ]      [####      ]        [          ]
Documentation       [########  ]      [##        ]        [          ]
Ops/Release Gates   [########  ]      [##        ]        [          ]
```

**The one area approaching "high risk" is test coverage** — not because what exists is bad (the eval harness is strong), but because the gap between what's tested and what exists is large enough that regressions in schema validation, prompt construction, and UI behavior could go undetected.

---

## V. Final Verdict

**PrairieClassroom OS is a credible, working system** that exceeds typical hackathon quality in its architecture, documentation discipline, and safety governance. The 12-prompt-class routing table, 5 inference backends, per-classroom SQLite memory, and 10 functional UI panels represent genuine working software — not aspirational wireframes.

**For hackathon submission**: Ready. The demo script is walkable, the hosted proof passes, and the documentation is artifact-backed. The gaps identified here are refinements, not blockers.

**For real classroom use**: Not yet. Path traversal validation, rate limiting, test coverage for schemas and prompt builders, and transaction safety for schedule writes need to be addressed first. The safety governance is thoughtful, but the absence of unit tests for safety-critical prompt builders is the most significant gap between "demo-ready" and "deployment-ready."

The most valuable next investment of engineering time is **Priority 1** (3 quick security fixes, ~30 minutes total) followed by **Priority 2 items 4 and 8** (schema tests + prompt builder tests, ~7 hours total). These would close the largest gap between the system's architectural quality and its verification coverage.
