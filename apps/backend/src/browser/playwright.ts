import { chromium, Browser, BrowserContext, Page } from "playwright";
import { config } from "../config.js";

const BROWSER_IDLE_MS = 120_000; // Close browser after 2 min of inactivity

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function clearIdleTimer(): Promise<void> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

async function scheduleClose(): Promise<void> {
  await clearIdleTimer();
  idleTimer = setTimeout(async () => {
    console.log("[Playwright] Idle timeout reached — closing browser");
    await closeBrowser();
  }, BROWSER_IDLE_MS);
}

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: config.browser.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
    });
    console.log("[Playwright] Browser launched");
  }
  // Reset idle timer on each access
  await scheduleClose();
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
  await clearIdleTimer();
  if (context) {
    try {
      await context.close();
    } catch {
      // Ignore errors on close
    }
    context = null;
  }
  if (browser) {
    try {
      await browser.close();
    } catch {
      // Ignore errors on close
    }
    browser = null;
    console.log("[Playwright] Browser closed");
  }
}

/**
 * Reset idle timer — call after completing a group of related page operations
 * to give the timer a fresh start before closing.
 */
export async function resetIdleTimer(): Promise<void> {
  await scheduleClose();
}
