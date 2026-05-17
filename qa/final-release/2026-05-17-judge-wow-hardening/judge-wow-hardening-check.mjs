import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "qa/final-release/2026-05-17-judge-wow-hardening";
const PUBLIC_ROOT = "https://prairieclassroom-os.vercel.app";
const LOCAL_ROOT = "http://localhost:5173";
const CANONICAL = "/?demo=true&tab=today&classroom=demo-okafor-grade34";
const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 393, height: 852 }],
];

function targetUrl(base, suffix = "") {
  return `${base}${suffix}`;
}

function isIgnoredFailure(failureText = "") {
  return /net::ERR_ABORTED|NS_BINDING_ABORTED/i.test(failureText);
}

async function collectIssues(page, label) {
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const interactive = Array.from(
      document.querySelectorAll("button, a[href], input, select, textarea, [role='button'], [role='tab']"),
    )
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          tag: node.tagName.toLowerCase(),
          text: (node.textContent || node.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.bottom >= 0 &&
            rect.top <= window.innerHeight,
        };
      })
      .filter((item) => item.visible);

    const smallTouchTargets = interactive.filter((item) => item.width < 40 || item.height < 40);
    const rootImage = document.querySelector(".landing-page__image");
    const cta = document.querySelector(".landing-page__cta");
    const ctaRect = cta?.getBoundingClientRect();
    const firstH1 = document.querySelector("h1")?.textContent?.trim() ?? null;

    return {
      url: window.location.href,
      title: document.title,
      h1: firstH1,
      demoApi: doc.dataset.demoApi ?? null,
      horizontalOverflowPx: Math.max(0, body.scrollWidth - window.innerWidth, doc.scrollWidth - window.innerWidth),
      visibleTextSample: body.innerText.slice(0, 600),
      modalOpen: Boolean(document.querySelector('[role="dialog"], .role-prompt-overlay, #classroom-access-title')),
      navCount: document.querySelectorAll("nav").length,
      mainCount: document.querySelectorAll("main").length,
      activeNav: document.querySelector(
        "[aria-current='page'], [role='tab'][aria-selected='true'], .shell-nav__group--active, .mobile-nav-group--active, .mobile-nav__item--active",
      )?.textContent?.trim() ?? null,
      rootImageLoaded: rootImage?.tagName === "IMG" ? rootImage.complete && rootImage.naturalWidth > 1000 : null,
      cta: cta
        ? {
            href: cta.getAttribute("href"),
            width: Math.round(ctaRect?.width ?? 0),
            height: Math.round(ctaRect?.height ?? 0),
            text: cta.textContent?.trim() ?? "",
          }
        : null,
      smallTouchTargets,
    };
  });

  const issues = [];
  if (data.horizontalOverflowPx > 0) issues.push(`${label}: horizontal overflow ${data.horizontalOverflowPx}px`);
  if (data.modalOpen) issues.push(`${label}: unexpected blocking modal is open`);
  if (data.mainCount < 1) issues.push(`${label}: missing main landmark`);
  if (data.url.includes(CANONICAL) && !data.activeNav) issues.push(`${label}: active nav state missing`);
  if (data.url === PUBLIC_ROOT + "/" || data.url === LOCAL_ROOT + "/") {
    if (data.h1 !== "PrairieClassroom OS") issues.push(`${label}: root H1 mismatch`);
    if (!data.rootImageLoaded) issues.push(`${label}: root hero image did not load`);
    if (!data.cta?.href?.includes(CANONICAL)) issues.push(`${label}: CTA does not target canonical demo route`);
    if ((data.cta?.height ?? 0) < 44) issues.push(`${label}: CTA is below 44px touch target height`);
  }

  return { data, issues };
}

async function checkCommandPalette(page, label) {
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+K`);
  await page.waitForSelector('[role="dialog"], [cmdk-root], .command-palette', { timeout: 5_000 });
  const result = await page.evaluate(() => ({
    hasSearch: Boolean(document.querySelector("input[type='search'], [cmdk-input], input")),
    text: document.body.innerText.slice(0, 500),
  }));
  await page.keyboard.press("Escape");
  return result.hasSearch ? [] : [`${label}: command palette opened without a searchable input`];
}

async function checkReducedMotion(browser, base) {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 393, height: 852 },
  });
  const page = await context.newPage();
  await page.goto(targetUrl(base, CANONICAL), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main", { timeout: 15_000 });
  const moving = await page.evaluate(() => Array.from(document.querySelectorAll("*"))
    .map((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        text: (node.textContent || node.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 50),
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        animationIterationCount: style.animationIterationCount,
        transitionDuration: style.transitionDuration,
        width: rect.width,
        height: rect.height,
      };
    })
    .filter((item) =>
      item.width > 0 &&
      item.height > 0 &&
      item.animationName !== "none" &&
      item.animationDuration !== "0s" &&
      item.animationDuration !== "0ms",
    ));
  await context.close();
  const continuousMotion = moving.filter((item) => item.animationIterationCount === "infinite");
  return continuousMotion.length === 0
    ? []
    : [`${base}: reduced-motion view still has continuous CSS animations (${continuousMotion.length})`];
}

async function runTarget(browser, name, base) {
  const result = {
    name,
    base,
    pages: [],
    consoleErrors: [],
    pageErrors: [],
    badResponses: [],
    requestFailures: [],
    issues: [],
  };

  for (const [vpName, viewport] of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") result.consoleErrors.push({ viewport: vpName, text: message.text() });
    });
    page.on("pageerror", (error) => {
      result.pageErrors.push({ viewport: vpName, text: error.message });
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        result.badResponses.push({ viewport: vpName, status: response.status(), url: response.url() });
      }
    });
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "";
      if (!isIgnoredFailure(failure)) {
        result.requestFailures.push({ viewport: vpName, failure, url: request.url() });
      }
    });

    await page.goto(targetUrl(base), { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 15_000 });
    await page.waitForFunction(() => {
      const image = document.querySelector(".landing-page__image");
      return image?.tagName !== "IMG" || (image.complete && image.naturalWidth > 0);
    }, { timeout: 10_000 }).catch(() => {});
    const rootCheck = await collectIssues(page, `${name} root ${vpName}`);
    result.pages.push({ viewport: vpName, route: "root", ...rootCheck.data });
    result.issues.push(...rootCheck.issues);
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `${name}-root-${vpName}.png`),
      fullPage: false,
      animations: "disabled",
    });

    await page.goto(targetUrl(base, CANONICAL), { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 15_000 });
    await page.waitForSelector("#panel-today:not([hidden]), [data-testid='today-hero'], h1", { timeout: 15_000 });
    await page.waitForFunction(() => !document.body.innerText.includes("Loading PrairieClassroom OS"), { timeout: 10_000 }).catch(() => {});
    const appCheck = await collectIssues(page, `${name} canonical ${vpName}`);
    result.pages.push({ viewport: vpName, route: "canonical", ...appCheck.data });
    result.issues.push(...appCheck.issues);
    if (vpName === "desktop") {
      result.issues.push(...await checkCommandPalette(page, `${name} command palette`));
    }
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `${name}-canonical-${vpName}.png`),
      fullPage: false,
      animations: "disabled",
    });

    if (vpName === "mobile") {
      const mobileSmall = appCheck.data.smallTouchTargets
        .filter((item) => !/skip to main/i.test(item.text))
        .slice(0, 12);
      if (mobileSmall.length > 0) {
        result.issues.push(`${name} canonical mobile: ${mobileSmall.length} visible touch targets below 40px`);
        result.pages.at(-1).smallTouchTargetSample = mobileSmall;
      }
    }

    await context.close();
  }

  result.issues.push(...await checkReducedMotion(browser, base));
  if (name === "public") {
    const publicCanonical = result.pages.find((page) => page.route === "canonical" && page.viewport === "desktop");
    if (publicCanonical?.demoApi !== "prairie-static-demo-api") {
      result.issues.push("public canonical desktop: expected prairie-static-demo-api marker");
    }
  }
  return result;
}

async function main() {
  await mkdir(path.join(OUT_DIR, "raw"), { recursive: true });
  await mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  try {
    const results = {
      createdAt: new Date().toISOString(),
      targets: [
        await runTarget(browser, "local", LOCAL_ROOT),
        await runTarget(browser, "public", PUBLIC_ROOT),
      ],
    };
    results.issueCount = results.targets.reduce((sum, target) => sum + target.issues.length, 0);
    await writeFile(
      path.join(OUT_DIR, "raw", "judge-wow-hardening-results.json"),
      `${JSON.stringify(results, null, 2)}\n`,
      "utf8",
    );
    if (results.issueCount > 0) {
      console.error(JSON.stringify(results.targets.map((target) => ({ name: target.name, issues: target.issues })), null, 2));
      process.exitCode = 1;
      return;
    }
    console.log("PASS judge wow hardening check");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
