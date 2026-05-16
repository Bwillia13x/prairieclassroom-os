# Command Results

- `git status --short --branch`: clean at start, `main...origin/main`.
- `git ls-remote origin refs/heads/main`: `937d0736b12572d4609bf55b9de36da6efbcd919`.
- `source ~/.nvm/nvm.sh && nvm use`: passed, Node `v25.8.2`, npm `11.11.1`.
- `npm run claims:check`: passed.
- `npm run proof:check`: passed.
- `npm run build -w apps/web`: passed.
- `vercel deploy --prod --yes` from `apps/web`: failed, remote install could not resolve workspace package `@prairie/shared`.
- `vercel build --prod` from `apps/web`: passed.
- `vercel deploy --prod --prebuilt --yes` from `apps/web`: passed and aliased production.
- `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`: passed.
- First `npm run submission:final-check -- --skip-publication-check`: failed on local port conflict from stale `pilot:start`.
- Stale tmux stack `prairie-landing-qa-20260516`: stopped.
- Rerun `npm run submission:final-check -- --skip-publication-check`: passed 7/7.
- `npm run proof:check` after release-gate baseline update: passed.

The no-skip publication gate was intentionally not run because `docs/submission-copy-pack.md` and `docs/kaggle-paste-block.md` still contain public video/Kaggle URL placeholders.
