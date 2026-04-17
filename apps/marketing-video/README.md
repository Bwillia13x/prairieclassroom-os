# PrairieClassroom Marketing Video

Remotion composition for a brief PrairieClassroom OS marketing demo.

The composition uses the existing QA demo screenshots through:

```text
apps/marketing-video/public/screenshots -> ../../../qa/demo-script/screenshots
```

Those screenshots are intentionally ignored by git because they are large generated assets. Recreate them with the repo's demo capture workflow before rendering on a clean checkout.

## Commands

```bash
npm run video:studio
npm run video:render
```

The render writes:

```text
qa/demo-script/videos/remotion-marketing-demo.mp4
```

The preview still writes:

```text
qa/demo-script/videos/remotion-marketing-preview.png
```
