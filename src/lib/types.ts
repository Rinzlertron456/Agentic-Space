export type JobStatus = "queued" | "drafted" | "approved" | "applied" | "rejected";

export type ScreeningAnswer = {
  question: string;
  answer: string;
  confidence: "default" | "jd-aware" | "needs-review";
};

export type OutreachDraft = {
  channel: "linkedin" | "gmail" | "portal";
  purpose: "referral" | "hiring-team" | "authenticity-check" | "application-follow-up";
  recipientHint: string;
  subject?: string;
  body: string;
  requiresApproval: true;
};

export type Job = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  role_family: string;
  url: string;
  company_url?: string | null;
  job_id?: string | null;
  posted_at?: string | null;
  discovered_at: string;
  fit_score: number;
  status: JobStatus;
  description: string;
  requirements: string;
  screening_answers: ScreeningAnswer[];
  outreach_drafts: OutreachDraft[];
  resume_variant: string;
  tailored_resume_docx?: string | null;
  tailored_resume_html?: string | null;
  notes: string;
};

export type ActivityLog = {
  id: number;
  ts: string;
  job_id?: string | null;
  action: string;
  detail: string;
};

export type Settings = {
  scheduler_enabled: boolean;
  schedule_cron_label: string;
  safe_mode: boolean;
  target_locations: string[];
  target_roles: string[];
  ctc_current: string;
  ctc_expected: string;
  notice_period: string;
  serving_notice: string;
  approval_mode: string;
};

export type DashboardData = {
  jobs: Job[];
  logs: ActivityLog[];
  stats: {
    counts: Record<string, number>;
    last_run?: Record<string, unknown> | null;
    settings: Settings;
    db_path: string;
  };
};

export type DiscoveryJobInput = Omit<
  Job,
  "status" | "tailored_resume_docx" | "tailored_resume_html"
> & {
  status?: JobStatus;
  tailored_resume_docx?: string | null;
  tailored_resume_html?: string | null;
};
