# Final Verdict

Generated: 2026-05-15T02:32:08.350Z

## Verdict

Application/public demo ready for judges and public demo use. The no-skip external publication gate remains blocked until the public video URL, Kaggle writeup URL, and hosted Gemini env/key lane are intentionally completed or waived.

## Evidence Summary

- Vercel latest production: dpl_HkA4bZLk7ZNzxrnotDZaQ5bsCkTe, READY, commit e00d83116ab596f04e722f44c612fa790e850d29.
- Root URL redirects to the canonical demo query path.
- Route/browser sweep: 38/38 passed; console errors 0; page errors 0; bad HTTP responses 0; overflow failures 0.
- Core surfaces covered: Today, Classroom, Tomorrow, Week, Prep, Ops, Review, Differentiate, Tomorrow Plan, Family Message approval boundary, Intervention logging, EA Load, Sub Packet, Support Patterns, command palette.
- Negative checks covered: stale classroom query settles safely; protected classroom URL shows access gate and makes no unauthorized detail fetches.
- Local gates passed: public smoke, submission final check with publication skip, claims, proof, system inventory, eval inventory, demo fixture, contrast, production npm audit.
- Lighthouse: Today 76/100 performance and 100/100 accessibility; Differentiate 81/100 performance and 100/100 accessibility.
- Hosted Gemini refresh was not run: `PRAIRIE_GEMINI_API_KEY` and `PRAIRIE_ENABLE_GEMINI_RUNS` are absent, so the hosted lane remains fail-closed.

## Blocking Items Outside App Readiness

- Public video URL is still missing from publication preflight.
- Kaggle writeup URL is still missing from publication preflight.
- Hosted Gemini proof cannot be refreshed without explicit credentials and guard enablement.
- During command capture, the fresh evidence folder made `submission:publish-preflight` report a dirty worktree; after committing the artifacts, the remaining no-skip blockers are the external publication links and hosted Gemini guard/env lane.

## Evidence Files

- [vercel-deployment-snapshot.md](vercel-deployment-snapshot.md)
- [route-sweep.md](route-sweep.md)
- [lighthouse-summary.md](lighthouse-summary.md)
- [security-header-notes.md](security-header-notes.md)
- [command-results.md](command-results.md)
- [browser-sanity.md](browser-sanity.md)
