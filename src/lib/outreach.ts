import type { OutreachDraft } from "./types";

export function buildOutreachDrafts(job: {
  title: string;
  company: string;
  job_id?: string | null;
  url: string;
  company_url?: string | null;
}): OutreachDraft[] {
  const jobRef = job.job_id ? `Job ID ${job.job_id}` : "the open role";
  return [
    {
      channel: "linkedin",
      purpose: "referral",
      recipientHint: `Current employee or recruiter at ${job.company}`,
      requiresApproval: true,
      body:
        `Hi, I noticed ${jobRef} for ${job.title} at ${job.company}. ` +
        "I have 3+ years of experience across React, TypeScript, Node.js, dashboards, REST APIs, and AI-enabled workflows. " +
        "Could you please confirm if this opening is active and, if relevant, consider referring me? I can share a tailored resume for the role."
    },
    {
      channel: "gmail",
      purpose: "hiring-team",
      recipientHint: `Hiring team / recruiter email for ${job.company}`,
      subject: `Application interest: ${job.title}${job.job_id ? ` (${job.job_id})` : ""}`,
      requiresApproval: true,
      body:
        `Hello,\n\nI am interested in the ${job.title} role at ${job.company}${job.job_id ? ` (${job.job_id})` : ""}. ` +
        "My background includes React, TypeScript, Node.js, FastAPI, enterprise dashboards, SQL optimization, and AI/RAG workflows. " +
        "Before applying, I wanted to confirm the role is active and understand the preferred application route.\n\n" +
        "Regards,\nSreeramula Vinayak Santhosh"
    },
    {
      channel: "portal",
      purpose: "authenticity-check",
      recipientHint: job.company_url ? "Company careers site" : "Company website search",
      requiresApproval: true,
      body:
        `Verify ${job.title} at ${job.company} through the company careers site before applying. ` +
        `Source URL: ${job.company_url ?? job.url}`
    }
  ];
}
