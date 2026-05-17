/* global URL, fetch */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const API_BASE = process.env.PRAIRIE_API_BASE ?? "http://localhost:3100/api";
const DEMO_CLASSROOM = "demo-okafor-grade34";
const OUT_DIR = path.resolve("qa/final-release/2026-05-17-continued-bug-sweep");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");

const surfaces = [
  { id: "today", tab: "today" },
  { id: "classroom", tab: "classroom" },
  { id: "prep-differentiate", tab: "prep", tool: "differentiate" },
  { id: "prep-language-tools", tab: "prep", tool: "language-tools" },
  { id: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan" },
  { id: "tomorrow-forecast", tab: "tomorrow", tool: "complexity-forecast" },
  { id: "week", tab: "week" },
  { id: "ops-log-intervention", tab: "ops", tool: "log-intervention" },
  { id: "ops-ea-briefing", tab: "ops", tool: "ea-briefing" },
  { id: "review-family-message", tab: "review", tool: "family-message" },
  { id: "review-support-patterns", tab: "review", tool: "support-patterns" },
  { id: "review-usage-insights", tab: "review", tool: "usage-insights" },
];

function demoUrl(tab = "today", tool = null, classroom = DEMO_CLASSROOM) {
  const params = new URLSearchParams({ demo: "true", tab, classroom });
  if (tool) params.set("tool", tool);
  return `${BASE_URL}/?${params.toString()}`;
}

function isExpectedConsole(text) {
  return /Failed to load resource: the server responded with a status of (401|403)/.test(text);
}

async function newDemoContext(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
  });
  return context;
}

function attachLogCapture(page, bucket) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !isExpectedConsole(text)) bucket.consoleErrors.push(text);
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
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

async function gotoDemo(page, tab, tool = null) {
  await page.goto(demoUrl(tab, tool), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, tab);
}

async function auditLayout(page, label) {
  return page.evaluate((auditLabel) => {
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
      ".recent-runs__chip",
    ].join(",");

    for (const element of document.querySelectorAll(selector)) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") continue;
      const text = (element.textContent || element.getAttribute("aria-label") || "").trim();
      if (!text) continue;
      const clipsWidth = element.scrollWidth - element.clientWidth > 3;
      const clipsHeight = element.scrollHeight - element.clientHeight > 3;
      if ((clipsWidth || clipsHeight) && style.overflow !== "visible") {
        clippedText.push({
          label: auditLabel,
          tag: element.tagName.toLowerCase(),
          text: text.slice(0, 100),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          overflow: style.overflow,
          whiteSpace: style.whiteSpace,
        });
      }
    }

    return { label: auditLabel, horizontalOverflowPx, clippedText };
  }, label);
}

async function captureSurface(page, spec, viewportName, results) {
  await gotoDemo(page, spec.tab, spec.tool ?? null);
  const filename = `${viewportName}-${spec.id}.png`;
  await page.screenshot({ path: path.join(SHOTS, filename), fullPage: true, animations: "disabled" });
  results.layout.push(await auditLayout(page, `${viewportName}-${spec.id}`));
}

async function checkLanding(page, results) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "PrairieClassroom OS" }).waitFor({ timeout: 15_000 });
  await page.getByRole("link", { name: "Enter PrairieClassroom" }).click();
  await waitForApp(page, "today");
  const url = new URL(page.url());
  assert.equal(url.searchParams.get("demo"), "true", "Landing CTA should enter demo mode");
  assert.equal(url.searchParams.get("tab"), "today", "Landing CTA should enter Today");
  assert.equal(url.searchParams.get("classroom"), DEMO_CLASSROOM, "Landing CTA should target canonical demo classroom");
  await page.screenshot({ path: path.join(SHOTS, "local-landing-cta.png"), fullPage: true, animations: "disabled" });
  results.interactions.landing = { url: page.url() };
}

async function checkCommandPalette(page, results) {
  await gotoDemo(page, "today");
  await page.keyboard.press("Control+K");
  await page.getByRole("dialog", { name: "Command palette" }).waitFor({ timeout: 10_000 });
  await page.getByRole("combobox", { name: "Search commands, classrooms, and actions" }).fill("Support");
  await page.screenshot({ path: path.join(SHOTS, "local-command-palette-support.png"), fullPage: false, animations: "disabled" });
  await page.locator("#cp-opt-tool\\:support-patterns").click();
  await waitForApp(page, "review");
  assert.equal(new URL(page.url()).searchParams.get("tool"), "support-patterns");
  results.interactions.commandPalette = { url: page.url() };
}

async function checkFocusVisible(page, results) {
  await gotoDemo(page, "today");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 100),
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    };
  });
  assert.ok(focus, "Expected focus after tabbing");
  assert.ok(
    focus.outlineStyle !== "none" || focus.outlineWidth !== "0px" || focus.boxShadow !== "none",
    `Expected visible focus treatment, got ${JSON.stringify(focus)}`,
  );
  await page.screenshot({ path: path.join(SHOTS, "local-focus-visible.png"), fullPage: false, animations: "disabled" });
  results.interactions.focus = focus;
}

async function checkDifferentiate(page, results) {
  await gotoDemo(page, "prep", "differentiate");
  await page.getByRole("tab", { name: /Paste text/i }).click();
  await page.getByLabel(/Artifact title/i).fill("Fractions Review QA Passage");
  await page.getByLabel(/^Subject$/i).fill("Math");
  await page.locator("#raw-text").fill("Fractions show equal parts of a whole. Compare 1/3 and 1/4, then explain which is larger using a drawing.");
  await page.getByLabel(/Outcome focus|Instructional Focus/i).fill("Check EAL supports, core scaffolds, and extension prompts.");
  await page.getByRole("button", { name: /Generate variants/i }).click();
  await page.getByText(/variants generated/i).first().waitFor({ timeout: 45_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-differentiate-output.png"), fullPage: true, animations: "disabled" });
  results.interactions.differentiate = "passed";
}

async function checkLanguageTools(page, results) {
  await gotoDemo(page, "prep", "language-tools");
  await page.getByLabel("Source text").fill("Plants need light, water, air, and space to grow. Roots hold the plant in the soil.");
  await page.getByRole("button", { name: "Simplify" }).click();
  await page.getByText("Text simplified").waitFor({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Vocab Cards" }).click();
  await page.getByLabel("Lesson text").fill("A habitat gives an animal food, water, shelter, and space.");
  await page.getByLabel("Target language").selectOption("pa");
  await page.getByRole("button", { name: "Generate cards" }).click();
  await page.getByText(/cards generated/i).waitFor({ timeout: 30_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-language-tools-output.png"), fullPage: true, animations: "disabled" });
  results.interactions.languageTools = "passed";
}

async function checkTomorrowPlan(page, results) {
  await gotoDemo(page, "tomorrow", "tomorrow-plan");
  await page.getByLabel(/Today's reflection/i).fill("Brody transitioned independently with the timer. Elena solved one fraction comparison with manipulatives.");
  await page.getByLabel(/Tomorrow's intention|Goal for Tomorrow/i).fill("Keep the math block calm after lunch and protect EA time in the morning.");
  await page.getByTestId("generate-tomorrow-plan-submit").click();
  await page.getByText(/Plan generated/i).first().waitFor({ timeout: 45_000 });
  await page.locator(".plan-viewer").first().waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-tomorrow-plan-output.png"), fullPage: true, animations: "disabled" });
  results.interactions.tomorrowPlan = "passed";
}

async function checkForecast(page, results) {
  await gotoDemo(page, "tomorrow", "complexity-forecast");
  await page.getByLabel("Optional notes for tomorrow").fill("Assembly at 10:00, math follows recess, and EA support is morning-only.");
  await page.getByRole("button", { name: /Generate forecast/i }).click();
  await page.getByText(/Forecast generated/i).first().waitFor({ timeout: 45_000 });
  await page.locator(".forecast-viewer, .forecast-timeline").first().waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-forecast-output.png"), fullPage: true, animations: "disabled" });
  results.interactions.forecast = "passed";
}

async function checkOps(page, results) {
  await gotoDemo(page, "ops", "log-intervention");
  await page.getByRole("group", { name: /Select students/i }).getByLabel(/^Brody$/).check();
  await page.getByLabel(/Evidence note/i).fill("Brody used the timer independently during math centers and moved to the next station without adult prompting.");
  await page.getByLabel(/Follow-up timing/i).selectOption("Tomorrow morning");
  await page.getByLabel(/Classroom memory destination/i).selectOption("Classroom + student thread");
  await page.locator(".intervention-memory-preview").getByText(/Brody/i).first().waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-log-intervention-preview.png"), fullPage: true, animations: "disabled" });

  await gotoDemo(page, "ops", "ea-briefing");
  await page.getByLabel("EA name (optional)").fill("Ms. Fehr");
  await page.getByLabel("Coordination notes for today (optional)").fill("Morning support only; prioritize Brody transitions and Amira vocabulary preview.");
  await page.getByRole("button", { name: "Generate briefing" }).click();
  await page.getByText("Briefing generated").waitFor({ timeout: 45_000 });
  await page.locator(".ea-briefing-result").waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-ea-briefing-output.png"), fullPage: true, animations: "disabled" });
  results.interactions.ops = "passed";
}

async function checkReview(page, results) {
  await gotoDemo(page, "review", "family-message");
  const amiraChip = page.getByTestId("message-student-chip-Amira");
  await amiraChip.waitFor({ state: "visible", timeout: 20_000 });
  if ((await amiraChip.getAttribute("aria-pressed")) !== "true") await amiraChip.click();
  await page.getByLabel(/Message type/i).selectOption("praise");
  await page.getByLabel(/Language/i).selectOption("pa");
  await page.locator("#msg-context").fill("Amira used new fraction vocabulary during partner math and asked for a sentence frame when she needed one.");
  await page.getByRole("button", { name: /Draft family message/i }).click();
  await page.getByRole("button", { name: /Review approval/i }).waitFor({ state: "visible", timeout: 45_000 });
  await page.getByRole("button", { name: /Review approval/i }).click();
  await page.getByRole("dialog", { name: /Review approval/i }).waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-family-message-approval.png"), fullPage: true, animations: "disabled" });
  await page.keyboard.press("Escape");

  await gotoDemo(page, "review", "support-patterns");
  await page.getByTestId("detect-patterns-submit").click();
  await page.waitForSelector(".pattern-header", { timeout: 45_000 });
  const patternText = await page.locator("#panel-review:not([hidden]) .workspace-result").innerText();
  assert.equal(/\b(Ari|Mika|Jae)\b/.test(patternText), false, "Support Patterns leaked protected alpha aliases");
  await page.screenshot({ path: path.join(SHOTS, "local-support-patterns-output.png"), fullPage: true, animations: "disabled" });

  await gotoDemo(page, "review", "usage-insights");
  await page.getByTestId("usage-summary-row").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-usage-insights-output.png"), fullPage: true, animations: "disabled" });
  results.interactions.review = "passed";
}

async function checkDeepLinksAndRecovery(page, results) {
  const legacyCases = [
    { legacy: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan" },
    { legacy: "log-intervention", tab: "ops", tool: "log-intervention" },
    { legacy: "differentiate", tab: "prep", tool: "differentiate" },
  ];
  results.interactions.deepLinks = [];
  for (const item of legacyCases) {
    await page.goto(`${BASE_URL}/?demo=true&tab=${item.legacy}&classroom=${DEMO_CLASSROOM}`, { waitUntil: "domcontentloaded" });
    await waitForApp(page, item.tab);
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("tab"), item.tab);
    assert.equal(url.searchParams.get("tool"), item.tool);
    results.interactions.deepLinks.push({ legacy: item.legacy, url: page.url() });
  }

  await page.goto(`${BASE_URL}/?demo=true&tab=today&classroom=stale-demo-classroom`, { waitUntil: "domcontentloaded" });
  await waitForApp(page, "today");
  await page.click("#shell-classroom-trigger");
  const active = (await page.getByTestId("shell-classroom-active-id").innerText()).trim();
  assert.equal(active, DEMO_CLASSROOM, "Invalid demo classroom should recover to canonical demo classroom");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: path.join(SHOTS, "local-invalid-classroom-recovery.png"), fullPage: false, animations: "disabled" });
  results.interactions.invalidClassroomRecovery = { active };
}

async function checkProtectedNegative(browser, results) {
  const classrooms = await fetch(`${API_BASE}/classrooms`).then((res) => res.json());
  const protectedClassroom = Array.isArray(classrooms)
    ? classrooms.find((entry) => entry?.requires_access_code === true)
    : null;
  if (!protectedClassroom) {
    results.interactions.protectedNegative = {
      skipped: true,
      reason: "No protected classroom is exposed by the current local data directory.",
    };
    return;
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };
  attachLogCapture(page, logs);

  await page.goto(`${BASE_URL}/?classroom=${protectedClassroom.classroom_id}&tab=today`, { waitUntil: "domcontentloaded" });
  await page.getByText(/protected.*access code|needs an access code|Authentication required/i).waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-protected-code-prompt.png"), fullPage: false, animations: "disabled" });
  await page.fill("#classroom-access-code", "wrong-code");
  await page.getByTestId("classroom-access-save").click();
  await page.getByText(/Invalid classroom code|access code.*did/i).waitFor({ timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS, "local-protected-invalid-code.png"), fullPage: false, animations: "disabled" });
  await context.close();

  assert.deepEqual(logs.pageErrors, []);
  assert.deepEqual(logs.consoleErrors, []);
  results.interactions.protectedNegative = { classroom_id: protectedClassroom.classroom_id, prompt: "shown", invalidCode: "rejected" };
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBase: API_BASE,
    layout: [],
    interactions: {},
    logs: {},
  };

  const desktopLogs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };
  const mobileLogs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };
  const tabletLogs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };

  const desktop = await newDemoContext(browser, { width: 1440, height: 950 });
  const mobile = await newDemoContext(browser, { width: 393, height: 852 }, { isMobile: true });
  const tablet = await newDemoContext(browser, { width: 768, height: 1024 });
  const desktopPage = await desktop.newPage();
  const mobilePage = await mobile.newPage();
  const tabletPage = await tablet.newPage();
  attachLogCapture(desktopPage, desktopLogs);
  attachLogCapture(mobilePage, mobileLogs);
  attachLogCapture(tabletPage, tabletLogs);

  try {
    await checkLanding(desktopPage, results);

    for (const spec of surfaces) await captureSurface(desktopPage, spec, "desktop", results);
    for (const spec of surfaces) await captureSurface(mobilePage, spec, "mobile", results);
    for (const spec of surfaces) await captureSurface(tabletPage, spec, "tablet", results);

    await checkCommandPalette(desktopPage, results);
    await checkFocusVisible(desktopPage, results);
    await checkDifferentiate(desktopPage, results);
    await checkLanguageTools(desktopPage, results);
    await checkTomorrowPlan(desktopPage, results);
    await checkForecast(desktopPage, results);
    await checkOps(desktopPage, results);
    await checkReview(desktopPage, results);
    await checkDeepLinksAndRecovery(desktopPage, results);
    await checkProtectedNegative(browser, results);

    results.logs = { desktop: desktopLogs, mobile: mobileLogs, tablet: tabletLogs };
    const layoutFailures = results.layout.filter((entry) => entry.horizontalOverflowPx > 2 || entry.clippedText.length > 0);
    results.layoutFailures = layoutFailures;
    assert.equal(layoutFailures.length, 0, `Layout failures: ${JSON.stringify(layoutFailures, null, 2)}`);
    assert.deepEqual(desktopLogs.consoleErrors, []);
    assert.deepEqual(desktopLogs.pageErrors, []);
    assert.deepEqual(mobileLogs.consoleErrors, []);
    assert.deepEqual(mobileLogs.pageErrors, []);
    assert.deepEqual(tabletLogs.consoleErrors, []);
    assert.deepEqual(tabletLogs.pageErrors, []);

    await writeFile(path.join(RAW, "continued-local-bug-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    console.log("PASS continued local browser bug sweep");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    results.logs = { desktop: desktopLogs, mobile: mobileLogs, tablet: tabletLogs };
    await desktopPage.screenshot({ path: path.join(SHOTS, "continued-local-bug-sweep-failure.png"), fullPage: true, animations: "disabled" }).catch(() => {});
    await writeFile(path.join(RAW, "continued-local-bug-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await desktop.close();
    await mobile.close();
    await tablet.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
