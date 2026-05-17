# Cellular Browser Smoke Checklist

Use this checklist to close the remaining physical cellular-browser blocker for the public PrairieClassroom OS demo. This is a manual device check; desktop HTTP reachability, Playwright mobile emulation, and Lighthouse mobile runs do not prove this item.

## Target

```text
https://prairieclassroom-os.vercel.app/?demo=true&tab=today&classroom=demo-okafor-grade34
```

## Device Setup

1. Use a real phone on mobile data only.
2. Turn Wi-Fi off.
3. Open a private/incognito browser tab if available.
4. Paste the target URL above.

## Pass Criteria

Record pass/fail for each item:

| Check | Expected Result | Result |
| --- | --- | --- |
| Initial load | Demo opens without access-code, onboarding, or role-selection blocking the route. |  |
| Today route | The first visible app workspace is Today for the Okafor Grade 3/4 demo class. |  |
| Mobile nav | Bottom navigation is visible and tappable. |  |
| Prep route | Tap Adapt or navigate to Prep Differentiate; the route loads without horizontal overflow. |  |
| Generated output | A static-first demo generation completes and is labelled as a static/demo fallback, not live hosted proof. |  |
| Review route | Navigate to Review Family Message; controls remain readable and tappable. |  |
| Reload | Reload the page; it returns to the demo classroom without an access-code prompt. |  |

## Evidence To Record

Save these details in the final submission closeout note:

- Date/time:
- Device model:
- Browser:
- Carrier/network:
- Result:
- Screenshots captured:
- Notes:

## After It Passes

Do not remove the public-video or Kaggle URL blockers unless those links are also real. After cellular smoke passes, record the evidence with the guarded helper instead of hand-editing status lines:

```bash
npm run submission:record-cellular-smoke -- \
  --result pass \
  --checked-at '<date/time with timezone>' \
  --device '<phone model>' \
  --browser '<browser>' \
  --carrier '<carrier/network>' \
  --screenshots '<paths or screenshot note>' \
  --notes '<brief observation>'
```

Then rerun the public demo smoke:

```bash
source ~/.nvm/nvm.sh && nvm use --silent 25.8.2
PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo
```

When the public YouTube and Kaggle URLs also exist, apply them and run the final no-skip gate:

```bash
npm run submission:apply-links -- --video-url '<youtube-url>' --kaggle-url '<kaggle-url>'
npm run submission:final-check
```
