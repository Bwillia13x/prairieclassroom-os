/* global location, URL */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PRAIRIE_PUBLIC_DEMO_URL ?? "https://prairieclassroom-os.vercel.app";
const OUT_DIR = path.resolve(process.env.PRAIRIE_QA_OUT_DIR ?? "qa/final-release/2026-05-17-last-runtime-sweep/viewport-command-sweep");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");
const DEMO_CLASSROOM = "demo-okafor-grade34";

const viewports = [
  { id: "mobile", width: 393, height: 852, isMobile: true },
  { id: "tablet", width: 768, height: 1024, isMobile: false },
  { id: "desktop", width: 1440, height: 900, isMobile: false },
  { id: "wide", width: 1920, height: 1080, isMobile: false },
];

const routes = [
  { id: "root", path: "/", root: true },
  { id: "today", tab: "today" },
  { id: "classroom", tab: "classroom" },
  { id: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan" },
  { id: "week", tab: "week" },
  { id: "prep-differentiate", tab: "prep", tool: "differentiate" },
  { id: "prep-language-tools", tab: "prep", tool: "language-tools" },
  { id: "ops-log-intervention", tab: "ops", tool: "log-intervention" },
  { id: "ops-ea-load", tab: "ops", tool: "ea-load" },
  { id: "ops-ea-briefing", tab: "ops", tool: "ea-briefing" },
  { id: "review-family-message", tab: "review", tool: "family-message" },
  { id: "review-support-patterns", tab: "review", tool: "support-patterns" },
];

function demoUrl(route) {
  if (route.root) return `${BASE_URL}/`;
  const params = new URLSearchParams({ demo: "true", tab: route.tab, classroom: DEMO_CLASSROOM });
  if (route.tool) params.set("tool", route.tool);
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

async function setupContext(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
  });
  return context;
}

async function auditLayout(page) {
  return page.evaluate(() => {
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
          tag: element.tagName.toLowerCase(),
          text: text.slice(0, 100),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        });
      }
    }

    const modalOpen = Boolean(document.querySelector(".onboarding-overlay, .role-prompt-overlay, .access-dialog"));
    const brokenImages = [...document.images]
      .filter((img) => {
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || "" }));

    return { horizontalOverflowPx, clippedText, modalOpen, brokenImages };
  });
}

async function auditFocus(page) {
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 100),
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
      visible: rect.width > 0 && rect.height > 0,
      focusVisible: style.outlineStyle !== "none" || style.outlineWidth !== "0px" || style.boxShadow !== "none" || element.matches(":focus-visible"),
    };
  });
}

async function waitForRoute(page, route) {
  if (route.root) {
    await page.getByRole("heading", { name: "PrairieClassroom OS" }).waitFor({ timeout: 20_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForFunction(() => {
      const visibleImages = [...document.images].filter((img) => {
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
      return visibleImages.every((img) => img.complete && img.naturalWidth > 0);
    }, { timeout: 15_000 }).catch(() => {});
    return;
  }
  await page.waitForSelector(".app-main", { timeout: 45_000 });
  await page.waitForSelector(`#panel-${route.tab}:not([hidden])`, { timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

async function auditRoute(browser, viewport, route) {
  const context = await setupContext(browser, viewport);
  const page = await context.newPage();
  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], badResponses: [] };
  attachLogCapture(page, logs);

  try {
    await page.goto(demoUrl(route), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForRoute(page, route);
    const screenshot = `${viewport.id}-${route.id}.png`;
    await page.screenshot({ path: path.join(SHOTS, screenshot), fullPage: true, animations: "disabled" });

    const layout = await auditLayout(page);
    const focus = route.root ? null : await auditFocus(page);
    const state = await page.evaluate(() => ({
      url: location.href,
      demoApi: document.documentElement.dataset.demoApi || null,
      activeNav: document.querySelector(".shell-nav__group--active, .mobile-nav-group--active")?.textContent?.trim() || null,
      title: document.title,
    }));

    if (!route.root) {
      const url = new URL(page.url());
      assert.equal(state.demoApi, "prairie-static-demo-api", `${route.id} should use static-first public demo API`);
      assert.equal(url.searchParams.get("tab"), route.tab, `${route.id} should preserve URL-backed tab state`);
      assert.equal(url.searchParams.get("classroom"), DEMO_CLASSROOM, `${route.id} should preserve classroom URL state`);
      if (route.tool) assert.equal(url.searchParams.get("tool"), route.tool, `${route.id} should preserve URL-backed tool state`);
      assert.ok(state.activeNav, `${route.id} should expose an active nav state`);
      assert.ok(focus?.visible && focus?.focusVisible, `${route.id} should show visible keyboard focus`);
    }
    assert.ok(layout.horizontalOverflowPx <= 2, `${viewport.id}-${route.id} has horizontal overflow ${layout.horizontalOverflowPx}px`);
    assert.deepEqual(layout.clippedText, [], `${viewport.id}-${route.id} has clipped control text`);
    assert.equal(layout.modalOpen, false, `${viewport.id}-${route.id} has a blocking modal`);
    assert.deepEqual(layout.brokenImages, [], `${viewport.id}-${route.id} has broken visible images`);
    assert.deepEqual(logs.consoleErrors, [], `${viewport.id}-${route.id} console errors`);
    assert.deepEqual(logs.pageErrors, [], `${viewport.id}-${route.id} page errors`);
    assert.deepEqual(logs.requestFailures, [], `${viewport.id}-${route.id} request failures`);
    assert.deepEqual(logs.badResponses, [], `${viewport.id}-${route.id} bad HTTP responses`);

    return { viewport: viewport.id, route: route.id, screenshot, state, layout, focus, logs };
  } finally {
    await context.close();
  }
}

async function auditNavigation(browser) {
  const context = await setupContext(browser, viewports.find((viewport) => viewport.id === "desktop"));
  const page = await context.newPage();
  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], badResponses: [] };
  attachLogCapture(page, logs);
  try {
    await page.goto(demoUrl({ tab: "today" }), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForRoute(page, { tab: "today" });
    const clicked = [];
    for (const tab of ["classroom", "tomorrow", "week", "prep", "ops", "review", "today"]) {
      await page.locator(`#tab-${tab}`).click({ timeout: 10_000 });
      await page.waitForSelector(`#panel-${tab}:not([hidden])`, { timeout: 20_000 });
      clicked.push({ tab, url: page.url() });
      assert.equal(new URL(page.url()).searchParams.get("tab"), tab, `nav click should write tab=${tab}`);
    }
    await page.keyboard.press("Control+K");
    await page.getByRole("dialog", { name: "Command palette" }).waitFor({ timeout: 10_000 });
    await page.getByRole("combobox", { name: "Search commands, classrooms, and actions" }).fill("Support");
    await page.locator("#cp-opt-tool\\:support-patterns").click();
    await page.waitForSelector("#panel-review:not([hidden])", { timeout: 20_000 });
    assert.equal(new URL(page.url()).searchParams.get("tool"), "support-patterns", "command palette should route to Support Patterns");
    await page.screenshot({ path: path.join(SHOTS, "desktop-command-palette-support-patterns.png"), fullPage: true, animations: "disabled" });
    assert.deepEqual(logs.consoleErrors, []);
    assert.deepEqual(logs.pageErrors, []);
    assert.deepEqual(logs.requestFailures, []);
    assert.deepEqual(logs.badResponses, []);
    return { clicked, commandPaletteUrl: page.url(), logs };
  } finally {
    await context.close();
  }
}

async function auditMobileNavigation(browser) {
  const context = await setupContext(browser, viewports.find((viewport) => viewport.id === "mobile"));
  const page = await context.newPage();
  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], badResponses: [] };
  attachLogCapture(page, logs);
  try {
    await page.goto(demoUrl({ tab: "today" }), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForRoute(page, { tab: "today" });
    const clicked = [];
    for (const tab of ["ops", "week", "review", "today"]) {
      await page.getByTestId(`mobile-nav-group-${tab}`).click({ timeout: 10_000 });
      await page.waitForSelector(`#panel-${tab}:not([hidden])`, { timeout: 20_000 });
      clicked.push({ tab, url: page.url() });
      assert.equal(new URL(page.url()).searchParams.get("tab"), tab, `mobile nav click should write tab=${tab}`);
    }
    await page.screenshot({ path: path.join(SHOTS, "mobile-nav-after-clicks.png"), fullPage: true, animations: "disabled" });
    assert.deepEqual(logs.consoleErrors, []);
    assert.deepEqual(logs.pageErrors, []);
    assert.deepEqual(logs.requestFailures, []);
    assert.deepEqual(logs.badResponses, []);
    return { clicked, logs };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewports,
    routes: routes.map((route) => route.id),
    pages: [],
    navigation: null,
    mobileNavigation: null,
  };

  try {
    for (const viewport of viewports) {
      for (const route of routes) {
        results.pages.push(await auditRoute(browser, viewport, route));
      }
    }
    results.navigation = await auditNavigation(browser);
    results.mobileNavigation = await auditMobileNavigation(browser);
    await writeFile(path.join(RAW, "public-viewport-command-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    console.log(`PASS public viewport command sweep (${results.pages.length} page captures)`);
  } catch (error) {
    results.error = error instanceof Error ? error.stack || error.message : String(error);
    await writeFile(path.join(RAW, "public-viewport-command-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
