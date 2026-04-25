import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("output", "plan-compass");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();

  // Tomorrow page, demo classroom → bypasses auth, shows the empty preview
  // state which renders the new PlanCoverageRadar compass.
  await page.goto("http://localhost:5173/?demo=true&tab=tomorrow&tool=tomorrow-plan", {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  // Give the mount animation time to land in its rest state.
  await page.waitForSelector(".viz-plan-radar--compass", { timeout: 15_000 });
  await page.waitForTimeout(1500);

  // Full page first.
  await page.screenshot({ path: path.join(OUT, "full-dark.png"), fullPage: true });

  // Tight crop of just the compass for the design review.
  const radar = await page.locator(".viz-plan-radar--compass").first();
  await radar.screenshot({ path: path.join(OUT, "compass-dark.png") });

  // Light theme — toggle and recapture.
  await ctx.close();
  const ctxLight = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const pageLight = await ctxLight.newPage();
  await pageLight.goto("http://localhost:5173/?demo=true&tab=tomorrow&tool=tomorrow-plan", {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await pageLight.waitForSelector(".viz-plan-radar--compass", { timeout: 15_000 });
  await pageLight.waitForTimeout(1500);
  await pageLight.locator(".viz-plan-radar--compass").first().screenshot({ path: path.join(OUT, "compass-light.png") });

  console.log("captured:");
  console.log(" -", path.join(OUT, "full-dark.png"));
  console.log(" -", path.join(OUT, "compass-dark.png"));
  console.log(" -", path.join(OUT, "compass-light.png"));
} finally {
  await browser.close();
}
