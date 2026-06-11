import { newPage } from "../browser/playwright.js";
import { applyStealth } from "../browser/stealth.js";
import { LINKEDIN_TPR_MAP } from "@agentic-space/shared";
import type { Page } from "playwright";

export interface LinkedInSearchOptions {
  keywords: string[];
  locations: string[];
  postedWithin: "last_hour" | "last_24_hours";
  experienceLevels: string[];
  employmentTypes: string[];
  maxResults: number;
}

export interface LinkedInJobResult {
  title: string;
  company: string;
  location: string;
  url: string;
  postedDate: string;
  isEasyApply: boolean;
  jobId: string;
}

/**
 * Build LinkedIn job search URL with all filters applied.
 * Replaces TPR=r86400 with TPR=r3600 for past-hour searches.
 */
function buildLinkedInUrl(options: LinkedInSearchOptions): string {
  const tpr = LINKEDIN_TPR_MAP[options.postedWithin] || 86400;

  // Build keyword parameter: URL-encode each keyword joined by space
  const keywordsParam = encodeURIComponent(options.keywords.join(" "));

  // Build location filter — LinkedIn uses geoId for specific cities
  // For simplicity, use the keyword-based location approach
  const locationParam = encodeURIComponent(options.locations.join(" + "));

  // Experience level mapping
  const expMap: Record<string, string> = {
    "entry": "2",
    "associate": "3",
    "mid_senior": "4",
    "senior": "5",
    "director": "6",
  };
  const expParam = options.experienceLevels
    .map((l) => expMap[l] || "4")
    .join("%2C");

  // Build base URL
  let url = "https://www.linkedin.com/jobs/search/";
  url += `?keywords=${keywordsParam}`;
  url += `&location=${locationParam}`;
  url += `&f_TPR=r${tpr}`;
  url += `&f_E=${expParam}`;

  // Employment type filter
  if (options.employmentTypes.includes("full_time")) {
    url += "&f_JT=F";
  }
  if (options.employmentTypes.includes("contract")) {
    url += "&f_JT=C";
  }
  if (options.employmentTypes.includes("part_time")) {
    url += "&f_JT=P";
  }

  // Sort by most recent
  url += "&sortBy=DD";

  // Remote filter
  url += "&f_WT=1"; // On-site

  return url;
}

/**
 * Parse LinkedIn job cards from the search results page.
 */
async function parseLinkedInResults(page: Page): Promise<LinkedInJobResult[]> {
  return page.evaluate(() => {
    const results: any[] = [];
    const cards = document.querySelectorAll(".job-card-container, .jobs-search-results__list-item");

    cards.forEach((card) => {
      try {
        const titleEl = card.querySelector(".job-card-list__title, h3");
        const companyEl = card.querySelector(".job-card-container__company-name, h4");
        const locationEl = card.querySelector(".job-card-container__metadata-item");
        const linkEl = card.querySelector("a.job-card-list__title, a.job-card-container__link") as HTMLAnchorElement | null;
        const postedDateEl = card.querySelector("time, .job-card-container__listed-time");
        const easyApplyEl = card.querySelector(".job-card-container__apply-method");

        const title = titleEl?.textContent?.trim() || "";
        const company = companyEl?.textContent?.trim() || "";
        const location = locationEl?.textContent?.trim() || "";
        const rawUrl = linkEl?.href || "";
        const postedDateText = postedDateEl?.textContent?.trim() || postedDateEl?.getAttribute("datetime") || "";

        // Extract job ID from URL
        const jobIdMatch = rawUrl.match(/\/jobs\/view\/(\d+)/);
        const jobId = jobIdMatch ? jobIdMatch[1] : "";

        // Detect Easy Apply
        const isEasyApply = easyApplyEl?.textContent?.toLowerCase().includes("easy apply") || false;

        if (title || company) {
          results.push({
            title,
            company,
            location,
            url: rawUrl || `https://www.linkedin.com/jobs/view/${jobId}/`,
            postedDate: postedDateText || new Date().toISOString().split("T")[0],
            isEasyApply,
            jobId,
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
 * Search LinkedIn for jobs matching the given criteria.
 * Returns structured results for HITL review.
 */
export async function searchLinkedIn(
  options: LinkedInSearchOptions
): Promise<LinkedInJobResult[]> {
  const results: LinkedInJobResult[] = [];
  let page;

  try {
    page = await newPage();
    await applyStealth(page);

    const url = buildLinkedInUrl(options);
    console.log(`[LinkedIn] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for job cards to load
    await page.waitForSelector(".job-card-container, .jobs-search-results__list-item", {
      timeout: 10000,
    }).catch(() => {
      console.warn("[LinkedIn] No job cards found — page may require login");
    });

    // Auto-scroll to load more results
    let previousHeight = 0;
    let scrolls = 0;
    const maxScrolls = Math.ceil(options.maxResults / 25);
    while (scrolls < maxScrolls && scrolls < 3) {
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForTimeout(2000);
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) break;
      scrolls++;
    }

    // Parse results
    const parsed = await parseLinkedInResults(page);

    // Skip Easy Apply jobs per requirement
    for (const job of parsed) {
      if (!job.isEasyApply) {
        results.push(job);
      }
    }

    console.log(`[LinkedIn] Found ${results.length} non-Easy-Apply jobs (Easy Apply skipped: ${parsed.length - results.length})`);
  } catch (error) {
    console.error("[LinkedIn] Search failed:", error instanceof Error ? error.message : error);
  } finally {
    try {
      await page?.close();
    } catch {}
  }

  return results.slice(0, options.maxResults);
}

/**
 * Get direct LinkedIn job URL for HITL redirect.
 */
export async function getRedirectUrl(linkedInJobId: string): Promise<string> {
  return `https://www.linkedin.com/jobs/view/${linkedInJobId}/`;
}
