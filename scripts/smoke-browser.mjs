import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const WEB_BASE = process.env.PRAIRIE_WEB_BASE ?? "http://localhost:5173";
const DEMO_CLASSROOM_ID = "demo-okafor-grade34";
const OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "output",
  "playwright",
);
const FAILURE_SCREENSHOT = path.join(OUTPUT_DIR, "demo-smoke-failure.png");

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

async function expectSelectValue(page, selector, expected, label) {
  await page.waitForSelector(selector);
  const actual = await page.locator(selector).inputValue();
  assert.equal(actual, expected, `${label} expected ${expected}, got ${actual}`);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
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
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    await page.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "networkidle" });

    await page.waitForSelector(".classroom-context-id");
    assert.equal((await page.locator(".classroom-context-id").innerText()).trim(), DEMO_CLASSROOM_ID);
    await expectSelectValue(page, "#classroom", DEMO_CLASSROOM_ID, "Differentiate classroom");

    await page.click("#tab-tomorrow-plan");
    await expectSelectValue(page, "#plan-classroom", DEMO_CLASSROOM_ID, "Tomorrow Plan classroom");

    await page.click("#tab-family-message");
    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom");

    await page.click("#tab-tomorrow-plan");
    await page.fill("#reflection", "Brody needed help after lunch, and Amira needed language support before writing.");
    await page.fill("#plan-goal", "Keep transitions smooth and reduce language load in math writing.");
    await page.getByRole("button", { name: "Generate Tomorrow Plan" }).click();
    await page.waitForSelector(".plan-viewer");

    const familyCard = page.locator(".plan-section--family .plan-card--family").first();
    const familyPrefill = parseLabelPair(
      await familyCard.locator(".plan-card-label").innerText(),
    );
    assert.ok(familyPrefill.student, "Expected a family follow-up student in tomorrow plan");
    await familyCard.click();

    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom after plan handoff");
    await expectSelectValue(page, "#msg-student", familyPrefill.student, "Family Message student after plan handoff");
    await expectSelectValue(page, "#msg-type", familyPrefill.type, "Family Message type after plan handoff");
    assert.match(await page.locator(".prefill-banner-text").innerText(), new RegExp(familyPrefill.student));

    await page.click("#tab-tomorrow-plan");
    const interventionCard = page.locator(".plan-section--priorities .plan-card--priority").first();
    const interventionStudent = (await interventionCard.locator(".plan-card-label").innerText()).trim();
    await interventionCard.getByRole("button", { name: "Log Intervention" }).click();

    await expectSelectValue(page, "#int-classroom", DEMO_CLASSROOM_ID, "Intervention classroom after plan handoff");
    const interventionCheckbox = page
      .locator(".student-checkbox")
      .filter({ hasText: interventionStudent })
      .locator("input");
    assert.equal(await interventionCheckbox.isChecked(), true, `${interventionStudent} should be pre-checked in intervention logger`);

    await page.click("#tab-support-patterns");
    await expectSelectValue(page, "#pat-classroom", DEMO_CLASSROOM_ID, "Support Patterns classroom");
    await page.getByRole("button", { name: "Detect Patterns" }).click();
    await page.waitForSelector(".pattern-header");

    const patternText = await page.locator(".pattern-report").innerText();
    assertNoAlphaAliases(patternText, "Support Patterns UI");

    const trendCard = page.locator(".pattern-section--trends .pattern-card").first();
    const trendStudent = (await trendCard.locator(".pattern-card-label").innerText()).trim();
    await trendCard.getByRole("button", { name: new RegExp(`Share positive trend for ${trendStudent} with family`) }).click();

    await expectSelectValue(page, "#msg-classroom", DEMO_CLASSROOM_ID, "Family Message classroom after pattern handoff");
    await expectSelectValue(page, "#msg-student", trendStudent, "Family Message student after pattern handoff");
    await expectSelectValue(page, "#msg-type", "praise", "Family Message type after pattern handoff");

    await page.click("#tab-survival-packet");
    await expectSelectValue(page, "#sp-classroom", DEMO_CLASSROOM_ID, "Survival Packet classroom");
    await page.getByRole("button", { name: "Generate Survival Packet" }).click();
    await page.waitForSelector('[aria-label="Print survival packet"]');

    const packetText = await page.locator(".max-w-4xl").innerText();
    assert.match(packetText, /Substitute Survival Packet/);
    assert.match(packetText, /Heads Up/);
    assertNoAlphaAliases(packetText, "Survival Packet UI");

    await page.getByRole("button", { name: "Print survival packet" }).click();
    const printCalls = await page.evaluate(() => globalThis.__printCalls);
    assert.equal(printCalls, 1, "Print should be invoked exactly once during smoke test");

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
