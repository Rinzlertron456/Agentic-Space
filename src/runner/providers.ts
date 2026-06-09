import crypto from "node:crypto";
import { candidateProfile } from "../lib/profile";
import { buildOutreachDrafts } from "../lib/outreach";
import { classifyRole, scoreJob, screeningAnswersFor } from "../lib/scoring";
import type { DiscoveryJobInput } from "../lib/types";

const roleQueries = [
  "Full Stack Developer React Node.js",
  "React Frontend Engineer TypeScript",
  "Node.js Developer React",
  "MERN Stack Developer",
  "UI Dashboard Engineer React",
  "AI Full Stack Developer React FastAPI"
];

const companyTargets = [
  { company: "Microsoft", url: "https://jobs.careers.microsoft.com/global/en/search?q=" },
  { company: "Amazon", url: "https://www.amazon.jobs/en/search?base_query=" },
  { company: "Google", url: "https://www.google.com/about/careers/applications/jobs/results/?q=" },
  { company: "Incedo", url: "https://www.incedoinc.com/careers/search?keyword=" },
  { company: "Infosys", url: "https://career.infosys.com/jobs?search=" },
  { company: "TCS", url: "https://ibegin.tcs.com/iBegin/jobs/search?keyword=" }
];

function nowIso() {
  return new Date().toISOString();
}

function stableId(...parts: string[]) {
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function linkedInUrl(query: string, location: string) {
  const params = new URLSearchParams({
    keywords: query,
    location,
    f_TPR: "r3600",
    f_JT: "F",
    f_E: "3,4"
  });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

function naukriUrl(query: string, location: string) {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const locationSlug = location.toLowerCase();
  return `https://www.naukri.com/${slug}-jobs-in-${locationSlug}?sort=rec`;
}

function makeLead(input: {
  source: string;
  query: string;
  location: string;
  url: string;
  company: string;
  title: string;
  companyUrl?: string;
  jobId?: string | null;
  description: string;
}): DiscoveryJobInput {
  const roleFamily = classifyRole(`${input.title} ${input.description}`);
  const fit = scoreJob({
    title: input.title,
    description: input.description,
    requirements: input.description,
    location: input.location,
    jobId: input.jobId,
    companyUrl: input.companyUrl,
    postedAt: nowIso()
  });
  const job = {
    id: stableId(input.source, input.query, input.location, input.company, input.title),
    source: input.source,
    title: input.title,
    company: input.company,
    location: input.location,
    role_family: roleFamily,
    url: input.url,
    company_url: input.companyUrl ?? null,
    job_id: input.jobId ?? null,
    posted_at: nowIso(),
    discovered_at: nowIso(),
    fit_score: fit,
    status: "queued" as const,
    description: input.description,
    requirements: input.description,
    screening_answers: screeningAnswersFor(input.description),
    outreach_drafts: buildOutreachDrafts({
      title: input.title,
      company: input.company,
      job_id: input.jobId,
      url: input.url,
      company_url: input.companyUrl
    }),
    resume_variant: "fullstack-react-node",
    tailored_resume_docx: null,
    tailored_resume_html: null,
    notes:
      "Safe-mode lead. Review the linked page and approve before any application or outreach. LinkedIn/Naukri account actions must remain human-in-the-loop."
  };
  return job;
}

export function discoverPortalLeads(limit = 36): DiscoveryJobInput[] {
  const leads: DiscoveryJobInput[] = [];
  for (const location of candidateProfile.locations) {
    for (const query of roleQueries) {
      leads.push(
        makeLead({
          source: "LinkedIn",
          query,
          location,
          url: linkedInUrl(query, location),
          company: "LinkedIn Jobs",
          title: `${query} - ${location}`,
          description:
            "Filtered LinkedIn search lead for fresh full-time Associate/Mid-Senior openings. Avoid Easy Apply by default; verify job ID and prefer company careers page/referral path."
        })
      );
      leads.push(
        makeLead({
          source: "Naukri",
          query,
          location,
          url: naukriUrl(query, location),
          company: "Naukri",
          title: `${query} - ${location}`,
          description:
            "Freshness-sorted Naukri search lead for full-time India roles. Use stored screening defaults for CTC, notice period, and reason-for-change drafts after review."
        })
      );
    }
  }
  return leads.slice(0, limit);
}

export function discoverCompanySiteLeads(limit = 24): DiscoveryJobInput[] {
  const leads: DiscoveryJobInput[] = [];
  for (const target of companyTargets) {
    for (const query of roleQueries.slice(0, 4)) {
      const encoded = encodeURIComponent(query);
      leads.push(
        makeLead({
          source: "CompanySite",
          query,
          location: "India",
          url: `${target.url}${encoded}`,
          company: target.company,
          title: `${query}`,
          companyUrl: `${target.url}${encoded}`,
          jobId: null,
          description:
            `Company careers search for ${query}. Prefer this path when LinkedIn or Naukri shows a valid job ID for ${target.company}. Stop for CAPTCHA, payment, suspicious forms, or unclear consent prompts.`
        })
      );
    }
  }
  return leads.slice(0, limit);
}

export function discoverAllLeads() {
  return [...discoverPortalLeads(), ...discoverCompanySiteLeads()].sort((a, b) => b.fit_score - a.fit_score);
}
