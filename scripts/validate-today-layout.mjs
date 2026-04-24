/**
 * validate-today-layout.mjs — Playwright check for Today desktop/mobile layouts.
 *
 * Architecture note: the Today rail is `<nav class="page-anchor-rail"
 * aria-label="Today sections">`, rendered as a sibling of the tabpanel
 * (not a child of `.today-panel`). Layout clearance is handled via
 * `.app-main[data-page-rail]` left-padding on its tabpanel children above
 * `min-width: 961px`; the rail is `display:none` at `max-width: 960px`.
 *
 * Assertions:
 *   Desktop (1440×1100):
 *     - `.workspace-page.today-panel` tabpanel is rendered
 *     - `.app-main[data-page-rail]` wiring is present
 *     - the anchor rail (`nav[aria-label="Today sections"]`) is visible
 *     - the Today hero content sits right of the rail (no overlap)
 *   Mobile (393×852):
 *     - rail is hidden
 *     - `.today-hero__brief` is visible above `.mobile-nav`
 *     - the primary hero CTA is above `.mobile-nav`
 *
 * Run: node scripts/validate-today-layout.mjs
 * Requires the Vite dev server on localhost:5173.
 */

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const WEB_BASE = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const DEMO_URL = `${WEB_BASE}/?demo=true&tab=today&classroom=demo-okafor-grade34`;

const OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "output",
  "playwright",
  "today-layout",
);

async function prepareContext(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    globalThis.localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ "demo-okafor-grade34": "teacher" }),
    );
  });
  return context;
}

async function validateDesktop(browser) {
  const context = await prepareContext(browser, { width: 1440, height: 1100 });
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(DEMO_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".workspace-page.today-panel", { timeout: 10_000 });

  // 1. Today tabpanel is rendered and visible
  const panelVisible = await page.locator(".workspace-page.today-panel").evaluate(
    (el) => {
      const style = globalThis.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    },
  );
  assert.ok(panelVisible, "Desktop: .workspace-page.today-panel must be visible");

  // 2. App-main has page-rail wiring that offsets tabpanel content
  const hasPageRailAttr = await page.locator(".app-main").evaluate(
    (el) => el.hasAttribute("data-page-rail"),
  );
  assert.ok(hasPageRailAttr, "Desktop: .app-main must have data-page-rail attribute for rail offset");

  // 3. Rail is visible
  const railVisible = await page.locator('nav[aria-label="Today sections"].page-anchor-rail').evaluate(
    (el) => {
      const style = globalThis.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    },
  );
  assert.ok(railVisible, "Desktop: anchor rail must be visible");

  // 4. Hero content sits right of the rail (no overlap)
  const railBox = await page.locator('nav[aria-label="Today sections"].page-anchor-rail').evaluate(
    (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    },
  );
  const heroBox = await page.locator(".today-hero").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left };
  });
  assert.ok(
    heroBox.left >= railBox.right,
    `Desktop: .today-hero left (${heroBox.left}) must be at or right of rail right (${railBox.right})`,
  );

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "today-desktop.png"),
    fullPage: true,
  });

  assert.equal(errors.length, 0, `Desktop page errors:\n${errors.join("\n")}`);

  await context.close();
  console.log("  PASS desktop layout");
}

async function validateMobile(browser) {
  const context = await prepareContext(browser, { width: 393, height: 852 });
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(DEMO_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".today-hero", { timeout: 10_000 });

  // 1. Rail is hidden on mobile
  const railHidden = await page.locator('nav[aria-label="Today sections"].page-anchor-rail').evaluate(
    (el) => {
      const style = globalThis.getComputedStyle(el);
      return style.display === "none" || style.visibility === "hidden";
    },
  );
  assert.ok(railHidden, "Mobile: anchor rail must be hidden");

  // 2. .today-hero__brief is visible above .mobile-nav
  const briefBox = await page.locator(".today-hero__brief").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom };
  });
  const mobileNavBox = await page.locator(".mobile-nav").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top };
  });
  assert.ok(
    briefBox.bottom < mobileNavBox.top,
    `Mobile: .today-hero__brief bottom (${briefBox.bottom}) must be above .mobile-nav top (${mobileNavBox.top})`,
  );

  // 3. Primary hero CTA is above .mobile-nav
  const ctaBox = await page.locator(".today-hero__cta").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom };
  });
  assert.ok(
    ctaBox.bottom < mobileNavBox.top,
    `Mobile: hero CTA bottom (${ctaBox.bottom}) must be above .mobile-nav top (${mobileNavBox.top})`,
  );

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "today-mobile.png"),
    fullPage: true,
  });

  assert.equal(errors.length, 0, `Mobile page errors:\n${errors.join("\n")}`);

  await context.close();
  console.log("  PASS mobile layout");
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    await validateDesktop(browser);
    await validateMobile(browser);
    console.log(`PASS Today layout validation. Evidence in ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exitCode = 1;
});
