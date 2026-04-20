/**
 * validate-today-layout.mjs — Playwright check for Today desktop/mobile layouts.
 *
 * Assertions:
 *   Desktop (1440×1100):
 *     - `.today-panel--with-rail` is display:grid
 *     - the anchor rail is visible
 *     - `.today-panel__content` is horizontally beside the rail
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
  await page.waitForSelector(".today-panel--with-rail", { timeout: 10_000 });

  // 1. display: grid on .today-panel--with-rail
  const panelDisplay = await page.$eval(
    ".today-panel--with-rail",
    (el) => globalThis.getComputedStyle(el).display,
  );
  assert.equal(panelDisplay, "grid", "Desktop: .today-panel--with-rail must be display:grid");

  // 2. Rail is visible
  const railVisible = await page.$eval(
    ".today-anchor-rail",
    (el) => {
      const style = globalThis.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    },
  );
  assert.ok(railVisible, "Desktop: anchor rail must be visible");

  // 3. Content is beside the rail (content left > rail left)
  const railBox = await page.$eval(".today-anchor-rail", (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right };
  });
  const contentBox = await page.$eval(".today-panel__content", (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left };
  });
  assert.ok(
    contentBox.left > railBox.left,
    `Desktop: .today-panel__content left (${contentBox.left}) must be right of rail left (${railBox.left})`,
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
  const railHidden = await page.$eval(
    ".today-anchor-rail",
    (el) => {
      const style = globalThis.getComputedStyle(el);
      return style.display === "none" || style.visibility === "hidden";
    },
  );
  assert.ok(railHidden, "Mobile: anchor rail must be hidden");

  // 2. .today-hero__brief is visible above .mobile-nav
  const briefBox = await page.$eval(".today-hero__brief", (el) => {
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom };
  });
  const mobileNavBox = await page.$eval(".mobile-nav", (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top };
  });
  assert.ok(
    briefBox.bottom < mobileNavBox.top,
    `Mobile: .today-hero__brief bottom (${briefBox.bottom}) must be above .mobile-nav top (${mobileNavBox.top})`,
  );

  // 3. Primary hero CTA is above .mobile-nav
  const ctaBox = await page.$eval(".today-hero__cta", (el) => {
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
