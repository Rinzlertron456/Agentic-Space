import { SearchFilters, LinkedInFilters } from "../types/search";

export const DEFAULT_LOCATIONS = ["Hyderabad", "Bengaluru", "Pune"];

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  keywords: [],
  locations: [...DEFAULT_LOCATIONS],
  sources: ["linkedin", "naukri", "indeed", "google_jobs", "company_portal"],
  postedWithin: "last_24_hours",
  experienceLevels: ["associate", "mid_senior"],
  employmentTypes: ["full_time"],
  excludeEasyApply: true,
  maxResults: 50,
};

export const DEFAULT_LINKEDIN_FILTERS: LinkedInFilters = {
  postedWithin: "last_24_hours",
  experienceLevel: ["associate", "mid_senior"],
  employmentType: ["full_time"],
  locations: [...DEFAULT_LOCATIONS],
  remoteFilter: false,
};

// LinkedIn URL TPR parameter mapping
export const LINKEDIN_TPR_MAP: Record<string, number> = {
  last_hour: 3600,
  last_24_hours: 86400,
  last_week: 604800,
  last_month: 2592000,
};
