import {
  SearchFilters,
  SearchResponse,
  JobListing,
  JobSource,
} from "@agentic-space/shared";
import { DEFAULT_SEARCH_FILTERS } from "@agentic-space/shared";
import { v4 as uuidv4 } from "uuid";
import { log } from "./logger.js";
import { searchWithRag } from "./matcher.js";
import { searchAllSources } from "./job-api.js";

export async function searchJobs(
  resumeId: string,
  filters: SearchFilters,
): Promise<SearchResponse> {
  const startTime = Date.now();
  const errors: string[] = [];

  const mergedFilters: SearchFilters = {
    ...DEFAULT_SEARCH_FILTERS,
    ...filters,
    sources: filters.sources || DEFAULT_SEARCH_FILTERS.sources,
  };

  const { getResume } = await import("./resume-store.js");
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
    `[Orchestrator] Searching via API: "${searchKeywords.join(", ")}" in ${locations.join(", ")}`,
  );

  // Use API-based job search (no Playwright scraping needed)
  const { jobs, source } = await searchAllSources(searchKeywords, locations);

  // RAG scoring: semantic + keyword combined
  const { results: scoredJobs } = await searchWithRag(resumeId, jobs);

  const duration = Date.now() - startTime;

  log(
    "job_search",
    `Found ${scoredJobs.length} jobs via ${source} in ${duration}ms (with RAG scoring)`,
    { source, searchKeywords, locations },
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
