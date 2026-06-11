import { embed } from "./ollama.js";
import type { JobListing } from "@agentic-space/shared";
import { getResume } from "./resume-store.js";
import { log } from "./logger.js";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function buildResumeText(resumeId: string): string {
  const resume = getResume(resumeId);
  if (!resume) return "";
  const parts: string[] = [
    resume.summary,
    resume.currentRole,
    ...resume.skills.map((s) => `${s.name} (${s.proficiency})`),
    ...resume.experience.map((e) => `${e.title} at ${e.company}: ${e.highlights.join(". ")}`),
    ...resume.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`),
    ...resume.preferredRoles,
  ];
  return parts.filter(Boolean).join(". ").slice(0, 4000);
}

function buildJobText(job: JobListing): string {
  const parts: string[] = [
    job.title,
    job.company,
    job.description,
    ...job.skills,
    ...job.requirements,
  ];
  return parts.filter(Boolean).join(". ").slice(0, 2000);
}

export async function matchResumeToJob(
  resumeId: string,
  job: JobListing
): Promise<{
  matchScore: number;
  semanticScore: number;
  keywordScore: number;
  matchedSkills: string[];
}> {
  const resume = getResume(resumeId);
  const resumeKeywords = resume?.skills?.map((s) => s.name.toLowerCase()) || [];
  const jobText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
  const matchedSkills = resumeKeywords.filter((kw) => jobText.includes(kw));
  const keywordScore = resumeKeywords.length > 0
    ? Math.round((matchedSkills.length / resumeKeywords.length) * 100)
    : 0;
  let semanticScore = 0;
  try {
    const resumeText = buildResumeText(resumeId);
    const jobTextFull = buildJobText(job);
    if (resumeText && jobTextFull) {
      const [resumeEmbedding, jobEmbedding] = await Promise.all([
        embed(resumeText).catch(() => null),
        embed(jobTextFull).catch(() => null),
      ]);
      if (resumeEmbedding && jobEmbedding) {
        semanticScore = Math.round(cosineSimilarity(resumeEmbedding, jobEmbedding) * 100);
      }
    }
  } catch {}
  const matchScore = semanticScore > 0
    ? Math.round(semanticScore * 0.6 + keywordScore * 0.4)
    : keywordScore;
  return { matchScore, semanticScore, keywordScore, matchedSkills: matchedSkills.slice(0, 10) };
}

export async function matchResumeToJobs(
  resumeId: string,
  jobs: JobListing[],
  onProgress?: (done: number, total: number) => void
): Promise<JobListing[]> {
  const results: JobListing[] = [];
  let completed = 0;
  const BATCH_SIZE = 5;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((job) => matchResumeToJob(resumeId, job))
    );
    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j];
      const job = { ...batch[j] };
      if (result.status === "fulfilled") {
        job.matchScore = result.value.matchScore;
      }
      results.push(job);
      completed++;
      onProgress?.(completed, jobs.length);
    }
  }
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}

export async function searchWithRag(
  resumeId: string,
  jobs: JobListing[]
): Promise<{ results: JobListing[]; ragDurationMs: number }> {
  const startTime = Date.now();
  if (!resumeId || jobs.length === 0) return { results: jobs, ragDurationMs: 0 };
  const resume = getResume(resumeId);
  if (!resume || resume.skills.length === 0) return { results: jobs, ragDurationMs: 0 };
  log("job_matched", "Starting RAG matching for " + jobs.length + " jobs", {
    resumeSkills: resume.skills.length,
    totalJobs: jobs.length,
  });
  const scoredJobs = await matchResumeToJobs(resumeId, jobs);
  const duration = Date.now() - startTime;
  log("job_matched", "RAG match complete: " + duration + "ms", {
    duration,
    avgPerJob: Math.round(duration / Math.max(jobs.length, 1)),
  });
  return { results: scoredJobs, ragDurationMs: duration };
}
