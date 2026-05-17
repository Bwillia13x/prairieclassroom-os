import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PRAIRIE_PUBLIC_DEMO_URL ?? "https://prairieclassroom-os.vercel.app";
const DEMO_CLASSROOM = "demo-okafor-grade34";
const OUT_DIR = path.resolve(process.env.PRAIRIE_QA_OUT_DIR ?? "qa/final-release/2026-05-17-active-goal-workflow-sweep");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");

function demoUrl(tab, tool = null) {
  const params = new URLSearchParams({ demo: "true", tab, classroom: DEMO_CLASSROOM });
  if (tool) params.set("tool", tool);
  return `${BASE_URL}/?${params.toString()}`;
}

function attachLogCapture(page, logs) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") logs.consoleErrors.push(text);
    if (message.type() === "warning") logs.consoleWarnings.push(text);
  });
  page.on("pageerror", (error) => logs.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    logs.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      logs.badResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });
}

async function setupContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });
  return context;
}

async function waitForApp(page, tab) {
  await page.waitForSelector(`#panel-${tab}:not([hidden])`, { timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  const marker = await page.evaluate(() => document.documentElement.dataset.demoApi || null);
  assert.equal(marker, "prairie-static-demo-api", `${tab} should use the static-first public demo API`);
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

async function captureWorkflow(page, results, label) {
  await page.screenshot({ path: path.join(SHOTS, `${label}.png`), fullPage: true, animations: "disabled" });
  results.layout.push(await auditLayout(page, label));
}

async function openDemoTool(page, tab, tool) {
  await page.goto(demoUrl(tab, tool), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, tab);
}

async function runDifferentiate(page, results) {
  await openDemoTool(page, "prep", "differentiate");
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.locator("#raw-text").fill("Plants need light, water, air, and space to grow. Roots hold the plant in soil and stems carry water to leaves.");
  await page.locator("#title").fill("Plant Needs Reading Passage");
  await page.locator("#subject").fill("science");
  await page.locator("#teacher-goal").fill("Create scaffolded, EAL, and extension paths without changing the learning goal.");
  await page.getByRole("button", { name: "Generate variants" }).click();
  await page.getByText("Variants generated").waitFor({ timeout: 45_000 });
  await page.getByText(/static-demo-fallback/i).first().waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-differentiate-generated");
  results.checks.differentiate = "generated static fallback variants";
}

async function runLanguageTools(page, results) {
  await openDemoTool(page, "prep", "language-tools");
  await page.locator("#simplify-source").fill("A habitat gives an animal food, water, shelter, and space. Animals use adaptations to survive in their habitats.");
  await page.getByRole("button", { name: "Simplify" }).click();
  await page.getByText("Text simplified").waitFor({ timeout: 45_000 });
  await page.locator(".simplified-result").waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-language-simplify-result");

  await page.getByRole("tab", { name: "Vocab Cards" }).click();
  await page.locator("#vocab-text").fill("A habitat gives an animal food, water, shelter, and space.");
  await page.locator("#vocab-lang").selectOption("pa");
  await page.getByRole("button", { name: "Generate cards" }).click();
  await page.getByText(/cards generated/i).waitFor({ timeout: 45_000 });
  await page.locator(".vocab-results").waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-language-vocab-result");
  results.checks.languageTools = "simplify and vocab cards generated";
}

async function runTomorrowPlan(page, results) {
  await openDemoTool(page, "tomorrow", "tomorrow-plan");
  await page.locator("#reflection").fill("Brody needed help after lunch, and Amira needed vocabulary support before writing.");
  await page.locator("#plan-goal").fill("Keep transitions smooth and reduce language load during math writing.");
  await page.getByTestId("generate-tomorrow-plan-submit").click();
  await page.getByText("Plan generated").waitFor({ timeout: 45_000 });
  await page.locator(".plan-viewer").waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-tomorrow-plan-generated");
  results.checks.tomorrowPlan = "plan generated";
}

async function runForecast(page, results) {
  await openDemoTool(page, "tomorrow", "complexity-forecast");
  await page.getByLabel("Optional notes for tomorrow").fill("Assembly at 10:00; math follows recess; EA is morning-only.");
  await page.getByRole("button", { name: "Generate forecast" }).click();
  await page.getByText("Forecast generated").waitFor({ timeout: 45_000 });
  await page.locator(".forecast-viewer, .forecast-timeline").first().waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-forecast-generated");
  results.checks.forecast = "forecast generated";
}

async function runEaBriefing(page, results) {
  await openDemoTool(page, "ops", "ea-briefing");
  await page.locator("#ea-name").fill("Ms. Fehr");
  await page.locator("#ea-coordination-notes").fill("EA is available before lunch; prioritize Brody transition and Amira vocabulary preview.");
  await page.getByRole("button", { name: "Generate briefing" }).click();
  await page.getByText("Briefing generated").waitFor({ timeout: 45_000 });
  await page.locator(".ea-briefing-result").waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-ea-briefing-generated");
  results.checks.eaBriefing = "briefing generated";
}

async function runEaLoad(page, results) {
  await openDemoTool(page, "ops", "ea-load");
  await page.locator("#ea-load-notes").fill("EA is morning-only; protect math transition and keep a calm opening routine.");
  await page.getByRole("button", { name: "Generate load profile" }).click();
  await page.getByText("EA load profile generated").waitFor({ timeout: 45_000 });
  await page.locator(".ea-load-viewer").waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-ea-load-generated");
  results.checks.eaLoad = "load profile generated";
}

async function runSupportPatterns(page, results) {
  await openDemoTool(page, "review", "support-patterns");
  await page.getByTestId("detect-patterns-submit").click();
  await page.getByText("Patterns analyzed").waitFor({ timeout: 45_000 });
  await page.locator(".pattern-header").waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-support-patterns-analyzed");
  results.checks.supportPatterns = "patterns analyzed";
}

async function runSurvivalPacket(page, results) {
  await openDemoTool(page, "ops", "survival-packet");
  await page.getByTestId("generate-survival-packet-submit").click();
  await page.locator(".survival-packet .survival-packet-title").waitFor({ timeout: 45_000 });
  await page.getByTestId("print-survival-packet").waitFor({ timeout: 10_000 });
  await page.getByTestId("print-survival-packet").click();
  const printCalls = await page.evaluate(() => window.__printCalls);
  assert.equal(printCalls, 1, "survival packet print button should invoke window.print once");
  await captureWorkflow(page, results, "workflow-survival-packet-generated");
  results.checks.survivalPacket = "packet generated and print invoked";
}

async function runFamilyMessage(page, results) {
  await openDemoTool(page, "review", "family-message");
  await page.locator("#panel-review:not([hidden]) [data-testid^='message-student-chip-']").first().click();
  await page.locator("#msg-type").selectOption("praise");
  await page.locator("#msg-context").fill("Amira used her vocabulary preview card independently before writing and stayed with the task.");
  await page.getByRole("button", { name: "Draft family message" }).click();
  await page.locator(".result-banner__label").filter({ hasText: "Message drafted" }).waitFor({ timeout: 45_000 });
  const approveToCopy = page.getByRole("button", { name: "Approve to copy" });
  await approveToCopy.waitFor({ timeout: 10_000 });
  assert.equal(await approveToCopy.isDisabled(), true, "copy should stay disabled until teacher approval");
  await page.getByRole("button", { name: "Review approval" }).click();
  await page.getByRole("heading", { name: "Review approval" }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Approve & Copy" }).waitFor({ timeout: 10_000 });
  await captureWorkflow(page, results, "workflow-family-message-approval-dialog");
  await page.getByRole("button", { name: "Cancel" }).click();
  results.checks.familyMessage = "drafted with copy disabled until approval dialog";
}

function collectFailures(results, logs) {
  const failures = [];
  const layoutFailures = results.layout.filter((entry) => (
    entry.horizontalOverflowPx > 2 || entry.clippedText.length > 0 || entry.modalOpen
  ));
  if (layoutFailures.length > 0) failures.push({ type: "layout", issues: layoutFailures });
  if (logs.consoleErrors.length > 0) failures.push({ type: "console-errors", issues: logs.consoleErrors });
  if (logs.consoleWarnings.length > 0) failures.push({ type: "console-warnings", issues: logs.consoleWarnings });
  if (logs.pageErrors.length > 0) failures.push({ type: "page-errors", issues: logs.pageErrors });
  if (logs.requestFailures.length > 0) failures.push({ type: "request-failures", issues: logs.requestFailures });
  if (logs.badResponses.length > 0) failures.push({ type: "bad-responses", issues: logs.badResponses });
  return failures;
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], badResponses: [] };
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks: {},
    layout: [],
    logs,
    failures: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await setupContext(browser);
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  attachLogCapture(page, logs);

  try {
    await runDifferentiate(page, results);
    await runLanguageTools(page, results);
    await runTomorrowPlan(page, results);
    await runForecast(page, results);
    await runEaBriefing(page, results);
    await runEaLoad(page, results);
    await runSupportPatterns(page, results);
    await runSurvivalPacket(page, results);
    await runFamilyMessage(page, results);

    results.failures = collectFailures(results, logs);
    await writeFile(path.join(RAW, "public-workflow-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    assert.equal(results.failures.length, 0, `Public workflow failures: ${JSON.stringify(results.failures, null, 2)}`);
    console.log("PASS public workflow sweep");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    results.failures = collectFailures(results, logs);
    await page.screenshot({ path: path.join(SHOTS, "workflow-sweep-failure.png"), fullPage: true, animations: "disabled" }).catch(() => {});
    await writeFile(path.join(RAW, "public-workflow-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
