import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PRAIRIE_ROUTE_SWEEP_OUT
  ? path.resolve(process.env.PRAIRIE_ROUTE_SWEEP_OUT)
  : __dirname;
const BASE = process.env.PRAIRIE_PUBLIC_DEMO_URL ?? "https://prairieclassroom-os.vercel.app";
const DEMO = "demo-okafor-grade34";

const routes = [
  { tab: "today", expect: ["Today", "Start morning triage"] },
  { tab: "classroom", expect: ["CLASSROOM COMMAND", "Active student signals"] },
  { tab: "tomorrow", expect: ["TOMORROW COMMAND", "Tomorrow Plan"] },
  { tab: "week", expect: ["WEEK COMMAND", "coverage"] },
  { tab: "prep", expect: ["Prep", "Differentiate"] },
  { tab: "ops", expect: ["OPS COMMAND", "Log Intervention"] },
  { tab: "review", expect: ["Review", "Family Message"] },
];

const viewports = [
  { name: "se", width: 375, height: 667 },
  { name: "mobile", width: 393, height: 852 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
];

function demoUrl(tab, tool) {
  const params = new URLSearchParams({ demo: "true", tab, classroom: DEMO });
  if (tool) params.set("tool", tool);
  return `${BASE}/?${params.toString()}`;
}

function isExpectedConsoleError(text) {
  return /Failed to load resource: the server responded with a status of (401|403)/.test(text);
}

async function addDemoInit(context) {
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    sessionStorage.setItem("prairie-demo-role-welcomed", "1");
  });
}

async function collectPageEvidence(page, label, screenshotName, expected = []) {
  const text = await page.locator("body").innerText({ timeout: 15_000 });
  const metrics = await page.evaluate(() => {
    const overflowing = [...document.querySelectorAll("body *")]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          className: typeof node.className === "string" ? node.className.slice(0, 120) : "",
          text: (node.textContent ?? "").trim().slice(0, 120),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.width > 0 && (item.left < -2 || item.right > window.innerWidth + 2))
      .slice(0, 10);

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      overflowing,
      demoApi: document.documentElement.dataset.demoApi ?? "",
    };
  });
  await page.screenshot({ path: path.join(OUT, "screenshots", screenshotName), fullPage: false });
  return {
    label,
    url: page.url(),
    title: await page.title(),
    textChecks: Object.fromEntries(expected.map((needle) => [needle, text.includes(needle)])),
    textSample: text.slice(0, 1000),
    metrics,
  };
}

async function runRouteMatrix(browser) {
  const results = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await addDemoInit(context);

    for (const route of routes) {
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];
      const badResponses = [];
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          const text = message.text();
          if (!isExpectedConsoleError(text)) {
            consoleMessages.push({ type: message.type(), text });
          }
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400) {
          badResponses.push({ status: response.status(), url: response.url() });
        }
      });

      await page.goto(demoUrl(route.tab), { waitUntil: "networkidle", timeout: 45_000 });
      await page.waitForSelector(`#panel-${route.tab}:not([hidden])`, { timeout: 20_000 });
      const evidence = await collectPageEvidence(
        page,
        `${viewport.name}:${route.tab}`,
        `${viewport.name}-${route.tab}.png`,
        route.expect,
      );
      results.push({
        ...evidence,
        viewport,
        consoleMessages,
        pageErrors,
        badResponses,
      });
      await page.close();
      await new Promise((resolve) => setTimeout(resolve, 1_250));
    }

    await context.close();
  }

  return results;
}

async function runNegativeChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await addDemoInit(context);
  const results = [];

  const stalePage = await context.newPage();
  await stalePage.goto(`${BASE}/?demo=true&tab=today&classroom=stale-classroom-id`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await stalePage.waitForSelector("#shell-classroom-trigger", { timeout: 20_000 });
  await stalePage.click("#shell-classroom-trigger");
  await stalePage.waitForSelector('[data-testid="shell-classroom-active-id"]', { timeout: 10_000 });
  const staleActiveClassroom = (await stalePage.locator('[data-testid="shell-classroom-active-id"]').innerText()).trim();
  results.push({
    ...(await collectPageEvidence(stalePage, "negative:stale-classroom", "negative-stale-classroom.png", ["Today"])),
    staleActiveClassroom,
    passed: staleActiveClassroom === DEMO,
  });
  await stalePage.close();

  const protectedPage = await context.newPage();
  await protectedPage.goto(`${BASE}/?tab=tomorrow&tool=tomorrow-plan&classroom=alpha-grade4`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await protectedPage.waitForFunction(
    () => /protected|access code|unlock alpha-grade4/i.test(document.body.innerText),
    null,
    { timeout: 30_000 },
  );
  const protectedText = await protectedPage.locator("body").innerText();
  results.push({
    ...(await collectPageEvidence(protectedPage, "negative:protected-classroom", "negative-protected-classroom.png", ["protected", "access code"])),
    hasAccessPrompt: /protected|access code/i.test(protectedText),
    passed: /protected|access code/i.test(protectedText),
  });
  await protectedPage.close();

  await context.close();
  return results;
}

async function runFallbackDifferentiate(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await addDemoInit(context);
  const page = await context.newPage();
  const consoleMessages = [];
  const badResponses = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      const text = message.text();
      if (!isExpectedConsoleError(text)) consoleMessages.push({ type: message.type(), text });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() });
  });

  await page.goto(demoUrl("prep", "differentiate"), { waitUntil: "networkidle", timeout: 45_000 });
  await page.evaluate(() => {
    document.documentElement.dataset.demoApi = "prairie-static-demo-api";
  });
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.fill("#raw-text", "Read a short passage about prairie plants and explain how roots help them survive dry weather.");
  await page.fill("#title", "Prairie Plant Reading");
  await page.fill("#subject", "science literacy");
  await page.fill("#teacher-goal", "Create EAL support, a core version, and an extension task for a split grade 3/4 class.");
  await page.getByRole("button", { name: "Generate variants" }).click();
  await page.waitForSelector(".variant-grid", { timeout: 30_000 });
  const text = await page.locator("#panel-prep:not([hidden])").innerText();
  const evidence = await collectPageEvidence(
    page,
    "workflow:differentiate-static-fallback",
    "workflow-differentiate-static-fallback.png",
    ["static-demo-fallback", "Core", "Extension", "EAL"],
  );
  await context.close();
  return {
    ...evidence,
    hasStaticFallbackLabel: /static-demo-fallback/i.test(text),
    hasVariantOutput: /Core|Extension|EAL/i.test(text),
    consoleMessages,
    pageErrors,
    badResponses,
  };
}

async function main() {
  await mkdir(path.join(OUT, "screenshots"), { recursive: true });
  await mkdir(path.join(OUT, "raw"), { recursive: true });
  const browser = await chromium.launch();
  try {
    const routeMatrix = await runRouteMatrix(browser);
    const negativeChecks = await runNegativeChecks(browser);
    const fallbackDifferentiate = await runFallbackDifferentiate(browser);
    const summary = {
      generatedAt: new Date().toISOString(),
      base: BASE,
      routeMatrix,
      negativeChecks,
      fallbackDifferentiate,
      failures: [
        ...routeMatrix.flatMap((entry) => {
          const missingText = Object.entries(entry.textChecks)
            .filter(([, ok]) => !ok)
            .map(([key]) => key);
          const issues = [];
          if (missingText.length) issues.push(`missing expected text: ${missingText.join(", ")}`);
          if (entry.metrics.horizontalOverflow) issues.push("horizontal overflow");
          if (entry.consoleMessages.length) issues.push(`console messages: ${entry.consoleMessages.length}`);
          if (entry.pageErrors.length) issues.push(`page errors: ${entry.pageErrors.length}`);
          if (entry.badResponses.length) issues.push(`bad responses: ${entry.badResponses.length}`);
          return issues.map((issue) => `${entry.label}: ${issue}`);
        }),
        ...negativeChecks.filter((entry) => !entry.passed).map((entry) => `${entry.label}: failed`),
        ...(!fallbackDifferentiate.hasStaticFallbackLabel ? ["workflow:differentiate-static-fallback: missing static fallback label"] : []),
        ...(!fallbackDifferentiate.hasVariantOutput ? ["workflow:differentiate-static-fallback: missing variant output"] : []),
        ...(fallbackDifferentiate.consoleMessages.length ? ["workflow:differentiate-static-fallback: console messages"] : []),
        ...(fallbackDifferentiate.pageErrors.length ? ["workflow:differentiate-static-fallback: page errors"] : []),
        ...(fallbackDifferentiate.badResponses.length ? ["workflow:differentiate-static-fallback: bad responses"] : []),
      ],
    };
    await writeFile(path.join(OUT, "route-sweep-report.json"), JSON.stringify(summary, null, 2));
    const md = [
      "# Public Route Sweep",
      "",
      `- Base: ${BASE}`,
      `- Generated: ${summary.generatedAt}`,
      `- Viewport route checks: ${routeMatrix.length}`,
      `- Negative checks: ${negativeChecks.length}`,
      `- Failures: ${summary.failures.length}`,
      "",
      "## Failures",
      "",
      ...(summary.failures.length ? summary.failures.map((failure) => `- ${failure}`) : ["- None"]),
      "",
      "## Screenshots",
      "",
      ...routeMatrix.map((entry) => `- ${entry.label}: screenshots/${entry.viewport.name}-${entry.label.split(":")[1]}.png`),
      "- negative:stale-classroom: screenshots/negative-stale-classroom.png",
      "- negative:protected-classroom: screenshots/negative-protected-classroom.png",
      "- workflow:differentiate-static-fallback: screenshots/workflow-differentiate-static-fallback.png",
      "",
    ].join("\n");
    await writeFile(path.join(OUT, "route-sweep-report.md"), md);
    console.log(JSON.stringify({ failures: summary.failures, routeChecks: routeMatrix.length }, null, 2));
    process.exitCode = summary.failures.length ? 1 : 0;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
