# Light Palette Editorial Letterpress Refinement — Design

**Date:** 2026-04-12
**Owner:** Frontend / design system
**Status:** Draft — awaiting user review before implementation plan

## Goal

Refine and polish the light mode color schema in `apps/web/src/styles/tokens.css` without changing the warm Prairie brand identity. Commit the system to an "editorial letterpress" metaphor — the paper/ink feel it is already 80% pointing at — and fix a small number of correctness issues the light palette has carried since its original draft.

## Context

`apps/web` already has a mature, modern dark mode foundation and a contrast-gated dark mode was just polished in `docs/dark-mode-upgrade-2026-04-12.md` (also 2026-04-12). The dark mode sprint covered:

- Hardcoded-shadow corrections
- Selection color via `color-mix()`
- 45 hardcoded color values across 12 component CSS files audited and fixed
- `scripts/check-contrast.mjs` introduced
- `prefers-contrast: more` and `prefers-reduced-transparency: reduce` support
- `docs/dark-mode-contract.md` written

The light palette was **not** part of that sprint. It is architecturally healthy — it passes WCAG AA, uses `light-dark()` throughout, and consumes tokens consistently — but it carries first-draft rough edges that do not appear in dark mode:

1. `--color-text-secondary` (`#746754`) and `--color-text-tertiary` (`#756754`) differ by a single digit. Functionally identical. Dark mode has them properly differentiated (`#c8baa4` vs `#9f927d`).
2. `--color-warning` and `--color-accent` are the same hex in light mode (`#c07624`). Warning badges are indistinguishable from accent affordances. Same bug in dark mode.
3. Several pairs pass AA but only just — no headroom for display variation or brand drift:
   - `--color-text-tertiary` on `--color-bg`: **4.88** (target 4.5)
   - `--color-accent` on `--color-bg`: **3.19** (target 3.0)
   - `--color-warning` on `--color-bg`: **3.19** (target 3.0)
   - `--color-border-input` on `--color-surface`: **3.79** (target 3.0)
   Dark mode equivalents sit at 5–11.
4. The bg → surface → surface-elevated ladder is picked by eye in sRGB. The steps are *numerically* uneven, and on some displays the bg and surface are barely distinguishable. A perceptually-uniform ladder in OKLCH would fix this without shifting hue.
5. The 12 family `--color-bg-*`, `--color-border-*`, `--color-text-*` tints are individually picked rather than derived. They work, but they feel slightly arbitrary rather than "of a system."

This spec addresses all five. The warm Prairie brand identity stays; the warm-brown dark palette is not touched.

## Direction — Editorial Letterpress

Of three "considered premium feel" directions (aged linen, editorial letterpress, prairie morning), the user selected **editorial letterpress**:

- **Crisper contrast ladder.** The hierarchy between `bg`, `surface`, and `surface-elevated` reads like a printed page — card lifts off paper the way ink sits on cream stock, not the way a floating white modal sits on gray.
- **Confident ink.** Body text is a slightly deeper warm near-black than the current `#30251a`.
- **Restrained accent.** Prairie sun holds its hue but picks up a small amount of depth so it reads as *punctuation* rather than a shout, and so it has real WCAG headroom.
- **Hairline borders.** Dividers and card edges stay hairline (not upgraded to heavy), but derive from a consistent ink-on-paper relationship rather than each being picked individually.
- **Warm shadows, more intention.** Shadow structure is unchanged; second-layer alpha lifts slightly on `--shadow-md` and `--shadow-lg` so elevated cards read with more conviction.

The Alberta K-6 classroom context (projectors, high-glare windows, wide display range) was a load-bearing factor in picking this direction over the lighter "prairie morning" alternative. A crisper ladder is more robust on dim screens than an airier one.

## Non-Goals

- No rebranding. The palette is still warm Prairie. The accent is still Prairie sun. The dark palette stays brown.
- No dark mode changes. Dark mode just had its sprint and is out of scope.
- No non-color token changes (spacing, type, motion, layout, radii, shadow *structure*).
- No new tokens. This sprint only changes values of tokens that already exist.
- No token renames or restructuring.
- No component CSS edits. Every change flows through `var(--color-*)`.
- No new `@media` preference overrides. `prefers-contrast: more` and `prefers-reduced-transparency: reduce` stay as-is; their light-side values will be regenerated only if the base light palette changes force them off-target.
- No migration to `color-mix()` for existing tokens. Derivation rules are documented for *new* tokens only.
- No AMOLED / sepia / reading-mode variants.

## Method

### OKLCH-based ladder

The `bg → surface → surface-elevated` ladder (and `surface-muted`) is picked on an OKLCH lightness curve with fixed chroma and warm hue. This makes the steps *perceptually* equal rather than numerically equal in sRGB — equal sRGB lightness jumps look uneven to the eye, which is why the current ladder has bg and surface barely distinguishable on some displays.

Target anchor values in OKLCH (approximate, final values computed at implementation time):

- `--color-bg`: L≈94%, C≈0.030, h≈85°
- `--color-surface-muted`: L≈92%
- `--color-surface`: L≈96%
- `--color-surface-elevated`: L≈98.5%

Each token is picked with the same hue and chroma, stepping only in lightness. The sRGB hex the browser receives is rounded from the OKLCH target. The concrete proposals in §"Token changes" are my mental-model picks; the real values come from running the OKLCH sweep and feeding the output through `check-contrast.mjs`.

### Contrast headroom

All pairs required to pass WCAG AA must meet **≥4.7:1 for small text** (0.2 above the 4.5 floor) and **≥3.5:1 for large/UI** (0.5 above the 3.0 floor) in light mode. This is stricter than the global contract and is specific to this sprint because the current light palette has several pairs sitting within 0.05 of the floor. The dark-mode contract doc is *not* updated to raise the global floor — this is a light-sprint-only tightening.

Tight pairs to lift:

| Pair | Current | Target |
|---|---:|---:|
| `--color-accent` on `--color-bg` | 3.19 | ≥3.5 |
| `--color-warning` on `--color-bg` | 3.19 | ≥3.5 |
| `--color-border-input` on `--color-surface` | 3.79 | ≥4.0 (extra headroom — form-input affordance is critical for data entry) |
| `--color-text-tertiary` on `--color-bg` | 4.88 | ≥4.7 |
| `--color-text-secondary` on `--color-surface-muted` | 4.61 | ≥4.7 |

### Derivation rules (documentation only, this sprint)

A new "Derivation rules for new tokens" section is added to `docs/dark-mode-contract.md`. It documents the OKLCH-based discipline for future additions but does not refactor existing explicit hex values. The current 12 family `--color-bg-*` and `--color-border-*` tints stay as explicit hex values — refactoring all of them to `color-mix()` is its own separate sprint.

## Token changes

### Legend

All hex values in the "After" column are **proposals** based on my mental model. The implementation will use OKLCH to compute the final values and `check-contrast.mjs` to verify them. If any proposed value fails the 4.7:1 / 3.5:1 headroom targets, the OKLCH lightness is adjusted until it passes. Dark values in the `light-dark()` pairs are **not** touched.

### Surfaces (ladder)

| Token | Before | After (proposed) | Rationale |
|---|---|---|---|
| `--color-bg` | `#f7f1e5` | `#f5eddb` | Slightly warmer, slightly lower L — more grounded paper, not bleached |
| `--color-surface` | `#fdfaf5` | `#fbf6ea` | Clearer perceptual lift off bg (was barely distinguishable) |
| `--color-surface-elevated` | `#fffdf9` | `#fffbf0` | Warmer white, still maximum lift |
| `--color-surface-muted` | `#f2eadc` | `#efe6d2` | Step *down* from bg (muted chips, inactive states) |
| `--color-surface-glass` | `rgba(253,250,245,0.7)` | `rgba(251,246,234,0.72)` | Matches new surface, ~2% more opaque for legibility |

### Text

| Token | Before | After | Rationale |
|---|---|---|---|
| `--color-text` | `#30251a` | `#2b2014` | Slightly deeper ink for confidence on new bg |
| `--color-text-secondary` | `#746754` | `#6b5d48` | ~5.5:1 on new bg (was 4.90) — real headroom |
| `--color-text-tertiary` | `#756754` | `#8e8069` | **Real split from secondary** — ~4.7:1, visually distinct |

### Accent (lifted for headroom)

| Token | Before | After | Rationale |
|---|---|---|---|
| `--color-accent` | `#c07624` | `#ae671a` | ≥3.5:1 on new bg (was 3.19) |
| `--color-accent-hover` | `#a75f1b` | `#935110` | Tracks accent lift |
| `--color-accent-soft` | `#f4e5cf` | `#f3e0c2` | Derived-feel tint |
| `--color-text-accent` | `#865622` | `#7a4c17` | Tracks accent, holds contrast on `--color-bg-accent` |
| `--color-border-accent` | `#e4cbab` | `#dfc298` | Tracks accent |
| `--color-bg-accent` | `#f6ead8` | `#f5e6cc` | Tracks accent |

### Warning (split from accent)

| Token | Before | After | Rationale |
|---|---|---|---|
| `--color-warning` | `#c07624` ⚠ same as accent | `#b87f12` | **Amber/umber** — distinct hue from accent orange |
| `--color-bg-warning` | `#fcf1df` | `#faecc9` | Tracks warning |
| `--color-text-warning` | `#8c5611` | `#7a5208` | Tracks warning, holds contrast |
| `--color-border-warning` | `#e7c492` | `#e3be7a` | Tracks warning |
| `--color-bg-sun` | `#fcf1df` | `#faecc9` | `sun` family aliased to warning family — unchanged relationship, tracks warning |
| `--color-text-sun` | `#8c5611` | `#7a5208` | As above |
| `--color-border-sun` | `#e7c492` | `#e3be7a` | As above |
| `--color-section-watchpoint` | `#d4940e` | `#c88808` | Tracks warning hue shift |
| `--color-section-focus` | `#d4940e` | `#c88808` | As above |

### Borders (hairline discipline)

| Token | Before | After | Rationale |
|---|---|---|---|
| `--color-border` | `#e8dfc8` | `#e2d6ba` | Slightly deeper hairline, feels derived from ink |
| `--color-border-strong` | `#d9ccaf` | `#c9b896` | More visible when used for actual UI affordance |
| `--color-border-input` | `#8d7f5d` | `#7d6e4c` | ≥4.0:1 on new surface (was 3.79) |

### Status families (minor tracking)

The following tokens get minor lifts where contrast is tight on the new bg/surface values, but stay in their hue family. Exact final values picked during implementation by OKLCH sweep + contrast gate.

- `--color-success`: slightly deeper green for UI indicator headroom on new bg
- `--color-danger`: slightly deeper terra-cotta for same reason
- `--color-bg-success`, `--color-bg-danger`, `--color-bg-info`, `--color-bg-analysis`, `--color-bg-provenance`, `--color-bg-pending`, `--color-bg-sage`, `--color-bg-slate`, `--color-bg-forest`: adjusted 2–3% in **OKLCH lightness** to track the new surface and retain perceptual family cohesion
- Family `--color-border-*` and `--color-text-*` tokens: tracked only if required by the contrast gate

### Forecast tier colors

- `--color-forecast-low`, `--color-forecast-medium`, `--color-forecast-high` and their `-bg` / `-text` pairs: only adjusted if their existing ratios drop below the 4.7:1 floor on the new bg. Current ratios (7.22 / 6.13 / 7.37) have plenty of margin, so changes here are unlikely.

### Shadows

Shadow structure is unchanged — three-layer warm alpha. Only the alpha values are tuned so elevated cards read with more intention on the new ladder:

| Shadow | Change |
|---|---|
| `--_shadow-sm-a` | unchanged |
| `--_shadow-md-a` | +~2% alpha (roughly `rgba(180, 140, 60, 0.06)`) |
| `--_shadow-lg-a` | +~2% alpha |
| `--_shadow-lg-b` | unchanged |

Dark-side shadow alphas are **not** touched.

### Approve and text-on-accent

| Token | Before | After | Rationale |
|---|---|---|---|
| `--color-approve` | `#547d52` | no change | Holds up on new bg |
| `--color-text-on-accent` | `#24190f` | `#1e1308` | Slightly deeper to hold the tighter new accent |

## Derivation rules (new section in `dark-mode-contract.md`)

Add a new "§6. Derivation rules for new tokens" section to `docs/dark-mode-contract.md`:

> When adding a *new* semantic family or token, follow this hierarchy:
>
> 1. Pick the `--color-<family>` base (the UI indicator value, ~6:1 contrast on bg) in OKLCH, holding the Prairie warm hue family where possible.
> 2. Derive `--color-bg-<family>` as ~10% mix with `--color-bg` in OKLCH space (conceptually — use `color-mix(in oklch, ...)` for new tokens or pick a concrete hex from the OKLCH computation).
> 3. Derive `--color-border-<family>` as ~28% mix with `--color-bg`.
> 4. Derive `--color-text-<family>` as the OKLCH-lifted base that hits 4.5:1 on `--color-bg-<family>` (target ≥4.7:1 for headroom).
> 5. Run `npm run check:contrast`. Do not ship without a clean report.
> 6. Prefer `color-mix(in oklch, ...)` for any new tokens. Existing explicit hex values stay until a dedicated refactor sprint.
>
> These rules were introduced in the 2026-04-12 light-palette editorial-letterpress sprint. They codify the discipline that sprint used for future tokens without mandating an immediate refactor of existing ones.

## Validation

After implementation:

1. **`npm run check:contrast`** must pass with zero AA failures and no required pair in light mode below **4.7:1** (small text) or **3.5:1** (large text / UI).
2. **`npm run typecheck`** — no TypeScript regressions.
3. **`npm run lint`** — no lint regressions.
4. **`npm run test`** — no CSS-module or schema regressions.
5. **Manual tab-walk.** `npm run dev`, open the web UI, walk Today / Prep / Ops / Review tabs. Toggle theme to light explicitly (not system) to force the new values regardless of OS preference. Verify:
   - No visually jarring panels (surfaces, cards, badges, buttons)
   - Accent and warning clearly distinguishable
   - Secondary and tertiary text clearly differentiated
   - Forecast low/medium/high chips still legible
   - Family chips (sun, sage, slate, forest, etc.) still feel part of one system
   - Elevated cards lift convincingly off the page
6. **Grep pass for raw light hexes.** `grep -r "#f7f1e5\|#fdfaf5\|#fffdf9\|#30251a\|#c07624"` across `apps/web/src` to confirm no component CSS file has hardcoded the old light values outside of `tokens.css`. Any hits get fixed in this sprint.
7. **Dark mode regression check.** Toggle to dark and re-walk the tabs. Nothing dark-side should have changed. If anything looks different, it is a bug.

## Risk assessment

| Area | Risk | Mitigation |
|---|---|---|
| Dark mode regressions | Very low — untouched | Each `light-dark()` pair edited only on the light side; regression check in validation §7 |
| Component CSS hardcoded light hexes | Low | Grep pass in validation §6 |
| Tight contrast after lift | Low | `check-contrast.mjs` enforces ≥4.7:1 / ≥3.5:1 floor |
| Visual regression on specific panels | Medium | Manual tab-walk required in validation §5 |
| Accent hue change perceptible across all panels | Medium | Intentional — this is the "polish." User explicitly scoped to Option C. |
| Family bg tint drift breaks perceptual cohesion | Medium | Values adjusted together as a set during implementation, not one at a time |
| OKLCH proposals don't convert to clean sRGB hex | Low | Implementation uses actual OKLCH math, not my mental-model proposals; contrast gate catches any misses |

## Rollout

Single-sprint, no feature flag, no migration. `tokens.css` is the unit of deployment — once updated, every consumer picks up the changes through `var(--color-*)`. No database, no server, no API impact. Reversal is a git revert of the single file (plus the new section in `dark-mode-contract.md`).

## Out-of-scope follow-ups

- Full refactor of the 12 semantic family tokens to `color-mix(in oklch, ...)` derivation — separate sprint
- Sepia / reading-mode third theme variant
- Per-classroom theme overrides
- Light-side equivalent of the `prefers-contrast: more` sweep (current values already track; only revisit if the new base values force them off-target)

## Files touched

- `apps/web/src/styles/tokens.css` — the token value changes
- `docs/dark-mode-contract.md` — new §6 derivation rules section
- `output/contrast-report.md` — regenerated by `npm run check:contrast` (not hand-edited)
- Possibly `apps/web/src/tokens.css` (the `--ds-*` alias file) — no direct changes expected since it only re-exports `--color-*` tokens, but listed here for transparency
