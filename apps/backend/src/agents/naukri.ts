import { newPage } from "../browser/playwright.js";
import { applyStealth } from "../browser/stealth.js";
import type { Page } from "playwright";

export interface NaukriSearchOptions {
  keywords: string[];
  location: string;
  sortBy: "freshness" | "relevance";
  maxResults: number;
}

export interface NaukriJobResult {
  title: string;
  company: string;
  location: string;
  url: string;
  jobId: string;
  postedDate: string;
  experience: string;
  salary: string;
}

/**
 * Build Naukri search URL with filters.
 */
function buildNaukriUrl(options: NaukriSearchOptions): string {
  const keywordParam = encodeURIComponent(options.keywords.join(" "));
  const locationParam = encodeURIComponent(options.location || "Hyderabad");

  // Base search URL
  let url = `https://www.naukri.com/${keywordParam.replace(/%20/g, "-")}-jobs-in-${locationParam.replace(/%20/g, "-")}`;

  // Add freshness parameter
  url += `?sort=${options.sortBy === "freshness" ? "f" : "r"}`;

  return url;
}

/**
 * Parse Naukri job cards from search results page.
 */
async function parseNaukriResults(page: Page): Promise<NaukriJobResult[]> {
  return page.evaluate(() => {
    const results: any[] = [];
    const cards = document.querySelectorAll(".jobTuple, .srp-jobtuple-wrapper, article");

    cards.forEach((card) => {
      try {
        const titleEl = card.querySelector(".title, a.title, .jobTuple-title a");
        const companyEl = card.querySelector(".subTitle, a.subTitle, .companyName");
        const locationEl = card.querySelector(".location, .locWdth");
        const experienceEl = card.querySelector(".experience, .expwdth");
        const salaryEl = card.querySelector(".salary, .sal");
        const linkEl = card.querySelector("a.title, a[href*='/job/']") as HTMLAnchorElement | null;
        const postedEl = card.querySelector(".posted, .jobPostDate, .fleft");

        const title = titleEl?.textContent?.trim() || "";
        const company = companyEl?.textContent?.trim() || "";
        const location = locationEl?.textContent?.trim() || "";
        const experience = experienceEl?.textContent?.trim() || "";
        const salary = salaryEl?.textContent?.trim() || "";
        const rawUrl = linkEl?.href || "";
        const postedDate = postedEl?.textContent?.trim() || "";

        // Extract job ID from URL
        const jobIdMatch = rawUrl.match(/job\/(\d+)/) || rawUrl.match(/jobId=(\d+)/);
        const jobId = jobIdMatch ? jobIdMatch[1] : "";

        if (title && company) {
          results.push({
            title,
            company,
            location,
            url: rawUrl,
            jobId,
            postedDate,
            experience,
            salary,
          });
        }
      } catch {
        // Skip malformed cards
      }
    });

    return results;
  });
}

/**
 * Search Naukri for jobs matching the given criteria.
 * Sorts by freshness. Returns structured results.
 */
export async function searchNaukri(
  options: NaukriSearchOptions
): Promise<NaukriJobResult[]> {
  const results: NaukriJobResult[] = [];
  let page;

  try {
    page = await newPage();
    await applyStealth(page);

    const url = buildNaukriUrl(options);
    console.log(`[Naukri] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for job listings to load
    await page.waitForSelector(".jobTuple, .srp-jobtuple-wrapper, article", {
      timeout: 10000,
    }).catch(() => {
      console.warn("[Naukri] No job listings found — page structure may have changed");
    });

    // Scroll to load more results
    for (let i = 0; i < 2; i++) {
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForTimeout(1500);
    }

    // Parse results
    const parsed = await parseNaukriResults(page);

    // Take only the latest results
    results.push(...parsed);
    console.log(`[Naukri] Found ${results.length} jobs`);
  } catch (error) {
    console.error("[Naukri] Search failed:", error instanceof Error ? error.message : error);
  } finally {
    try {
      await page?.close();
    } catch {}
  }

  return results.slice(0, options.maxResults);
}

/**
 * Look for a specific job on the company's own career portal.
 * Uses Google search to find the company career page for a given job ID.
 */
export async function getCompanyPortalUrl(
  companyName: string,
  jobId: string
): Promise<string | null> {
  let page;
  try {
    page = await newPage();
    await applyStealth(page);

    const searchQuery = encodeURIComponent(
      `${companyName} careers ${jobId} site:${companyName.toLowerCase().replace(/\s+/g, "")}.com`
    );
    const url = `https://www.google.com/search?q=${searchQuery}`;

    console.log(`[Naukri] Searching company portal: ${companyName} careers`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });

    // Look for career page links in Google results
    const careerLink = await page.evaluate(() => {
      const links = document.querySelectorAll("a");
      for (const link of links) {
        const href = link.href;
        const text = link.textContent?.toLowerCase() || "";
        if (
          href &&
          (href.includes("/careers") || href.includes("/jobs") || href.includes("/carrers")) &&
          (text.includes("career") || text.includes("job") || text.includes("apply"))
        ) {
          return href;
        }
      }
      return null;
    });

    return careerLink;
  } catch (error) {
    console.error(`[Naukri] Company portal search failed for ${companyName}:`, error);
    return null;
  } finally {
    try {
      await page?.close();
    } catch {}
  }
}
