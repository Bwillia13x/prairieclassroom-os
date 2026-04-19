# PrairieClassroom Marketing Video

Remotion composition for a detailed PrairieClassroom OS marketing and explanatory overview.

The composition uses the existing QA demo screenshots through:

```text
apps/marketing-video/public/screenshots -> ../../../qa/demo-script/screenshots
```

Those screenshots are intentionally ignored by git because they are large generated assets. Recreate them with the repo's demo capture workflow before rendering on a clean checkout.

## Commands

```bash
npm run video:studio
npm run video:render
npm run still:nothing -w @prairie/marketing-video
npm run render:nothing -w @prairie/marketing-video
```

The render writes:

```text
qa/demo-script/videos/remotion-marketing-overview.mp4
```

The preview still writes:

```text
qa/demo-script/videos/remotion-marketing-overview-preview.png
```

The Nothing-design launch composition uses fresh screenshots from:

```text
qa/demo-script/screenshots/nothing-fixed/
```

It writes:

```text
qa/demo-script/videos/remotion-nothing-launch.mp4
qa/demo-script/videos/remotion-nothing-launch-preview.png
```
