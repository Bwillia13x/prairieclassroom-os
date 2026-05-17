/* global URL, performance, location, HTMLImageElement */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PRAIRIE_PUBLIC_DEMO_URL ?? "https://prairieclassroom-os.vercel.app";
const DEMO_CLASSROOM = "demo-okafor-grade34";
const OUT_DIR = path.resolve(process.env.PRAIRIE_QA_OUT_DIR ?? "qa/final-release/2026-05-16-pre-submit-e2e");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");

function demoUrl(tab = "today", tool = null, classroom = DEMO_CLASSROOM) {
  const params = new URLSearchParams({ demo: "true", tab, classroom });
  if (tool) params.set("tool", tool);
  return `${BASE_URL}/?${params.toString()}`;
}

async function attachLogCapture(page, bucket) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") bucket.consoleErrors.push(text);
    if (message.type() === "warning") bucket.consoleWarnings.push(text);
  });
  page.on("pageerror", (error) => bucket.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    bucket.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });
}

async function waitForApp(page, tab) {
  await page.waitForSelector(`#panel-${tab}:not([hidden])`, { timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
}

async function waitForLandingHero(page) {
  await page.waitForSelector(".landing-page__image", { timeout: 15_000 });
  await page.waitForFunction(() => {
    const image = document.querySelector(".landing-page__image");
    if (!(image instanceof HTMLImageElement)) return false;
    const style = getComputedStyle(image);
    const rect = image.getBoundingClientRect();
    const zIndex = Number.parseInt(style.zIndex || "0", 10);
    return image.complete
      && image.naturalWidth > 0
      && rect.width >= window.innerWidth * 0.95
      && rect.height >= window.innerHeight * 0.95
      && Number.isFinite(zIndex)
      && zIndex >= 0;
  }, null, { timeout: 20_000 });
  const hero = await page.evaluate(() => {
    const image = document.querySelector(".landing-page__image");
    if (!(image instanceof HTMLImageElement)) return null;
    return {
      currentSrc: image.currentSrc || image.src,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  });
  assert.ok(hero, "Landing hero image should be present");
  assert.match(hero.currentSrc, /\.webp(?:$|\?)/, "Chromium public QA should load the optimized WebP hero");
  return hero;
}

async function auditLayout(page, label) {
  return await page.evaluate((auditLabel) => {
    const root = document.documentElement;
    const body = document.body;
    const horizontalOverflowPx = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
    const clippedText = [];
    const selector = "button, a, label, [role='button'], [role='tab'], .btn, .chip, .status-chip, .mobile-nav-group__label";
    for (const element of document.querySelectorAll(selector)) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") continue;
      const visibleText = (element.textContent || element.getAttribute("aria-label") || "").trim();
      if (!visibleText) continue;
      if ((element.scrollWidth - element.clientWidth > 3 || element.scrollHeight - element.clientHeight > 3) && style.overflow !== "visible") {
        clippedText.push({
          label: auditLabel,
          tag: element.tagName.toLowerCase(),
          text: visibleText.slice(0, 80),
          width: rect.width,
          height: rect.height,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        });
      }
    }
    return { label: auditLabel, horizontalOverflowPx, clippedText };
  }, label);
}

async function capturePerf(page, label) {
  return await page.evaluate((perfLabel) => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint").map((entry) => ({
      name: entry.name,
      startTime: Math.round(entry.startTime),
    }));
    return {
      label: perfLabel,
      url: location.href,
      timing: nav ? {
        type: nav.type,
        domContentLoadedEventEnd: Math.round(nav.domContentLoadedEventEnd),
        loadEventEnd: Math.round(nav.loadEventEnd),
        duration: Math.round(nav.duration),
        transferSize: nav.transferSize ?? null,
        decodedBodySize: nav.decodedBodySize ?? null,
      } : null,
      paint,
      resourceCount: performance.getEntriesByType("resource").length,
    };
  }, label);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const mobile = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });
  const desktopPage = await desktop.newPage();
  const mobilePage = await mobile.newPage();
  const desktopLogs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };
  const mobileLogs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks: {},
    layout: [],
    performance: [],
  };
  await attachLogCapture(desktopPage, desktopLogs);
  await attachLogCapture(mobilePage, mobileLogs);

  try {
    await desktopPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await desktopPage.getByRole("heading", { name: "PrairieClassroom OS" }).waitFor({ timeout: 20_000 });
    await desktopPage.getByRole("link", { name: "Enter PrairieClassroom" }).waitFor({ timeout: 10_000 });
    const desktopHero = await waitForLandingHero(desktopPage);
    await desktopPage.screenshot({ path: path.join(SHOTS, "public-root-desktop.png"), fullPage: true, animations: "disabled" });
    results.layout.push(await auditLayout(desktopPage, "public-root-desktop"));
    results.checks.rootLanding = {
      title: await desktopPage.title(),
      ctaText: "Enter PrairieClassroom",
      hero: desktopHero,
    };

    await desktopPage.getByRole("link", { name: "Enter PrairieClassroom" }).click();
    await waitForApp(desktopPage, "today");
    const ctaUrl = new URL(desktopPage.url());
    assert.equal(ctaUrl.searchParams.get("demo"), "true");
    assert.equal(ctaUrl.searchParams.get("tab"), "today");
    assert.equal(ctaUrl.searchParams.get("classroom"), DEMO_CLASSROOM);
    await desktopPage.screenshot({ path: path.join(SHOTS, "public-root-cta-enters-demo.png"), fullPage: true, animations: "disabled" });
    results.checks.rootCta = { url: desktopPage.url() };

    await desktopPage.goto(demoUrl("today"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForApp(desktopPage, "today");
    const staticMarker = await desktopPage.evaluate(() => document.documentElement.dataset.demoApi || null);
    assert.equal(staticMarker, "prairie-static-demo-api");
    await desktopPage.screenshot({ path: path.join(SHOTS, "public-canonical-today-desktop.png"), fullPage: true, animations: "disabled" });
    results.layout.push(await auditLayout(desktopPage, "public-canonical-today-desktop"));
    results.performance.push(await capturePerf(desktopPage, "public-canonical-today"));
    results.checks.staticFirst = { marker: staticMarker };

    await desktopPage.goto(demoUrl("prep", "differentiate"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForApp(desktopPage, "prep");
    await desktopPage.getByRole("tab", { name: "Paste text" }).click();
    await desktopPage.locator("#raw-text").fill("Plants need light, water, air, and space to grow. Roots hold the plant in the soil and stems carry water to the leaves.");
    await desktopPage.locator("#title").fill("Plant Needs Reading Passage");
    await desktopPage.locator("#subject").fill("science");
    await desktopPage.locator("#teacher-goal").fill("Create one scaffolded, one EAL, and one extension path without changing the learning goal.");
    await desktopPage.getByRole("button", { name: "Generate variants" }).click();
    await desktopPage.getByText("Variants generated").waitFor({ timeout: 45_000 });
    await desktopPage.getByText(/static-demo-fallback/i).first().waitFor({ timeout: 10_000 });
    await desktopPage.screenshot({ path: path.join(SHOTS, "public-static-differentiate-generated.png"), fullPage: true, animations: "disabled" });
    results.layout.push(await auditLayout(desktopPage, "public-static-differentiate-generated"));
    results.performance.push(await capturePerf(desktopPage, "public-static-differentiate-generated"));
    results.checks.staticGeneratedLabel = {
      marker: await desktopPage.evaluate(() => document.documentElement.dataset.demoApi || null),
      labelPresent: true,
    };

    await mobilePage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await mobilePage.getByRole("heading", { name: "PrairieClassroom OS" }).waitFor({ timeout: 20_000 });
    const mobileHero = await waitForLandingHero(mobilePage);
    await mobilePage.screenshot({ path: path.join(SHOTS, "public-root-mobile.png"), fullPage: true, animations: "disabled" });
    results.layout.push(await auditLayout(mobilePage, "public-root-mobile"));
    results.checks.rootLandingMobile = {
      hero: mobileHero,
    };

    await mobilePage.goto(demoUrl("today"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForApp(mobilePage, "today");
    await mobilePage.screenshot({ path: path.join(SHOTS, "public-canonical-today-mobile.png"), fullPage: true, animations: "disabled" });
    results.layout.push(await auditLayout(mobilePage, "public-canonical-today-mobile"));

    results.logs = { desktop: desktopLogs, mobile: mobileLogs };
    const layoutFailures = results.layout.filter((entry) => (
      entry.horizontalOverflowPx > 2 || entry.clippedText.length > 0
    ));
    results.layoutFailures = layoutFailures;

    assert.equal(layoutFailures.length, 0, `Public layout findings: ${JSON.stringify(layoutFailures, null, 2)}`);
    assert.deepEqual(desktopLogs.consoleErrors, []);
    assert.deepEqual(desktopLogs.pageErrors, []);
    assert.deepEqual(desktopLogs.requestFailures, []);
    assert.deepEqual(mobileLogs.consoleErrors, []);
    assert.deepEqual(mobileLogs.pageErrors, []);
    assert.deepEqual(mobileLogs.requestFailures, []);

    await writeFile(path.join(RAW, "public-demo-check-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    console.log("PASS public demo browser QA");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    results.logs = { desktop: desktopLogs, mobile: mobileLogs };
    await desktopPage.screenshot({ path: path.join(SHOTS, "public-demo-check-failure.png"), fullPage: true, animations: "disabled" }).catch(() => {});
    await writeFile(path.join(RAW, "public-demo-check-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await desktop.close();
    await mobile.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
