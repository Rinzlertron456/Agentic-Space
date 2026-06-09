import { chromium } from "playwright";

export async function openApprovedJobInBrowser(url: string) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return { browser, page };
}

export function shouldStopForSensitiveGate(text: string) {
  const lower = text.toLowerCase();
  return ["captcha", "payment", "credit card", "aadhaar", "passport", "password", "otp"].some((gate) =>
    lower.includes(gate)
  );
}
