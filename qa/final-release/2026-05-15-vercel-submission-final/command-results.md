
## smoke public demo

```console
$ env PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo

> prairieclassroom-os@0.0.1 smoke:public-demo
> node scripts/smoke-public-demo.mjs

Public demo smoke target: https://prairieclassroom-os.vercel.app

> prairieclassroom-os@0.0.1 smoke:browser
> node scripts/smoke-browser.mjs

Skipping protected-classroom browser smoke; set PRAIRIE_SMOKE_PROTECTED_CLASSROOM_CODE to exercise it.
PASS browser smoke

[exit 0]
```

## smoke public demo rerun

```console
$ env PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo

> prairieclassroom-os@0.0.1 smoke:public-demo
> node scripts/smoke-public-demo.mjs

Public demo smoke target: https://prairieclassroom-os.vercel.app

> prairieclassroom-os@0.0.1 smoke:browser
> node scripts/smoke-browser.mjs

Skipping protected-classroom browser smoke; set PRAIRIE_SMOKE_PROTECTED_CLASSROOM_CODE to exercise it.
PASS browser smoke

[exit 0]
```

## submission final check skip publication

```console
$ npm run submission:final-check -- --skip-publication-check

> prairieclassroom-os@0.0.1 submission:final-check
> node scripts/submission-final-check.mjs --skip-publication-check

Submission final check — 7 steps
  (publication readiness check skipped via --skip-publication-check)

▶  claims:check

> prairieclassroom-os@0.0.1 claims:check
> node scripts/claims-check.mjs

Claims check passed.

▶  proof:check

> prairieclassroom-os@0.0.1 proof:check
> node scripts/proof-check.mjs

Proof surfaces are internally consistent.

▶  system:inventory:check

> prairieclassroom-os@0.0.1 system:inventory:check
> node scripts/system-inventory.mjs --check

System Inventory
Primary panels: 12
Prompt classes: 13
Live/planning split: 7/6
Retrieval-backed prompt classes: 7
API route bases: 21
API endpoints: 53
Eval case files: 134

Canonical inventory claims are in sync.

▶  eval:inventory:check

> prairieclassroom-os@0.0.1 eval:inventory:check
> node scripts/eval-inventory.mjs --check

Eval inventory is in sync.

▶  demo:fixture:check

> prairieclassroom-os@0.0.1 demo:fixture:check
> node scripts/validate-demo-fixture.mjs

Demo fixture validation passed.
  Classroom: demo-okafor-grade34
  interventions: 36
  generated_plans: 3
  pattern_reports: 1
  family_messages: 1
  sessions: 5
  feedback: 0
  complexity_forecasts: 0
  scaffold_reviews: 0
  survival_packets: 0
  generated_variants: 0
  runs: 0

▶  check:contrast

> prairieclassroom-os@0.0.1 check:contrast
> node scripts/check-contrast.mjs

Contrast report: output/contrast-report.md
Pairs evaluated: 80 (light + dark)
All pairs meet WCAG AA. ✓

▶  release:gate (mock)

> prairieclassroom-os@0.0.1 release:gate
> node scripts/release-gate.mjs --inference-mode mock --update-baseline

Release gate logs: /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/output/release-gate/2026-05-15T12-57-10-977Z-52253
Release gate Python: /Users/benjaminwilliams/Prairie_Complexity/prairieclassroom-predev/services/inference/.venv311/bin/python
Release gate passed (mock).

════════════════════════════════════════════════════════════
Submission Final Check — Summary
════════════════════════════════════════════════════════════
  ✓  claims:check                    240ms
  ✓  proof:check                     214ms
  ✓  system:inventory:check          220ms
  ✓  eval:inventory:check            256ms
  ✓  demo:fixture:check               1.0s
  ✓  check:contrast                  219ms
  ✓  release:gate (mock)             2m05s
────────────────────────────────────────────────────────────
  Passed: 7/7    Total: 2m07s

✓  All local pre-submit gates passed.
   Next: complete the external publish steps in docs/hackathon-submission-checklist.md
   (GitHub public, reachable live demo URL, public demo browser smoke, reachable YouTube video, Kaggle attachments).

[exit 0]
```

## claims check

```console
$ npm run claims:check

> prairieclassroom-os@0.0.1 claims:check
> node scripts/claims-check.mjs

Claims check passed.

[exit 0]
```

## proof check

```console
$ npm run proof:check

> prairieclassroom-os@0.0.1 proof:check
> node scripts/proof-check.mjs

Proof surfaces are internally consistent.

[exit 0]
```

## system inventory check

```console
$ npm run system:inventory:check

> prairieclassroom-os@0.0.1 system:inventory:check
> node scripts/system-inventory.mjs --check

System Inventory
Primary panels: 12
Prompt classes: 13
Live/planning split: 7/6
Retrieval-backed prompt classes: 7
API route bases: 21
API endpoints: 53
Eval case files: 134

Canonical inventory claims are in sync.

[exit 0]
```

## eval inventory check

```console
$ npm run eval:inventory:check

> prairieclassroom-os@0.0.1 eval:inventory:check
> node scripts/eval-inventory.mjs --check

Eval inventory is in sync.

[exit 0]
```

## demo fixture check

```console
$ npm run demo:fixture:check

> prairieclassroom-os@0.0.1 demo:fixture:check
> node scripts/validate-demo-fixture.mjs

Demo fixture validation passed.
  Classroom: demo-okafor-grade34
  interventions: 36
  generated_plans: 3
  pattern_reports: 1
  family_messages: 1
  sessions: 5
  feedback: 0
  complexity_forecasts: 0
  scaffold_reviews: 0
  survival_packets: 0
  generated_variants: 0
  runs: 0

[exit 0]
```

## contrast check

```console
$ npm run check:contrast

> prairieclassroom-os@0.0.1 check:contrast
> node scripts/check-contrast.mjs

Contrast report: output/contrast-report.md
Pairs evaluated: 80 (light + dark)
All pairs meet WCAG AA. ✓

[exit 0]
```

## npm audit omit dev

```console
$ npm audit --omit=dev
found 0 vulnerabilities

[exit 0]
```

## final clean-deployment smoke

```console
$ PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo

> prairieclassroom-os@0.0.1 smoke:public-demo
> node scripts/smoke-public-demo.mjs

Public demo smoke target: https://prairieclassroom-os.vercel.app

> prairieclassroom-os@0.0.1 smoke:browser
> node scripts/smoke-browser.mjs

Skipping protected-classroom browser smoke; set PRAIRIE_SMOKE_PROTECTED_CLASSROOM_CODE to exercise it.
PASS browser smoke

[exit 0]
```

## final public route sweep

```console
$ node qa/final-release/2026-05-15-vercel-submission-final/public-route-sweep.mjs
{
  "failures": [],
  "routeChecks": 35
}

[exit 0]
```

## final lighthouse spot checks

```console
$ npx lighthouse <canonical demo URL> --preset=desktop --only-categories=performance,accessibility,best-practices,seo
$ npx lighthouse <canonical demo URL> --only-categories=performance,accessibility,best-practices,seo
$ npx lighthouse <review support patterns URL> --preset=desktop --only-categories=performance,accessibility,best-practices,seo

canonical desktop: performance 99, accessibility 100, best-practices 100, seo 100
canonical mobile: performance 84, accessibility 100, best-practices 100, seo 100
review support desktop: performance 83, accessibility 100, best-practices 100, seo 100

[exit 0]
```
