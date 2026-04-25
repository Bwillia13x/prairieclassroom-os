# Color System Audit — PrairieClassroom OS

**Generated:** 2026-04-25
**Status:** All 10 remediation items shipped on 2026-04-25 (see "Remediation log" at the bottom). Validation passed: `npm run check:contrast` 80/80 pairs AA (previously 74 measured + 6 silently skipped — the 6 forecast pairs are now AA-audited end-to-end), `npm run typecheck` clean, `npm run lint` clean, `npm run test` 1,899 passed.
**Scope:** `apps/web/src` (every CSS file + every TSX/TS file with inline color)
**Tooling used:**
- Canonical contrast checker — `npm run check:contrast` (passed with 6 advisory borders, 6 forecast tokens unresolved)
- Hand-grep for hex / rgb / hsl / `light-dark()` / fallback values
- Hand-computed WCAG AA contrast for the parallel "risk" palette in `TodayPanel.css`
- Token-usage census across 113 declared `--color-*` tokens

**Headline:**
The canonical token system in `apps/web/src/styles/tokens.css` is mature, contrast-correct, and well-documented. The misalignment is concentrated in **one panel and one theme overlay**:

1. `apps/web/src/panels/TodayPanel.css` — a parallel "risk" palette built from raw hex bypasses every canonical role (status, chart-tone, text-status) and produces real **WCAG AA failures in dark mode**.
2. `apps/web/src/styles/nothing-theme.css` — uses `--nothing-button-signal: #d71921` and two `color: #ffffff !important` literals where canonical tokens exist.

Eight further low-severity observations are listed below. Print-only (`@media print`) hex values are intentional and not flagged.

---

## Severity scoring

- **HIGH** — produces a contrast failure, latent bug, or contract violation that will surface to teachers.
- **MEDIUM** — token-purity / dark-mode-contract violation with no immediate user-visible failure today.
- **LOW** — cosmetic consistency cleanup; safe to defer.
- **NIT** — dead code or minor convention drift.

---

## HIGH severity

### H1. Parallel "risk" palette in `TodayPanel.css` — contrast failures + contract violation

**Files:** `apps/web/src/panels/TodayPanel.css`
**Locations:**
- L687–689 — token definitions
- L855, 857, 880, 882, 1006, 1008 — usage as text/border color
- L924, 932 — usage as `color-mix()` input
- L925, 929, 933 — sibling `light-dark(#hex, #hex)` text overrides
- L1225, 1227 — usage in `.today-health-error` via fallback

**What's there:**
```css
.today-forecast-section.risk-windows {
  --risk-red: #D71921;
  --risk-green: #4a9e5c;
  --risk-amber: #d4a843;
  /* … */
}

.risk-windows__peak--high   .risk-windows__peak-level { color: var(--risk-red); }
.risk-windows__peak--medium .risk-windows__peak-level { color: var(--risk-amber); }
.risk-windows__peak--low    .risk-windows__peak-level { color: var(--risk-green); }
```

**Problems:**

1. **No `light-dark()` wrapper.** Each token is a single hex used in both modes. The dark-mode contract (`docs/dark-mode-contract.md` §1) requires every color affordance to be theme-aware. These three tokens silently break that contract.

2. **Hand-computed contrast on canonical surfaces** (light `#ffffff`, dark `#101114`) — measured with WCAG 2.1 against `--text-sm` (14 px, normal-text → 4.5:1 floor):

   | Token       | On light surface | On dark surface | Verdict                                  |
   |-------------|-----------------:|----------------:|------------------------------------------|
   | `--risk-red`   | **5.18:1 ✓ AA**   | **3.64:1 ✗ FAIL** | dark-mode failure                      |
   | `--risk-green` | **3.31:1 ✗ FAIL** | 5.70:1 ✓ AA      | light-mode failure                      |
   | `--risk-amber` | **2.21:1 ✗ FAIL** | 8.52:1 ✓ AAA     | light-mode failure (largest gap)        |

   For comparison, the canonical text-status family clears AAA on both modes:

   | Canonical token        | On light surface | On dark surface |
   |------------------------|-----------------:|----------------:|
   | `--color-text-danger`  | 10.01:1 ✓ AAA    | 9.84:1 ✓ AAA    |
   | `--color-text-success` | 7.57:1 ✓ AAA     | 8.31:1 ✓ AAA    |
   | `--color-text-warning` | 9.84:1 ✓ AAA     | 9.27:1 ✓ AAA    |

   **Net: every level label in `risk-windows` fails AA in at least one theme today.**

3. **`.today-health-error` uses `var(--risk-red, #D71921)` outside the scope where `--risk-red` is defined** (lines 1225–1227). The token is only declared inside `.today-forecast-section.risk-windows`; it is never on `:root`. So the fallback `#D71921` is what actually renders on `.today-health-error` — confirming the contrast failure on dark surface.

**Recommended fix:**

| Old                         | New                              |
|-----------------------------|----------------------------------|
| `--risk-red`                | `--color-danger` (mix bg input) / `--color-text-danger` (text) |
| `--risk-amber`              | `--color-warning` / `--color-text-warning` |
| `--risk-green`              | `--color-success` / `--color-text-success` |
| `var(--risk-red, #D71921)`  | `var(--color-text-danger)` (in `.today-health-error`) |

Optionally, the segment-fill `color-mix()` calls (L924, L932) can map to `--chart-tone-high-bg` / `--chart-tone-medium-bg` since the calmer chart-tone palette was added 2026-04-23 Phase 5 specifically to replace these alert-pitch reds in scalar charts. The risk windows are a scalar (forecast severity), not an alert, so chart-tone is the better semantic fit.

After migration, delete the three `--risk-*` declarations entirely.

### H2. Sibling `light-dark(#hex, #hex)` literals duplicate `--color-text-{success,warning,danger}`

**File:** `apps/web/src/panels/TodayPanel.css`
**Lines:** 925, 929, 933

```css
.risk-windows .forecast-timeline-segment--low    { color: light-dark(#18583a, #b4d6c1); }
.risk-windows .forecast-timeline-segment--medium { color: light-dark(#5c3a00, #f1d49b); }
.risk-windows .forecast-timeline-segment--high   { color: light-dark(#7a1116, #ffb5b9); }
```

The light-mode color on `--low` is **identical** to `--color-text-success` (`#18583a`). The other four are within ±1 lightness step of `--color-text-warning` and `--color-text-danger` but are not byte-identical, so they have drifted. Replace with the canonical text-status tokens for parity with the rest of the system and to remove the only `light-dark(#hex, #hex)` literals outside `tokens.css`.

---

## MEDIUM severity

### M1. Contrast checker silently skips alias chains (forecast family)

**File:** `output/contrast-report.md` summary
**Symptom:**
```
| `--color-forecast-low-text`    | `--color-forecast-low-bg`    | — | 4.5 | ⚠ missing |
| `--color-forecast-medium-text` | `--color-forecast-medium-bg` | — | 4.5 | ⚠ missing |
| `--color-forecast-high-text`   | `--color-forecast-high-bg`   | — | 4.5 | ⚠ missing |
```

These are flagged "missing" because `scripts/check-contrast.mjs` parses only direct `light-dark()` declarations and does not follow `var()` aliases. The forecast tokens are defined as `var(--chart-tone-*)`, so they're invisible to the checker.

**Hand-computed result** for the unresolved pairs (using the resolved chart-tone values):

| Forecast pair (light)              | Ratio  | Verdict |
|------------------------------------|-------:|---------|
| `forecast-low-text` (#35486a) on `forecast-low-bg` (#eaeef5)       | 8.31  | ✓ AA |
| `forecast-medium-text` (#7a4e02) on `forecast-medium-bg` (#faf0dc) | 6.36  | ✓ AA |
| `forecast-high-text` (#6a2a24) on `forecast-high-bg` (#f7e8e5)     | 7.92  | ✓ AA |

| Forecast pair (dark)               | Ratio  | Verdict |
|------------------------------------|-------:|---------|
| `forecast-low-text` (#c2cad9) on `forecast-low-bg` (#0b0d12)       | 11.77 | ✓ AA |
| `forecast-medium-text` (#e2bf7f) on `forecast-medium-bg` (#100d07) | 11.08 | ✓ AA |
| `forecast-high-text` (#d9a098) on `forecast-high-bg` (#120909)     | 9.04  | ✓ AA |

Functionally the forecast palette is fine. **The fix is to the tooling**: teach `scripts/check-contrast.mjs` to resolve one level of `var()` indirection so the contract is enforced going forward. (Or, less elegantly, redeclare the six forecast tokens with explicit `light-dark()`.)

### M2. `--nothing-button-signal: #d71921` defined as raw hex with no `light-dark()`

**File:** `apps/web/src/styles/nothing-theme.css:2316`
**Context:** This is a Nothing-OS brand-signal red used on circular badge controls, footer toggles, mobile-nav badges. It ships globally because `nothing-theme.css` is unconditionally imported in `main.tsx:16`.

**The judgment call:**
- If the value is a **deliberate** Nothing-aesthetic affordance (vivid red on both modes, distinct from canonical `--color-danger`), then it should be:
  - declared with explicit `light-dark()` even if both halves are the same hex (so the contract is honored),
  - co-located with brand-highlight tokens in `tokens.css` (not buried at line 2316 of a theme file),
  - named to reflect its role: e.g. `--color-brand-signal` or `--color-signal-critical`.
- If the value is a drift from `--color-danger` (`#a62f26` light / `#ef8a81` dark), retire it and use the canonical token.

**Note on contrast:** white-on-`#d71921` measures 5.18:1 — passes AA for normal text. Not a contrast bug. Just a contract / location bug.

---

## LOW severity

### L1. `color: #ffffff !important` literals where `--color-text-on-danger` exists

**File:** `apps/web/src/styles/nothing-theme.css`
**Lines:** 3452, 3554

```css
.shell-nav__badge--alert,
.mobile-nav-badge,
.mobile-nav-subtab-badge {
  background: var(--nothing-button-signal) !important;
  color: #ffffff !important;
}
```

The token `--color-text-on-danger: light-dark(#ffffff, #ffffff)` exists for exactly this case and is already used at `nothing-theme.css:1485` (`.shell-nav__badge--alert`). Replace `#ffffff !important` with `var(--color-text-on-danger)` (keep the `!important` if needed for specificity).

The visible color is identical today; the win is purely token purity and a single point of change if the contract ever evolves (e.g., to add a dark-mode opacity).

### L2. Custom shadow alpha in `MobileNav.css` deviates from canonical `--_shadow-lg-b`

**File:** `apps/web/src/components/MobileNav.css:12`
```css
box-shadow: 0 -8px 22px light-dark(rgba(17, 24, 39, 0.07), rgba(0, 0, 0, 0.2));
```

The light-mode alpha (`0.07`) matches `--_shadow-lg-b` exactly, but the dark-mode alpha (`0.2`) is **almost 2× the canonical `0.11`**. Either:
- Promote this to a documented variant (`--shadow-mobile-nav-edge`) with a comment explaining why mobile nav warrants a heavier dark-mode lift, or
- Replace with `var(--shadow-lg)` and accept the lighter elevation.

### L3. `border: solid white` on checkbox check glyph

**File:** `apps/web/src/styles/primitives.css:657`
```css
.field input[type="checkbox"]:checked::after {
  /* … */
  border: solid white;
  border-width: 0 2px 2px 0;
}
```

The CSS keyword `white` is a literal `#ffffff`. Replace with `var(--color-text-on-accent)` — same visible result in light mode, and aligns with the rest of the "what color sits on top of `--color-accent`" contract.

### L4. Modal scrim alphas inconsistent across three components

| File                                | Alpha value      |
|-------------------------------------|------------------|
| `components/DrillDownDrawer.css:8`  | `rgba(0,0,0,0.35)` |
| `components/OnboardingOverlay.css:8`| `rgba(0,0,0,0.35)` |
| `components/RolePromptDialog.css:9` | `rgba(0,0,0,0.55)` |

Two of the three agree on `0.35`; `RolePromptDialog` uses `0.55` for what looks like the same modal-scrim role. Tokenize into:
```css
--scrim-soft: rgba(0, 0, 0, 0.35);     /* drawers, contextual overlays */
--scrim-strong: rgba(0, 0, 0, 0.55);   /* identity-decisions, blocking dialogs */
```
…and wire the three call sites. Light/dark-aware variants are unnecessary because a black scrim works on both canvases.

### L5. `text-shadow: rgba(0,0,0,0.3)` in `ForecastViewer.css`

**File:** `apps/web/src/components/ForecastViewer.css:124`
This shadow is on a label sitting on a colored chart segment (foreground = `--color-text-on-accent`). It's defensible as-is (the only such usage; plain rgba on a non-token shadow). Optional cleanup: tokenize as `--shadow-text-on-color` if a second consumer ever appears.

---

## NIT (dead code / minor)

### N1. Orphan token: `--color-forest`

**File:** `apps/web/src/styles/tokens.css:199`
Compatibility alias declared as `--color-forest: var(--color-section-trend);`. Zero consumers across CSS, TSX, and TS. Safe to delete.

(`--color-bg-forest`, `--color-border-forest`, `--color-text-forest`, `--color-section-forest` are all heavily used — only the bare `--color-forest` is dead.)

### N2. Six legacy compat aliases still consumed by data-viz

These compat aliases are still reached from JS/TSX color lookups, blocking their retirement:

| Alias                      | Consumers                                               |
|----------------------------|---------------------------------------------------------|
| `--color-sun`              | `components/DataVisualizations.tsx:2333, 2639`          |
| `--color-sage`             | `components/DataVisualizations.tsx:2332, 2638`          |
| `--color-slate`            | `components/DataVisualizations.tsx:2330, 2356`          |
| `--color-section-sage`     | `components/Sparkline.tsx:13`, `DataVisualizations.tsx:762` |
| `--color-section-forest`   | `components/Sparkline.tsx:15`, `DataVisualizations.tsx:761` |

Migrate to canonical `--color-section-watchpoint` / `--color-section-family` / `--color-section-ea` / `--color-section-trend` and delete the aliases.

### N3. `linear-gradient(#fff …)` mask in `ambient.css`

**File:** `apps/web/src/styles/ambient.css:357–361`
These four `#fff` values are CSS mask layers, not visible color — they're alpha-1 mattes XORed against themselves to produce a hollow ring effect. **Not an outlier.** Mentioned only because a naive grep flags them.

---

## What's healthy and should not be touched

- **`tokens.css` itself** is the single source of truth — 113 `--color-*` tokens, every status family with bg/border/text triplets, all behind `light-dark()`, and all 80 contrast pairs the script does check pass WCAG AA (32 of 80 pairs even clear AAA).
- **`ds-*` shared aliases** in `apps/web/src/tokens.css` correctly forward to canonical tokens with no value redefinition.
- **Print-only blocks** (`print.css`, and the `@media print {}` blocks in `MessageDraft.css`, `SurvivalPacket.css`, `EABriefing.css`, `Card.css`) hardcode hex by necessity. **Not flagged.**
- **`color-mix(…, black)` / `color-mix(…, white)`** in `primitives.css` (lines 131, 170) use the bare keyword as a darken/lighten endpoint. Conventional and readable; no token needed.
- **The `nothing-theme.css` file header explicitly states** "no token values are redefined here" — and on a careful read, the only deviations are the three documented above (`--nothing-button-signal` and the two `#ffffff !important` lines). The 3,615-line theme file is otherwise token-pure.
- **Redundant amber family** (`bg-warning` ≡ `bg-pending` ≡ `bg-sun`, with matching border/text triplets) is **intentional**: same physical color, three semantic roles (state, state, watchpoint section). Keep — but resist the urge to add a fourth alias.

---

## Recommended remediation order

| Step | What                                                                                        | Effort | Severity |
|------|---------------------------------------------------------------------------------------------|--------|----------|
| 1    | Replace `--risk-*` palette in `TodayPanel.css` with `--color-{success,warning,danger}` family + `--color-text-{success,warning,danger}`. Delete the three token declarations. | M | HIGH |
| 2    | Fix `.today-health-error` to use `--color-text-danger` (kills the latent fallback bug + the dark-mode contrast failure in one edit). | XS | HIGH |
| 3    | Replace the three `light-dark(#hex, #hex)` literals at L925/L929/L933 with the canonical `--color-text-*` family. | XS | MEDIUM |
| 4    | Teach `scripts/check-contrast.mjs` to resolve one level of `var()` aliasing so the forecast family is auditable. | S | MEDIUM |
| 5    | Decide intent for `--nothing-button-signal`: promote to `tokens.css` (with `light-dark()`) or retire to `--color-danger`. | S | MEDIUM |
| 6    | Replace `#ffffff !important` on the two badge selectors with `var(--color-text-on-danger)`. | XS | LOW |
| 7    | Tokenize modal scrims as `--scrim-soft` / `--scrim-strong`; standardize the three call sites. | S | LOW |
| 8    | `border: solid white` → `border: solid var(--color-text-on-accent)` on the checkbox glyph. | XS | LOW |
| 9    | `MobileNav.css` shadow: document the deviation or canonicalize. | XS | LOW |
| 10   | Delete orphan `--color-forest`; migrate `Sparkline.tsx` + `DataVisualizations.tsx` to canonical `--color-section-*` names; delete `--color-sun/sage/slate/section-sage/section-forest`. | M | NIT |

After step 1–3, re-run:
```
npm run check:contrast
```
and the contrast report should remain "All pairs meet WCAG AA. ✓" with the bonus of zero raw `light-dark(#hex, #hex)` literals outside `tokens.css`. After step 4, the report should additionally resolve the six "missing" forecast pairs.

---

## Definition of "color-polished" — checklist

- [x] Color roles documented in `tokens.css` with usage comments and decision-log references.
- [x] Three-layer material model (bg / workspace / surface) consistently honored across panels.
- [x] All 80 declared text/bg pairs meet WCAG AA in both modes (the 6 forecast-family pairs were previously reported "missing" because the script didn't follow `var()` aliases; they are now resolved and AA-audited end-to-end).
- [x] No `light-dark()` declarations exist outside `tokens.css` except for one in-place documented exception (`MobileNav.css:12`, intentionally heavier dark-mode shadow alpha for floating chrome).
- [x] Status families (success/warning/danger/info/accent/analysis/provenance/pending) are distinct, contrast-correct, and theme-aware.
- [x] Every consumer of color uses a canonical token; no parallel hex palettes. *(`--risk-*` retired)*
- [x] Contrast checker covers every text/bg pair, including aliased forecast tokens.
- [x] No orphan tokens shipped. *(`--color-forest` deleted; 8 other compat aliases retired alongside it)*
- [x] Modal scrims tokenized. *(`--scrim-soft` / `--scrim-strong`)*

---

## Remediation log — 2026-04-25

| # | Item | Files touched | Status |
|---|---|---|---|
| 1 | TodayPanel `--risk-*` palette migrated to canonical `--color-{success,warning,danger}` + `--color-text-*`. Three local tokens deleted. | `panels/TodayPanel.css` | ✅ |
| 2 | `.today-health-error` rewired from `var(--risk-red, #D71921)` to `var(--color-danger)` border + `var(--color-text-danger)` color. Dark-mode contrast failure (3.64:1) closed. | `panels/TodayPanel.css` | ✅ |
| 3 | Three `light-dark(#hex,#hex)` literals on risk-segment text replaced with canonical `--color-text-{success,warning,danger}`. | `panels/TodayPanel.css` | ✅ |
| 4 | `scripts/check-contrast.mjs` taught one-level `var()` alias resolution. Forecast pairs now report 7.89/6.36/8.95 (light) and 11.79/11.08/8.83 (dark) — previously silently skipped. | `scripts/check-contrast.mjs` | ✅ |
| 5 | `--nothing-button-signal: #d71921` promoted to `--color-signal-critical: light-dark(#d71921, #d71921)` in `tokens.css` with full intent comment. Nothing-theme wires the local var to the canonical token. | `styles/tokens.css`, `styles/nothing-theme.css` | ✅ |
| 6 | Two `color: #ffffff !important` literals replaced with `var(--color-text-on-danger)` on the alert badge selectors. | `styles/nothing-theme.css` | ✅ |
| 7 | `--scrim-soft` and `--scrim-strong` added to `tokens.css`. Three modal call sites wired. Dark-mode contract §8.1 updated to point at the new tokens. | `styles/tokens.css`, `components/{DrillDownDrawer,OnboardingOverlay,RolePromptDialog}.css`, `docs/dark-mode-contract.md` | ✅ |
| 8 | Checkbox check glyph: `border: solid white` → `border: solid var(--color-text-on-accent)`. | `styles/primitives.css` | ✅ |
| 9 | `MobileNav.css` shadow deviation annotated in-place (heavier dark alpha is deliberate; documented for future contributors). | `components/MobileNav.css` | ✅ |
| 10 | Compat aliases retired from `tokens.css`: `--color-{sun,sage,slate,forest,alert}` and `--color-section-{sun,sage,slate,forest}` (9 tokens). All 21 consumer references in `Sparkline.tsx`, `DataVisualizations.tsx`, and `nothing-theme.css` migrated to canonical `--color-section-*` / `--color-danger`. | `styles/tokens.css`, `components/Sparkline.tsx`, `components/DataVisualizations.tsx`, `styles/nothing-theme.css` | ✅ |

### Validation evidence

```
$ npm run check:contrast
Pairs evaluated: 80 (light + dark) — 6 of these previously showed "missing"
                                     because the forecast aliases were not
                                     resolved; all 80 are now measured.
All pairs meet WCAG AA. ✓

$ npm run typecheck
(clean — tsc --noEmit passes)

$ npm run lint
(clean — eslint . passes)

$ npm run test
Test Files  172 passed (172)
     Tests  1899 passed (1899)
```

### Net change in outlier count

| Class                                      | Before | After |
|--------------------------------------------|-------:|------:|
| Raw hex outside `tokens.css` (non-print)   | 13     | 0     |
| `light-dark()` declarations outside tokens | 4      | 1 (documented in-place) |
| Aliased contrast pairs silently skipped    | 6      | 0     |
| Orphan `--color-*` tokens                  | 1      | 0     |
| Compat aliases blocking retirement         | 5      | 0     |
| Hardcoded `#ffffff !important`             | 2      | 0     |
| Untokenized modal scrims                   | 3      | 0     |
| Parallel hex palettes (`--risk-*`)         | 1      | 0     |
