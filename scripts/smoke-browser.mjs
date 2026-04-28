import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URLSearchParams } from "node:url";
import { chromium } from "playwright";
import { assertGeminiRunsAllowed } from "./lib/gemini-api-preflight.mjs";

const WEB_BASE = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const PROTECTED_CLASSROOM_ID = "alpha-grade4";
const PROTECTED_CLASSROOM_CODE = "prairie-alpha-2026";
const INFERENCE_PROVIDER = (process.env.PRAIRIE_INFERENCE_PROVIDER ?? "").trim().toLowerCase();
const HOSTED_GENERATION_TIMEOUT_MS = INFERENCE_PROVIDER === "gemini" ? 180_000 : 30_000;
const OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "output",
  "playwright",
);
const FAILURE_SCREENSHOT = path.join(OUTPUT_DIR, "browser-smoke-failure.png");

/** Seven-view shell top-level tabs (order matches `TAB_ORDER` in appReducer). */
const TOP_LEVEL_TABS = ["classroom", "today", "tomorrow", "week", "prep", "ops", "review"];
const TOP_LEVEL = new Set(TOP_LEVEL_TABS);

/** Map legacy tool / surface ids to canonical `?tab=` + optional `?tool=` (2026-04-23 nav reorg). */
const TOOL_HOST = {
  differentiate: { tab: "prep", tool: "differentiate" },
  "language-tools": { tab: "prep", tool: "language-tools" },
  "tomorrow-plan": { tab: "tomorrow", tool: "tomorrow-plan" },
  "complexity-forecast": { tab: "tomorrow", tool: "complexity-forecast" },
  "log-intervention": { tab: "ops", tool: "log-intervention" },
  "ea-briefing": { tab: "ops", tool: "ea-briefing" },
  "ea-load": { tab: "ops", tool: "ea-load" },
  "survival-packet": { tab: "ops", tool: "survival-packet" },
  "family-message": { tab: "review", tool: "family-message" },
  "support-patterns": { tab: "review", tool: "support-patterns" },
  "usage-insights": { tab: "review", tool: "usage-insights" },
};

function resolveSurface(id) {
  if (TOP_LEVEL.has(id)) {
    return { tab: id, tool: null };
  }
  const spec = TOOL_HOST[id];
  assert.ok(spec, `Unknown navigation target: ${id}`);
  return spec;
}

function hostTabForSurface(id) {
  return resolveSurface(id).tab;
}

/** Visible labels in each page's `page-tool-switcher` (see `TOOL_META` in appReducer). */
const TOOL_SWITCHER_NAME = {
  differentiate: "Differentiate",
  "language-tools": "Language Tools",
  "tomorrow-plan": "Tomorrow Plan",
  "complexity-forecast": "Forecast",
  "log-intervention": "Log Intervention",
  "ea-briefing": "EA Briefing",
  "ea-load": "EA Load Balance",
  "survival-packet": "Sub Packet",
  "family-message": "Family Message",
  "support-patterns": "Support Patterns",
  "usage-insights": "Usage Insights",
};

function assertNoAlphaAliases(text, label) {
  const match = text.match(/\b(Ari|Mika|Jae)\b/);
  assert.equal(match, null, `${label} leaked alpha alias ${match?.[1]}`);
}

function parseLabelPair(labelText) {
  const parts = labelText.split("·").map((part) => part.trim()).filter(Boolean);
  return {
    student: parts[0] ?? "",
    type: (parts[1] ?? "").replace(/ /g, "_"),
  };
}

function isExpectedAuthConsoleError(text) {
  return /Failed to load resource: the server responded with a status of (401|403)/.test(text);
}

async function expectSelectValue(page, selector, expected, label) {
  await page.waitForSelector(selector);
  const actual = await page.locator(selector).inputValue();
  assert.equal(actual, expected, `${label} expected ${expected}, got ${actual}`);
}

/**
 * Verify the chrome's classroom pill shows the expected classroom id.
 * The Workstream F2 lift (and its Tomorrow-Plan/Survival-Packet follow-up)
 * removed the per-form Classroom select from every panel that previously
 * had one. The canonical classroom affordance is now `.shell-classroom-pill`
 * in the chrome. Open the panel to read the unambiguous
 * `[data-testid="shell-classroom-active-id"]` (per CLAUDE.md feedback
 * memory: prefer testid over class-derived selectors for smoke-browser
 * durability).
 */
async function expectActiveClassroom(page, expected, label) {
  await openClassroomPanel(page);
  const actual = (await page.locator('[data-testid="shell-classroom-active-id"]').innerText()).trim();
  await page.keyboard.press("Escape");
  assert.equal(actual, expected, `${label} expected ${expected}, got ${actual}`);
}

async function expectCheckedStudentInPanel(page, surfaceId, student, label) {
  const host = hostTabForSurface(surfaceId);
  const control = page
    .locator(`#panel-${host}:not([hidden]) .student-checkbox`)
    .filter({ hasText: student })
    .first();
  await control.waitFor({ state: "visible" });

  const checkbox = control.locator("input");
  if ((await checkbox.count()) > 0) {
    await page.waitForFunction(
      (element) => Boolean(element && typeof element === "object" && "checked" in element && element.checked),
      await checkbox.elementHandle(),
    );
    assert.equal(await checkbox.isChecked(), true, `${label} expected ${student} to be checked`);
    return;
  }

  await page.waitForFunction(
    (element) => element?.getAttribute("aria-pressed") === "true",
    await control.elementHandle(),
  );
  assert.equal(await control.getAttribute("aria-pressed"), "true", `${label} expected ${student} to be selected`);
}

async function dismissRolePromptIfPresent(page) {
  // Plan 2's RolePromptDialog opens on first load for protected classrooms.
  // It intercepts pointer events, so we must dismiss it before clicking into
  // the shell. "Skip" defaults the role to Teacher, which is the smoke test's
  // expected role for all assertions.
  const skipBtn = page.getByTestId("role-prompt-skip");
  try {
    await skipBtn.waitFor({ state: "visible", timeout: 1_000 });
  } catch {
    return;
  }

  await skipBtn.click();
  await page.locator(".role-prompt-overlay").waitFor({ state: "detached", timeout: 3_000 });
}

async function openClassroomPanel(page) {
  await dismissRolePromptIfPresent(page);
  await page.click("#shell-classroom-trigger");
  await page.waitForSelector("#shell-classroom-panel");
}

async function selectShellClassroom(page, classroomId) {
  await openClassroomPanel(page);
  await page.selectOption("#shell-classroom", classroomId);
}

/**
 * Deep-link to a top-level tab or embedded tool workspace (canonical URL).
 * Preserves classroom when `classroom` is passed; use after switching to a protected demo class.
 */
async function navigateToSurface(page, surfaceId, { classroom = DEMO_CLASSROOM_ID } = {}) {
  await dismissRolePromptIfPresent(page);
  const { tab, tool } = resolveSurface(surfaceId);
  const params = new URLSearchParams({ tab, classroom });
  if (tool) params.set("tool", tool);
  if (classroom === DEMO_CLASSROOM_ID) {
    params.set("demo", "true");
  }
  await page.goto(`${WEB_BASE}/?${params.toString()}`, { waitUntil: "networkidle" });
  await page.waitForSelector(`#panel-${tab}:not([hidden])`);
}

/**
 * Navigate via the live shell (preserves SPA state across handoffs — e.g. a
 * generated Tomorrow plan before returning from Family Message).
 */
async function openTab(page, id) {
  await dismissRolePromptIfPresent(page);
  const { tab, tool } = resolveSurface(id);
  await page.getByTestId(`shell-nav-group-${tab}`).click();
  await page.waitForSelector(`#panel-${tab}:not([hidden])`);
  if (!tool) return;
  const label = TOOL_SWITCHER_NAME[tool];
  assert.ok(label, `switcher label for ${tool}`);
  await page.getByRole("tab", { name: label }).click();
}

async function expectSevenViewShell(page) {
  for (const tab of TOP_LEVEL_TABS) {
    await page.waitForSelector(`[data-testid="shell-nav-group-${tab}"]`);
  }
}

async function shellChromeBox(page) {
  const headerBox = await page.locator(".app-header").boundingBox();
  if (headerBox) return headerBox;

  // The premium desktop shell lets `.app-header` participate semantically
  // while `display: contents` promotes brand, command bar, and rail into the
  // app grid. In that mode the header has no CSS box, so measure the visible
  // chrome cluster that must remain pinned while `.app-main` scrolls.
  return page.locator(".shell-brand, .shell-bar, .shell-nav").evaluateAll((elements) => {
    const boxes = elements
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);

    if (boxes.length === 0) return null;

    const left = Math.min(...boxes.map((rect) => rect.left));
    const top = Math.min(...boxes.map((rect) => rect.top));
    const right = Math.max(...boxes.map((rect) => rect.right));
    const bottom = Math.max(...boxes.map((rect) => rect.bottom));
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
}

async function expectAuthPromptVisible(page) {
  await page.waitForSelector("#classroom-access-title");
  const title = await page.locator("#classroom-access-title").innerText();
  assert.match(title, new RegExp(PROTECTED_CLASSROOM_ID), "Auth prompt should target the protected classroom");
}

async function expectStickyShell(page) {
  const headerBoxBefore = await shellChromeBox(page);
  assert.ok(headerBoxBefore, "Shell header should be measurable before scrolling");

  await page.locator(".app-main").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await page.waitForTimeout(150);
  const headerBoxAfter = await shellChromeBox(page);
  assert.ok(headerBoxAfter, "Shell header should be measurable after scrolling");
  assert.ok(
    Math.abs((headerBoxAfter?.y ?? 0) - (headerBoxBefore?.y ?? 0)) <= 2,
    `Shell header should stay fixed relative to the viewport, start y=${headerBoxBefore?.y} end y=${headerBoxAfter?.y}`,
  );
  await page.locator(".app-main").evaluate((node) => {
    node.scrollTop = 0;
  });
}

async function submitAccessCode(page, code) {
  await page.fill("#classroom-access-code", code);
  await page.getByTestId("classroom-access-save").click();
}

async function main() {
  if (INFERENCE_PROVIDER === "gemini") {
    assertGeminiRunsAllowed(process.env, "Hosted Gemini browser smoke");
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    globalThis.__printCalls = 0;
    globalThis.print = () => {
      globalThis.__printCalls += 1;
    };
  });

  const page = await context.newPage();
  page.setDefaultTimeout(HOSTED_GENERATION_TIMEOUT_MS);
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!isExpectedAuthConsoleError(text)) {
        consoleErrors.push(text);
      }
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    await page.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "networkidle" });

    await page.waitForSelector("#shell-classroom-trigger");
    await openClassroomPanel(page);
    assert.equal((await page.locator('[data-testid="shell-classroom-active-id"]').innerText()).trim(), DEMO_CLASSROOM_ID);
    await page.keyboard.press("Escape");

    // Cohort Pulse zone: at least one cohort-cell must render on the demo classroom.
    await page.waitForSelector('[data-testid="cohort-cell"]', { timeout: 5000 });
    const cohortCellCount = await page.locator('[data-testid="cohort-cell"]').count();
    assert.ok(
      cohortCellCount >= 1,
      `Expected at least 1 cohort-cell on Classroom page, got ${cohortCellCount}`,
    );

    await expectSevenViewShell(page);
    await navigateToSurface(page, "today");
    await navigateToSurface(page, "differentiate");
    await navigateToSurface(page, "log-intervention");
    await navigateToSurface(page, "family-message");
    await expectStickyShell(page);

    await page.goto(
      `${WEB_BASE}/?demo=true&tab=review&tool=family-message&classroom=${DEMO_CLASSROOM_ID}`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector("#panel-review:not([hidden])");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Family Message deep link classroom");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#panel-review:not([hidden])");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Family Message classroom after refresh");

    await openTab(page, "differentiate");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Differentiate classroom");

    await openTab(page, "tomorrow-plan");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Tomorrow Plan classroom");

    await openTab(page, "family-message");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Family Message classroom");

    await openTab(page, "tomorrow-plan");
    await page.fill("#reflection", "Brody needed help after lunch, and Amira needed language support before writing.");
    await page.fill("#plan-goal", "Keep transitions smooth and reduce language load in math writing.");
    await page.getByTestId("generate-tomorrow-plan-submit").click();
    await page.waitForSelector(".plan-viewer", { timeout: HOSTED_GENERATION_TIMEOUT_MS });

    const familyCard = page.locator(".plan-section--family .plan-card--family").first();
    const familyPrefill = parseLabelPair(
      await familyCard.locator(".plan-card-label").innerText(),
    );
    assert.ok(familyPrefill.student, "Expected a family follow-up student in tomorrow plan");
    await familyCard.click();

    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Family Message classroom after plan handoff");
    await expectCheckedStudentInPanel(page, "family-message", familyPrefill.student, "Family Message student after plan handoff");
    await expectSelectValue(page, "#msg-type", familyPrefill.type, "Family Message type after plan handoff");
    assert.match(await page.locator(".prefill-banner-text").innerText(), new RegExp(familyPrefill.student));

    await openTab(page, "tomorrow-plan");
    const interventionCard = page.locator(".plan-section--priorities .plan-card--priority").first();
    const interventionStudent = (await interventionCard.locator(".plan-card-label").innerText()).trim();
    await interventionCard.getByTestId("plan-card-log-intervention").click();

    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Intervention classroom after plan handoff");
    const interventionCheckbox = page
      .locator("#panel-ops:not([hidden]) .student-checkbox")
      .filter({ hasText: interventionStudent })
      .locator("input");
    await page.waitForFunction(
      (element) => Boolean(element && typeof element === "object" && "checked" in element && element.checked),
      await interventionCheckbox.elementHandle(),
    );
    assert.equal(await interventionCheckbox.isChecked(), true, `${interventionStudent} should be pre-checked in intervention logger`);

    await openTab(page, "support-patterns");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Support Patterns classroom");
    await page.getByTestId("detect-patterns-submit").click();
    await page.waitForSelector(".pattern-header", { timeout: HOSTED_GENERATION_TIMEOUT_MS });

    const patternText = await page.locator("#panel-review:not([hidden]) .workspace-result").innerText();
    assertNoAlphaAliases(patternText, "Support Patterns UI");

    const trendCard = page.locator(".pattern-section--trends .pattern-card").first();
    const trendStudent = (await trendCard.locator(".pattern-card-label").innerText()).trim();
    await trendCard.getByTestId("pattern-share-positive-trend").click();

    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Family Message classroom after pattern handoff");
    await expectCheckedStudentInPanel(page, "family-message", trendStudent, "Family Message student after pattern handoff");
    await expectSelectValue(page, "#msg-type", "praise", "Family Message type after pattern handoff");

    await openTab(page, "survival-packet");
    await expectActiveClassroom(page, DEMO_CLASSROOM_ID, "Survival Packet classroom");
    await page.getByTestId("generate-survival-packet-submit").click();
    await page.getByTestId("print-survival-packet").waitFor({ timeout: HOSTED_GENERATION_TIMEOUT_MS });

    const packetText = await page.locator(".survival-packet").innerText();
    assert.match(packetText, /Substitute Survival Packet/);
    assert.match(packetText, /Heads Up/);
    assertNoAlphaAliases(packetText, "Survival Packet UI");

    await page.getByTestId("print-survival-packet").click();
    const printCalls = await page.evaluate(() => globalThis.__printCalls);
    assert.equal(printCalls, 1, "Print should be invoked exactly once during smoke test");

    await selectShellClassroom(page, PROTECTED_CLASSROOM_ID);
    await dismissRolePromptIfPresent(page);
    await expectAuthPromptVisible(page);
    await page.waitForFunction(() => {
      const element = globalThis.document.querySelector(".access-dialog__description");
      const text = element?.textContent ?? "";
      return /Authentication required|needs an access code|protected.*access code/i.test(text);
    });

    await submitAccessCode(page, "wrong-code");
    await page.waitForFunction(() => {
      const element = globalThis.document.querySelector(".access-dialog__description");
      return /Invalid classroom code|access code (?:didn't|did not) match/i.test(element?.textContent ?? "");
    });
    assert.match(
      await page.locator(".access-dialog__description").innerText(),
      /Invalid classroom code|access code (?:didn't|did not) match/i,
    );

    await submitAccessCode(page, PROTECTED_CLASSROOM_CODE);
    await page.waitForSelector("#classroom-access-title", { state: "detached" });
    await openClassroomPanel(page);
    assert.match(await page.locator(".shell-classroom-panel__details").innerText(), /saved in this browser/i);
    await page.keyboard.press("Escape");
    await navigateToSurface(page, "tomorrow-plan", { classroom: PROTECTED_CLASSROOM_ID });
    await expectActiveClassroom(page, PROTECTED_CLASSROOM_ID, "Protected classroom tomorrow plan");

    await page.reload({ waitUntil: "networkidle" });
    await openClassroomPanel(page);
    assert.equal((await page.locator('[data-testid="shell-classroom-active-id"]').innerText()).trim(), PROTECTED_CLASSROOM_ID);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#classroom-access-title").count(), 0, "Saved classroom code should survive refresh without prompting");
    assert.match(await page.locator(".shell-classroom-panel__details").innerText(), /saved in this browser/i);
    await page.keyboard.press("Escape");

    const tabletContext = await browser.newContext({ viewport: { width: 720, height: 1100 } });
    await tabletContext.addInitScript(() => {
      globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(
      `${WEB_BASE}/?demo=true&tab=tomorrow&tool=tomorrow-plan&classroom=${DEMO_CLASSROOM_ID}`,
      { waitUntil: "networkidle" },
    );
    await tabletPage.waitForSelector("#panel-tomorrow:not([hidden])");
    await dismissRolePromptIfPresent(tabletPage);
    await expectStickyShell(tabletPage);
    await tabletContext.close();

    const mobileContext = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await mobileContext.addInitScript(() => {
      globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(
      `${WEB_BASE}/?demo=true&tab=review&tool=family-message&classroom=${DEMO_CLASSROOM_ID}`,
      { waitUntil: "networkidle" },
    );
    await mobilePage.waitForSelector(".mobile-nav");
    await dismissRolePromptIfPresent(mobilePage);
    const navBox = await mobilePage.locator(".mobile-nav").boundingBox();
    assert.ok(navBox && navBox.y + navBox.height <= 852.5, "Mobile nav should stay pinned to the viewport bottom");
    await mobilePage.getByTestId("mobile-nav-group-ops").click();
    await mobilePage.waitForSelector("#panel-ops:not([hidden])");
    assert.equal(await mobilePage.locator(".mobile-nav-group--active").count(), 1, "Expected one active mobile nav group");
    await mobileContext.close();

    await page.getByRole("button", { name: /Color theme/i }).click();
    await page.getByRole("button", { name: /Color theme/i }).click();
    const themeState = await page.evaluate(() => ({
      theme: globalThis.document.documentElement.dataset.theme ?? "",
      colorBg: getComputedStyle(globalThis.document.documentElement).getPropertyValue("--color-bg").trim(),
    }));
    assert.equal(themeState.theme, "dark", "Theme toggle should reach dark mode");
    // Dark canvas retuned to #020305 in the 2026-04-17 round-6 black-first
    // dark-mode pass (see docs/decision-log.md). The previous round-2 value
    // #070a0f shipped between 2026-04-12 and 2026-04-17 but is no longer
    // correct; the smoke assertion drifted and is now aligned.
    assert.ok(
      themeState.colorBg === "#020305" || themeState.colorBg.includes("#020305"),
      `Dark theme should apply the near-black Prairie background token; got "${themeState.colorBg}"`,
    );

    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join("\n")}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
    }

    console.log("PASS browser smoke");
  } catch (error) {
    await page.screenshot({ path: FAILURE_SCREENSHOT, fullPage: true });
    const details = [
      error instanceof Error ? error.message : String(error),
      consoleErrors.length > 0 ? `Console errors:\n${consoleErrors.join("\n")}` : "",
      pageErrors.length > 0 ? `Page errors:\n${pageErrors.join("\n")}` : "",
      `Screenshot: ${FAILURE_SCREENSHOT}`,
    ].filter(Boolean);
    throw new Error(details.join("\n\n"), { cause: error });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
