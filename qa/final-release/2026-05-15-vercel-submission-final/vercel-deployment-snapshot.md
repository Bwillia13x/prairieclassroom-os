# Vercel Deployment Snapshot

- Checked at: 2026-05-15T13:31:37.721Z
- Project: prairieclassroom-os (prj_Hf8Vju4JZRTNRBEDJ8dvWyftXlQO)
- Team: team_6F2gUB7a71YmwNGbqU5HA7cE
- Verification deployment: dpl_BHrGmMjyUSgvCRmtrktzpTnRuhF7
- Verification deployment URL: https://prairieclassroom-lcj3s4ybs-echoexes-projects.vercel.app
- Production alias: https://prairieclassroom-os.vercel.app
- State: READY
- Commit: f46122aefe7d37152b7648872fe5e3877e6fd316
- Vercel project Node: 24.x
- Repo local Node used for gates: 25.8.2

## Alias And HTTP

- Root URL returns HTTP 307 to `/?demo=true&tab=today&classroom=demo-okafor-grade34`.
- Canonical demo URL returns HTTP 200.
- Hashed assets are served through the Vercel build output; the app shell includes only Atkinson 400/700 font preloads on the first HTML path.

## Source Evidence

- CLI inspect: `raw/final-vercel-inspect.txt`
- Root headers: `raw/final-root.headers`
- Canonical headers: `raw/final-demo.headers`
- Public route sweep: `route-sweep-report.json` and `route-sweep-report.md`

Note: this snapshot records the clean production deployment used for the full route and Lighthouse refresh. An evidence-only commit may be redeployed afterward so Vercel metadata points at the latest repository commit; app build output is unchanged by evidence files outside `apps/web`.
