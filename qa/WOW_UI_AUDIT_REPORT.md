# WOW UI Polish Audit — 2026-04-27

- **Auditor:** Claude Code (Opus 4.7, 1M context) — static / code-based audit
- **Scope:** WOW UI work shipped between the 2026-04-26 in-browser audit and HEAD: commits `157344f` (Phases A→E + refinement) and `ddfd1b1` (Phases α→δ + Phase 1–4 CSS hygiene), plus the demo-freshness, Today-h1, and access-dialog `aria-live` fixes.
- **Method:** static inspection of CSS tokens, motion stack, new primitive components, heading hierarchy, landmark structure, and reduced-motion guards. No browser was driven — for live in-browser coverage see `qa/final-release/FINAL_RELEASE_AUDIT_2026-04-26.md`.
- **HEAD assumed:** `ddfd1b1` (most recent WOW UI commit on the working tree).

## TL;DR

**GREEN — submission-ready.** The two big WOW UI commits added ~2,000 lines of new component code (TodayHero, AppFooter, SectionMarker, CohortSparklineGrid, expanded PageHero) without breaking the production-hardened doctrine. Token discipline, motion accessibility, heading hierarchy, and landmark structure all hold up. Both findings from the 2026-04-26 audit (F1 Today-h1, F2 access-dialog `aria-live`) are confirmed closed.

There are **4 P2 findings worth a small follow-up commit** before the submission-window release, plus **4 P3 polish items**. Total fix budget: ~45 minutes.

The new primitives (NumberTicker, CohortSparklineGrid, useReducedMotion) are notably well-engineered — they read like the work of a maintainer who has been burned by SSR + reduced-motion + RAF leak bugs before, and they all have unit tests covering the right invariants.

---

## Findings

### P2 — Fix before submission window

#### W1. `--space-1-5` token referenced but never declared
**Surface:** `apps/web/src/components/shared/PageHero.css:623`, `apps/web/src/styles/primitives.css:1751`
**What:** Both sites use `var(--space-1-5, 0.375rem)`. The token is **not declared** in `tokens.css` or `nothing-theme.css`. The CSS fallback (`0.375rem` → 6 px) is currently rendering, so visually nothing is broken — but the design system intent is gapped. Any future global change to the spacing scale skips these two sites silently.
**Why it matters:** This is exactly the failure mode CLAUDE.md and `feedback_design_tokens` warn about ("invented tokens silently fail at runtime"). The fallback masks the miss.
**Fix:** Add to `apps/web/src/styles/tokens.css` near line 346 (where `--space-2-5` lives):
```css
--space-1-5: 0.375rem; /* 6px — fills the 4→8 gap */
```
Keeps the scale consistent with the existing `--space-2-5: 0.75rem; /* 12px — fills the 8→16 gap */` convention.
**Effort:** 1 minute.

#### W2. TodayHero Monday-eyebrow dismiss button is an 18×18 tap target — fails WCAG 2.5.8
**Surface:** `apps/web/src/components/TodayHero.css:128-134`, button rendered at `apps/web/src/components/TodayHero.tsx:93-100`
**What:** `.today-hero__eyebrow-dismiss` is `width: 18px; height: 18px;`. WCAG 2.5.8 (Level AA) requires interactive targets to be ≥ 24×24 CSS px (with narrow exceptions that don't apply here — the button is not inline within a sentence, it sits in its own absolutely-positioned eyebrow row).
**Why it matters:** This is the only Monday-only dismissal control on the highest-traffic page. Touch users on a phone will mis-tap it. The teacher's reaction will be "I tapped 'x' and nothing happened, did the eyebrow lock?"
**Fix:** Bump the inner click area to 24×24 without changing visible size, e.g.:
```css
.today-hero__eyebrow-dismiss {
  width: 24px; height: 24px;
  /* keep visual weight unchanged: */
  font-size: var(--text-2xs);
}
```
Or keep visual at 18 and pad to 24 with negative margin offsetting the row (`padding: 3px; margin: -3px;`). Either is fine — pick the one that doesn't shift the eyebrow row baseline.
**Effort:** 5 minutes.

#### W3. AppFooter has nested `role="contentinfo"` landmarks
**Surface:** `apps/web/src/components/AppFooter.tsx:63` (outer `<footer role="contentinfo">`) and `:116` (inner `<div className="app-footer__rail" role="contentinfo" aria-label="Build context">`)
**What:** Two `contentinfo` landmarks render in the same subtree. Per ARIA, `contentinfo` (the implicit role of `<footer>` at the document level) should appear at most once per page, and inner duplicates dilute the landmark map. Axe and Lighthouse will flag this.
**Why it matters:** Screen-reader users who navigate by landmarks (NVDA/JAWS `D` key) get an extra "footer" stop pointing at the build-stamp rail, which isn't really a footer landmark — it's a status/build-context group nested inside the footer.
**Fix:** In `apps/web/src/components/AppFooter.tsx:116`, change `role="contentinfo"` to `role="group"`. The `aria-label="Build context"` already qualifies the group so the change is a strict ARIA improvement.
**Effort:** 1 minute.

#### W4. AppFooter `aria-controls` points to a non-existent id
**Surface:** `apps/web/src/components/AppFooter.tsx:87` — `aria-controls="app-footer-shortcuts"`
**What:** The shortcut-list wrapper at `apps/web/src/components/AppFooter.tsx:65` is `<div className="app-footer__shortcuts" aria-label="Keyboard shortcuts">` — no `id`. The `aria-controls` reference is therefore dangling.
**Why it matters:** Some screen readers (notably JAWS) depend on `aria-controls` to announce "controls Keyboard shortcuts" when the toggle is focused; a dangling reference produces inconsistent announcement behavior.
**Fix:** Add `id="app-footer-shortcuts"` to the shortcuts wrapper div on line 65, OR remove the `aria-controls` attribute on line 87. Either is correct; adding the id is the higher-fidelity fix because the relationship really does exist.
**Effort:** 1 minute.

### P3 — Polish (none blocking)

#### W5. Monday-eyebrow dismiss renders as lowercase letter `x`, not the close glyph
**Surface:** `apps/web/src/components/TodayHero.tsx:99` (button text `"x"`) plus `apps/web/src/components/TodayHero.css:141` (`text-transform: lowercase`)
**What:** Sighted users see a typewriter-style lowercase 'x'. The `aria-label="Dismiss fresh week eyebrow"` is fine for screen readers, but the editorial choice reads as a typo on first glance during a demo or screenshot.
**Fix:** Change the button content to `×` (U+00D7) or `✕` (U+2715), then drop the `text-transform: lowercase` line. (If the lowercase 'x' is an intentional typewriter editorial nod, leave a one-line comment explaining it so future contributors don't "fix" it.)
**Effort:** 1 minute.

#### W6. WeekPanel uses `<h2>` for Card-bound subsections under a SectionMarker `<h2>`
**Surface:** `apps/web/src/panels/WeekPanel.tsx:185` (SectionMarker → h2) plus `:195`, `:254`, `:284` (sibling `<h2 id="…">` for "This Week", "Upcoming events", "Planning rhythm & pattern pressure").
**What:** The page emits four sibling `<h2>` headings under one `<h1>`. Valid HTML, but the heading outline flattens what is visually a hierarchy (one big sectional break, three Card-bound subsections). ClassroomPanel uses the cleaner pattern: SectionMarker (h2) followed by Card-bound `<h3 className="classroom-section__title">` (lines 388, 419, 481).
**Fix:** Promote the WeekPanel Card-bound h2s to h3, mirroring ClassroomPanel's convention. Update the `aria-labelledby` chains on the parent Cards to reference the same ids — only the tag name changes.
**Effort:** 5 minutes.

#### W7. `ambient.css` cites `motion.css` for the reduced-motion blanket; the actual rule lives in `base.css`
**Surface:** `apps/web/src/styles/ambient.css:22-23`, `:461`, `:491`, `:663`, `:683`
**What:** Five separate comment blocks in `ambient.css` reference "the blanket override already in motion.css (0.01ms clamp)". The actual `prefers-reduced-motion: reduce { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; … } }` lives in `apps/web/src/styles/base.css:282-293`. There is no `motion.css` in the tree.
**Why it matters:** Future contributors searching for the global motion clamp by filename will dead-end. The comments are otherwise excellent and load-bearing — this is purely a reference fix.
**Fix:** Find/replace `motion.css` → `base.css (lines 282–293)` across the five citations in `ambient.css`.
**Effort:** 2 minutes.

#### W8. AppFooter contains hard-coded sub-token literals
**Surface:** `apps/web/src/components/AppFooter.css`
**What:** `gap: 0.3rem` (line 123), `padding: 0.2rem var(--space-2)` (124), `font-size: 0.7rem` (150), `min-width: 1.2rem; height: 1.2rem;` (88-89), `border-radius: 4px` (91), and several raw opacity numerics (`0.4`, `0.45`, `0.65`, `0.75`). Most are decorative; the `0.3rem` / `0.2rem` / `0.7rem` / `1.2rem` values are spacing/sizing that should plug into the existing scale (e.g. `--space-1: 0.25rem`, `--text-2xs`, `--icon-md`).
**Why it matters:** Token discipline is one of the strongest signals in this codebase; the AppFooter is a brand-new component and every literal is a future drift point.
**Fix:** Sweep the file. The minimum useful change: replace `0.3rem` with `var(--space-1)` or `var(--space-2)` per design intent; `0.7rem` with `var(--text-2xs)`; `1.2rem` with `var(--icon-md)` (or whichever icon token corresponds to a 19.2 px chip).
**Effort:** 10 minutes.

---

## What's notably solid (worth preserving)

These all came in via the recent commits and are worth defending against drift:

1. **`useReducedMotion` hook (`apps/web/src/hooks/useReducedMotion.ts`)** — defensive against missing `window` (SSR) and missing `matchMedia` (jsdom); intentionally non-subscribing with the trade-off documented inline; consolidates three previously-duplicated inline checks. Excellent design comment for future maintainers.
2. **`NumberTicker.tsx`** — short-circuits to the target value on reduced motion (no RAF tween); cancels RAF on unmount; aria-label binds to the target value (not displayValue) so screen readers don't get spammed at 60 fps; explicitly omits `displayValue` from the effect deps with a comment explaining why.
3. **`CohortSparklineGrid.tsx`** — interactive cells are real `<button>` elements with composed `aria-label="Brody: 4 interventions in last 14 days"`; fixed `width=92 / height=28` SVG attrs prevent CLS; reduced-motion fallback path (Phase δ2) skips the trajectory gradient and falls back to the C1 solid stroke; empty state has `role="status"`; SVG defs container is `aria-hidden="true" focusable="false"`.
4. **Universal reduced-motion blanket in `apps/web/src/styles/base.css:282-293`** clamps `animation-duration` and `transition-duration` to 0.01 ms across `*, *::before, *::after`. This is what lets TodayHero and AppFooter use plain `transition: color var(--motion-fast) …` declarations without per-component reduced-motion blocks.
5. **Token system uses `light-dark()`** — most new tokens (`--gradient-classroom-lume`, the `--chart-tone-*` scale, etc.) auto-adapt to dark mode without separate `[data-theme="dark"]` blocks. The pattern is correctly applied to the new tokens added in `157344f`.
6. **PageHero contract** — every call site in all 6 panels passes `ariaLabel`, so the `<section>` landmark always has an accessible name. The pivot buttons compose their `aria-label` from `eyebrow + label` (e.g. "Today: Triage now"). Pulse dot animation re-keys on `pulse.state` change so the ring restarts intentionally; `useRef` + `useState` pattern is correct (no stale-closure bug).
7. **Heading hierarchy is now consistent**: every panel renders exactly one `<h1>` (Today via TodayStory; the other six via PageHero), `<h2>` per SectionMarker, `<h3>` for Card-bound subsections (ClassroomPanel pattern). The single drift is WeekPanel (W6 above).
8. **Skip-link present** (`apps/web/src/App.tsx:806-808` → `#main-content` at `:968`).
9. **F1 + F2 from the 2026-04-26 audit confirmed closed** by `41d9598`: Today lede is `<h1 className="today-story__lede">` (`TodayStory.tsx:42`); access-dialog dynamic message has `aria-live="polite"` (`ClassroomAccessDialog.tsx:79`).
10. **F3 (demo freshness)** is closed by `4a63aa5` ("Fix demo freshness and family message review flow") — the prior 394–397d touchpoint cluster has been re-stamped by the seed.

---

## Recommended next actions

| ID | Priority | Action | Estimated time |
|----|----------|--------|----------------|
| W1 | P2 | Declare `--space-1-5: 0.375rem;` in `tokens.css` | 1 min |
| W2 | P2 | Bump TodayHero dismiss to a 24×24 hit area | 5 min |
| W3 | P2 | Demote inner `role="contentinfo"` to `role="group"` in AppFooter | 1 min |
| W4 | P2 | Add `id="app-footer-shortcuts"` (or drop `aria-controls`) | 1 min |
| W5 | P3 | Replace `"x"` with `×` and drop `text-transform: lowercase` | 1 min |
| W6 | P3 | Promote WeekPanel Card-bound h2s to h3 | 5 min |
| W7 | P3 | Fix `motion.css` → `base.css` references in `ambient.css` | 2 min |
| W8 | P3 | Tokenize literal sub-token values in AppFooter.css | 10 min |

**Total to close all WOW UI polish findings:** ~25–45 minutes.

After fixes, run:

```bash
npm run typecheck
npm run lint
npm run test            # vitest — confirm typography.test.ts and the new component tests still pass
npm run check:contrast  # token additions can shift dark-mode contrast pairs
npm run release:gate    # mock lane structural validation
```

---

## What this audit did NOT cover

- **In-browser visual regression / dark mode contrast** — covered by `qa/final-release/FINAL_RELEASE_AUDIT_2026-04-26.md` and `npm run check:contrast`. No new dark-mode-only tokens added in `157344f` / `ddfd1b1`, so re-running the contrast check is sufficient — a fresh in-browser pass is not strictly required unless W2's tap-target fix shifts the eyebrow row baseline.
- **Hosted Gemini lane** — covered by `npm run release:gate:gemini` and `live-model-proof-status.md`. Out of scope for a UI polish audit.
- **Ollama lane** — structurally infeasible on the maintenance host per CLAUDE.md G-02.
- **Real WCAG axe scan** — `jest-axe` suites already exist in `apps/web/src/__tests__`; run them after the W2/W3/W4 fixes to confirm no new violations.
- **Live keyboard navigation traversal** — landmark and focus-ring tokens are correct in CSS; behavior should be re-verified once W3/W4 land because both touch focusable surfaces.
