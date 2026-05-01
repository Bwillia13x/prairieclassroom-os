/**
 * validate-today-layout.mjs — Playwright check for Today desktop/mobile layouts.
 *
 * Architecture note: Today now uses its purpose-built command-center hero
 * inside `.workspace-page.today-panel`. The old sibling
 * `.page-anchor-rail` was removed; section navigation is handled by the
 * global shell rail on desktop and mobile navigation at compact widths.
 *
 * Assertions:
 *   Desktop (1440×1100):
 *     - `.workspace-page.today-panel` tabpanel is rendered
 *     - stale Today anchor-rail wiring is absent
 *     - command, flow, debt, live-signal, and watchlist surfaces are visible
 *     - the Today hero stays inside `.app-main` with no document overflow
 *   Mobile (393×852):
 *     - stale Today anchor-rail wiring is absent
 *     - `.today-hero__command` is visible above `.mobile-nav`
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

  // 2. Stale page-rail wiring is absent.
  const staleRailState = await page.locator(".app-main").evaluate((el) => ({
    hasPageRailAttr: el.hasAttribute("data-page-rail"),
    railCount: document.querySelectorAll('nav[aria-label="Today sections"].page-anchor-rail').length,
  }));
  assert.equal(staleRailState.hasPageRailAttr, false, "Desktop: stale data-page-rail wiring must stay removed");
  assert.equal(staleRailState.railCount, 0, "Desktop: stale Today anchor rail must not render");

  // 3. The current command-center surfaces are present and visible.
  for (const selector of [
    ".today-hero__command",
    ".today-hero__flow",
    ".today-hero__debt",
    ".today-hero__signals",
    ".today-hero__watchlist",
  ]) {
    const visible = await page.locator(selector).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = globalThis.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    assert.ok(visible, `Desktop: ${selector} must be visible`);
  }

  // 4. Hero content stays inside the main workspace and does not force document-level horizontal scroll.
  const desktopLayout = await page.evaluate(() => {
    const main = document.querySelector(".app-main")?.getBoundingClientRect();
    const hero = document.querySelector(".today-hero")?.getBoundingClientRect();
    return {
      main: main ? { left: main.left, right: main.right, top: main.top } : null,
      hero: hero ? { left: hero.left, right: hero.right, top: hero.top } : null,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  assert.ok(desktopLayout.main, "Desktop: .app-main must be present");
  assert.ok(desktopLayout.hero, "Desktop: .today-hero must be present");
  assert.ok(
    desktopLayout.hero.left >= desktopLayout.main.left && desktopLayout.hero.right <= desktopLayout.main.right,
    `Desktop: .today-hero must stay inside .app-main (${JSON.stringify(desktopLayout)})`,
  );
  assert.ok(desktopLayout.hero.top >= desktopLayout.main.top, "Desktop: .today-hero must start below shell chrome");
  assert.ok(desktopLayout.overflowX <= 1, `Desktop: document horizontal overflow must be <= 1px, got ${desktopLayout.overflowX}`);

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

  // 1. Stale page-rail wiring is absent on mobile too.
  const staleRailCount = await page.locator(".app-main").evaluate(
    () => document.querySelectorAll('nav[aria-label="Today sections"].page-anchor-rail').length,
  );
  assert.equal(staleRailCount, 0, "Mobile: stale Today anchor rail must not render");

  // 2. .today-hero__command is visible above .mobile-nav
  const commandBox = await page.locator(".today-hero__command").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom };
  });
  const mobileNavBox = await page.locator(".mobile-nav").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top };
  });
  assert.ok(
    commandBox.bottom < mobileNavBox.top,
    `Mobile: .today-hero__command bottom (${commandBox.bottom}) must be above .mobile-nav top (${mobileNavBox.top})`,
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

  const mobileOverflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(mobileOverflowX <= 1, `Mobile: document horizontal overflow must be <= 1px, got ${mobileOverflowX}`);

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
