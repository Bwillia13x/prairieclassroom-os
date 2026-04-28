# Browser Use Teacher Walkthrough

Date: 2026-04-27
Target: `http://localhost:5173/?demo=true`
Runtime: Codex Browser Use plugin, in-app browser backend
Mode: local mock/demo stack

## Scope

This pass used the in-app browser directly rather than only repo scripts. The goal was to exercise the application as a teacher would: land in the demo classroom, move through the operating shell, open command/search affordances, and run representative generation flows on synthetic classroom data.

## Result

Browser Use validation is green for the tested teacher workflows. The main navigation, command surfaces, differentiated-material generation, Tomorrow Plan generation, and command palette all worked in the live app. Browser console warning/error capture returned zero entries.

## Actions Verified

| Workflow | Result | Notes |
|---|---|---|
| Load demo classroom | Pass | Landed on Classroom with `demo-okafor-grade34`. |
| Classroom -> Today | Pass | Today opened through the tab and exposed the live triage headline. |
| Today -> Prep | Pass | Prep opened through the tab and exposed the prep command surface. |
| Prep differentiated variants | Pass | Pasted synthetic fraction worksheet text and generated variants successfully. |
| Prep -> Tomorrow | Pass | Tomorrow opened through the shell and exposed the planning command surface. |
| Tomorrow Plan generation | Pass | Entered synthetic reflection/intention and generated a plan successfully. |
| Tomorrow -> Ops | Pass | Ops opened through the tab and exposed the adult-coordination surface. |
| Ops -> Review | Pass | Review opened through the tab and exposed the follow-through surface. |
| Command palette | Pass | Search opened the command palette with panel/tool options for Classroom, Today, Tomorrow, Ops, Review, and embedded tools. |
| Browser logs | Pass | No console warnings or errors were captured during the final run. |

## Notes From The Run

- Browser Use screenshot capture timed out on the first attempt, so this report relies on DOM/state evidence from Browser Use plus the screenshot bundles already captured by the final-release audit.
- Initial exact-label form locators failed because the Browser Use runtime did not resolve those fields through `getByLabel`. Retrying with the exposed textbox roles worked cleanly. This is an automation-locator issue, not a product blocker.
- I did not click any final family-message approval or external-send affordance. The tested generation actions stayed inside local synthetic/demo data.

## Evidence

- Machine-readable summary: `qa/browser-use/2026-04-27-teacher-walkthrough/walkthrough-summary.json`
- Related screenshot bundle: `qa/final-release/screenshots/2026-04-27-current/`
- Related UI evidence bundle: `output/playwright/ui-evidence/2026-04-27T22-51-09-966Z/`

## Remaining Risks

- This Browser Use pass does not replace the existing performance findings. Mobile LCP/CLS remain the main closeout blocker.
- This pass used mock inference only; hosted Gemini and paid Vertex were not rerun.
- The run used synthetic demo classroom data only.
