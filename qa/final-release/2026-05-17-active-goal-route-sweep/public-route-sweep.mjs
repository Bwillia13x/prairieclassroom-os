/* global URLSearchParams */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PRAIRIE_PUBLIC_DEMO_URL ?? "https://prairieclassroom-os.vercel.app";
const DEMO_CLASSROOM = "demo-okafor-grade34";
const OUT_DIR = path.resolve(process.env.PRAIRIE_QA_OUT_DIR ?? "qa/final-release/2026-05-17-active-goal-route-sweep");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 393, height: 852 };

const demoSurfaces = [
  { id: "today", tab: "today", tool: null, heading: /Today/i },
  { id: "classroom", tab: "classroom", tool: null, heading: /Read the room/i },
  { id: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan", heading: /Plan, forecast/i },
  { id: "tomorrow-forecast", tab: "tomorrow", tool: "complexity-forecast", heading: /Plan, forecast/i },
  { id: "week", tab: "week", tool: null, heading: /Shape the week/i },
  { id: "prep-differentiate", tab: "prep", tool: "differentiate", heading: /Prepare the material/i },
  { id: "prep-language-tools", tab: "prep", tool: "language-tools", heading: /Prepare the material/i },
  { id: "ops-log-intervention", tab: "ops", tool: "log-intervention", heading: /Coordinate the adults/i },
  { id: "ops-ea-load", tab: "ops", tool: "ea-load", heading: /Coordinate the adults/i },
  { id: "review-family-message", tab: "review", tool: "family-message", heading: /Turn classroom memory/i },
  { id: "review-support-patterns", tab: "review", tool: "support-patterns", heading: /Turn classroom memory/i },
  { id: "review-usage-insights", tab: "review", tool: "usage-insights", heading: /Turn classroom memory/i },
];

const mobileSurfaces = [
  demoSurfaces.find((surface) => surface.id === "today"),
  demoSurfaces.find((surface) => surface.id === "prep-differentiate"),
  demoSurfaces.find((surface) => surface.id === "review-family-message"),
].filter(Boolean);

function demoUrl(surface) {
  const params = new URLSearchParams({
    demo: "true",
    tab: surface.tab,
    classroom: DEMO_CLASSROOM,
  });
  if (surface.tool) params.set("tool", surface.tool);
  return `${BASE_URL}/?${params.toString()}`;
}

async function setupContext(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
  });
  return context;
}

function attachLogCapture(page, bucket) {
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
  page.on("response", (response) => {
    if (response.status() >= 400) {
      bucket.badResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });
}

async function waitForDemoSurface(page, surface) {
  await page.waitForSelector(`#panel-${surface.tab}:not([hidden])`, { timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
}

async function auditLayout(page, label) {
  return await page.evaluate((auditLabel) => {
    const root = document.documentElement;
    const body = document.body;
    const horizontalOverflowPx = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
    const clippedText = [];
    const selector = [
      "button",
      "a",
      "label",
      "[role='button']",
      "[role='tab']",
      ".btn",
      ".chip",
      ".status-chip",
      ".mobile-nav-group__label",
    ].join(",");
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
          text: visibleText.slice(0, 100),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        });
      }
    }
    const modalOpen = Boolean(document.querySelector(".onboarding-overlay, .role-prompt-overlay, .access-dialog"));
    return { label: auditLabel, horizontalOverflowPx, clippedText, modalOpen };
  }, label);
}

async function captureRoot(page, prefix) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "PrairieClassroom OS" }).waitFor({ timeout: 20_000 });
  await page.getByRole("link", { name: "Enter PrairieClassroom" }).waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, `${prefix}-root.png`), fullPage: true, animations: "disabled" });
  return {
    label: `${prefix}-root`,
    url: page.url(),
    title: await page.title(),
    h1: await page.locator("h1").first().innerText(),
    demoApi: await page.evaluate(() => document.documentElement.dataset.demoApi || null),
    layout: await auditLayout(page, `${prefix}-root`),
  };
}

async function captureDemoSurface(page, surface, prefix) {
  await page.goto(demoUrl(surface), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForDemoSurface(page, surface);
  await page.getByRole("heading", { name: surface.heading }).first().waitFor({ timeout: 20_000 });
  const demoApi = await page.evaluate(() => document.documentElement.dataset.demoApi || null);
  assert.equal(demoApi, "prairie-static-demo-api", `${surface.id} should use static-first public demo API`);
  await page.screenshot({ path: path.join(SHOTS, `${prefix}-${surface.id}.png`), fullPage: true, animations: "disabled" });
  return {
    label: `${prefix}-${surface.id}`,
    url: page.url(),
    title: await page.title(),
    h1: await page.locator("h1").first().innerText(),
    demoApi,
    activeNav: await page.locator(".shell-nav__group--active, .mobile-nav-group--active").first().innerText().catch(() => null),
    layout: await auditLayout(page, `${prefix}-${surface.id}`),
  };
}

async function runSurfaceSet(browser, prefix, viewport, surfaces) {
  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], badResponses: [] };
  const context = await setupContext(browser, viewport);
  const page = await context.newPage();
  attachLogCapture(page, logs);
  const pages = [];
  try {
    pages.push(await captureRoot(page, prefix));
    for (const surface of surfaces) {
      pages.push(await captureDemoSurface(page, surface, prefix));
    }
  } finally {
    await context.close();
  }
  return { prefix, viewport, pages, logs };
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    desktop: null,
    mobile: null,
    failures: [],
  };

  try {
    results.desktop = await runSurfaceSet(browser, "desktop", DESKTOP_VIEWPORT, demoSurfaces);
    results.mobile = await runSurfaceSet(browser, "mobile", MOBILE_VIEWPORT, mobileSurfaces);

    const allPages = [...results.desktop.pages, ...results.mobile.pages];
    const allLogs = [results.desktop.logs, results.mobile.logs];
    const layoutFailures = allPages
      .map((page) => page.layout)
      .filter((layout) => layout.horizontalOverflowPx > 2 || layout.clippedText.length > 0 || layout.modalOpen);
    if (layoutFailures.length > 0) results.failures.push({ type: "layout", issues: layoutFailures });

    for (const [index, logs] of allLogs.entries()) {
      const label = index === 0 ? "desktop" : "mobile";
      if (logs.consoleErrors.length > 0) results.failures.push({ type: `${label}-console-errors`, issues: logs.consoleErrors });
      if (logs.pageErrors.length > 0) results.failures.push({ type: `${label}-page-errors`, issues: logs.pageErrors });
      if (logs.requestFailures.length > 0) results.failures.push({ type: `${label}-request-failures`, issues: logs.requestFailures });
      if (logs.badResponses.length > 0) results.failures.push({ type: `${label}-bad-responses`, issues: logs.badResponses });
    }

    await writeFile(path.join(RAW, "public-route-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    assert.equal(results.failures.length, 0, `Public route sweep failures: ${JSON.stringify(results.failures, null, 2)}`);
    console.log("PASS public route sweep");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    await writeFile(path.join(RAW, "public-route-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
