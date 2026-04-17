# Browser Verification Checklist

Artifact: `output/playwright/ui-evidence/2026-04-15T01-05-37-378Z`

| Area | Result | Evidence |
|---|---|---|
| Desktop Today route | Pass | `today-desktop.png` captured after route load. |
| Desktop Differentiate route | Pass | `differentiate-desktop.png` captured after route load. |
| Desktop Tomorrow Plan route | Pass | `tomorrow-plan-desktop.png` captured after route load. |
| Tablet Tomorrow Plan route | Pass | `tomorrow-plan-tablet.png` captured after route load. |
| Dark-mode Tomorrow Plan route | Pass | `tomorrow-plan-dark-desktop.png` captured after route load. |
| Desktop Family Message route | Pass | `family-message-desktop.png` captured after route load. |
| Mobile shell route | Pass | `shell-mobile.png` captured after mobile nav selector appeared. |
| Runtime console errors | Pass | `npm run ui:evidence` completed; script fails on console errors. |
| Page errors | Pass | `npm run ui:evidence` completed; script fails on page errors. |
| Release browser smoke | Pass | `output/release-gate/2026-04-15T01-02-59-972Z-6535/90-smoke-browser.log`. |
