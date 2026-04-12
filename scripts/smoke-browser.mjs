import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
const TAB_GROUPS = {
  today: "Today",
  differentiate: "Prep",
  "language-tools": "Prep",
  "tomorrow-plan": "Ops",
  "ea-briefing": "Ops",
  "complexity-forecast": "Ops",
  "log-intervention": "Ops",
  "survival-packet": "Ops",
  "family-message": "Review",
  "support-patterns": "Review",
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

async function expectCheckedStudentInPanel(page, panelId, student, label) {
  const checkbox = page
    .locator(`#panel-${panelId}:not([hidden]) .student-checkbox`)
    .filter({ hasText: student })
    .locator("input");
  await checkbox.waitFor();
  await page.waitForFunction(
    (element) => Boolean(element && typeof element === "object" && "checked" in element && element.checked),
    await checkbox.elementHandle(),
  );
  assert.equal(await checkbox.isChecked(), true, `${label} expected ${student} to be checked`);
}

async function openClassroomPanel(page) {
  await page.click("#shell-classroom-trigger");
  await page.waitForSelector("#shell-classroom-panel");
}

async function selectShellClassroom(page, classroomId) {
  await openClassroomPanel(page);
  await page.selectOption("#shell-classroom", classroomId);
}

async function openTab(page, id) {
  const groupLabel = TAB_GROUPS[id];
  if (groupLabel) {
    await page.locator(".shell-nav__groups").getByRole("button", { name: groupLabel, exact: true }).click();
  }
  await page.click(`#tab-${id}`);
  await page.waitForSelector(`#panel-${id}:not([hidden])`);
}

async function expectPrimaryGroups(page) {
  const labels = await page.locator(".shell-nav__group").allInnerTexts();
  assert.deepEqual(
    labels.map((label) => label.trim()),
    ["Today", "Prep", "Ops", "Review"],
    "Desktop primary nav groups should match the new shell IA",
  );
}

async function openGroup(page, groupLabel, expectedTabId) {
  await page.locator(".shell-nav__groups").getByRole("button", { name: groupLabel, exact: true }).click();
  if (await page.locator(`#tab-${expectedTabId}`).count()) {
    await page.waitForSelector(`#tab-${expectedTabId}[aria-selected="true"]`);
  }
  await page.waitForSelector(`#panel-${expectedTabId}:not([hidden])`);
}

async function expectAuthPromptVisible(page) {
  await page.waitForSelector("#classroom-access-title");
  const title = await page.locator("#classroom-access-title").innerText();
  assert.match(title, new RegExp(PROTECTED_CLASSROOM_ID), "Auth prompt should target the protected classroom");
}

async function expectStickyShell(page) {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(150);
  const box = await page.locator(".app-header").boundingBox();
  assert.ok(box && box.y <= 2, `Sticky shell should remain pinned near the top, got y=${box?.y}`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

async function expectScrollableSubtabs(page) {
  const metrics = await page.locator(".shell-nav__tabs").evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    overflowX: getComputedStyle(node).overflowX,
    rowCount: new Set(
      Array.from(node.children, (child) => Math.round(child.getBoundingClientRect().top)),
    ).size,
  }));
  assert.equal(metrics.overflowX, "auto", "Secondary tabs should scroll horizontally on tablet");
  assert.equal(metrics.rowCount, 1, `Secondary tabs should remain on one row, got ${JSON.stringify(metrics)}`);
}

async function submitAccessCode(page, code) {
  await page.fill("#classroom-access-code", code);
  await page.getByRole("button", { name: "Save & Continue" }).click();
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
    assert.equal((await page.locator(".shell-classroom-panel__id").innerText()).trim(), DEMO_CLASSROOM_ID);
    await page.keyboard.press("Escape");
    await expectPrimaryGroups(page);
    await openGroup(page, "Today", "today");
    await openGroup(page, "Prep", "differentiate");
    await openGroup(page, "Ops", "tomorrow-plan");
    await openGroup(page, "Review", "family-message");
    await expectStickyShell(page);

    await page.goto(`${WEB_BASE}/?demo=true&tab=family-message&classroom=${DEMO_CLASSROOM_ID}`, { waitUntil: "networkidle" });
    await page.waitForSelector("#panel-family-message:not([hidden])");
    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message deep link classroom");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#panel-family-message:not([hidden])");
    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom after refresh");

    await openTab(page, "differentiate");
    await expectSelectValue(page, "#classroom", DEMO_CLASSROOM_ID, "Differentiate classroom");

    await openTab(page, "tomorrow-plan");
    await expectSelectValue(page, "#plan-classroom", DEMO_CLASSROOM_ID, "Tomorrow Plan classroom");

    await openTab(page, "family-message");
    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom");

    await openTab(page, "tomorrow-plan");
    await page.fill("#reflection", "Brody needed help after lunch, and Amira needed language support before writing.");
    await page.fill("#plan-goal", "Keep transitions smooth and reduce language load in math writing.");
    await page.getByRole("button", { name: "Generate Tomorrow Plan" }).click();
    await page.waitForSelector(".plan-viewer", { timeout: HOSTED_GENERATION_TIMEOUT_MS });

    const familyCard = page.locator(".plan-section--family .plan-card--family").first();
    const familyPrefill = parseLabelPair(
      await familyCard.locator(".plan-card-label").innerText(),
    );
    assert.ok(familyPrefill.student, "Expected a family follow-up student in tomorrow plan");
    await familyCard.click();

    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom after plan handoff");
    await expectCheckedStudentInPanel(page, "family-message", familyPrefill.student, "Family Message student after plan handoff");
    await expectSelectValue(page, "#msg-type", familyPrefill.type, "Family Message type after plan handoff");
    assert.match(await page.locator(".prefill-banner-text").innerText(), new RegExp(familyPrefill.student));

    await openTab(page, "tomorrow-plan");
    const interventionCard = page.locator(".plan-section--priorities .plan-card--priority").first();
    const interventionStudent = (await interventionCard.locator(".plan-card-label").innerText()).trim();
    await interventionCard.getByRole("button", { name: "Log Intervention" }).click();

    await expectSelectValue(page, "#int-classroom", DEMO_CLASSROOM_ID, "Intervention classroom after plan handoff");
    const interventionCheckbox = page
      .locator('#panel-log-intervention:not([hidden]) .student-checkbox')
      .filter({ hasText: interventionStudent })
      .locator("input");
    await page.waitForFunction(
      (element) => Boolean(element && typeof element === "object" && "checked" in element && element.checked),
      await interventionCheckbox.elementHandle(),
    );
    assert.equal(await interventionCheckbox.isChecked(), true, `${interventionStudent} should be pre-checked in intervention logger`);

    await openTab(page, "support-patterns");
    await expectSelectValue(page, "#pat-classroom", DEMO_CLASSROOM_ID, "Support Patterns classroom");
    await page.getByRole("button", { name: "Detect Patterns" }).click();
    await page.waitForSelector(".pattern-header", { timeout: HOSTED_GENERATION_TIMEOUT_MS });

    const patternText = await page.locator("#panel-support-patterns:not([hidden]) .workspace-result").innerText();
    assertNoAlphaAliases(patternText, "Support Patterns UI");

    const trendCard = page.locator(".pattern-section--trends .pattern-card").first();
    const trendStudent = (await trendCard.locator(".pattern-card-label").innerText()).trim();
    await trendCard.getByRole("button", { name: new RegExp(`Share positive trend for ${trendStudent} with family`) }).click();

    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom after pattern handoff");
    await expectCheckedStudentInPanel(page, "family-message", trendStudent, "Family Message student after pattern handoff");
    await expectSelectValue(page, "#msg-type", "praise", "Family Message type after pattern handoff");

    await openTab(page, "survival-packet");
    await expectSelectValue(page, "#sp-classroom", DEMO_CLASSROOM_ID, "Survival Packet classroom");
    await page.getByRole("button", { name: "Generate Survival Packet" }).click();
    await page.getByRole("button", { name: "Print Packet" }).waitFor({ timeout: HOSTED_GENERATION_TIMEOUT_MS });

    const packetText = await page.locator(".survival-packet").innerText();
    assert.match(packetText, /Substitute Survival Packet/);
    assert.match(packetText, /Heads Up/);
    assertNoAlphaAliases(packetText, "Survival Packet UI");

    await page.getByRole("button", { name: "Print Packet" }).click();
    const printCalls = await page.evaluate(() => globalThis.__printCalls);
    assert.equal(printCalls, 1, "Print should be invoked exactly once during smoke test");

    await selectShellClassroom(page, PROTECTED_CLASSROOM_ID);
    await expectAuthPromptVisible(page);
    await page.waitForFunction(() => {
      const element = globalThis.document.querySelector(".access-dialog__description");
      const text = element?.textContent ?? "";
      return /Authentication required|needs an access code/i.test(text);
    });

    await submitAccessCode(page, "wrong-code");
    await page.waitForFunction(() => {
      const element = globalThis.document.querySelector(".access-dialog__description");
      return Boolean(element?.textContent?.includes("Invalid classroom code"));
    });
    assert.match(await page.locator(".access-dialog__description").innerText(), /Invalid classroom code/i);

    await submitAccessCode(page, PROTECTED_CLASSROOM_CODE);
    await page.waitForSelector("#classroom-access-title", { state: "detached" });
    await openClassroomPanel(page);
    assert.match(await page.locator(".shell-classroom-panel__details").innerText(), /saved in this browser/i);
    await page.keyboard.press("Escape");
    await openTab(page, "tomorrow-plan");
    await expectSelectValue(page, "#plan-classroom", PROTECTED_CLASSROOM_ID, "Protected classroom tomorrow plan");

    await page.reload({ waitUntil: "networkidle" });
    await openClassroomPanel(page);
    assert.equal((await page.locator(".shell-classroom-panel__id").innerText()).trim(), PROTECTED_CLASSROOM_ID);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#classroom-access-title").count(), 0, "Saved classroom code should survive refresh without prompting");
    assert.match(await page.locator(".shell-classroom-panel__details").innerText(), /saved in this browser/i);
    await page.keyboard.press("Escape");

    const tabletContext = await browser.newContext({ viewport: { width: 720, height: 1100 } });
    await tabletContext.addInitScript(() => {
      globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`${WEB_BASE}/?demo=true&tab=tomorrow-plan&classroom=${DEMO_CLASSROOM_ID}`, { waitUntil: "networkidle" });
    await tabletPage.waitForSelector("#panel-tomorrow-plan:not([hidden])");
    await expectScrollableSubtabs(tabletPage);
    await expectStickyShell(tabletPage);
    await tabletContext.close();

    const mobileContext = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await mobileContext.addInitScript(() => {
      globalThis.localStorage.setItem("prairie-onboarding-done", "true");
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${WEB_BASE}/?demo=true&tab=family-message&classroom=${DEMO_CLASSROOM_ID}`, { waitUntil: "networkidle" });
    await mobilePage.waitForSelector(".mobile-nav");
    const navBox = await mobilePage.locator(".mobile-nav").boundingBox();
    assert.ok(navBox && navBox.y + navBox.height <= 852.5, "Mobile nav should stay pinned to the viewport bottom");
    await mobilePage.locator(".mobile-nav-groups").getByRole("button", { name: "Ops", exact: true }).click();
    await mobilePage.waitForSelector("#panel-tomorrow-plan:not([hidden])");
    assert.equal(await mobilePage.locator(".mobile-nav-group--active").count(), 1, "Expected one active mobile nav group");
    await mobileContext.close();

    await page.getByRole("button", { name: /Color theme/i }).click();
    await page.getByRole("button", { name: /Color theme/i }).click();
    const themeState = await page.evaluate(() => ({
      theme: globalThis.document.documentElement.dataset.theme ?? "",
      colorBg: getComputedStyle(globalThis.document.documentElement).getPropertyValue("--color-bg").trim(),
    }));
    assert.equal(themeState.theme, "dark", "Theme toggle should reach dark mode");
    assert.ok(
      themeState.colorBg === "#1a1610" || themeState.colorBg.includes("#1a1610"),
      "Dark theme should apply prairie-night background token",
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
