import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, URLSearchParams } from "node:url";
import { chromium } from "playwright";

const WEB_BASE = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const COMMUNITY_HELPERS_PASSAGE = `Community Helpers Reading Passage

Community helpers make our town safer, healthier, and easier to understand. Firefighters help when there is danger. Nurses help people feel better and explain what care they need. Librarians help families find books, technology, and quiet spaces to learn.

Good readers notice what each helper does and why the job matters. As you read, underline one detail about each helper. Then write one sentence explaining which helper your community needs most this week and why.`;
const COMMUNITY_HELPERS_GOAL = "Reading: Understand and respond to text";
const FORECAST_SCENARIO_NOTES = "Assembly at 10:00; math follows recess; EA available morning only; writing block has unfinished threads for Hannah and Marco.";
const OPS_DRAFT_NOTE = "During math block after the assembly transition, Amira and Farid needed repeated side-conversation reminders. Used proximity and a quiet reset; both rejoined the fraction task after three minutes.";
const TOMORROW_REFLECTION = "The visual timer helped Brody transition during math. Elena was more confident with fraction strips. Tomorrow's math block comes after lunch and the EA is only available in the morning.";
const FAMILY_MESSAGE_CONTEXT = "Amira finished her reading block with strong effort and used her vocabulary card independently.";
const ROOT_OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "output",
  "playwright",
  "ui-evidence",
);
const FIRST_SCREEN_SURFACES = [
  { tab: "classroom", tool: null },
  { tab: "today", tool: null },
  { tab: "tomorrow", tool: "tomorrow-plan" },
  { tab: "week", tool: null },
  { tab: "prep", tool: "differentiate" },
  { tab: "ops", tool: "log-intervention" },
  { tab: "review", tool: "family-message" },
];
const RENDER_COMPARISON_SURFACES = [
  { tab: "classroom", tool: null },
  { tab: "today", tool: null },
  { tab: "week", tool: null },
  { tab: "prep", tool: "differentiate" },
  { tab: "ops", tool: "log-intervention" },
];

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function assertEvidenceApiReady(label = "UI evidence preflight") {
  const checks = [
    { name: "classroom list", url: `${WEB_BASE}/api/classrooms`, headers: {} },
    {
      name: "Today snapshot",
      url: `${WEB_BASE}/api/today/${DEMO_CLASSROOM_ID}`,
      headers: { "X-Classroom-Role": "teacher" },
    },
  ];

  for (const check of checks) {
    let response;
    try {
      response = await fetch(check.url, { headers: check.headers });
    } catch (error) {
      throw new Error(
        `${label}: ${check.name} request failed at ${check.url}. ` +
        `Start the web/orchestrator services before running ui:evidence. ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    if (response.status === 429) {
      throw new Error(
        `${label}: ${check.name} returned 429 from ${check.url}. ` +
        `Restart the local orchestrator with PRAIRIE_TEST_DISABLE_RATE_LIMITS=true for screenshot/evidence capture.`,
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `${label}: ${check.name} returned HTTP ${response.status} from ${check.url}. ${body.slice(0, 240)}`,
      );
    }
  }
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

async function gotoPanel(page, tab, tool = null) {
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
}

async function waitForLoadedPanel(page, tab, label) {
  const panel = page.locator(`#panel-${tab}:not([hidden])`);
  await panel.waitFor({ state: "visible", timeout: 15_000 });
  const loaded = await page.waitForFunction((activeTab) => {
    const activePanel = globalThis.document.querySelector(`#panel-${activeTab}:not([hidden])`);
    if (!activePanel) return false;
    const hasBlockingLoader = !!globalThis.document.querySelector(".branded-loading");
    const hasPanelLoader = !!activePanel.querySelector("[role='status']");
    const hasPrimaryContent = !!activePanel.querySelector(
      [
        ".today-hero",
        ".ops-command-workflow",
        ".prep-command-strip",
        ".week-operations-board",
        ".page-hero",
        ".workspace-layout",
      ].join(", "),
    );
    return !hasBlockingLoader && (!hasPanelLoader || hasPrimaryContent);
  }, tab, { timeout: 20_000 }).then(() => true).catch(() => false);

  if (!loaded) {
    await assertEvidenceApiReady(label);
    throw new Error(`${label}: ${tab} panel did not finish loading expected content.`);
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const body = globalThis.document.body;
    return Math.max(root.scrollWidth, body.scrollWidth) - globalThis.innerWidth;
  });
  assert.ok(overflow <= 2, `${label}: horizontal overflow ${overflow}px`);
}

async function assertActivePageContentVisible(page, tab, label) {
  const visible = await page.waitForFunction((activeTab) => {
    const panel = globalThis.document.querySelector(`#panel-${activeTab}:not([hidden])`);
    if (!panel) return false;
    const primary = [...panel.querySelectorAll(
      [
        ".today-hero__mobile-command",
        ".today-hero",
        ".ops-command-workflow",
        ".prep-command-strip",
        ".week-operations-board",
        ".page-hero",
        ".page-intro",
        ".workspace-layout",
      ].join(", "),
    )].find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!primary) return false;
    const rect = primary.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < globalThis.innerHeight;
  }, tab, { timeout: 10_000 }).then(() => true).catch(() => false);
  assert.ok(visible, `${label}: active page content should be visible in the first viewport`);
}

async function assertMobileNavClearance(page, tab, label) {
  const clearance = await page.evaluate((activeTab) => {
    const nav = globalThis.document.querySelector(".mobile-nav");
    const panel = globalThis.document.querySelector(`#panel-${activeTab}:not([hidden])`);
    if (!nav || !panel) return { ok: true, reason: "mobile nav absent" };

    const navRect = nav.getBoundingClientRect();
    const primary = [...panel.querySelectorAll(
      [
        ".today-hero__next-action",
        ".today-hero",
        ".today-hero__mobile-command",
        ".ops-command-workflow",
        ".prep-command-strip",
        ".week-operations-board",
        ".page-hero",
        ".page-intro",
        ".workspace-layout",
      ].join(", "),
    )].find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!primary) return { ok: false, reason: "no primary page content" };

    const primaryRect = primary.getBoundingClientRect();
    if (primaryRect.top >= navRect.top) {
      return { ok: false, reason: "primary content starts behind mobile nav" };
    }

    const cta = [...panel.querySelectorAll(
      ".today-hero__cta, .btn--primary, [data-testid='generate-tomorrow-plan-submit']",
    )].find((element) => {
      const rect = element.getBoundingClientRect();
      const style = globalThis.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    if (!cta) return { ok: true, reason: "no visible primary CTA in first pass" };

    const ctaRect = cta.getBoundingClientRect();
    const ctaIntersectsNav =
      ctaRect.top < navRect.bottom &&
      ctaRect.bottom > navRect.top &&
      ctaRect.left < navRect.right &&
      ctaRect.right > navRect.left;
    return {
      ok: !ctaIntersectsNav,
      reason: ctaIntersectsNav ? "primary CTA intersects mobile nav" : "clear",
    };
  }, tab);

  assert.ok(clearance.ok, `${label}: ${clearance.reason}`);
}

async function assertMobileTodayHero(page) {
  const mobileRailHidden = await page.evaluate(() => {
    const rail = globalThis.document.querySelector(".page-anchor-rail");
    if (!rail) return true;
    return globalThis.getComputedStyle(rail).display === "none";
  });
  assert.ok(mobileRailHidden, "Mobile Today page anchor rail should be hidden");

  const mobileCommandAboveNav = await page.evaluate(() => {
    const command = [...globalThis.document.querySelectorAll(
      ".today-hero__next-action, .today-hero__mobile-command",
    )].find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const nav = globalThis.document.querySelector(".mobile-nav");
    if (!command || !nav) return false;
    return command.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;
  });
  assert.ok(mobileCommandAboveNav, "Mobile Today next-action surface should appear above mobile nav");

  const mobileCtaAboveNav = await page.evaluate(() => {
    const cta = globalThis.document.querySelector(".today-hero__cta");
    const nav = globalThis.document.querySelector(".mobile-nav");
    if (!cta || !nav) return true;
    return cta.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;
  });
  assert.ok(mobileCtaAboveNav, "Mobile Today CTA should appear above mobile nav");
}

async function captureFirstScreens(page, runDir, prefix, { mobile = false } = {}) {
  const files = [];
  for (const { tab, tool } of FIRST_SCREEN_SURFACES) {
    await gotoPanel(page, tab, tool);
    const label = `${prefix} ${tab}`;
    await assertNoHorizontalOverflow(page, label);
    await assertActivePageContentVisible(page, tab, label);
    if (mobile) {
      await page.waitForSelector(".mobile-nav");
      await assertMobileNavClearance(page, tab, label);
      if (tab === "today") {
        await assertMobileTodayHero(page);
      }
    }
    const filename = `first-${prefix}-${tab}.png`;
    await page.screenshot({
      path: path.join(runDir, filename),
      fullPage: false,
      animations: "disabled",
    });
    files.push(filename);
    await sleep(500);
  }
  return files;
}

async function captureRenderComparisonScreens(page, runDir, prefix, surfaces, { mobile = false } = {}) {
  const files = [];
  for (const { tab, tool } of surfaces) {
    if (tab === "prep" && tool === "differentiate") {
      await fillPrepGeneratedScenario(page);
    } else {
      await gotoPanel(page, tab, tool);
    }
    if (tab === "ops" && tool === "log-intervention") {
      await fillOpsDraftScenario(page);
    }
    const label = `${prefix} render comparison ${tab}`;
    await assertNoHorizontalOverflow(page, label);
    await assertActivePageContentVisible(page, tab, label);
    if (mobile) {
      await page.waitForSelector(".mobile-nav");
      await assertMobileNavClearance(page, tab, label);
      if (tab === "today") {
        await assertMobileTodayHero(page);
      }
    }
    const filename = `render-${prefix}-${tab}${tool ? `-${tool}` : ""}.png`;
    await page.screenshot({
      path: path.join(runDir, filename),
      fullPage: false,
      animations: "disabled",
    });
    files.push(filename);
    await sleep(300);
  }
  return files;
}

async function generateForecastScenario(page) {
  await gotoPanel(page, "tomorrow", "complexity-forecast");
  await page.getByLabel(/Optional notes for tomorrow/i).fill(FORECAST_SCENARIO_NOTES);
  await page.getByRole("button", { name: /Generate forecast/i }).click();
  await page.getByText(/Forecast generated/i).first().waitFor({ timeout: 45_000 });
  await page.locator(".forecast-viewer, .forecast-timeline").first().waitFor({ timeout: 10_000 });
  await assertNoHorizontalOverflow(page, "Desktop Forecast scenario");
}

async function selectPasteArtifactSource(page) {
  const prepPanel = page.locator("#panel-prep:not([hidden])");
  const workspace = prepPanel.locator(".workspace-layout--prep-canvas").first();
  await waitForLoadedPanel(page, "prep", "Prep scenario setup");
  try {
    await workspace.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    await assertEvidenceApiReady("Prep scenario setup");
    await page.reload({ waitUntil: "networkidle" });
    await waitForLoadedPanel(page, "prep", "Prep scenario setup after reload");
    await workspace.waitFor({ state: "visible", timeout: 45_000 });
  }
  const intake = prepPanel.locator(".artifact-upload").first();
  try {
    await intake.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    await assertEvidenceApiReady("Prep artifact intake setup");
    await page.reload({ waitUntil: "networkidle" });
    await waitForLoadedPanel(page, "prep", "Prep artifact intake setup after reload");
    await workspace.waitFor({ state: "visible", timeout: 45_000 });
    await intake.waitFor({ state: "visible", timeout: 45_000 });
  }
  await intake.getByRole("tab", { name: /Paste text/i }).click();
  await page.locator("#raw-text").waitFor({ state: "visible", timeout: 10_000 });
}

async function fillPrepGeneratedScenario(page) {
  await gotoPanel(page, "prep", "differentiate");
  await selectPasteArtifactSource(page);
  await page.getByLabel(/Artifact title/i).fill("Community Helpers Reading Passage");
  await page.getByLabel(/^Subject$/i).fill("Literacy");
  await page.locator("#raw-text").fill(COMMUNITY_HELPERS_PASSAGE);
  await page.getByLabel(/Outcome focus/i).fill(COMMUNITY_HELPERS_GOAL);
  await page.getByRole("button", { name: /Generate variants/i }).click();
  await page.getByText(/variants generated/i).first().waitFor({ timeout: 30_000 });
  await page.locator(".variant-grid-wrapper").first().waitFor({ timeout: 10_000 });
  await page.locator("#prep-command").scrollIntoViewIfNeeded();
}

async function fillOpsDraftScenario(page) {
  await page.getByRole("group", { name: /Select students/i }).getByLabel(/^Amira$/).check();
  await page.getByRole("group", { name: /Select students/i }).getByLabel(/^Farid$/).check();
  await page.getByLabel(/Evidence note/i).fill(OPS_DRAFT_NOTE);
  await page.getByLabel(/Follow-up timing/i).selectOption("Tomorrow morning");
  await page.getByLabel(/Classroom memory destination/i).selectOption("Classroom memory + student thread");
  const preview = page.locator(".intervention-memory-preview");
  await preview.getByText(/Amira, Farid/i).first().waitFor({ timeout: 10_000 });
  await preview.getByText(/assembly transition/i).first().waitFor({ timeout: 10_000 });
  await page.locator(".ops-command-workflow").scrollIntoViewIfNeeded();
}

async function captureDifferentiatedOutput(page, filename) {
  await gotoPanel(page, "prep", "differentiate");
  await selectPasteArtifactSource(page);
  await page.getByLabel(/Artifact title/i).fill("Community Helpers Reading Passage");
  await page.getByLabel(/^Subject$/i).fill("Literacy");
  await page.locator("#raw-text").fill(COMMUNITY_HELPERS_PASSAGE);
  await page.getByLabel(/Outcome focus/i).fill(COMMUNITY_HELPERS_GOAL);
  await page.getByRole("button", { name: /Generate variants/i }).click();
  await page.getByText(/variants generated/i).first().waitFor({ timeout: 30_000 });
  await page.locator(".variant-grid-wrapper").scrollIntoViewIfNeeded();
  await assertNoHorizontalOverflow(page, "Desktop Differentiate output");
  await page.screenshot({ path: filename, fullPage: true });
}

async function captureTomorrowPlanSources(page, filename) {
  await gotoPanel(page, "tomorrow", "tomorrow-plan");
  await page.getByLabel(/Today's reflection/i).fill(TOMORROW_REFLECTION);
  await page.getByLabel(/Tomorrow's intention/i).fill("Use the timer win without overloading the afternoon block.");
  await page.getByTestId("generate-tomorrow-plan-submit").click();
  await page.getByText(/Plan generated/i).first().waitFor({ timeout: 45_000 });
  const traceSummary = page.locator(".retrieval-trace__summary").first();
  if (await traceSummary.count()) {
    await traceSummary.click();
    await page.locator(".retrieval-trace").first().scrollIntoViewIfNeeded();
  } else {
    await page.locator(".plan-viewer").first().scrollIntoViewIfNeeded();
  }
  await assertNoHorizontalOverflow(page, "Desktop Tomorrow Plan output");
  await page.screenshot({ path: filename, fullPage: true });
}

async function captureFamilyApproval(page, filename) {
  await gotoPanel(page, "review", "family-message");
  const amiraChip = page.getByTestId("message-student-chip-Amira");
  try {
    await amiraChip.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#panel-review:not([hidden])");
    await amiraChip.waitFor({ state: "visible", timeout: 30_000 });
  }
  await amiraChip.scrollIntoViewIfNeeded();
  if ((await amiraChip.getAttribute("aria-pressed")) !== "true") {
    await amiraChip.click();
  }
  await page.getByLabel(/Message type/i).selectOption("praise");
  await page.getByLabel(/Language/i).selectOption("pa");
  await page.locator("#msg-context").fill(FAMILY_MESSAGE_CONTEXT);
  await page.getByRole("button", { name: /Draft family message/i }).click();
  const reviewApprovalButton = page.getByRole("button", { name: /Review approval/i });
  await reviewApprovalButton.waitFor({ state: "visible", timeout: 45_000 });
  await reviewApprovalButton.click();
  await page.getByRole("dialog", { name: /Review approval/i }).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
  await assertNoHorizontalOverflow(page, "Review family-message approval");
  await page.screenshot({ path: filename, fullPage: true, animations: "disabled" });
}

async function main() {
  await assertEvidenceApiReady();

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

  const midDarkContext = await prepareContext(browser, { width: 1120, height: 900 }, "dark");
  const midDarkPage = await midDarkContext.newPage();
  const midDarkConsoleErrors = [];
  const midDarkPageErrors = [];

  midDarkPage.on("console", (message) => {
    if (message.type() === "error") {
      midDarkConsoleErrors.push(message.text());
    }
  });
  midDarkPage.on("pageerror", (error) => {
    midDarkPageErrors.push(error.message);
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

  const mobileDarkContext = await prepareContext(browser, { width: 393, height: 852 }, "dark");
  const mobileDarkPage = await mobileDarkContext.newPage();
  const mobileDarkConsoleErrors = [];
  const mobileDarkPageErrors = [];

  mobileDarkPage.on("console", (message) => {
    if (message.type() === "error") {
      mobileDarkConsoleErrors.push(message.text());
    }
  });
  mobileDarkPage.on("pageerror", (error) => {
    mobileDarkPageErrors.push(error.message);
  });

  try {
    const files = [];

    files.push(...await captureFirstScreens(desktopPage, runDir, "desktop"));
    files.push(...await captureFirstScreens(mobilePage, runDir, "mobile", { mobile: true }));

    files.push("today-desktop.png");
    await captureDesktopTab(desktopPage, "today", path.join(runDir, "today-desktop.png"));
    await assertNoHorizontalOverflow(desktopPage, "Desktop Today");

    files.push("differentiate-desktop.png");
    await captureDifferentiatedOutput(desktopPage, path.join(runDir, "differentiate-desktop.png"));

    files.push("tomorrow-plan-desktop.png");
    await captureTomorrowPlanSources(desktopPage, path.join(runDir, "tomorrow-plan-desktop.png"));

    files.push("family-message-desktop.png");
    await captureFamilyApproval(desktopPage, path.join(runDir, "family-message-desktop.png"));

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
    await assertNoHorizontalOverflow(tabletPage, "Tablet Tomorrow Plan");
    files.push("tomorrow-plan-tablet.png");
    await tabletPage.screenshot({
      path: path.join(runDir, "tomorrow-plan-tablet.png"),
      fullPage: true,
    });

    await darkPage.goto(`${WEB_BASE}/?${tabletParams.toString()}`, {
      waitUntil: "networkidle",
    });
    await darkPage.waitForSelector("#panel-tomorrow:not([hidden])");
    await assertNoHorizontalOverflow(darkPage, "Dark Tomorrow Plan");
    files.push("tomorrow-plan-dark-desktop.png");
    await darkPage.screenshot({
      path: path.join(runDir, "tomorrow-plan-dark-desktop.png"),
      fullPage: true,
    });

    files.push("family-message-dark-desktop.png");
    await captureFamilyApproval(darkPage, path.join(runDir, "family-message-dark-desktop.png"));

    await generateForecastScenario(darkPage);

    files.push(...await captureRenderComparisonScreens(
      darkPage,
      runDir,
      "dark-desktop",
      RENDER_COMPARISON_SURFACES,
    ));

    await gotoPanel(midDarkPage, "ops", "log-intervention");
    await fillOpsDraftScenario(midDarkPage);
    await assertNoHorizontalOverflow(midDarkPage, "Dark mid-width Ops");
    await assertActivePageContentVisible(midDarkPage, "ops", "Dark mid-width Ops");
    files.push("render-dark-midwidth-ops-1120x900.png");
    await midDarkPage.screenshot({
      path: path.join(runDir, "render-dark-midwidth-ops-1120x900.png"),
      fullPage: false,
      animations: "disabled",
    });

    files.push(...await captureRenderComparisonScreens(
      mobileDarkPage,
      runDir,
      "dark-mobile",
      [{ tab: "today", tool: null }],
      { mobile: true },
    ));

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
    await assertNoHorizontalOverflow(mobilePage, "Mobile shell");
    await assertMobileNavClearance(mobilePage, "review", "Mobile shell");
    files.push("shell-mobile.png");
    await mobilePage.screenshot({
      path: path.join(runDir, "shell-mobile.png"),
      fullPage: true,
    });

    await assertNoRuntimeErrors(desktopPage, desktopConsoleErrors, desktopPageErrors);
    await assertNoRuntimeErrors(tabletPage, tabletConsoleErrors, tabletPageErrors);
    await assertNoRuntimeErrors(darkPage, darkConsoleErrors, darkPageErrors);
    await assertNoRuntimeErrors(midDarkPage, midDarkConsoleErrors, midDarkPageErrors);
    await assertNoRuntimeErrors(mobilePage, mobileConsoleErrors, mobilePageErrors);
    await assertNoRuntimeErrors(mobileDarkPage, mobileDarkConsoleErrors, mobileDarkPageErrors);

    const manifest = {
      created_at: new Date().toISOString(),
      web_base: WEB_BASE,
      classroom: DEMO_CLASSROOM_ID,
      files,
    };

    await writeFile(
      path.join(runDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    assert.equal(manifest.files.length, 29, "Expected 29 evidence screenshots");
    console.log(`PASS ui evidence captured at ${runDir}`);
  } finally {
    await desktopContext.close();
    await tabletContext.close();
    await darkContext.close();
    await midDarkContext.close();
    await mobileContext.close();
    await mobileDarkContext.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
