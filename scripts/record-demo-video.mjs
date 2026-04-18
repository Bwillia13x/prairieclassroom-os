#!/usr/bin/env node
/**
 * Record a live walkthrough of PrairieClassroom OS as a webm video.
 *
 * Usage:
 *   node scripts/record-demo-video.mjs
 *
 * Prereqs:
 *   - Web dev server running on http://localhost:5173
 *   - Orchestrator on 3100, inference on 3200 (mock mode is fine)
 *
 * Output:
 *   qa/demo-script/videos/walkthrough-<timestamp>.webm
 *   (convert to mp4 with scripts/convert-demo-video.sh)
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Timing manifest — records the exact start offset (ms) of each narration
// beat relative to the first frame of the video. Used by add-voiceover.mjs
// to pad the TTS audio into alignment.
const timings = [];
let recordStartMs = 0;
function mark(beat) {
  const offsetMs = Math.round(performance.now() - recordStartMs);
  timings.push({ beat, offsetMs });
  console.log(`[record] @ ${(offsetMs / 1000).toFixed(2)}s — ${beat}`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const VIDEO_DIR = join(REPO_ROOT, "qa/demo-script/videos");
const BASE_URL = process.env.DEMO_BASE_URL ?? "http://localhost:5173";
const CLASSROOM = "demo-okafor-grade34";
const VIEWPORT = { width: 1440, height: 900 };

mkdirSync(VIDEO_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────
// BEAT TIMINGS — tune these to match your narration pace
// ─────────────────────────────────────────────────────────────────────────
// Each value is milliseconds the camera lingers on the visual after the
// relevant action completes. Total of all values + action overhead should
// land the video at ~3:00 so it matches Kaggle's hard cap.
//
// TODO (user): pick a pacing strategy before running.
//   SLOW (relaxed narration, ~3:20 total): linger 4000–6000 per beat
//   BRISK (crisp narration, ~2:50 total):  linger 2500–4000 per beat
//   CINEMATIC (mix, ~3:00):                vary 2500–6000 intentionally
//
// Current values are CINEMATIC targeting ~3:00. The two wow beats
// (differentiate, family-message) linger longest. Adjust down if the
// resulting mp4 exceeds 3:00 hard cap — Kaggle rejects over-length videos.
//
// Trimmed from an earlier 3:08 take to land safely under the 3:00 hard cap.
// Wow beats (differentiate, family-message) preserved at full length; setup
// beats and closes trimmed 1–3s each.
const BEAT_HOLD_MS = {
  todayHero: 9000,        // opening — let the current morning queue land
  todayDayArc: 6000,      // day-arc / classroom pulse scan
  todayDebt: 7000,        // complexity debt ring
  todayPriority: 2500,    // priority matrix sweep
  differentiateEmpty: 3000,
  differentiateFilling: 600,   // per-keystroke typing delay
  differentiateGenerated: 12000,
  familyMessageEmpty: 3000,
  familyMessageGenerated: 12000,
  eaBriefingGenerated: 9000,
  eaLoadGenerated: 7000,
  forecastGenerated: 8000,
  closeLightTheme: 5000,
  closeMobile: 5000,
};
// ─────────────────────────────────────────────────────────────────────────

function url(tab) {
  return `${BASE_URL}/?classroom=${CLASSROOM}&demo=true&tab=${tab}`;
}

async function dismissDialog(page) {
  await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return;
    const action = Array.from(dlg.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Skip (default to Teacher)") ||
      b.textContent?.includes("Confirm role") ||
      b.textContent?.includes("Skip tour") ||
      b.textContent?.includes("Skip"),
    );
    action?.click();
  });
}

async function waitAndSettle(page, ms) {
  await page.waitForTimeout(ms);
}

async function smoothScrollTo(page, targetY, durationMs = 1200) {
  await page.evaluate(
    ({ targetY, durationMs }) => {
      return new Promise((resolve) => {
        const startY = window.scrollY;
        const delta = targetY - startY;
        const startTime = performance.now();
        function step(now) {
          const t = Math.min(1, (now - startTime) / durationMs);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          window.scrollTo(0, startY + delta * eased);
          if (t < 1) requestAnimationFrame(step);
          else resolve(undefined);
        }
        requestAnimationFrame(step);
      });
    },
    { targetY, durationMs },
  );
}

async function setValue(page, selector, value) {
  await page.evaluate(
    ({ selector, value }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selector, value },
  );
}

async function typeInto(page, selector, text, delayMs) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Selector not found: ${selector}`);
  await el.focus();
  await page.keyboard.type(text, { delay: delayMs });
}

async function clickByText(page, text) {
  await page.evaluate((text) => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === text,
    );
    btn?.click();
  }, text);
}

async function main() {
  console.log("[record] launching chromium…");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: {
      dir: VIDEO_DIR,
      size: VIEWPORT,
    },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // Pre-seed dark theme BEFORE first navigation so the render is dark.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("prairie-theme", "dark");
      localStorage.setItem("prairie-onboarding-done", "true");
      localStorage.setItem(
        "prairie-classroom-roles",
        JSON.stringify({ "demo-okafor-grade34": "teacher" }),
      );
    } catch {
      // localStorage may be unavailable before the page context is ready.
    }
  });

  // Anchor the timing manifest to the moment the video recording starts.
  // Playwright begins recording when context.newPage() resolves — we set
  // this immediately after so every mark() is relative to the first frame.
  recordStartMs = performance.now();

  // ── BEAT 1 — Today hero ──────────────────────────────────────────────
  await page.goto(url("today"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 800);
  await dismissDialog(page);
  await waitAndSettle(page, 400);
  await page.evaluate(() => window.scrollTo(0, 0));
  mark("todayHero");
  await waitAndSettle(page, BEAT_HOLD_MS.todayHero);

  // ── BEAT 2 — Day arc ─────────────────────────────────────────────────
  await smoothScrollTo(page, 380, 1500);
  mark("todayDayArc");
  await waitAndSettle(page, BEAT_HOLD_MS.todayDayArc);

  // ── BEAT 3 — Complexity debt ring ────────────────────────────────────
  await smoothScrollTo(page, 1500, 1500);
  mark("todayDebt");
  await waitAndSettle(page, BEAT_HOLD_MS.todayDebt);

  // ── BEAT 3b — Priority matrix sweep ──────────────────────────────────
  await smoothScrollTo(page, 2100, 1200);
  mark("todayPriority");
  await waitAndSettle(page, BEAT_HOLD_MS.todayPriority);

  // ── BEAT 4 — Differentiate live generation ───────────────────────────
  mark("differentiateNav");
  await page.goto(url("differentiate"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  await page.evaluate(() => {
    document.getElementById("title")?.scrollIntoView({ block: "center" });
  });
  mark("differentiateEmpty");
  await waitAndSettle(page, BEAT_HOLD_MS.differentiateEmpty);

  // Fill form with visible typing
  mark("differentiateTyping");
  await setValue(page, "#title", "Community Helpers Reading Passage");
  await waitAndSettle(page, 300);
  await setValue(page, "#subject", "literacy");
  await waitAndSettle(page, 300);
  await typeInto(
    page,
    "#teacher-goal",
    "Scaffold for Amira's reading level. Pre-teach vocabulary and add sentence frames.",
    BEAT_HOLD_MS.differentiateFilling / 15,
  );
  await waitAndSettle(page, 600);

  // Switch to Paste tab
  await clickByText(page, "Paste");
  await waitAndSettle(page, 500);
  await setValue(
    page,
    "#raw-text",
    `Community Helpers Reading Passage (Grade 3-4)

Every neighborhood depends on community helpers. Firefighters rush to emergencies. Doctors and nurses treat people who are sick or injured. Teachers help children learn. Librarians help us find books. Police officers keep communities safe.

Questions:
1. Name three community helpers.
2. Why are teachers important?
3. Write a sentence about a librarian.`,
  );
  await waitAndSettle(page, 800);

  // Trigger generation
  await clickByText(page, "Generate variants");
  console.log("[record] waiting for differentiate generation…");
  // Wait for the four variant headings to appear
  await page
    .waitForSelector("text=Core Version", { timeout: 15000 })
    .catch(() => console.log("[record] core version selector timed out"));
  await waitAndSettle(page, 1000);
  // Scroll to show the generated output nicely
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h3, h4")).find((el) =>
      el.textContent?.includes("Core Version"),
    );
    h?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -120);
  });
  mark("differentiateGenerated");
  await waitAndSettle(page, BEAT_HOLD_MS.differentiateGenerated);

  // ── BEAT 5 — Family message bilingual ────────────────────────────────
  mark("familyMessageNav");
  await page.goto(url("family-message"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  mark("familyMessageEmpty");
  await waitAndSettle(page, BEAT_HOLD_MS.familyMessageEmpty);

  // Select message type, language, and student
  await setValue(page, "#msg-type", "praise");
  await setValue(page, "#msg-lang", "pa");
  await waitAndSettle(page, 300);
  await typeInto(
    page,
    "#msg-context",
    "Amira presented her reading reflection to the whole class today. First time volunteering. Proud of her courage.",
    30,
  );
  await waitAndSettle(page, 500);

  // Check Amira's box
  await page.evaluate(() => {
    const cb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(
      (c) => c.closest("label")?.textContent?.trim() === "Amira",
    );
    cb?.click();
  });
  await waitAndSettle(page, 500);

  await clickByText(page, "Draft Family Message");
  console.log("[record] waiting for family message generation…");
  await waitAndSettle(page, 3500);
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h2, h3, h4")).find((el) =>
      el.textContent?.includes("Draft") && !el.textContent?.includes("Family Messages"),
    );
    h?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -100);
  });
  mark("familyMessageGenerated");
  await waitAndSettle(page, BEAT_HOLD_MS.familyMessageGenerated);

  // ── BEAT 6 — EA Briefing (27B planning tier) ─────────────────────────
  mark("eaBriefingNav");
  await page.goto(url("ea-briefing"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  await waitAndSettle(page, 800);

  await clickByText(page, "Generate briefing");
  console.log("[record] waiting for ea briefing generation…");
  await waitAndSettle(page, 3500);
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h2, h3, h4")).find((el) =>
      el.textContent?.includes("Daily Briefing"),
    );
    h?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -80);
  });
  mark("eaBriefingGenerated");
  await waitAndSettle(page, BEAT_HOLD_MS.eaBriefingGenerated);

  // ── BEAT 6b — EA Load distribution ───────────────────────────────────
  mark("eaLoadNav");
  await page.goto(url("ea-load"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  await clickByText(page, "Generate load profile");
  console.log("[record] waiting for ea load generation…");
  await waitAndSettle(page, 3500);
  await page.evaluate(() => window.scrollTo(0, 400));
  mark("eaLoadGenerated");
  await waitAndSettle(page, BEAT_HOLD_MS.eaLoadGenerated);

  // ── BEAT 7 — Forecast ────────────────────────────────────────────────
  mark("forecastNav");
  await page.goto(url("complexity-forecast"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  await clickByText(page, "Generate forecast");
  console.log("[record] waiting for forecast generation…");
  await waitAndSettle(page, 3500);
  await page.evaluate(() => window.scrollTo(0, 300));
  mark("forecastGenerated");
  await waitAndSettle(page, BEAT_HOLD_MS.forecastGenerated);

  // ── BEAT 8a — Light theme close ──────────────────────────────────────
  mark("closeLightThemeNav");
  await page.evaluate(() => {
    localStorage.setItem("prairie-theme", "light");
  });
  await page.goto(url("today"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  mark("closeLightTheme");
  await waitAndSettle(page, BEAT_HOLD_MS.closeLightTheme);

  // ── BEAT 8b — Mobile shot ────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    localStorage.setItem("prairie-theme", "dark");
  });
  await page.goto(url("today"));
  await page.waitForLoadState("networkidle");
  await waitAndSettle(page, 600);
  await dismissDialog(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  mark("closeMobile");
  await waitAndSettle(page, BEAT_HOLD_MS.closeMobile);

  // Total duration marker so the aligner knows the video's end.
  mark("end");

  console.log("[record] finalizing video…");
  await page.close();
  await context.close();
  await browser.close();

  const videoPath = await (async () => {
    // Playwright writes videos to context-close; glob the dir for the newest
    const { readdirSync, statSync, renameSync } = await import("node:fs");
    const files = readdirSync(VIDEO_DIR)
      .filter((f) => f.endsWith(".webm"))
      .map((f) => ({ f, mtime: statSync(join(VIDEO_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) throw new Error("No webm produced");
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace(/Z$/, "");
    const finalName = `walkthrough-${stamp}.webm`;
    renameSync(join(VIDEO_DIR, files[0].f), join(VIDEO_DIR, finalName));
    return join(VIDEO_DIR, finalName);
  })();

  // Write the timing manifest next to the video. add-voiceover.mjs uses it.
  const manifestPath = videoPath.replace(/\.webm$/, ".timing.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ video: videoPath, beats: timings }, null, 2),
  );

  console.log(`[record] saved ${videoPath}`);
  console.log(`[record] timing manifest → ${manifestPath}`);
  console.log("\nNext: convert webm → mp4 for YouTube, then add voiceover");
  console.log(`  bash scripts/convert-demo-video.sh "${videoPath}"`);
  console.log(
    `  node scripts/add-voiceover.mjs "${videoPath.replace(/\.webm$/, ".mp4")}"`,
  );
}

main().catch((err) => {
  console.error("[record] failed:", err);
  process.exit(1);
});
