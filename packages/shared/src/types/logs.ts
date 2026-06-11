export type LogAction =
  | "resume_upload"
  | "resume_analyzed"
  | "job_search"
  | "job_matched"
  | "job_viewed"
  | "resume_tailored"
  | "apply_redirect"
  | "linkedin_message_drafted"
  | "email_drafted"
  | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  action: LogAction;
  message: string;
  details?: Record<string, unknown>;
  jobId?: string;
  resumeId?: string;
}

export interface DailyLog {
  date: string;
  entries: LogEntry[];
}
