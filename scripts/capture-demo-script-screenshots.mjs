/**
 * Capture stills for `qa/DEMO_SCRIPT.md` under the seven-view shell.
 * Requires a running web app + API (default http://localhost:5173).
 *
 *   npm run dev   # in another terminal
 *   npm run demo:screenshots
 *
 * Output: qa/demo-script/screenshots/*.png (gitignored or committed per team policy).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URLSearchParams } from "node:url";
import { chromium } from "playwright";

const WEB_BASE = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "qa",
  "demo-script",
  "screenshots",
);

async function prepareContext(browser, viewport, theme = "auto") {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((currentTheme) => {
    globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    globalThis.localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ [DEMO_CLASSROOM_ID]: "teacher" }),
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

function buildUrl(tab, tool) {
  const params = new URLSearchParams({
    demo: "true",
    tab,
    classroom: DEMO_CLASSROOM_ID,
  });
  if (tool) params.set("tool", tool);
  return `${WEB_BASE}/?${params.toString()}`;
}

async function gotoPanel(page, tab, tool) {
  await page.goto(buildUrl(tab, tool), { waitUntil: "networkidle" });
  await page.waitForSelector(`#panel-${tab}:not([hidden])`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    // Dark desktop — matches DEMO_SCRIPT default (beats 1–7).
    const darkDesktop = await prepareContext(browser, { width: 1440, height: 900 }, "dark");
    const dPage = await darkDesktop.newPage();

    await gotoPanel(dPage, "today");
    await dPage.screenshot({ path: path.join(OUT_DIR, "01-today-hero.png"), fullPage: true });

    await gotoPanel(dPage, "today");
    await dPage.screenshot({ path: path.join(OUT_DIR, "02-today-day-arc.png"), fullPage: true });

    await gotoPanel(dPage, "today");
    await dPage.screenshot({ path: path.join(OUT_DIR, "04-today-complexity-debt.png"), fullPage: true });

    await gotoPanel(dPage, "prep", "differentiate");
    await dPage.screenshot({ path: path.join(OUT_DIR, "08b-differentiate-generated-full.png"), fullPage: true });

    await gotoPanel(dPage, "review", "family-message");
    await dPage.screenshot({ path: path.join(OUT_DIR, "10b-family-message-generated-full.png"), fullPage: true });

    await gotoPanel(dPage, "ops", "ea-briefing");
    await dPage.screenshot({ path: path.join(OUT_DIR, "13b-ea-briefing-full.png"), fullPage: true });

    await gotoPanel(dPage, "tomorrow", "complexity-forecast");
    await dPage.screenshot({ path: path.join(OUT_DIR, "17b-forecast-full.png"), fullPage: true });

    await darkDesktop.close();

    // Beat 8 — light theme Today + mobile Today.
    const lightDesktop = await prepareContext(browser, { width: 1440, height: 900 }, "light");
    const lPage = await lightDesktop.newPage();
    await gotoPanel(lPage, "today");
    await lPage.screenshot({ path: path.join(OUT_DIR, "19-today-light-theme.png"), fullPage: true });
    await lightDesktop.close();

    const mobileCtx = await prepareContext(browser, { width: 393, height: 852 }, "dark");
    const mPage = await mobileCtx.newPage();
    await gotoPanel(mPage, "today");
    await mPage.waitForSelector("[data-testid='today-hero']");
    await mPage.screenshot({ path: path.join(OUT_DIR, "20-mobile-today.png"), fullPage: true });
    await mobileCtx.close();

    console.log(`PASS demo script screenshots → ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
