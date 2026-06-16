export type JobSource = "linkedin" | "naukri" | "indeed" | "company_portal" | "google_jobs" | "adzuna" | "remotive" | "other";

export type JobStatus = "new" | "viewed" | "applied" | "skipped" | "saved";

export interface JobListing {
  id: string;
  source: JobSource;
  sourceId: string; // Original ID from source
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary?: {
    min?: number;
    max?: number;
    currency: string;
  };
  applyUrl: string;
  postedDate: string;
  experienceLevel: "entry" | "associate" | "mid_senior" | "senior" | "director";
  employmentType: "full_time" | "part_time" | "contract" | "internship";
  isEasyApply: boolean;
  matchScore: number; // 0-100
  skills: string[];
  hrContact?: {
    name: string;
    email: string;
    linkedin?: string;
  };
  status: JobStatus;
}

export interface BatchAction {
  jobIds: string[];
  action: "apply" | "tailor" | "save" | "skip";
}

export interface BatchActionResponse {
  success: boolean;
  results: {
    jobId: string;
    success: boolean;
    message: string;
    tailoredResumeUrl?: string;
  }[];
}
