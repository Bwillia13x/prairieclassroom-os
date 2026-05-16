# Public Demo Check - 2026-05-16

Target: `https://prairieclassroom-os.vercel.app`

## Verdict

Pass for public static-first demo readiness.

## Checks

- `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`: passed.
- Root URL loads the PrairieClassroom OS landing page.
- Root CTA `Enter PrairieClassroom` points to `https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34`.
- Clicking the CTA opens the canonical demo path and lands on `panel-today`.
- Public canonical demo uses `document.documentElement.dataset.demoApi = "prairie-static-demo-api"`, confirming the static-first bundled synthetic demo lane.
- Desktop and mobile canonical demo checks had no document-level horizontal overflow and no classroom-code prompt.
- Console errors: 0.
- Page runtime errors: 0.

## Evidence

- Headers/body captures: `root-headers.txt`, `root.html`, `canonical-headers.txt`, `canonical.html`.
- Screenshots: `qa/final-release/2026-05-16-public-demo-check/screenshots/`.

This is public demo validation only. It is not a new hosted Gemma proof baseline.
