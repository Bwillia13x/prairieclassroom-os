import path from "node:path";
import { mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../node_modules/playwright/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGET_URL = process.env.WALKTHROUGH_URL || "http://127.0.0.1:5173/?demo=true";
const RUN_ID = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const OUTPUT_DIR = path.join(ROOT, "output", "playwright", "walkthrough-recordings", RUN_ID);

const DIFFERENTIATION_TEXT = `Fractions Review Worksheet

1. Circle the larger fraction: 1/4 or 1/3?
2. Show 2/3 on the number line below.
3. Solve: 1/2 + 1/4 = ___
4. Mrs. Okafor has 3/4 of a pizza. If she eats 1/4, how much is left?
5. Write a fraction equal to 1/2.
6. Challenge: 5/6 - 2/6 = ___`;

const TOMORROW_REFLECTION = `This week has been a breakthrough for Brody. The visual timer is working and he is gaining independence. Elena had a real confidence moment in math on Wednesday, but Monday will be disruptive because of the community event. Chantal is helping Daniyal well.`;

const INTERVENTION_NOTE = `Brody used his visual timer independently during the math center rotation today. He set it for 10 minutes, watched it count down, and transitioned to the next station without adult prompting. This is the first time he has done this without support.`;

const FAMILY_CONTEXT = `Elena showed more confidence during fractions today and completed a challenge problem with less reassurance than usual.`;

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function slowType(locator, text, delay = 24) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(text, { delay });
}

async function dismissTour(page) {
  const labels = ["Skip tour", "Got it", "Next"];
  for (let i = 0; i < 6; i += 1) {
    let dismissed = false;
    for (const label of labels) {
      const button = page.getByRole("button", { name: label }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await wait(350);
        dismissed = true;
      }
    }
    if (!dismissed) break;
  }
}

async function installClickOverlay(page) {
  await page.evaluate(() => {
    if (window.__prairieWalkthroughOverlayInstalled) return;
    window.__prairieWalkthroughOverlayInstalled = true;

    const style = document.createElement("style");
    style.textContent = `
      #pw-demo-cursor {
        position: fixed;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: rgba(227, 70, 51, 0.95);
        border: 2px solid white;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 2147483647;
      }
      .pw-demo-ripple {
        position: fixed;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 3px solid rgba(227, 70, 51, 0.9);
        transform: translate(-50%, -50%) scale(0.7);
        opacity: 1;
        pointer-events: none;
        z-index: 2147483646;
        animation: pw-demo-ripple 600ms ease-out forwards;
      }
      @keyframes pw-demo-ripple {
        to {
          transform: translate(-50%, -50%) scale(2.8);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement("div");
    cursor.id = "pw-demo-cursor";
    cursor.style.left = "50vw";
    cursor.style.top = "24vh";
    document.body.appendChild(cursor);

    document.addEventListener("mousemove", (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    }, { passive: true });

    document.addEventListener("click", (event) => {
      const ripple = document.createElement("div");
      ripple.className = "pw-demo-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    }, true);
  });
}

async function activateSection(page, label) {
  const button = page.getByRole("button", { name: new RegExp(`^${label}`) }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await wait(700);
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1600, height: 900 },
    },
  });
  await context.addInitScript(() => {
    localStorage.setItem("prairie-onboarding-done", "true");
  });

  const page = await context.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await installClickOverlay(page);
    await dismissTour(page);

    await page.mouse.move(120, 120);
    await wait(500);

    await activateSection(page, "Prep");

    const artifactTitle = page.getByLabel("Artifact Title");
    await artifactTitle.scrollIntoViewIfNeeded();
    await wait(400);
    await slowType(artifactTitle, "Fractions Review Worksheet", 18);
    await slowType(page.getByLabel("Subject").first(), "Math", 18);
    await slowType(page.getByLabel("Lesson Content"), DIFFERENTIATION_TEXT, 8);
    await slowType(
      page.getByLabel("Instructional Focus (optional)"),
      "Support Elena, add EAL scaffolds for Amira and Daniyal, and extend for Chantal.",
      8,
    );
    await wait(350);
    await page.getByRole("button", { name: "Differentiate" }).last().click();
    await wait(2600);

    await activateSection(page, "Ops");

    const reflection = page.getByLabel("Today's Reflection *");
    await reflection.scrollIntoViewIfNeeded();
    await wait(600);
    await slowType(reflection, TOMORROW_REFLECTION, 8);
    await slowType(
      page.getByLabel("Goal for Tomorrow (optional)"),
      "Protect transitions, celebrate math confidence, and keep the Monday routine steady.",
      8,
    );
    await wait(350);
    await page.getByRole("button", { name: "Generate Tomorrow Plan" }).click();
    await wait(2800);

    await activateSection(page, "Ops");
    await page.getByRole("button", { name: "Log Intervention" }).first().click();
    await wait(900);

    const intervention = page.getByLabel("What happened? *");
    await intervention.scrollIntoViewIfNeeded();
    await wait(600);
    await slowType(intervention, INTERVENTION_NOTE, 8);
    await wait(350);
    await page.getByRole("button", { name: "Log Intervention" }).last().click();
    await wait(2400);

    await activateSection(page, "Review");
    await page.getByRole("button", { name: "Draft Family Message" }).first().click();
    await wait(900);

    const familyContext = page.getByLabel("Context (optional)");
    await familyContext.scrollIntoViewIfNeeded();
    await wait(600);
    await slowType(familyContext, FAMILY_CONTEXT, 8);
    await wait(350);
    await page.getByRole("button", { name: "Draft Family Message" }).last().click();
    await wait(2200);

    await page.mouse.wheel(0, 700);
    await wait(1200);
    const approveButton = page.getByRole("button", { name: /Approve/i }).first();
    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.hover();
      await wait(1200);
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, "final-frame.png"),
      type: "png",
    });
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const rawPath = await video.path();
      const finalPath = path.join(OUTPUT_DIR, "walkthrough.webm");
      await rename(rawPath, finalPath).catch(async () => {});
      console.log(`Walkthrough recording: ${finalPath}`);
    }

    console.log(`Recording artifacts: ${OUTPUT_DIR}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
