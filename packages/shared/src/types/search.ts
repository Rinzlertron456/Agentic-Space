import { JobSource } from "./job";

export interface SearchFilters {
  keywords: string[];
  locations: string[];
  sources: JobSource[];
  postedWithin: PostedWithin;
  experienceLevels: ExperienceLevel[];
  employmentTypes: EmploymentType[];
  excludeEasyApply: boolean;
  maxResults: number;
}

export type PostedWithin =
  | "last_hour"      // TPR=r3600
  | "last_24_hours"  // TPR=r86400
  | "last_week"
  | "last_month"
  | "any";

export type ExperienceLevel = "entry" | "associate" | "mid_senior" | "senior" | "director";

export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

export interface SearchRequest {
  resumeId: string;
  filters: SearchFilters;
}

export interface SearchResponse {
  success: boolean;
  totalResults: number;
  results: import("./job").JobListing[];
  searchDuration: number; // ms
  errors: string[];
}

export interface LinkedInFilters {
  postedWithin: PostedWithin;
  experienceLevel: ExperienceLevel[];
  employmentType: EmploymentType[];
  locations: string[];
  remoteFilter: boolean;
}
