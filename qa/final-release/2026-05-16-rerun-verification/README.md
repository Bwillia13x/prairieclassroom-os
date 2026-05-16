# Final Verification Rerun - 2026-05-16

Target app:

- Local: `http://localhost:5173/?demo=true&tab=today&classroom=demo-okafor-grade34`
- Public: `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`

## Verdict

Pass for local app readiness and public static-first demo readiness. No P0/P1 runtime, workflow, auth, privacy, contrast, release-gate, or performance blocker was found in this rerun.

This does not prove the app is literally bug-free. It records the strongest practical pre-submit validation rerun performed before commit/push/redeploy.

## Commands

- `nvm use 25.8.2`
- `npm run rebuild:memory`
- `npm run pilot:reset`
- `npm run demo:fixture:check`
- `npm run claims:check`
- `npm run proof:check`
- `npm run system:inventory:check`
- `npm run eval:inventory:check`
- `npm run check:contrast`
- `npm run lint`
- `npm run build -w apps/web`
- `npm run video:still:classroom-full`
- `npm run release:gate`
- `PRAIRIE_WEB_BASE=http://localhost:5173 npm run ui:evidence`
- `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`
- `npx --yes lighthouse@13.1.0 ... --preset=desktop`
- `npx --yes lighthouse@13.1.0 ...` (mobile)

## Evidence

- Latest mock release gate: `output/release-gate/2026-05-16T22-26-39-727Z-59832/summary.json`
- Local UI evidence sweep: `output/playwright/ui-evidence/2026-05-16T22-39-55-609Z/`
- Public Lighthouse reports: `qa/performance/lighthouse/2026-05-16-rerun/`
- Prior local browser workflow evidence retained at `qa/final-release/2026-05-16-local-e2e-qa/`
- Prior public root/canonical demo evidence retained at `qa/final-release/2026-05-16-public-demo-check/`

## Performance Snapshot

| Target | Perf | A11y | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Public canonical desktop | 100 | 100 | 100 | 100 | 0.36s | 0.56s | 0ms | 0.000004 |
| Public canonical mobile | 95 | 100 | 100 | 100 | 2.05s | 2.22s | 29ms | 0 |

## Boundaries

- Public `?demo=true` is static-first bundled synthetic/demo data.
- Hosted Gemini proof is separate and synthetic/demo-only.
- Ollama proof remains unproven on this host.
- Paid Vertex was not run.
- Human classroom validation is not claimed.
