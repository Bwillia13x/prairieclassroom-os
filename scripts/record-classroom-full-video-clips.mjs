#!/usr/bin/env node
/* global document, Event, localStorage, performance, requestAnimationFrame, window */
/**
 * Capture carefully framed PrairieClassroom OS proof clips for the
 * "The Classroom Is Already Full" competition video.
 *
 * This records only synthetic demo data from the public demo URL.
 */

import { chromium } from "playwright";
import { mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(
  ROOT,
  "apps",
  "marketing-video",
  "public",
  "browser-captures",
  "the-classroom-is-already-full-2026-05-16",
);
const QA_DIR = join(ROOT, "qa", "demo-script", "videos", "the-classroom-is-already-full-2026-05-16", "raw");
const BASE_URL = "https://prairieclassroom-os.vercel.app";
const CLASSROOM = "demo-okafor-grade34";
const VIEWPORT = { width: 1920, height: 1080 };

mkdirSync(PUBLIC_DIR, { recursive: true });
mkdirSync(QA_DIR, { recursive: true });

function pageUrl(tab, extra = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set("demo", "true");
  url.searchParams.set("classroom", CLASSROOM);
  url.searchParams.set("tab", tab);
  for (const [key, value] of Object.entries(extra)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms);
}

async function dismissDialog(page) {
  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("button"));
    const action = candidates.find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return /skip|confirm role/i.test(text);
    });
    action?.click();
  });
}

async function preparePage(page) {
  await page.addInitScript(() => {
    localStorage.setItem("prairie-theme", "light");
    localStorage.setItem("prairie-onboarding-done", "true");
    localStorage.setItem("prairie-classroom-roles", JSON.stringify({ "demo-okafor-grade34": "teacher" }));
  });
}

async function setValue(page, selector, value) {
  await page.evaluate(
    ({ selector, value }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { selector, value },
  );
}

async function clickByText(page, text) {
  await page.evaluate((text) => {
    const normalize = (value) => value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
    const wanted = normalize(text);
    const buttons = Array.from(document.querySelectorAll("button,[role='tab'],a")).filter(
      (button) => !("disabled" in button) || !button.disabled,
    );
    const button =
      buttons.find((candidate) => normalize(candidate.textContent) === wanted) ??
      buttons.find((candidate) => normalize(candidate.textContent).startsWith(wanted)) ??
      buttons.find((candidate) => normalize(candidate.textContent).includes(wanted));
    if (!button) throw new Error(`Button not found: ${text}`);
    button.click();
  }, text);
}

async function smoothScrollTo(page, targetY, durationMs = 1000) {
  await page.evaluate(
    ({ targetY, durationMs }) =>
      new Promise((resolve) => {
        const scroller = document.querySelector("#main-content");
        const target = scroller && scroller.scrollHeight > scroller.clientHeight ? scroller : window;
        const startY = target === window ? window.scrollY : target.scrollTop;
        const delta = targetY - startY;
        const startTime = performance.now();
        function step(now) {
          const t = Math.min(1, (now - startTime) / durationMs);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          if (target === window) window.scrollTo(0, startY + delta * eased);
          else target.scrollTop = startY + delta * eased;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      }),
    { targetY, durationMs },
  );
}

async function gotoDemo(page, tab, extra) {
  await page.goto(pageUrl(tab, extra), { waitUntil: "load", timeout: 30000 });
  await settle(page, 1200);
  await dismissDialog(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 500);
}

async function newestWebm(dir) {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".webm"))
    .map((file) => ({ file, mtime: statSync(join(dir, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) throw new Error(`No webm output found in ${dir}`);
  return join(dir, files[0].file);
}

function convertToMp4(webm, mp4) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      webm,
      "-vf",
      "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      mp4,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${webm}`);
}

async function recordClip(browser, clip) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "light",
    recordVideo: { dir: QA_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();
  await preparePage(page);
  await clip.run(page);
  await page.close();
  await context.close();

  const webm = await newestWebm(QA_DIR);
  const namedWebm = join(QA_DIR, `${clip.id}.webm`);
  renameSync(webm, namedWebm);
  const mp4 = join(PUBLIC_DIR, `${clip.id}.mp4`);
  convertToMp4(namedWebm, mp4);
  console.log(`[record] ${clip.id} -> ${mp4}`);
}

const clips = [
  {
    id: "01-today-view",
    run: async (page) => {
      await gotoDemo(page, "today");
      await settle(page, 3200);
      await smoothScrollTo(page, 520, 1600);
      await settle(page, 2600);
      await smoothScrollTo(page, 1120, 1800);
      await settle(page, 2600);
      await smoothScrollTo(page, 0, 1400);
      await settle(page, 1600);
    },
  },
  {
    id: "02-differentiate-workflow",
    run: async (page) => {
      await gotoDemo(page, "differentiate");
      await setValue(page, "#title", "Community Helpers Reading Passage");
      await setValue(page, "#subject", "literacy");
      await setValue(
        page,
        "#teacher-goal",
        "Scaffold vocabulary, preserve the learning goal, and create readiness-aligned variants.",
      );
      await settle(page, 700);
      await clickByText(page, "Paste");
      await setValue(
        page,
        "#raw-text",
        `Community Helpers Reading Passage

Every neighborhood depends on community helpers. Firefighters rush to emergencies. Doctors and nurses treat people who are sick or injured. Teachers help children learn. Librarians help us find books.

Questions:
1. Name three community helpers.
2. Why are teachers important?
3. Write a sentence about a librarian.`,
      );
      await settle(page, 1200);
      await clickByText(page, "Generate lesson variants");
      await page.waitForSelector("text=Core Version", { timeout: 18000 }).catch(() => {});
      await settle(page, 1800);
      await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll("h2,h3,h4")).find((el) =>
          el.textContent?.includes("Core Version"),
        );
        heading?.scrollIntoView({ block: "start" });
        window.scrollBy(0, -110);
      });
      await settle(page, 8200);
      await smoothScrollTo(page, 1780, 1800).catch(() => {});
      await settle(page, 2000);
    },
  },
  {
    id: "03-tomorrow-plan-forecast",
    run: async (page) => {
      await gotoDemo(page, "tomorrow");
      await settle(page, 3200);
      await smoothScrollTo(page, 620, 1600);
      await settle(page, 2600);
      await gotoDemo(page, "complexity-forecast");
      await clickByText(page, "Generate forecast").catch(() => {});
      await settle(page, 3800);
      await smoothScrollTo(page, 420, 1400);
      await settle(page, 3200);
    },
  },
  {
    id: "04-ea-briefing",
    run: async (page) => {
      await gotoDemo(page, "ea-briefing");
      await clickByText(page, "Generate briefing").catch(() => {});
      await settle(page, 4200);
      await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll("h2,h3,h4")).find((el) =>
          /briefing|daily/i.test(el.textContent ?? ""),
        );
        heading?.scrollIntoView({ block: "start" });
        window.scrollBy(0, -90);
      });
      await settle(page, 7600);
    },
  },
  {
    id: "05-family-message-approval",
    run: async (page) => {
      await gotoDemo(page, "family-message");
      await setValue(page, "#msg-type", "praise");
      await setValue(page, "#msg-lang", "en");
      await setValue(
        page,
        "#msg-context",
        "Amira volunteered to share her reading reflection and used the vocabulary support independently.",
      );
      await page.evaluate(() => {
        const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find((input) =>
          input.closest("label")?.textContent?.includes("Amira"),
        );
        checkbox?.click();
      });
      await settle(page, 900);
      await clickByText(page, "Draft Family Message");
      await settle(page, 4200);
      await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll("h2,h3,h4")).find((el) =>
          /draft/i.test(el.textContent ?? ""),
        );
        heading?.scrollIntoView({ block: "start" });
        window.scrollBy(0, -100);
      });
      await settle(page, 8400);
    },
  },
  {
    id: "06-support-patterns",
    run: async (page) => {
      await gotoDemo(page, "support-patterns");
      await settle(page, 2800);
      await smoothScrollTo(page, 520, 1600);
      await settle(page, 3200);
      await smoothScrollTo(page, 980, 1600);
      await settle(page, 2600);
    },
  },
];

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    console.log("[record] using installed Chrome");
  } catch {
    console.log("[record] installed Chrome unavailable; using bundled Chromium");
    browser = await chromium.launch({ headless: true });
  }

  try {
    const requested = new Set((process.env.ONLY_CLIPS ?? "").split(",").filter(Boolean));
    const selected = requested.size ? clips.filter((clip) => requested.has(clip.id)) : clips;
    for (const clip of selected) {
      await recordClip(browser, clip);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
