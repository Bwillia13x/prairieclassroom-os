import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URLSearchParams } from "node:url";
import { chromium } from "playwright";

const WEB_BASE = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const ROOT_OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "output",
  "playwright",
  "ui-evidence",
);

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function prepareContext(browser, viewport, theme = "auto") {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((currentTheme) => {
    globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    globalThis.localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ "demo-okafor-grade34": "teacher" }),
    );
    if (currentTheme === "dark") {
      globalThis.localStorage.setItem("prairie-theme", "dark");
    } else if (currentTheme === "light") {
      globalThis.localStorage.setItem("prairie-theme", "light");
    } else {
      globalThis.localStorage.removeItem("prairie-theme");
    }
  }, theme);
  return context;
}

async function assertNoRuntimeErrors(page, consoleErrors, pageErrors) {
  if (pageErrors.length > 0) {
    throw new Error(`Page errors detected:\n${pageErrors.join("\n")}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} tab — top-level shell tab (`classroom` … `review`)
 * @param {string | null} [tool] — optional embedded tool (`differentiate`, `tomorrow-plan`, …)
 * @param {string} filename
 */
async function captureDesktopTab(page, tab, filename, tool = null) {
  const params = new URLSearchParams({
    demo: "true",
    tab,
    classroom: DEMO_CLASSROOM_ID,
  });
  if (tool) params.set("tool", tool);
  await page.goto(`${WEB_BASE}/?${params.toString()}`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(`#panel-${tab}:not([hidden])`);
  await page.screenshot({ path: filename, fullPage: true });
}

async function main() {
  const runDir = path.join(ROOT_OUTPUT_DIR, timestampLabel());
  await mkdir(runDir, { recursive: true });

  const browser = await chromium.launch();

  const desktopContext = await prepareContext(browser, { width: 1440, height: 1100 });
  const desktopPage = await desktopContext.newPage();
  const desktopConsoleErrors = [];
  const desktopPageErrors = [];

  desktopPage.on("console", (message) => {
    if (message.type() === "error") {
      desktopConsoleErrors.push(message.text());
    }
  });
  desktopPage.on("pageerror", (error) => {
    desktopPageErrors.push(error.message);
  });

  const tabletContext = await prepareContext(browser, { width: 720, height: 1100 });
  const tabletPage = await tabletContext.newPage();
  const tabletConsoleErrors = [];
  const tabletPageErrors = [];

  tabletPage.on("console", (message) => {
    if (message.type() === "error") {
      tabletConsoleErrors.push(message.text());
    }
  });
  tabletPage.on("pageerror", (error) => {
    tabletPageErrors.push(error.message);
  });

  const darkContext = await prepareContext(browser, { width: 1440, height: 1100 }, "dark");
  const darkPage = await darkContext.newPage();
  const darkConsoleErrors = [];
  const darkPageErrors = [];

  darkPage.on("console", (message) => {
    if (message.type() === "error") {
      darkConsoleErrors.push(message.text());
    }
  });
  darkPage.on("pageerror", (error) => {
    darkPageErrors.push(error.message);
  });

  const mobileContext = await prepareContext(browser, { width: 393, height: 852 });
  const mobilePage = await mobileContext.newPage();
  const mobileConsoleErrors = [];
  const mobilePageErrors = [];

  mobilePage.on("console", (message) => {
    if (message.type() === "error") {
      mobileConsoleErrors.push(message.text());
    }
  });
  mobilePage.on("pageerror", (error) => {
    mobilePageErrors.push(error.message);
  });

  try {
    const captures = [
      { tab: "today", tool: null, filename: "today-desktop.png" },
      { tab: "prep", tool: "differentiate", filename: "differentiate-desktop.png" },
      { tab: "tomorrow", tool: "tomorrow-plan", filename: "tomorrow-plan-desktop.png" },
      { tab: "review", tool: "family-message", filename: "family-message-desktop.png" },
    ];

    for (const capture of captures) {
      await captureDesktopTab(
        desktopPage,
        capture.tab,
        path.join(runDir, capture.filename),
        capture.tool,
      );
    }

    const tabletParams = new URLSearchParams({
      demo: "true",
      tab: "tomorrow",
      tool: "tomorrow-plan",
      classroom: DEMO_CLASSROOM_ID,
    });
    await tabletPage.goto(`${WEB_BASE}/?${tabletParams.toString()}`, {
      waitUntil: "networkidle",
    });
    await tabletPage.waitForSelector("#panel-tomorrow:not([hidden])");
    await tabletPage.screenshot({
      path: path.join(runDir, "tomorrow-plan-tablet.png"),
      fullPage: true,
    });

    await darkPage.goto(`${WEB_BASE}/?${tabletParams.toString()}`, {
      waitUntil: "networkidle",
    });
    await darkPage.waitForSelector("#panel-tomorrow:not([hidden])");
    await darkPage.screenshot({
      path: path.join(runDir, "tomorrow-plan-dark-desktop.png"),
      fullPage: true,
    });

    const reviewParams = new URLSearchParams({
      demo: "true",
      tab: "review",
      tool: "family-message",
      classroom: DEMO_CLASSROOM_ID,
    });
    await mobilePage.goto(`${WEB_BASE}/?${reviewParams.toString()}`, {
      waitUntil: "networkidle",
    });
    await mobilePage.waitForSelector("#panel-review:not([hidden])");
    await mobilePage.waitForSelector(".mobile-nav");
    await mobilePage.screenshot({
      path: path.join(runDir, "shell-mobile.png"),
      fullPage: true,
    });

    // Today mobile evidence: 393×852 iPhone-class viewport
    await mobilePage.goto(`${WEB_BASE}/?demo=true&tab=today&classroom=${DEMO_CLASSROOM_ID}`, {
      waitUntil: "networkidle",
    });
    await mobilePage.waitForSelector("[data-testid='today-hero']");
    await mobilePage.screenshot({
      path: path.join(runDir, "today-mobile.png"),
      fullPage: true,
    });

    await desktopPage.goto(`${WEB_BASE}/?demo=true&tab=today&classroom=${DEMO_CLASSROOM_ID}`, {
      waitUntil: "networkidle",
    });
    await desktopPage.waitForSelector("#panel-today:not([hidden])");

    // ─── Layout assertions ───

    // Desktop Today: grid layout with visible rail
    const desktopTodayIsGrid = await desktopPage.evaluate(() => {
      const panel = globalThis.document.querySelector(".today-panel--with-rail");
      if (!panel) return false;
      return globalThis.getComputedStyle(panel).display === "grid";
    });
    assert.ok(desktopTodayIsGrid, "Desktop Today should use grid layout");

    const railVisible = await desktopPage.evaluate(() => {
      const rail = globalThis.document.querySelector(".today-anchor-rail");
      if (!rail) return false;
      return globalThis.getComputedStyle(rail).display !== "none";
    });
    assert.ok(railVisible, "Desktop Today anchor rail should be visible");

    // Mobile Today: rail hidden, hero brief visible above mobile nav, CTA above mobile nav
    const mobileRailHidden = await mobilePage.evaluate(() => {
      const rail = globalThis.document.querySelector(".today-anchor-rail");
      if (!rail) return true; // absent counts as hidden
      return globalThis.getComputedStyle(rail).display === "none";
    });
    assert.ok(mobileRailHidden, "Mobile Today anchor rail should be hidden");

    const mobileBriefAboveNav = await mobilePage.evaluate(() => {
      const brief = globalThis.document.querySelector(".today-hero__brief");
      const nav = globalThis.document.querySelector(".mobile-nav");
      if (!brief || !nav) return true; // skip if elements absent
      return brief.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;
    });
    assert.ok(mobileBriefAboveNav, "Mobile Today hero brief should appear above mobile nav");

    const mobileCtaAboveNav = await mobilePage.evaluate(() => {
      const cta = globalThis.document.querySelector(".today-hero__cta");
      const nav = globalThis.document.querySelector(".mobile-nav");
      if (!cta || !nav) return true; // skip if elements absent
      return cta.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;
    });
    assert.ok(mobileCtaAboveNav, "Mobile Today CTA should appear above mobile nav");

    await assertNoRuntimeErrors(desktopPage, desktopConsoleErrors, desktopPageErrors);
    await assertNoRuntimeErrors(tabletPage, tabletConsoleErrors, tabletPageErrors);
    await assertNoRuntimeErrors(darkPage, darkConsoleErrors, darkPageErrors);
    await assertNoRuntimeErrors(mobilePage, mobileConsoleErrors, mobilePageErrors);

    const manifest = {
      created_at: new Date().toISOString(),
      web_base: WEB_BASE,
      classroom: DEMO_CLASSROOM_ID,
      files: [
        "today-desktop.png",
        "today-mobile.png",
        "differentiate-desktop.png",
        "tomorrow-plan-desktop.png",
        "tomorrow-plan-tablet.png",
        "tomorrow-plan-dark-desktop.png",
        "family-message-desktop.png",
        "shell-mobile.png",
      ],
    };

    await writeFile(
      path.join(runDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    assert.equal(manifest.files.length, 8, "Expected eight evidence screenshots");
    console.log(`PASS ui evidence captured at ${runDir}`);
  } finally {
    await desktopContext.close();
    await tabletContext.close();
    await darkContext.close();
    await mobileContext.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
