import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

async function captureDesktopTab(page, tab, filename) {
  await page.goto(`${WEB_BASE}/?demo=true&tab=${tab}&classroom=${DEMO_CLASSROOM_ID}`, {
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
      { tab: "today", filename: "today-desktop.png" },
      { tab: "differentiate", filename: "differentiate-desktop.png" },
      { tab: "tomorrow-plan", filename: "tomorrow-plan-desktop.png" },
      { tab: "family-message", filename: "family-message-desktop.png" },
    ];

    for (const capture of captures) {
      await captureDesktopTab(
        desktopPage,
        capture.tab,
        path.join(runDir, capture.filename),
      );
    }

    await tabletPage.goto(`${WEB_BASE}/?demo=true&tab=tomorrow-plan&classroom=${DEMO_CLASSROOM_ID}`, {
      waitUntil: "networkidle",
    });
    await tabletPage.waitForSelector("#panel-tomorrow-plan:not([hidden])");
    await tabletPage.screenshot({
      path: path.join(runDir, "tomorrow-plan-tablet.png"),
      fullPage: true,
    });

    await darkPage.goto(`${WEB_BASE}/?demo=true&tab=tomorrow-plan&classroom=${DEMO_CLASSROOM_ID}`, {
      waitUntil: "networkidle",
    });
    await darkPage.waitForSelector("#panel-tomorrow-plan:not([hidden])");
    await darkPage.screenshot({
      path: path.join(runDir, "tomorrow-plan-dark-desktop.png"),
      fullPage: true,
    });

    await mobilePage.goto(`${WEB_BASE}/?demo=true&tab=family-message&classroom=${DEMO_CLASSROOM_ID}`, {
      waitUntil: "networkidle",
    });
    await mobilePage.waitForSelector("#panel-family-message:not([hidden])");
    await mobilePage.waitForSelector(".mobile-nav");
    await mobilePage.screenshot({
      path: path.join(runDir, "shell-mobile.png"),
      fullPage: true,
    });

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

    assert.equal(manifest.files.length, 7, "Expected seven evidence screenshots");
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
