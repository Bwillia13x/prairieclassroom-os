import { chromium } from "../node_modules/playwright/index.mjs";

const label = process.argv[2] || "Prep";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();

await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

const target = page.getByRole("button", { name: new RegExp(`^${label}`) }).first();
if (await target.isVisible().catch(() => false)) {
  await target.click();
  await page.waitForTimeout(700);
}

const nodes = page.locator("button, input, textarea, select, h2, h3");
const count = await nodes.count();
const snapshot = [];
for (let i = 0; i < count; i += 1) {
  const node = nodes.nth(i);
  if (!(await node.isVisible().catch(() => false))) continue;
  snapshot.push(await node.evaluate((el) => ({
    tag: el.tagName,
    text: (el.innerText || el.textContent || "").trim(),
    placeholder: el.getAttribute("placeholder"),
    value: "value" in el ? el.value : null,
    aria: el.getAttribute("aria-label"),
  })));
}

console.log(JSON.stringify(snapshot, null, 2));

await browser.close();
