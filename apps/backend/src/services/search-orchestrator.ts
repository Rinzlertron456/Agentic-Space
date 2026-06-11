import { SearchFilters, SearchResponse, JobListing, JobSource } from "@agentic-space/shared";
import { DEFAULT_SEARCH_FILTERS } from "@agentic-space/shared";
import { v4 as uuidv4 } from "uuid";
import { log } from "./logger.js";
import { getAllKnownCareerUrls } from "../agents/company-site.js";

// Agent imports
import { searchLinkedIn } from "../agents/linkedin.js";
import { searchNaukri } from "../agents/naukri.js";
import { searchWebJobs } from "../agents/web-search.js";
import { getResume } from "./resume-store.js";

export async function searchJobs(
  resumeId: string,
  filters: SearchFilters
): Promise<SearchResponse> {
  const startTime = Date.now();
  const results: JobListing[] = [];
  const errors: string[] = [];

  // Merge with defaults
  const mergedFilters: SearchFilters = {
    ...DEFAULT_SEARCH_FILTERS,
    ...filters,
    sources: filters.sources || DEFAULT_SEARCH_FILTERS.sources,
  };

  // Load resume for keyword generation if available
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

  console.log(`[Orchestrator] Searching: "${searchKeywords.join(", ")}" in ${locations.join(", ")}`);

  // Dispatch to all active sources in parallel
  const searches: Promise<void>[] = [];

  for (const source of mergedFilters.sources) {
    switch (source) {
      case "linkedin":
        searches.push(searchLinkedInSource(results, searchKeywords, locations, mergedFilters));
        break;
      case "naukri":
        searches.push(searchNaukriSource(results, searchKeywords, locations, mergedFilters));
        break;
      case "indeed":
      case "google_jobs":
        searches.push(searchWebSource(results, searchKeywords, locations, mergedFilters));
        break;
      case "company_portal":
        searches.push(searchCompanyPortals(results, mergedFilters));
        break;
    }
  }

  // Wait for all searches (with individual timeouts via Promise.allSettled)
  await Promise.allSettled(searches);

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = results.filter((job) => {
    if (seen.has(job.applyUrl) || !job.applyUrl) {
      if (job.source === "company_portal") return true; // Keep career site entries
      return false;
    }
    seen.add(job.applyUrl);
    return true;
  });

  // Compute match scores (simple keyword overlap)
  for (const job of unique) {
    if (job.source !== "company_portal") {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      const matched = searchKeywords.filter((kw) =>
        jobText.includes(kw.toLowerCase())
      ).length;
      job.matchScore = Math.min(100, Math.round((matched / Math.max(searchKeywords.length, 1)) * 100));
    }
  }

  // Sort by match score descending, then by date
  unique.sort((a, b) => b.matchScore - a.matchScore);

  const duration = Date.now() - startTime;

  log(
    "job_search",
    `Found ${unique.length} jobs across ${mergedFilters.sources.length} sources in ${duration}ms`,
    {
      sources: mergedFilters.sources,
      resultsPerSource: {
        total: unique.length,
      },
    },
    undefined,
    resumeId
  );

  return {
    success: true,
    totalResults: unique.length,
    results: unique.slice(0, mergedFilters.maxResults),
    searchDuration: duration,
    errors,
  };
}

// ─── LinkedIn Source ───────────────────────────────────────────

async function searchLinkedInSource(
  results: JobListing[],
  keywords: string[],
  locations: string[],
  filters: SearchFilters
): Promise<void> {
  try {
    const raw = await searchLinkedIn({
      keywords,
      locations,
      postedWithin: filters.postedWithin === "last_hour" ? "last_hour" : "last_24_hours",
      experienceLevels: filters.experienceLevels,
      employmentTypes: filters.employmentTypes,
      maxResults: Math.min(filters.maxResults, 25),
    });

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
  filters: SearchFilters
): Promise<void> {
  try {
    const raw = await searchNaukri({
      keywords,
      location: locations[0],
      sortBy: "freshness",
      maxResults: Math.min(filters.maxResults, 20),
    });

    for (const job of raw) {
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
  filters: SearchFilters
): Promise<void> {
  try {
    const raw = await searchWebJobs(keywords, locations);

    for (const job of raw) {
      const source: JobSource = job.source === "indeed" ? "indeed" : "google_jobs";

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
  _filters: SearchFilters
): Promise<void> {
  try {
    const urls = getAllKnownCareerUrls();
    console.log(`[Company Portals] ${urls.length} curated career sites available`);

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
