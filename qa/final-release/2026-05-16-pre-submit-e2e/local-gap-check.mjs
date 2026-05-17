/* global URL, fetch */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:5173";
const DEMO_CLASSROOM = "demo-okafor-grade34";
const OUT_DIR = path.resolve("qa/final-release/2026-05-16-pre-submit-e2e");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");

const surfaces = [
  { id: "today", tab: "today", tool: null, heading: "Today" },
  { id: "classroom", tab: "classroom", tool: null, heading: "Classroom" },
  { id: "prep-differentiate", tab: "prep", tool: "differentiate", heading: "Differentiate" },
  { id: "prep-language-tools", tab: "prep", tool: "language-tools", heading: "Language Support Tools" },
  { id: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan", heading: "Tomorrow Plan" },
  { id: "tomorrow-forecast", tab: "tomorrow", tool: "complexity-forecast", heading: "Forecast" },
  { id: "week", tab: "week", tool: null, heading: "Week" },
  { id: "ops-log-intervention", tab: "ops", tool: "log-intervention", heading: "Log Intervention" },
  { id: "ops-ea-briefing", tab: "ops", tool: "ea-briefing", heading: "EA Briefing" },
  { id: "review-family-message", tab: "review", tool: "family-message", heading: "Family Message" },
  { id: "review-support-patterns", tab: "review", tool: "support-patterns", heading: "Support Patterns" },
  { id: "review-usage-insights", tab: "review", tool: "usage-insights", heading: "Usage Insights" },
];

function demoUrl(tab = "today", tool = null, classroom = DEMO_CLASSROOM) {
  const params = new URLSearchParams({ demo: "true", tab, classroom });
  if (tool) params.set("tool", tool);
  return `${BASE_URL}/?${params.toString()}`;
}

function isExpectedConsole(text) {
  return /Failed to load resource: the server responded with a status of (401|403)/.test(text);
}

async function newContext(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
  });
  return context;
}

async function attachLogCapture(page, bucket) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!isExpectedConsole(text)) bucket.consoleErrors.push(text);
    }
  });
  page.on("pageerror", (error) => bucket.pageErrors.push(error.message));
}

async function waitForApp(page, tab) {
  await page.waitForSelector(`#panel-${tab}:not([hidden])`, { timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
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

async function captureSurface(page, spec, prefix) {
  await page.goto(demoUrl(spec.tab, spec.tool), { waitUntil: "domcontentloaded" });
  await waitForApp(page, spec.tab);
  await page.screenshot({ path: path.join(SHOTS, `${prefix}-${spec.id}.png`), fullPage: true, animations: "disabled" });
  return await auditLayout(page, `${prefix}-${spec.id}`);
}

async function checkFocusVisible(page, results) {
  await page.goto(demoUrl("today"), { waitUntil: "domcontentloaded" });
  await waitForApp(page, "today");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 80),
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
  assert.ok(focus, "Expected a focused element after tabbing");
  assert.ok(
    focus.outlineStyle !== "none" || focus.outlineWidth !== "0px" || focus.boxShadow !== "none",
    `Expected visible focus treatment, got ${JSON.stringify(focus)}`,
  );
  await page.screenshot({ path: path.join(SHOTS, "local-keyboard-focus-visible.png"), fullPage: false, animations: "disabled" });
  results.focus = focus;
}

async function checkCommandPalette(page, results) {
  await page.goto(demoUrl("today"), { waitUntil: "domcontentloaded" });
  await waitForApp(page, "today");
  await page.keyboard.press("Control+K");
  await page.getByRole("dialog", { name: "Command palette" }).waitFor({ timeout: 10_000 });
  await page.getByRole("combobox", { name: "Search commands, classrooms, and actions" }).fill("Language");
  await page.screenshot({ path: path.join(SHOTS, "local-command-palette-language.png"), fullPage: false, animations: "disabled" });
  await page.locator("#cp-opt-tool\\:language-tools").click();
  await waitForApp(page, "prep");
  assert.ok(new URL(page.url()).searchParams.get("tool") === "language-tools", "Command palette should navigate to Language Tools");
  results.commandPalette = { url: page.url() };
}

async function checkLanguageTools(page, results) {
  await page.goto(demoUrl("prep", "language-tools"), { waitUntil: "domcontentloaded" });
  await waitForApp(page, "prep");
  await page.getByLabel("Source text").fill("Plants need light, water, air, and space to grow. Roots hold the plant in the soil.");
  await page.getByRole("button", { name: "Simplify" }).click();
  await page.getByText("Text simplified").waitFor({ timeout: 30_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-language-tools-simplify-result.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("tab", { name: "Vocab Cards" }).click();
  await page.getByLabel("Lesson text").fill("A habitat gives an animal food, water, shelter, and space.");
  await page.getByLabel("Target language").selectOption("pa");
  await page.getByRole("button", { name: "Generate cards" }).click();
  await page.getByText(/cards generated/i).waitFor({ timeout: 30_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-language-tools-vocab-result.png"), fullPage: true, animations: "disabled" });
  results.languageTools = { simplify: "passed", vocab: "passed" };
}

async function checkForecast(page, results) {
  await page.goto(demoUrl("tomorrow", "complexity-forecast"), { waitUntil: "domcontentloaded" });
  await waitForApp(page, "tomorrow");
  await page.getByLabel("Optional notes for tomorrow").fill("Assembly at 10:00; math follows recess; EA is morning-only.");
  await page.getByRole("button", { name: "Generate forecast" }).click();
  await page.locator(".forecast-viewer, .forecast-timeline").first().waitFor({ timeout: 45_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-tomorrow-forecast-result.png"), fullPage: true, animations: "disabled" });
  results.forecast = "passed";
}

async function checkEaBriefing(page, results) {
  await page.goto(demoUrl("ops", "ea-briefing"), { waitUntil: "domcontentloaded" });
  await waitForApp(page, "ops");
  await page.getByLabel("EA name (optional)").fill("Ms. Fehr");
  await page.getByLabel("Coordination notes for today (optional)").fill("EA is available before lunch; prioritize Brody's transition and Amira's vocabulary preview.");
  await page.getByRole("button", { name: "Generate briefing" }).click();
  await page.getByText("Briefing generated").waitFor({ timeout: 45_000 });
  await page.locator(".ea-briefing-result").waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-ea-briefing-result.png"), fullPage: true, animations: "disabled" });
  results.eaBriefing = "passed";
}

async function checkUsageInsights(page, results) {
  await page.goto(demoUrl("review", "usage-insights"), { waitUntil: "domcontentloaded" });
  await waitForApp(page, "review");
  await page.getByTestId("usage-summary-row").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-usage-insights.png"), fullPage: true, animations: "disabled" });
  results.usageInsights = "passed";
}

async function checkDeepLinks(page, results) {
  const cases = [
    { legacy: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan" },
    { legacy: "log-intervention", tab: "ops", tool: "log-intervention" },
    { legacy: "differentiate", tab: "prep", tool: "differentiate" },
  ];
  results.deepLinks = [];
  for (const item of cases) {
    await page.goto(`${BASE_URL}/?demo=true&tab=${item.legacy}&classroom=${DEMO_CLASSROOM}`, { waitUntil: "domcontentloaded" });
    await waitForApp(page, item.tab);
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("tab"), item.tab, `${item.legacy} should migrate tab`);
    assert.equal(url.searchParams.get("tool"), item.tool, `${item.legacy} should migrate tool`);
    results.deepLinks.push({ legacy: item.legacy, url: page.url() });
  }
}

async function checkInvalidClassroomRecovery(page, results) {
  await page.goto(`${BASE_URL}/?demo=true&tab=today&classroom=stale-demo-classroom`, { waitUntil: "domcontentloaded" });
  await waitForApp(page, "today");
  await page.click("#shell-classroom-trigger");
  const active = (await page.getByTestId("shell-classroom-active-id").innerText()).trim();
  assert.equal(active, DEMO_CLASSROOM);
  await page.screenshot({ path: path.join(SHOTS, "local-stale-demo-classroom-recovered.png"), fullPage: false, animations: "disabled" });
  await page.keyboard.press("Escape");
  results.invalidClassroomRecovery = { active };
}

async function checkProtectedNegative(browser, results) {
  const classroomList = await fetch("http://localhost:3100/api/classrooms").then((res) => res.json());
  const protectedClassroom = Array.isArray(classroomList)
    ? classroomList.find((entry) => entry?.requires_access_code === true)
    : null;
  if (!protectedClassroom) {
    results.protectedNegative = {
      skipped: true,
      reason: "Default local fixture has no protected classroom; all bundled classrooms report requires_access_code=false.",
    };
    return;
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const logs = { consoleErrors: [], pageErrors: [] };
  await attachLogCapture(page, logs);
  await page.goto(`${BASE_URL}/?classroom=${protectedClassroom.classroom_id}&tab=today`, { waitUntil: "domcontentloaded" });
  await page.getByText(/protected.*access code|needs an access code|Authentication required/i).waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-protected-classroom-code-prompt.png"), fullPage: false, animations: "disabled" });
  await page.fill("#classroom-access-code", "wrong-code");
  await page.getByTestId("classroom-access-save").click();
  await page.getByText(/Invalid classroom code|access code.*did/i).waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-protected-classroom-invalid-code.png"), fullPage: false, animations: "disabled" });
  results.protectedNegative = { prompt: "shown", invalidCode: "rejected", consoleErrors: logs.consoleErrors, pageErrors: logs.pageErrors };
  await context.close();
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const browser = await chromium.launch();
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    desktopLayout: [],
    mobileLayout: [],
  };

  const desktopContext = await newContext(browser, { width: 1440, height: 950 });
  const desktopPage = await desktopContext.newPage();
  const desktopLogs = { consoleErrors: [], pageErrors: [] };
  await attachLogCapture(desktopPage, desktopLogs);

  const mobileContext = await newContext(browser, { width: 393, height: 852 });
  const mobilePage = await mobileContext.newPage();
  const mobileLogs = { consoleErrors: [], pageErrors: [] };
  await attachLogCapture(mobilePage, mobileLogs);

  try {
    await desktopPage.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await desktopPage.getByRole("heading", { name: "PrairieClassroom OS" }).waitFor({ timeout: 10_000 });
    await desktopPage.screenshot({ path: path.join(SHOTS, "local-root-landing-desktop.png"), fullPage: true, animations: "disabled" });
    await desktopPage.getByRole("link", { name: "Enter PrairieClassroom" }).click();
    await waitForApp(desktopPage, "today");
    await desktopPage.screenshot({ path: path.join(SHOTS, "local-root-cta-enters-demo.png"), fullPage: true, animations: "disabled" });
    results.landing = { ctaUrl: desktopPage.url() };

    for (const spec of surfaces) {
      results.desktopLayout.push(await captureSurface(desktopPage, spec, "local-desktop"));
    }
    for (const spec of surfaces) {
      results.mobileLayout.push(await captureSurface(mobilePage, spec, "local-mobile"));
    }

    await checkCommandPalette(desktopPage, results);
    await checkFocusVisible(desktopPage, results);
    await checkLanguageTools(desktopPage, results);
    await checkForecast(desktopPage, results);
    await checkEaBriefing(desktopPage, results);
    await checkUsageInsights(desktopPage, results);
    await checkDeepLinks(desktopPage, results);
    await checkInvalidClassroomRecovery(desktopPage, results);
    await checkProtectedNegative(browser, results);

    results.console = {
      desktopErrors: desktopLogs.consoleErrors,
      desktopPageErrors: desktopLogs.pageErrors,
      mobileErrors: mobileLogs.consoleErrors,
      mobilePageErrors: mobileLogs.pageErrors,
    };

    const layoutFailures = [...results.desktopLayout, ...results.mobileLayout].filter((entry) => (
      entry.horizontalOverflowPx > 2 || entry.clippedText.length > 0
    ));
    results.layoutFailures = layoutFailures;

    assert.equal(layoutFailures.length, 0, `Layout overflow/clipped text findings: ${JSON.stringify(layoutFailures, null, 2)}`);
    assert.deepEqual(desktopLogs.consoleErrors, []);
    assert.deepEqual(desktopLogs.pageErrors, []);
    assert.deepEqual(mobileLogs.consoleErrors, []);
    assert.deepEqual(mobileLogs.pageErrors, []);

    await writeFile(path.join(RAW, "local-gap-check-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    console.log("PASS local gap browser QA");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    results.console = {
      desktopErrors: desktopLogs.consoleErrors,
      desktopPageErrors: desktopLogs.pageErrors,
      mobileErrors: mobileLogs.consoleErrors,
      mobilePageErrors: mobileLogs.pageErrors,
    };
    await desktopPage.screenshot({ path: path.join(SHOTS, "local-gap-check-failure.png"), fullPage: true, animations: "disabled" }).catch(() => {});
    await writeFile(path.join(RAW, "local-gap-check-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await desktopContext.close();
    await mobileContext.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
