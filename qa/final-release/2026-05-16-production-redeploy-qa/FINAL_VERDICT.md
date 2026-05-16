# PrairieClassroom OS Production Redeploy QA — 2026-05-16

## Verdict

**Go for app/public-demo submission readiness.** The newly deployed Vercel production app is serving commit `937d0736b12572d4609bf55b9de36da6efbcd919` and passed the current app gates tested in this pass.

Do **not** call the overall Kaggle submission complete yet: the public YouTube/video URL and Kaggle writeup URL are still placeholders, so the no-skip publication gate was not run.

## Deployment

- Canonical production URL: `https://prairieclassroom-os.vercel.app`
- Canonical demo URL: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Deployment URL: `https://prairieclassroom-lw66n1m9c-echoexes-projects.vercel.app`
- Deployment id: `dpl_CKv2ZmurbAoWoVTpZx7MAyZgvGKx`
- Inspect URL: `https://vercel.com/echoexes-projects/prairieclassroom-os/CKv2ZmurbAoWoVTpZx7MAyZgvGKx`
- Vercel metadata: `gitCommitSha=937d0736b12572d4609bf55b9de36da6efbcd919`, `gitCommitRef=main`, `gitCommitMessage=Polish Today hero and shell caveats`, `readyState=READY`, `target=production`.

The first direct deploy from `apps/web` failed because Vercel's remote install could not resolve local workspace package `@prairie/shared`. The successful deployment used `vercel build --prod` locally, then `vercel deploy --prod --prebuilt --yes` against the existing linked project.

## Gates

- `source ~/.nvm/nvm.sh && nvm use`: passed, Node `v25.8.2`, npm `11.11.1`.
- `npm run claims:check`: passed.
- `npm run proof:check`: passed before deploy and after baseline update.
- `npm run build -w apps/web`: passed.
- `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`: passed.
- `npm run submission:final-check -- --skip-publication-check`: passed after stopping a stale local `pilot:start` tmux stack that occupied ports `3100` and `3200`.
- `npm run submission:final-check`: not run because publication placeholders remain for public YouTube/video and Kaggle writeup URLs.

## Browser QA

In-app Browser covered root, CTA routing, stale demo classroom recovery, and all seven top-level routes: Today, Classroom, Tomorrow, Week, Prep, Ops, Review.

- Root loads as the PrairieClassroom OS landing page.
- Root CTA routes to `/?demo=true&tab=today&classroom=demo-okafor-grade34`.
- Canonical demo path lands in Today without onboarding, role prompt, classroom-code prompt, or stale classroom redirect.
- Stale demo classroom query rewrites back to `demo-okafor-grade34`.
- Desktop, mobile, tablet, and wide screenshots were captured after lazy-route animations settled.
- Browser route sweeps recorded no console warnings/errors, no visible blockers, and no document-level horizontal overflow.

## Chrome QA

Real Chrome covered root/new-tab verification, canonical demo, command palette, asset reachability, and a representative generated output.

- Root CTA and canonical demo passed in Chrome.
- `Meta+K` opened the command palette with Today/Classroom/Tomorrow/Week/Prep/Ops/Review entries.
- Differentiate generated a result canvas and surfaced `Model: static-demo-fallback`, matching the public static-first demo lane.
- Initial app asset URLs observed by Chrome returned HTTP 200.
- Chrome dev logs after command-palette/workflow interaction contained repeated Chrome-extension async-response noise only; no app-specific error banner, failed route, or P0/P1 UI failure was visible.

## Computer Use

Computer Use confirmed Google Chrome was running and the PrairieClassroom QA tab group was present in the real Mac UI. No risky external UI action was taken.

## Remaining External Blockers

- Public YouTube/video URL: still missing.
- Kaggle writeup/submission URL: still missing.
- True cellular smoke: not performed in this environment.
- Hosted Gemma proof refresh: not refreshed in this pass; public demo uses bundled static fallback.
- Teacher/EA validation: still not claimed as complete.
- Ollama proof: still not claimed as passed.

## Key Evidence

- Command logs: `commands/`
- Deployment logs and headers: `deployment/`
- Browser JSON findings: `browser/`
- Chrome JSON findings: `chrome/`
- Screenshots: `screenshots/`
