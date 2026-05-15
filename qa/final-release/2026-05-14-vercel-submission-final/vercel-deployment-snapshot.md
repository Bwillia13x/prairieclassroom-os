# Vercel Deployment Snapshot

Generated: 2026-05-15T02:32:08.350Z
Project: prairieclassroom-os (prj_Hf8Vju4JZRTNRBEDJ8dvWyftXlQO)
Team: team_6F2gUB7a71YmwNGbqU5HA7cE
Latest production deployment: dpl_HkA4bZLk7ZNzxrnotDZaQ5bsCkTe
State: READY
Alias: https://prairieclassroom-os.vercel.app
Deployment URL: https://prairieclassroom-q0i2zo89s-echoexes-projects.vercel.app
Commit: e00d83116ab596f04e722f44c612fa790e850d29
Commit message: fix: prioritize access gate over onboarding
Vercel project Node: 24.x
Local validation Node: v25.8.2

Build notes:
- Local repo uses Node v25.8.2 for build and validation.
- Vercel project is configured for Node 24.x, but production was deployed from prebuilt local artifacts, avoiding npm workspace install drift.
- Recent non-prebuilt failed deployment was attributable to @prairie/shared workspace package lookup from npm; prebuilt deploy path avoids that failure mode.
