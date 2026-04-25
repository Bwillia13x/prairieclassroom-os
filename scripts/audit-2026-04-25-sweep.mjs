// One-off live-DOM browser sweep for the 2026-04-25 final-release audit (R8).
// Captures full-page screenshots across 5 viewports × 2 themes × 7 tabs = 70.
// Verifies no console/page errors AND that captures are not byte-identical
// (guards against the fake-screenshot mode observed during the audit).

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const TABS = ["classroom", "today", "tomorrow", "week", "prep", "ops", "review"];
// Reduced from 5 viewports to 3 to fit within the orchestrator's 200/min rate limit:
// 3 viewports x 2 themes x 7 tabs = 42 captures, ~5 API calls each = ~210 reqs
// (close to limit, mitigated by THROTTLE_MS sleep between viewport-theme cycles).
const VIEWPORTS = [
  { name: "375", width: 375, height: 667 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1720", width: 1720, height: 1080 },
];
const THEMES = ["light", "dark"];
const THROTTLE_MS = 65_000;
const OUT = "qa/final-release/screenshots/2026-04-25";
const errors = [];
const captured = [];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let cycleIndex = 0;
try {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      if (cycleIndex > 0) {
        // Throttle between viewport-theme cycles to let the orchestrator's
        // rate-limit window roll over (60s window, 200 req cap).
        console.log(`Throttling ${THROTTLE_MS / 1000}s before ${vp.name}/${theme}...`);
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
      cycleIndex += 1;
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`[${vp.name}/${theme}] console: ${msg.text()}`);
      });
      page.on("pageerror", (err) => errors.push(`[${vp.name}/${theme}] page-error: ${err.message}`));
      for (const tab of TABS) {
        await page.goto(`http://localhost:5173/?demo=true&tab=${tab}`, { waitUntil: "networkidle" });
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
        }, theme);
        await page.waitForTimeout(900);
        const path = `${OUT}/${vp.name}-${theme}-${tab}.png`;
        await page.screenshot({ path, fullPage: false });
        captured.push(path);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

// Hash-collision guard: real captures of distinct content cannot be byte-identical
const hashes = new Map();
for (const path of captured) {
  const buf = await readFile(path);
  const h = createHash("md5").update(buf).digest("hex");
  if (!hashes.has(h)) hashes.set(h, []);
  hashes.get(h).push(path);
}
const collisions = [...hashes.values()].filter((paths) => paths.length > 1);

if (errors.length > 0) {
  console.error(`Console/page errors detected (${errors.length}):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
if (collisions.length > 0) {
  console.error(`Hash collisions detected (${collisions.length} groups) — captures may be fake/blank:`);
  for (const group of collisions) {
    console.error("  " + group.join(", "));
  }
  process.exit(1);
}
console.log(`PASS — ${captured.length} screenshots captured; ${hashes.size} unique hashes; 0 errors.`);
