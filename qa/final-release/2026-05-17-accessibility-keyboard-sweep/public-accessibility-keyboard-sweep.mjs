/* global CSS, HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement */
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);

const BASE_URL = process.env.PRAIRIE_PUBLIC_DEMO_URL ?? "https://prairieclassroom-os.vercel.app";
const DEMO_CLASSROOM = "demo-okafor-grade34";
const OUT_DIR = path.resolve(process.env.PRAIRIE_QA_OUT_DIR ?? "qa/final-release/2026-05-17-accessibility-keyboard-sweep");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");
const REQUIRE_STATIC_DEMO_MARKER = process.env.PRAIRIE_QA_REQUIRE_STATIC_DEMO_MARKER !== "0";

const ROUTES = [
  { id: "today", tab: "today", label: "Today" },
  { id: "classroom", tab: "classroom", label: "Classroom" },
  { id: "week", tab: "week", label: "Week" },
  { id: "prep-differentiate", tab: "prep", tool: "differentiate", label: "Prep / Differentiate", toolRole: "tab", toolName: /differentiate/i },
  { id: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan", label: "Tomorrow / Plan", toolRole: "tab", toolName: /tomorrow plan/i },
  { id: "ops-ea-briefing", tab: "ops", tool: "ea-briefing", label: "Ops / EA Briefing", toolRole: "button", toolName: /ea briefing/i },
  { id: "review-family-message", tab: "review", tool: "family-message", label: "Review / Family Message", toolRole: "tab", toolName: /family message/i },
];

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 950, isMobile: false },
  { id: "mobile", width: 393, height: 852, isMobile: true },
];

function demoUrl(route) {
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

async function loadAxeSource() {
  const candidates = [
    "jest-axe/node_modules/axe-core/axe.min.js",
    "axe-core/axe.min.js",
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(require.resolve(candidate), "utf8");
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("Could not resolve axe-core for public accessibility sweep");
}

async function setupContext(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    bypassCSP: true,
  });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
  });
  return context;
}

async function waitForApp(page, route) {
  const panelSelector = `#panel-${route.tab}:not([hidden])`;
  await page.waitForSelector(".app-main", { timeout: 45_000 });
  await page.waitForSelector(panelSelector, { timeout: 12_000 }).catch(async () => {
    const desktopTab = page.locator(`#tab-${route.tab}`).first();
    const mobileTab = page.getByTestId(`mobile-nav-group-${route.tab}`).first();
    if (await desktopTab.isVisible().catch(() => false)) {
      await desktopTab.click();
    } else if (await mobileTab.isVisible().catch(() => false)) {
      await mobileTab.click();
    }
    await page.waitForSelector(panelSelector, { timeout: 45_000 });
  });
  if (route.toolRole && route.toolName) {
    const toolControl = page.getByRole(route.toolRole, { name: route.toolName }).first();
    if (await toolControl.isVisible().catch(() => false)) {
      await toolControl.click();
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    }
  }
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  const marker = await page.evaluate(() => document.documentElement.dataset.demoApi || null);
  if (REQUIRE_STATIC_DEMO_MARKER) {
    assert.equal(marker, "prairie-static-demo-api", `${route.id} should use the static-first public demo API`);
  }
}

async function runAxe(page) {
  return await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      nodes: violation.nodes.slice(0, 5).map((node) => ({
        target: node.target,
        failureSummary: node.failureSummary,
      })),
    }));
  });
}

async function auditKeyboardFocus(page) {
  const seen = [];
  const failures = [];
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    window.scrollTo(0, 0);
  });

  for (let index = 0; index < 28; index += 1) {
    await page.keyboard.press("Tab");
    const item = await page.evaluate((focusIndex) => {
      function descriptor(element) {
        if (!element) return "none";
        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : "";
        const label = element.getAttribute("aria-label") || element.textContent?.trim()?.replace(/\s+/g, " ").slice(0, 80) || "";
        return `${tag}${id}${label ? `:${label}` : ""}`;
      }
      function focusVisible(element) {
        if (!element || element === document.body) return false;
        const style = getComputedStyle(element);
        return (
          (style.outlineStyle !== "none" && parseFloat(style.outlineWidth || "0") > 0) ||
          style.boxShadow !== "none" ||
          element.matches(":focus-visible")
        );
      }
      function inViewport(element) {
        if (!element || element === document.body) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
      }
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      return {
        index: focusIndex,
        descriptor: descriptor(element),
        inViewport: inViewport(element),
        focusVisible: focusVisible(element),
      };
    }, index);
    if (!item) continue;
    seen.push(item);
    if (!item.inViewport || !item.focusVisible) failures.push(item);
  }
  return { seen, failures };
}

async function auditPage(page, route, viewport, axeSource) {
  await page.goto(demoUrl(route), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, route);
  await page.addScriptTag({ content: axeSource });

  const screenshot = `${viewport.id}-${route.id}.png`;
  await page.screenshot({ path: path.join(SHOTS, screenshot), fullPage: true, animations: "disabled" });

  const [layout, semantic, axeViolations] = await Promise.all([
    page.evaluate(() => {
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
        const text = (element.textContent || element.getAttribute("aria-label") || "").trim();
        if (!text) continue;
        if ((element.scrollWidth - element.clientWidth > 3 || element.scrollHeight - element.clientHeight > 3) && style.overflow !== "visible") {
          clippedText.push({
            tag: element.tagName.toLowerCase(),
            text: text.slice(0, 100),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          });
        }
      }
      return { horizontalOverflowPx, clippedText };
    }),
    page.evaluate(() => {
      function isVisible(element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      }
      function associatedLabel(element) {
        if (element.id) {
          const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
          if (explicit?.textContent?.trim()) return explicit.textContent.trim();
        }
        const parent = element.closest("label");
        return parent?.textContent?.trim() || "";
      }
      function accessibleName(element) {
        const ariaLabel = element.getAttribute("aria-label")?.trim();
        if (ariaLabel) return ariaLabel;
        const ariaLabelledBy = element.getAttribute("aria-labelledby");
        if (ariaLabelledBy) {
          const label = ariaLabelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() || "")
            .filter(Boolean)
            .join(" ");
          if (label) return label;
        }
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          const label = associatedLabel(element);
          if (label) return label;
        }
        return (element.textContent || element.getAttribute("title") || element.getAttribute("alt") || "").trim();
      }

      const unnamedControls = [];
      const smallTouchTargets = [];
      const controls = Array.from(document.querySelectorAll([
        "button",
        "a[href]",
        "input",
        "select",
        "textarea",
        "[role='button']",
        "[role='link']",
        "[role='tab']",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",")));
      for (const element of controls) {
        if (!isVisible(element)) continue;
        const tag = element.tagName.toLowerCase();
        const role = element.getAttribute("role") || tag;
        const name = accessibleName(element);
        const rect = element.getBoundingClientRect();
        if (!name) {
          unnamedControls.push({
            role,
            tag,
            classes: element.className?.toString().slice(0, 120) || "",
            html: element.outerHTML.slice(0, 180),
          });
        }
        const inlineLink = tag === "a" && element.closest("p, li");
        const textField = ["input", "select", "textarea"].includes(tag);
        if (!inlineLink && !textField && (rect.width < 40 || rect.height < 40)) {
          smallTouchTargets.push({
            role,
            name: name.slice(0, 120),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            classes: element.className?.toString().slice(0, 120) || "",
          });
        }
      }

      const mainCount = document.querySelectorAll("main, [role='main']").length;
      const h1Count = document.querySelectorAll("h1").length;
      const activeTabCount = document.querySelectorAll("[role='tab'][aria-selected='true']").length;
      return { unnamedControls, smallTouchTargets, mainCount, h1Count, activeTabCount };
    }),
    runAxe(page),
  ]);
  const focus = await auditKeyboardFocus(page);

  return {
    route: route.id,
    label: route.label,
    viewport: viewport.id,
    screenshot,
    layout,
    semantic,
    focus,
    axeViolations,
  };
}

function collectFailures(results, logs) {
  const failures = [];
  for (const pageResult of results.pages) {
    const prefix = `${pageResult.viewport}/${pageResult.route}`;
    if (pageResult.layout.horizontalOverflowPx > 2) failures.push({ type: "horizontal-overflow", page: prefix, issue: pageResult.layout.horizontalOverflowPx });
    if (pageResult.layout.clippedText.length > 0) failures.push({ type: "clipped-text", page: prefix, issues: pageResult.layout.clippedText });
    if (pageResult.semantic.unnamedControls.length > 0) failures.push({ type: "unnamed-controls", page: prefix, issues: pageResult.semantic.unnamedControls });
    if (pageResult.viewport === "mobile" && pageResult.semantic.smallTouchTargets.length > 0) failures.push({ type: "small-touch-targets", page: prefix, issues: pageResult.semantic.smallTouchTargets });
    if (pageResult.semantic.mainCount !== 1) failures.push({ type: "main-landmark-count", page: prefix, issue: pageResult.semantic.mainCount });
    if (pageResult.semantic.h1Count !== 1) failures.push({ type: "h1-count", page: prefix, issue: pageResult.semantic.h1Count });
    if (pageResult.focus.failures.length > 0) failures.push({ type: "keyboard-focus", page: prefix, issues: pageResult.focus.failures });
    const seriousAxe = pageResult.axeViolations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
    if (seriousAxe.length > 0) failures.push({ type: "axe-serious-critical", page: prefix, issues: seriousAxe });
  }
  if (logs.consoleErrors.length > 0) failures.push({ type: "console-errors", issues: logs.consoleErrors });
  if (logs.pageErrors.length > 0) failures.push({ type: "page-errors", issues: logs.pageErrors });
  if (logs.requestFailures.length > 0) failures.push({ type: "request-failures", issues: logs.requestFailures });
  if (logs.badResponses.length > 0) failures.push({ type: "bad-responses", issues: logs.badResponses });
  return failures;
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const axeSource = await loadAxeSource();
  const logs = { consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailures: [], badResponses: [] };
  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    classroom: DEMO_CLASSROOM,
    requireStaticDemoMarker: REQUIRE_STATIC_DEMO_MARKER,
    pages: [],
    logs,
    failures: [],
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of VIEWPORTS) {
      const context = await setupContext(browser, viewport);
      try {
        for (const route of ROUTES) {
          const page = await context.newPage();
          page.setDefaultTimeout(45_000);
          attachLogCapture(page, logs);
          results.pages.push(await auditPage(page, route, viewport, axeSource));
          await page.close();
        }
      } finally {
        await context.close();
      }
    }

    results.failures = collectFailures(results, logs);
    await writeFile(path.join(RAW, "public-accessibility-keyboard-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    assert.equal(results.failures.length, 0, `Public accessibility/keyboard failures: ${JSON.stringify(results.failures, null, 2)}`);
    console.log("PASS public accessibility keyboard sweep");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    results.failures = collectFailures(results, logs);
    await writeFile(path.join(RAW, "public-accessibility-keyboard-sweep-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
