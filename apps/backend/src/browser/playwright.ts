import { chromium, Browser, BrowserContext, Page } from "playwright";

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

export async function getContext(): Promise<BrowserContext> {
  if (!context) {
    const b = await getBrowser();
    context = await b.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });
  }
  return context;
}

export async function newPage(): Promise<Page> {
  const ctx = await getContext();
  return await ctx.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}
