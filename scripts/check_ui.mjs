import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.UI_CHECK_URL ?? "http://localhost:3000";
const outDir = "artifacts/logs";

async function assertVisible(page, selector, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible())) {
    throw new Error(`${label} is not visible`);
  }
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1365, height: 900 }]
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await assertVisible(page, "h1", "title");
    await assertVisible(page, ".command-strip", "command strip");
    await assertVisible(page, ".metric-row", "metrics");
    const title = await page.locator("h1").innerText();
    const jobs = await page.locator(".job-card").count();
    if (!title.includes("Mobile Job Agent")) {
      throw new Error(`unexpected title: ${title}`);
    }
    if (jobs < 1) {
      throw new Error("expected at least one job card after dry discovery run");
    }
    await page.getByRole("button", { name: "Logs" }).click();
    await assertVisible(page, ".log-list", "log list");
    await page.screenshot({ path: `${outDir}/ui-${name}.png`, fullPage: true });
    await page.close();
  }
  console.log(JSON.stringify({ ok: true, baseUrl, screenshots: [`${outDir}/ui-mobile.png`, `${outDir}/ui-desktop.png`] }));
} finally {
  await browser.close();
}
