import {
  findCompanyCareerSite,
  getAllCareerSiteUrls,
} from "@agentic-space/shared";

export interface CompanySiteResult {
  companyName: string;
  careerPageUrl: string;
  jobUrl: string | null;
  atsType: string | null;
}

/**
 * Find a job on a company's career page using the Referral Community
 * career site database (90+ Indian companies).
 *
 * Strategy:
 * 1. Look up the company in the curated career sites database
 * 2. If found, return the career page URL directly
 * 3. If not found, fall back to Playwright-based search
 */
export async function findJobOnCompanySite(
  companyName: string,
  jobId: string,
  jobTitle: string,
): Promise<CompanySiteResult | null> {
  try {
    // Step 1: Look up in curated career sites database
    const match = findCompanyCareerSite(companyName);

    if (match) {
      // Build a direct URL if we know the ATS platform
      const directUrl = buildDirectJobUrl(match.careerUrl, jobId, jobTitle);
      const atsType = detectAtsType(match.careerUrl);

      return {
        companyName: match.name,
        careerPageUrl: match.careerUrl,
        jobUrl: directUrl,
        atsType,
      };
    }

    // Step 2: Fallback — return null so the orchestrator can try web search
    console.log(`[Company Site] No career site found for "${companyName}"`);
    return null;
  } catch (error) {
    console.error(`[Company Site] Error for ${companyName}:`, error);
    return null;
  }
}

/**
 * Get all curated career site URLs for batch searching
 */
export function getAllKnownCareerUrls(): string[] {
  return getAllCareerSiteUrls();
}

/**
 * Build direct job URL based on known ATS platform patterns
 */
function buildDirectJobUrl(
  careerUrl: string,
  jobId: string,
  jobTitle: string,
): string | null {
  // Known ATS patterns
  const url = careerUrl.toLowerCase();

  if (url.includes("workday") || url.includes("myworkdayjobs")) {
    const slug = jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `${careerUrl.replace(/\/$/, "")}/${slug}/${jobId}`;
  }

  if (url.includes("greenhouse")) {
    return `${careerUrl.replace(/\/$/, "")}/jobs/${jobId}`;
  }

  if (url.includes("lever.co")) {
    return `${careerUrl.replace(/\/$/, "")}/${jobId}`;
  }

  if (url.includes("ashbyhq")) {
    return `${careerUrl.replace(/\/$/, "")}/${jobId}`;
  }

  if (url.includes("bamboohr")) {
    return `${careerUrl.replace(/\/$/, "")}/jobs/view.php?id=${jobId}`;
  }

  // Fallback: just return the career page URL
  return null;
}

/**
 * Detect ATS platform from career page URL
 */
function detectAtsType(careerUrl: string): string | null {
  const url = careerUrl.toLowerCase();

  if (url.includes("workday") || url.includes("myworkdayjobs"))
    return "workday";
  if (url.includes("greenhouse")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("ashbyhq")) return "ashby";
  if (url.includes("bamboohr")) return "bamboohr";
  if (url.includes("successfactors") || url.includes("sap"))
    return "successfactors";
  if (url.includes("taleo") || url.includes("oracle")) return "taleo";
  if (url.includes("icims")) return "icims";

  return null;
}
