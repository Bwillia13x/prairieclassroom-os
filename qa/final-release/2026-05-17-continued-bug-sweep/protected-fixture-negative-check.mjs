/* global fetch */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:5174";
const API_BASE = "http://localhost:3110/api";
const OUT_DIR = path.resolve("qa/final-release/2026-05-17-continued-bug-sweep");
const SHOTS = path.join(OUT_DIR, "screenshots");
const RAW = path.join(OUT_DIR, "raw");

function isExpectedAuthConsole(text) {
  return /Failed to load resource: the server responded with a status of (401|403)/.test(text);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await mkdir(RAW, { recursive: true });

  const results = {
    createdAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBase: API_BASE,
    protectedClassroom: null,
    promptShown: false,
    invalidCodeRejected: false,
    validCodeAccepted: false,
    consoleErrors: [],
    pageErrors: [],
  };

  const classrooms = await fetch(`${API_BASE}/classrooms`).then((res) => res.json());
  const protectedClassroom = Array.isArray(classrooms)
    ? classrooms.find((entry) => entry?.requires_access_code === true)
    : null;
  assert.ok(protectedClassroom, "Expected fixture API to expose a protected classroom");
  results.protectedClassroom = protectedClassroom;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" && !isExpectedAuthConsole(message.text())) {
      results.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));

  try {
    await page.goto(`${BASE_URL}/?classroom=${protectedClassroom.classroom_id}&tab=today`, { waitUntil: "domcontentloaded" });
    await page.getByText(/protected.*access code|needs an access code|Authentication required/i).waitFor({ timeout: 20_000 });
    results.promptShown = true;
    await page.screenshot({ path: path.join(SHOTS, "protected-fixture-code-prompt.png"), fullPage: false, animations: "disabled" });

    await page.fill("#classroom-access-code", "wrong-code");
    await page.getByTestId("classroom-access-save").click();
    await page.getByText(/Invalid classroom code|access code.*did/i).waitFor({ timeout: 20_000 });
    results.invalidCodeRejected = true;
    await page.screenshot({ path: path.join(SHOTS, "protected-fixture-invalid-code.png"), fullPage: false, animations: "disabled" });

    await page.fill("#classroom-access-code", "qa-code-123");
    await page.getByTestId("classroom-access-save").click();
    await page.waitForSelector("#classroom-access-title", { state: "detached", timeout: 20_000 });
    await page.waitForSelector("#panel-today:not([hidden])", { timeout: 20_000 });
    results.validCodeAccepted = true;
    await page.screenshot({ path: path.join(SHOTS, "protected-fixture-valid-code-today.png"), fullPage: true, animations: "disabled" });

    assert.deepEqual(results.consoleErrors, []);
    assert.deepEqual(results.pageErrors, []);
    await writeFile(path.join(RAW, "protected-fixture-negative-check-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    console.log("PASS protected fixture negative browser check");
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    await page.screenshot({ path: path.join(SHOTS, "protected-fixture-negative-check-failure.png"), fullPage: true, animations: "disabled" }).catch(() => {});
    await writeFile(path.join(RAW, "protected-fixture-negative-check-results.json"), `${JSON.stringify(results, null, 2)}\n`);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
