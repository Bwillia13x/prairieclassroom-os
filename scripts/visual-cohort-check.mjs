#!/usr/bin/env node
/**
 * Standalone visual smoke for the Cohort Pulse zone on the Classroom page.
 * Boots no servers — assumes web@5173 + orchestrator@3100 are already running.
 *
 * Verifies:
 *  - cohort-cell renders for the demo classroom
 *  - the count is >= 26 (matches demo seed roster)
 *  - rendering is stable across 3 viewports (375 / 768 / 1440)
 *  - no console errors are emitted while the Classroom page is open
 *  - takes screenshots: dashboard-cohort-pulse-{375,768,1440}.png
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const WEB = process.env.PRAIRIE_WEB_URL ?? "http://localhost:5173";
const VIEWPORTS = [
  { name: "375", width: 375, height: 700 },
  { name: "768", width: 768, height: 1000 },
  { name: "1440", width: 1440, height: 900 },
];
const OUT_DIR = "output/cohort-pulse";

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const failures = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  try {
    await page.goto(`${WEB}/?demo=true`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForSelector('[data-testid="cohort-cell"]', { timeout: 8000 });
    const count = await page.locator('[data-testid="cohort-cell"]').count();

    if (count < 26) {
      failures.push(`viewport ${vp.name}: only ${count} cohort cells visible (expected >= 26)`);
    }

    const filtered = errors.filter(
      (e) => !/favicon\.ico|404 \(Not Found\).*favicon|net::ERR_FAILED/i.test(e),
    );
    if (filtered.length > 0) {
      failures.push(`viewport ${vp.name}: console errors — ${JSON.stringify(filtered.slice(0, 3))}`);
    }

    // Scroll the cohort grid into view so the screenshot actually captures
    // the Zone 3.5 cohort pulse area. The app shell is viewport-locked
    // (overflow:hidden on .app-shell, overflow-y:auto on .app-main), so
    // fullPage:true captures the same height as the viewport. Scrolling
    // the first cohort-cell into view ensures the zone is visible.
    await page.locator('[data-testid="cohort-cell"]').first().scrollIntoViewIfNeeded();

    await page.screenshot({
      path: `${OUT_DIR}/dashboard-cohort-pulse-${vp.name}.png`,
      fullPage: true,
    });
  } catch (err) {
    failures.push(`viewport ${vp.name}: ${err.message}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();

if (failures.length > 0) {
  console.error("Visual cohort check FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`Visual cohort check PASS — screenshots in ${OUT_DIR}/`);
