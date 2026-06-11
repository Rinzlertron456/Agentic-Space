import * as cheerio from "cheerio";
import { newPage } from "../browser/playwright.js";
import { applyStealth } from "../browser/stealth.js";

export interface WebJobResult {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  postedDate: string;
  salary?: string;
}

interface SearchSource {
  name: string;
  enabled: boolean;
  search: (keywords: string[], location: string) => Promise<WebJobResult[]>;
}

/**
 * Search Indeed India via HTTP + Cheerio (static, fast, no Playwright needed).
 */
async function searchIndeedIndia(
  keywords: string[],
  location: string
): Promise<WebJobResult[]> {
  try {
    const keywordParam = encodeURIComponent(keywords.join(" "));
    const locationParam = encodeURIComponent(location);
    const url = `https://in.indeed.com/jobs?q=${keywordParam}&l=${locationParam}&sort=date&fromage=1`;

    console.log(`[Web Search] Indeed: ${url}`);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: WebJobResult[] = [];

    $(".job_seen_beacon, .resultContent, .cardOutline").each((_i, el) => {
      const $el = $(el);
      const title = $el.find('[id^="jobTitle"], .jobTitle, h2 a').first().text().trim();
      const company = $el.find('[data-testid="company-name"], .companyName, .companyName').first().text().trim();
      const locationEl = $el.find('[data-testid="text-location"], .companyLocation').first().text().trim();
      const linkEl = $el.find("a[href*='/viewjob'], a[href*='/rc/']").first();
      const dateEl = $el.find(".date, .job-age, .result-footer").first().text().trim();
      const salaryEl = $el.find(".salary-snippet, .salaryText").first().text().trim();

      const rawUrl = linkEl.attr("href") || "";
      const applyUrl = rawUrl.startsWith("http") ? rawUrl : `https://in.indeed.com${rawUrl}`;

      if (title) {
        results.push({
          title,
          company,
          location: locationEl,
          url: applyUrl,
          source: "indeed",
          postedDate: dateEl || "Today",
          salary: salaryEl || undefined,
        });
      }
    });

    console.log(`[Web Search] Indeed found ${results.length} jobs`);
    return results;
  } catch (error) {
    console.error("[Web Search] Indeed search failed:", error);
    return [];
  }
}

/**
 * Search Google for Jobs (India) via Playwright + Cheerio.
 * Google Jobs results appear as rich cards in Google SERP.
 */
async function searchGoogleJobs(
  keywords: string[],
  location: string
): Promise<WebJobResult[]> {
  let page;
  try {
    page = await newPage();
    await applyStealth(page);

    const keywordParam = encodeURIComponent(`${keywords.join(" ")} jobs`);
    const locationParam = encodeURIComponent(location);
    const url = `https://www.google.com/search?q=${keywordParam}+${locationParam}&ibp=htl;jobs&hl=en&gl=IN`;

    console.log(`[Web Search] Google Jobs: ${url}`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });

    // Google Jobs shows results in a special widget
    // Try to wait for the job results container
    await page.waitForSelector("div[data-share-url], .BjJfJf, .gws-plugins-horizon-jobs__tl-lvc", {
      timeout: 8000,
    }).catch(() => {
      console.warn("[Web Search] Google Jobs widget not found — page may have changed");
    });

    const html = await page.content();
    const $ = cheerio.load(html);
    const results: WebJobResult[] = [];

    // Parse Google Jobs cards
    $("div[data-share-url], .BjJfJf, li.iFjolb").each((_i, el) => {
      const $el = $(el);
      const title = $el.find(".BjJfJf, .PUpOsf, [role='heading']").first().text().trim();
      const company = $el.find(".vNEEBe, .wHYlTd").first().text().trim();
      const locationEl = $el.find(".Qk80Jf, .KCiEEe").first().text().trim();
      const linkEl = $el.find("a[href*='/jobs/']").first();
      const applyUrl = linkEl.attr("href") || $el.attr("data-share-url") || "";
      const postedEl = $el.find(".LL4CDc, span:contains('ago')").first().text().trim();

      if (title) {
        results.push({
          title: title,
          company,
          location: locationEl,
          url: applyUrl.startsWith("http") ? applyUrl : `https://www.google.com${applyUrl}`,
          source: "google_jobs",
          postedDate: postedEl || "Recently",
        });
      }
    });

    console.log(`[Web Search] Google Jobs found ${results.length} jobs`);
    return results;
  } catch (error) {
    console.error("[Web Search] Google Jobs search failed:", error);
    return [];
  } finally {
    try {
      await page?.close();
    } catch {}
  }
}

/**
 * Main web search orchestrator.
 * Searches Indeed (static) and Google Jobs (Playwright) in parallel.
 */
export async function searchWebJobs(
  keywords: string[],
  locations: string[]
): Promise<WebJobResult[]> {
  const allResults: WebJobResult[] = [];
  const primaryLocation = locations[0] || "India";

  // Run static and dynamic searches in parallel
  const searches: Promise<WebJobResult[]>[] = [];

  // Indeed India — static HTTP
  searches.push(searchIndeedIndia(keywords, primaryLocation));

  // Google Jobs — Playwright
  if (locations.length > 0) {
    for (const location of locations.slice(0, 2)) {
      searches.push(searchGoogleJobs(keywords, location));
    }
  }

  const settled = await Promise.allSettled(searches);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter((job) => {
    if (seen.has(job.url) || !job.url) return false;
    seen.add(job.url);
    return true;
  });

  console.log(`[Web Search] Total: ${unique.length} unique jobs from ${settled.length} sources`);
  return unique;
}
