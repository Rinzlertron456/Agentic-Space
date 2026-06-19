import { config } from "../config.js";
import { v4 as uuidv4 } from "uuid";
import type { JobListing, JobSource } from "@agentic-space/shared";

/** Max results per API call */
const MAX_RESULTS = 25;

/** Fallback mock jobs when no API is configured (for local demo) */
const FALLBACK_JOBS: JobListing[] = [
  {
    id: "mock-swe-1", source: "other", sourceId: "mock-1",
    title: "Software Engineer", company: "Google", location: "Bengaluru",
    description: "Build and maintain large-scale distributed systems.",
    requirements: ["5+ years experience", "Strong CS fundamentals", "System design"],
    applyUrl: "https://careers.google.com", postedDate: new Date().toISOString(),
    experienceLevel: "mid_senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["JavaScript", "TypeScript", "Python", "Go", "System Design"], status: "new",
  },
  {
    id: "mock-swe-2", source: "other", sourceId: "mock-2",
    title: "Senior Frontend Engineer", company: "Microsoft", location: "Hyderabad",
    description: "Develop modern web applications using React and TypeScript.",
    requirements: ["4+ years React", "TypeScript expertise", "Accessibility knowledge"],
    applyUrl: "https://careers.microsoft.com", postedDate: new Date(Date.now() - 86400000).toISOString(),
    experienceLevel: "senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["React", "TypeScript", "CSS", "Testing", "Performance"], status: "new",
  },
  {
    id: "mock-swe-3", source: "other", sourceId: "mock-3",
    title: "Full Stack Developer", company: "Amazon", location: "Bengaluru",
    description: "Build end-to-end features for Amazon's consumer facing products.",
    requirements: ["3+ years full stack", "AWS experience", "Agile methodology"],
    applyUrl: "https://amazon.jobs", postedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    experienceLevel: "mid_senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["Java", "React", "AWS", "SQL", "Microservices"], status: "new",
  },
  {
    id: "mock-swe-4", source: "other", sourceId: "mock-4",
    title: "Backend Engineer", company: "Stripe", location: "Bengaluru",
    description: "Design and build APIs that power global payments infrastructure.",
    requirements: ["Strong Python or Ruby", "API design", "Distributed systems"],
    applyUrl: "https://stripe.com/jobs", postedDate: new Date().toISOString(),
    experienceLevel: "mid_senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["Python", "Ruby", "PostgreSQL", "Redis", "gRPC"], status: "new",
  },
  {
    id: "mock-swe-5", source: "other", sourceId: "mock-5",
    title: "DevOps Engineer", company: "Netflix", location: "Remote, India",
    description: "Build tools and infrastructure for Netflix's cloud platform.",
    requirements: ["5+ years DevOps", "Kubernetes", "Terraform", "CI/CD"],
    applyUrl: "https://jobs.netflix.com", postedDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    experienceLevel: "senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["Kubernetes", "Terraform", "AWS", "Docker", "CI/CD"], status: "new",
  },
  {
    id: "mock-swe-6", source: "other", sourceId: "mock-6",
    title: "Data Scientist", company: "Flipkart", location: "Bengaluru",
    description: "Apply ML to improve e-commerce search and recommendations.",
    requirements: ["MS/PhD in CS/ML", "Python", "TensorFlow", "SQL"],
    applyUrl: "https://flipkart.careers", postedDate: new Date(Date.now() - 86400000).toISOString(),
    experienceLevel: "mid_senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["Python", "TensorFlow", "SQL", "Statistics", "ML"], status: "new",
  },
  {
    id: "mock-swe-7", source: "other", sourceId: "mock-7",
    title: "Product Manager", company: "Swiggy", location: "Bengaluru",
    description: "Drive product strategy for Swiggy's restaurant platform.",
    requirements: ["3+ years PM experience", "Data-driven", "Tech background"],
    applyUrl: "https://careers.swiggy.com", postedDate: new Date().toISOString(),
    experienceLevel: "mid_senior", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["Product Strategy", "Analytics", "A/B Testing", "Agile"], status: "new",
  },
  {
    id: "mock-swe-8", source: "other", sourceId: "mock-8",
    title: "Engineering Manager", company: "Uber", location: "Bengaluru",
    description: "Lead a team of 8-12 engineers building Uber's mobility platform.",
    requirements: ["7+ years engineering", "2+ years management", "System design"],
    applyUrl: "https://uber.careers", postedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    experienceLevel: "director", employmentType: "full_time", isEasyApply: false,
    matchScore: 0, skills: ["Leadership", "System Design", "Java", "Microservices", "Team Management"], status: "new",
  },
];

// ─── Adzuna API ──────────────────────────────────────────────

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_type?: string;
  category?: { label: string };
}

interface AdzunaResponse {
  count: number;
  results: AdzunaResult[];
}

async function searchAdzuna(
  keywords: string[],
  location: string,
): Promise<JobListing[]> {
  if (!config.jobApi.adzunaAppId || !config.jobApi.adzunaAppKey) {
    return [];
  }

  const country = "in"; // India
  const appId = config.jobApi.adzunaAppId;
  const appKey = config.jobApi.adzunaAppKey;
  const what = encodeURIComponent(keywords.slice(0, 3).join(" "));
  const where = encodeURIComponent(location);
  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1` +
    `?app_id=${appId}&app_key=${appKey}` +
    `&what=${what}&where=${where}` +
    `&results_per_page=${MAX_RESULTS}&sort_by=date&content_type=application/json`;

  console.log(`[JobAPI] Searching Adzuna: ${keywords.join(", ")} in ${location}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[JobAPI] Adzuna returned ${res.status}`);
      return [];
    }

    const data = (await res.json()) as AdzunaResponse;
    console.log(`[JobAPI] Adzuna found ${data.count} jobs`);

    return data.results.map((job): JobListing => {
      const isContract = job.contract_type?.toLowerCase().includes("contract");
      const salaryMin = job.salary_min || 0;
      const salaryMax = job.salary_max || 0;

      return {
        id: uuidv4(),
        source: "other" as JobSource,
        sourceId: job.id,
        title: job.title,
        company: job.company?.display_name || "Unknown",
        location: job.location?.display_name || location,
        description: job.description?.slice(0, 2000) || "",
        requirements: [],
        salary: salaryMin || salaryMax
          ? { min: salaryMin, max: salaryMax, currency: "INR" }
          : undefined,
        applyUrl: job.redirect_url || `https://www.adzuna.co.in/jobs/details/${job.id}`,
        postedDate: job.created || new Date().toISOString(),
        experienceLevel: "mid_senior",
        employmentType: isContract ? "contract" : "full_time",
        isEasyApply: false,
        matchScore: 0,
        skills: extractKeywords(job.title, job.description),
        status: "new",
      };
    });
  } catch (error) {
    console.error("[JobAPI] Adzuna search failed:", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── The Work Number API (simulated free tier) ───────────────

/**
 * The Work Number / Indeed-style free RSS feed.
 * Uses Indeed's RSS feed (no API key needed, static XML).
 */
async function searchIndeedRss(
  keywords: string[],
  location: string,
): Promise<JobListing[]> {
  try {
    const query = encodeURIComponent(keywords.join(" "));
    const loc = encodeURIComponent(location);
    const url = `https://rss.indeed.com/rss?q=${query}&l=${loc}&sort=date`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!res.ok) return [];
    const xml = await res.text();

    // Simple XML parse — extract job entries
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[JobAPI] Indeed RSS found ${items.length} jobs`);

    return items.slice(0, 20).map((item, i): JobListing => {
      const title = item.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || "";
      const company = item.match(/<source[^>]*>([^<]+)<\/source>/)?.[1]?.trim() ||
                      item.match(/<span[^>]*class="company"[^>]*>([^<]+)/)?.[1]?.trim() || "Unknown";
      const desc = item.match(/<description>([^<]*)<\/description>/)?.[1]?.trim() || "";
      const link = item.match(/<link>([^<]+)<\/link>/)?.[1]?.trim() || "";
      const dateStr = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]?.trim() || new Date().toISOString();

      return {
        id: uuidv4(),
        source: "indeed" as JobSource,
        sourceId: `indeed-rss-${i}`,
        title,
        company,
        location,
        description: desc.replace(/<[^>]*>/g, "").slice(0, 1000),
        requirements: [],
        applyUrl: link,
        postedDate: dateStr,
        experienceLevel: "mid_senior",
        employmentType: "full_time",
        isEasyApply: false,
        matchScore: 0,
        skills: extractKeywords(title, desc),
        status: "new",
      };
    });
  } catch (error) {
    console.error("[JobAPI] Indeed RSS failed:", error);
    return [];
  }
}

// ─── Organic Search via SERP (for LinkedIn, Naukri, etc) ─────

async function searchOrganicJobs(
  keywords: string[],
  location: string,
  siteFilter: string,
  sourceType: JobSource
): Promise<JobListing[]> {
  try {
    if (!config.jobApi.serpApiKey) return [];
    
    // e.g. "software engineer jobs in Bengaluru site:linkedin.com/jobs/view"
    const query = encodeURIComponent(`${keywords.join(" ")} jobs in ${location} ${siteFilter}`);
    const url = `https://serpapi.com/search?engine=google&q=${query}&hl=en&gl=in`;

    const res = await fetch(`${url}&api_key=${config.jobApi.serpApiKey}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    const results = data.organic_results || [];
    return results.slice(0, 15).map((result: any): JobListing => {
      // Try to parse title and company from snippets like "Software Engineer - Google - Bengaluru"
      let title = result.title || "";
      let company = "Unknown";
      
      if (title.includes(" - ")) {
        const parts = title.split(" - ");
        title = parts[0]?.trim() || title;
        company = parts[1]?.trim() || company;
        company = company.replace(/\|.*$/, "").trim();
      }

      return {
        id: uuidv4(),
        source: sourceType,
        sourceId: result.position?.toString() || uuidv4(),
        title: title.replace(/\|.*$/, "").trim(),
        company,
        location,
        description: result.snippet || "",
        requirements: [],
        applyUrl: result.link || "",
        postedDate: new Date().toISOString(),
        experienceLevel: "mid_senior",
        employmentType: "full_time",
        isEasyApply: false,
        matchScore: 0,
        skills: extractKeywords(title, result.snippet || ""),
        status: "new",
      };
    });
  } catch (error) {
    console.error(`[JobAPI] Organic search failed for ${siteFilter}:`, error);
    return [];
  }
}

// ─── Public aggregator: Google Jobs via SERP (free, no key) ─

async function searchGoogleJobsApi(
  keywords: string[],
  location: string,
): Promise<JobListing[]> {
  try {
    // Use a free Google Jobs scraper endpoint
    const query = encodeURIComponent(`${keywords.join(" ")} jobs in ${location}`);
    const url = `https://serpapi.com/search?engine=google_jobs&q=${query}&hl=en&gl=in`;

    // If no SERP API key, skip
    if (!config.jobApi.serpApiKey) return [];

    const res = await fetch(`${url}&api_key=${config.jobApi.serpApiKey}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    const jobsResults = data.jobs_results || [];
    return jobsResults.map((job: any): JobListing => ({
      id: uuidv4(),
      source: "google_jobs" as JobSource,
      sourceId: job.job_id || "",
      title: job.title || "",
      company: job.company_name || "Unknown",
      location: job.location || location,
      description: job.description || "",
      requirements: Array.isArray(job.extensions) ? job.extensions : [],
      applyUrl: job.related_links?.[0]?.link || job.share_link || "",
      postedDate: job.publish_date || new Date().toISOString(),
      experienceLevel: "mid_senior",
      employmentType: "full_time",
      isEasyApply: false,
      matchScore: 0,
      skills: extractKeywords(job.title || "", job.description || ""),
      status: "new",
    }));
  } catch (error) {
    console.error("[JobAPI] Google Jobs search failed:", error);
    return [];
  }
}

// ─── Free fallback: Remotive API (no key needed) ─────────────

async function searchRemotive(
  keywords: string[],
): Promise<JobListing[]> {
  try {
    const query = encodeURIComponent(keywords.join(" "));
    const url = `https://remotive.com/api/remote-jobs?search=${query}&limit=25`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data = await res.json();
    const jobs = data.jobs || [];

    return jobs.map((job: any): JobListing => ({
      id: uuidv4(),
      source: "other" as JobSource,
      sourceId: `remotive-${job.id}`,
      title: job.title || "",
      company: job.company_name || "Unknown",
      location: job.candidate_required_location || "Remote",
      description: (job.description || "").replace(/<[^>]*>?/gm, '').slice(0, 2000),
      requirements: [],
      applyUrl: job.url || "",
      postedDate: job.publication_date || new Date().toISOString(),
      experienceLevel: "mid_senior",
      employmentType: job.job_type === "full_time" ? "full_time" : "contract",
      isEasyApply: false,
      matchScore: 0,
      skills: job.tags || extractKeywords(job.title || "", job.description || ""),
      status: "new",
    }));
  } catch (error) {
    console.error("[JobAPI] Remotive API failed:", error);
    return [];
  }
}

// ─── Main orchestrator ──────────────────────────────────────

export type JobApiSource = "adzuna" | "remotive" | "indeed" | "google_jobs" | "linkedin" | "naukri" | "company_portal" | "mock";

export async function searchJobsViaApi(
  keywords: string[],
  locations: string[],
  source: JobApiSource,
): Promise<JobListing[]> {
  const allJobs: JobListing[] = [];

  for (const location of locations.slice(0, 2)) {
    let jobs: JobListing[] = [];

    switch (source) {
      case "adzuna":
        jobs = await searchAdzuna(keywords, location);
        break;
      case "remotive":
        jobs = await searchRemotive(keywords);
        break;
      case "indeed":
        jobs = await searchIndeedRss(keywords, location);
        break;
      case "google_jobs":
        jobs = await searchGoogleJobsApi(keywords, location);
        break;
      case "linkedin":
        jobs = await searchOrganicJobs(keywords, location, "site:linkedin.com/jobs/view", "linkedin");
        // Fallback if no jobs found from API
        if (jobs.length === 0) jobs = getMockJobs(keywords, location).map(j => ({ ...j, source: "linkedin" }));
        break;
      case "naukri":
        jobs = await searchOrganicJobs(keywords, location, "site:naukri.com/job-listings", "naukri");
        if (jobs.length === 0) jobs = getMockJobs(keywords, location).map(j => ({ ...j, source: "naukri" }));
        break;
      case "company_portal":
        jobs = await searchOrganicJobs(keywords, location, "inurl:careers OR site:lever.co OR site:greenhouse.io OR site:workday.com", "company_portal");
        if (jobs.length === 0) jobs = getMockJobs(keywords, location).map(j => ({ ...j, source: "company_portal" }));
        break;
      case "mock":
        jobs = getMockJobs(keywords, location).map(j => ({ ...j, source: "other" }));
        break;
    }

    allJobs.push(...jobs);
  }

  // Deduplicate by title+company
  const seen = new Set<string>();
  const unique = allJobs.filter((job) => {
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[JobAPI] ${source}: ${unique.length} unique jobs from ${allJobs.length} raw`);
  return unique;
}

/**
 * Try all available API sources in priority order or concurrently,
 * based on the requested sources.
 */
export async function searchAllSources(
  keywords: string[],
  locations: string[],
  requestedSources: JobSource[] = ["adzuna", "remotive", "indeed", "google_jobs"]
): Promise<{ jobs: JobListing[]; source: string }> {
  
  const promises = requestedSources.map(source => {
    // Map JobSource to JobApiSource if needed
    const apiSource = source as JobApiSource;
    return searchJobsViaApi(keywords, locations, apiSource).catch(err => {
      console.error(`[JobAPI] Failed for source ${source}:`, err);
      return [] as JobListing[];
    });
  });

  const results = await Promise.all(promises);
  let allJobs = results.flat();

  // If no jobs were found from configured APIs, fall back to some general mock data
  if (allJobs.length === 0) {
    console.log("[JobAPI] No jobs found from requested sources — falling back to mock data");
    allJobs = getMockJobs(keywords, locations[0] || "India");
  }

  // Deduplicate again across all sources
  const seen = new Set<string>();
  const unique = allJobs.filter((job) => {
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { jobs: unique, source: requestedSources.join(",") };
}

// ─── Mock data (fallback when no API is configured) ─────────

function getMockJobs(keywords: string[], location: string): JobListing[] {
  const keyword = keywords[0]?.toLowerCase() || "software";

  // Filter mock jobs by keyword relevance
  return FALLBACK_JOBS.filter((job) => {
    const text = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
    return text.includes(keyword);
  });
}

// ─── Helper ─────────────────────────────────────────────────

function extractKeywords(title: string, description: string): string[] {
  const techKeywords = [
    "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "Ruby",
    "React", "Angular", "Vue", "Node", "Express", "Django", "Flask", "Spring",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "PostgreSQL", "MongoDB", "Redis", "MySQL", "SQL",
    "GraphQL", "REST", "API", "Microservices", "CI/CD", "DevOps",
    "Machine Learning", "AI", "Data Science", "NLP", "Computer Vision",
    "Agile", "Scrum", "Leadership", "Product Management",
  ];

  const text = `${title} ${description}`;
  return techKeywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).slice(0, 10);
}
