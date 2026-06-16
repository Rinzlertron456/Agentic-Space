import {
  SearchFilters,
  SearchResponse,
  JobListing,
  JobSource,
} from "@agentic-space/shared";
import { DEFAULT_SEARCH_FILTERS } from "@agentic-space/shared";
import { v4 as uuidv4 } from "uuid";
import { log } from "./logger.js";
import { getAllKnownCareerUrls } from "../agents/company-site.js";
import { searchWithRag } from "./matcher.js";

function parsePostedAgeHours(postedDate: string): number | null {
  const text = postedDate?.toLowerCase().trim();
  if (!text) return null;
  if (
    /(just posted|today|posted today|recently|few hours|less than an hour|hour ago|hours ago|mins ago|minutes ago|seconds ago)/.test(
      text,
    )
  ) {
    return 0;
  }

  const minuteMatch = text.match(/(\d+)\s*(?:minute|min|mins)/);
  if (minuteMatch) return Number(minuteMatch[1]) / 60;

  const hourMatch = text.match(/(\d+)\s*(?:hour|hr|hrs|h)\b/);
  if (hourMatch) return Number(hourMatch[1]);

  const dayMatch = text.match(/(\d+)\s*(?:day|days|d)\b/);
  if (dayMatch) return Number(dayMatch[1]) * 24;

  const weekMatch = text.match(/(\d+)\s*(?:week|weeks)/);
  if (weekMatch) return Number(weekMatch[1]) * 24 * 7;

  const monthMatch = text.match(/(\d+)\s*(?:month|months)/);
  if (monthMatch) return Number(monthMatch[1]) * 24 * 30;

  const date = new Date(postedDate);
  if (!Number.isNaN(date.getTime())) {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }

  return null;
}

function matchesPostedWithin(
  postedDate: string,
  postedWithin: SearchFilters["postedWithin"],
): boolean {
  if (postedWithin === "any") return true;
  const ageHours = parsePostedAgeHours(postedDate);
  if (ageHours === null) return false;

  switch (postedWithin) {
    case "last_hour":
      return ageHours <= 1;
    case "last_24_hours":
      return ageHours <= 24;
    case "last_week":
      return ageHours <= 24 * 7;
    case "last_month":
      return ageHours <= 24 * 30;
  }
}

// Agent imports
import { searchLinkedIn } from "../agents/linkedin.js";
import { searchNaukri } from "../agents/naukri.js";
import { searchWebJobs } from "../agents/web-search.js";
import { getResume } from "./resume-store.js";
import { closeBrowser } from "../browser/playwright.js";

export async function searchJobs(
  resumeId: string,
  filters: SearchFilters,
): Promise<SearchResponse> {
  const startTime = Date.now();
  const results: JobListing[] = [];
  const errors: string[] = [];

  const mergedFilters: SearchFilters = {
    ...DEFAULT_SEARCH_FILTERS,
    ...filters,
    sources: filters.sources || DEFAULT_SEARCH_FILTERS.sources,
  };

  const resume = getResume(resumeId);
  const resumeKeywords = resume?.skills?.map((s) => s.name) || [];
  const searchKeywords =
    mergedFilters.keywords.length > 0
      ? mergedFilters.keywords
      : resumeKeywords.length > 0
        ? resumeKeywords.slice(0, 5)
        : ["software engineer"];

  const locations =
    mergedFilters.locations.length > 0
      ? mergedFilters.locations
      : ["Hyderabad", "Bengaluru", "Pune"];

  console.log(
    `[Orchestrator] Searching: "${searchKeywords.join(", ")}" in ${locations.join(", ")}`,
  );

  const searches: Promise<void>[] = [];
  for (const source of mergedFilters.sources) {
    switch (source) {
      case "linkedin":
        searches.push(
          searchLinkedInSource(
            results,
            searchKeywords,
            locations,
            mergedFilters,
          ),
        );
        break;
      case "naukri":
        searches.push(
          searchNaukriSource(results, searchKeywords, locations, mergedFilters),
        );
        break;
      case "indeed":
      case "google_jobs":
        searches.push(
          searchWebSource(results, searchKeywords, locations, mergedFilters),
        );
        break;
      case "company_portal":
        searches.push(searchCompanyPortals(results, mergedFilters));
        break;
    }
  }

  // Run searches SEQUENTIALLY to keep Playwright memory usage low
  // Parallel execution opens 3-4 Chromium pages simultaneously (~200-400 MB)
  // Sequential limits to 1 page at a time
  for (const search of searches) {
    await search;
  }

  // Close the browser to free its ~200-350 MB of memory now that searches are done
  await closeBrowser();

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = results.filter((job) => {
    if (seen.has(job.applyUrl) || !job.applyUrl) {
      if (job.source === "company_portal") return true;
      return false;
    }
    seen.add(job.applyUrl);
    return true;
  });

  // RAG scoring: semantic + keyword combined
  const { results: scoredJobs } = await searchWithRag(resumeId, unique);

  const duration = Date.now() - startTime;

  log(
    "job_search",
    `Found ${scoredJobs.length} jobs across ${mergedFilters.sources.length} sources in ${duration}ms (with RAG scoring)`,
    { sources: mergedFilters.sources },
    undefined,
    resumeId,
  );

  return {
    success: true,
    totalResults: scoredJobs.length,
    results: scoredJobs.slice(0, mergedFilters.maxResults),
    searchDuration: duration,
    errors,
  };
}

// ─── LinkedIn Source ───────────────────────────────────────────

async function searchLinkedInSource(
  results: JobListing[],
  keywords: string[],
  locations: string[],
  filters: SearchFilters,
): Promise<void> {
  try {
    const raw = await searchLinkedIn({
      keywords,
      locations,
      postedWithin: filters.postedWithin,
      experienceLevels: filters.experienceLevels,
      employmentTypes: filters.employmentTypes,
      maxResults: Math.min(filters.maxResults, 25),
    });

    console.log(`[Orchestrator] LinkedIn returned ${raw.length} jobs`);

    for (const job of raw) {
      results.push({
        id: uuidv4(),
        source: "linkedin",
        sourceId: job.jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        description: "",
        requirements: [],
        applyUrl: job.url || `https://www.linkedin.com/jobs/view/${job.jobId}/`,
        postedDate: job.postedDate,
        experienceLevel: filters.experienceLevels[0] || "mid_senior",
        employmentType: "full_time",
        isEasyApply: job.isEasyApply,
        matchScore: 0,
        skills: [],
        status: "new",
      });
    }
  } catch (error) {
    console.error("[Orchestrator] LinkedIn source failed:", error);
  }
}

// ─── Naukri Source ─────────────────────────────────────────────

async function searchNaukriSource(
  results: JobListing[],
  keywords: string[],
  locations: string[],
  filters: SearchFilters,
): Promise<void> {
  try {
    const raw = await searchNaukri({
      keywords,
      location: locations[0],
      sortBy: "freshness",
      maxResults: Math.min(filters.maxResults, 20),
    });

    console.log(`[Orchestrator] Naukri returned ${raw.length} jobs`);

    for (const job of raw) {
      if (!matchesPostedWithin(job.postedDate, filters.postedWithin)) continue;

      results.push({
        id: uuidv4(),
        source: "naukri",
        sourceId: job.jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        description: `Experience: ${job.experience || "N/A"} | Salary: ${job.salary || "N/A"}`,
        requirements: [],
        applyUrl: job.url,
        postedDate: job.postedDate,
        experienceLevel: filters.experienceLevels[0] || "mid_senior",
        employmentType: "full_time",
        isEasyApply: false,
        matchScore: 0,
        skills: [],
        status: "new",
      });
    }
  } catch (error) {
    console.error("[Orchestrator] Naukri source failed:", error);
  }
}

// ─── Web Search Source (Indeed + Google Jobs) ─────────────────

async function searchWebSource(
  results: JobListing[],
  keywords: string[],
  locations: string[],
  filters: SearchFilters,
): Promise<void> {
  try {
    const raw = await searchWebJobs(keywords, locations);

    for (const job of raw) {
      if (!matchesPostedWithin(job.postedDate, filters.postedWithin)) continue;

      const source: JobSource =
        job.source === "indeed" ? "indeed" : "google_jobs";

      results.push({
        id: uuidv4(),
        source,
        sourceId: "",
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.salary ? `Salary: ${job.salary}` : "",
        requirements: [],
        applyUrl: job.url,
        postedDate: job.postedDate,
        experienceLevel: filters.experienceLevels[0] || "mid_senior",
        employmentType: "full_time",
        isEasyApply: false,
        matchScore: 0,
        skills: [],
        status: "new",
      });
    }
  } catch (error) {
    console.error("[Orchestrator] Web search source failed:", error);
  }
}

// ─── Company Portal Source ─────────────────────────────────────

async function searchCompanyPortals(
  results: JobListing[],
  _filters: SearchFilters,
): Promise<void> {
  try {
    const urls = getAllKnownCareerUrls();
    console.log(
      `[Company Portals] ${urls.length} curated career sites available`,
    );

    // Add a summary entry for the curated career sites
    results.push({
      id: uuidv4(),
      source: "company_portal",
      sourceId: "career-sites-index",
      title: `${urls.length} Curated Company Career Sites`,
      company: "Referral Community Database",
      location: "India (Multiple)",
      description: `${urls.length} company career sites available for direct search. Includes top companies, mid-size product companies, and startups.`,
      requirements: [],
      applyUrl: "",
      postedDate: new Date().toISOString(),
      experienceLevel: "associate",
      employmentType: "full_time",
      isEasyApply: false,
      matchScore: 0,
      skills: [],
      status: "new",
    });
  } catch (error) {
    console.error("[Company Portals] Error:", error);
  }
}
