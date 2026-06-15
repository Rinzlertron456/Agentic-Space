import { generate } from "./ollama.js";
import { getResume } from "./resume-store.js";
import { buildResumeText } from "./resume-text.js";
import { log } from "./logger.js";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { v4 as uuidv4 } from "uuid";

/** UUID v4 pattern for input validation */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface JobContext {
  title?: string;
  description?: string;
  company?: string;
  requirements?: string[];
  skills?: string[];
}

export interface TailorResult {
  success: boolean;
  tailoredText?: string;
  tailoredMarkdown?: string;
  downloadUrl?: string;
  tailorId?: string;
  error?: string;
}

// In-memory cache for tailored results (keyed by tailorId)
// Entries are evicted after CACHE_TTL_MS milliseconds.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 500;
const tailoredResults = new Map<
  string,
  { markdown: string; resumeId: string; jobId: string; createdAt: string }
>();

/** Evict entries older than CACHE_TTL_MS, or oldest entries when over MAX_CACHE_SIZE */
function evictStaleEntries(): void {
  const now = Date.now();
  for (const [key, value] of tailoredResults) {
    if (now - new Date(value.createdAt).getTime() > CACHE_TTL_MS) {
      tailoredResults.delete(key);
    }
  }
  // If still over max, drop oldest entries
  if (tailoredResults.size > MAX_CACHE_SIZE) {
    const entries = [...tailoredResults.entries()].sort(
      (a, b) =>
        new Date(a[1].createdAt).getTime() -
        new Date(b[1].createdAt).getTime(),
    );
    const toRemove = entries.slice(0, tailoredResults.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      tailoredResults.delete(key);
    }
  }
}

/**
 * Tailor a resume for a specific job using Ollama.
 *
 * The LLM rewrites resume bullet points to better match the job description
 * keywords while keeping all information truthful.
 */
export async function tailorResume(
  resumeId: string,
  jobId: string,
  jobContext?: JobContext,
): Promise<TailorResult> {
  try {
    // 1. Load the stored resume
    const resume = getResume(resumeId);
    if (!resume) {
      return { success: false, error: `Resume not found: ${resumeId}` };
    }

    const resumeContext = buildResumeText(resume);
    if (!resumeContext.trim()) {
      return { success: false, error: "Resume has no content to tailor" };
    }

    // 2. Build the job context section for the prompt
    const jobParts: string[] = [];
    if (jobContext?.title) jobParts.push(`Title: ${jobContext.title}`);
    if (jobContext?.company) jobParts.push(`Company: ${jobContext.company}`);
    if (jobContext?.description)
      jobParts.push(`Description: ${jobContext.description}`);
    if (jobContext?.requirements && jobContext.requirements.length > 0)
      jobParts.push(`Requirements: ${jobContext.requirements.join(", ")}`);
    if (jobContext?.skills && jobContext.skills.length > 0)
      jobParts.push(`Key Skills: ${jobContext.skills.join(", ")}`);

    const jobSection =
      jobParts.length > 0
        ? `TARGET JOB:\n${jobParts.join("\n")}`
        : `TARGET JOB ID: ${jobId}\n(No additional job details available — rewrite the resume to be broadly competitive.)`;

    // 3. Build the tailoring prompt
    const prompt = `You are a professional resume writer. Your task is to rewrite the following resume to better match the target job.

RULES:
- Keep all information TRUTHFUL. Do NOT fabricate experience, skills, or achievements.
- Rewrite bullet points to emphasize keywords and skills relevant to the target job.
- Use strong action verbs (Led, Designed, Implemented, Optimized, etc.).
- Quantify achievements where possible (increased by X%, reduced by Y hours, etc.).
- Keep the resume concise — aim for 1-2 pages.
- Output the tailored resume in clean Markdown format.
- Include sections: Summary, Skills, Experience, Education.
- Do NOT add any explanations or commentary — output ONLY the tailored resume.

${jobSection}

ORIGINAL RESUME:
${resumeContext}

OUTPUT (Markdown-formatted tailored resume):`;

    // 4. Generate tailored resume via Ollama
    let tailoredMarkdown: string;
    try {
      tailoredMarkdown = await generate(prompt);
    } catch (ollamaError) {
      // Fallback: return a reformatted version of the original resume
      log(
        "error",
        `Ollama unavailable for tailoring: ${String(ollamaError)}`,
        undefined,
        jobId,
        resumeId,
      );
      tailoredMarkdown = generateFallbackResume(resume);
    }

    // 5. Clean up the response
    tailoredMarkdown = tailoredMarkdown
      .replace(/^```(?:markdown)?\n?/gm, "")
      .replace(/\n?```$/gm, "")
      .trim();

    // 6. Store the tailored result
    const tailorId = uuidv4();
    evictStaleEntries();
    tailoredResults.set(tailorId, {
      markdown: tailoredMarkdown,
      resumeId,
      jobId,
      createdAt: new Date().toISOString(),
    });

    // 7. Also save to disk for download (async)
    const tailorDir = path.join(config.paths.uploads, "tailored");
    await fs.mkdir(tailorDir, { recursive: true });
    await fs.writeFile(
      path.join(tailorDir, `${tailorId}.md`),
      tailoredMarkdown,
      "utf-8",
    );

    // 8. Log the action
    log(
      "resume_upload",
      `Tailored resume for job ${jobContext?.title || jobId}`,
      { tailorId, resumeId, jobId },
      jobId,
      resumeId,
    );

    return {
      success: true,
      tailoredText:
        tailoredMarkdown.substring(0, 500) +
        (tailoredMarkdown.length > 500 ? "..." : ""),
      tailoredMarkdown,
      downloadUrl: `/api/tailor/${tailorId}/download`,
      tailorId,
    };
  } catch (error) {
    console.error("[Tailor] Error:", error);
    log(
      "error",
      `Resume tailoring failed: ${String(error)}`,
      undefined,
      jobId,
      resumeId,
    );
    return { success: false, error: String(error) };
  }
}

/**
 * Retrieve a tailored resume by ID (for download).
 * Validates that tailorId is a UUID to prevent path traversal.
 */
export async function getTailoredResume(
  tailorId: string,
): Promise<{ markdown: string; resumeId: string; jobId: string } | null> {
  // Path traversal guard: only accept valid UUIDs
  if (!UUID_RE.test(tailorId)) return null;

  // Check in-memory cache first
  const inMemory = tailoredResults.get(tailorId);
  if (inMemory) return inMemory;

  // Check disk
  const filePath = path.join(
    config.paths.uploads,
    "tailored",
    `${tailorId}.md`,
  );
  try {
    const markdown = await fs.readFile(filePath, "utf-8");
    return { markdown, resumeId: "unknown", jobId: "unknown" };
  } catch {
    return null;
  }
}

/**
 * Generate a basic formatted resume when Ollama is unavailable.
 */
function generateFallbackResume(
  resume: NonNullable<ReturnType<typeof getResume>>,
): string {
  const sections: string[] = [];

  sections.push(`# ${resume.currentRole || "Professional Resume"}\n`);

  if (resume.summary) {
    sections.push(`## Summary\n\n${resume.summary}\n`);
  }

  if (resume.skills.length > 0) {
    const skillsByCategory = new Map<string, string[]>();
    for (const skill of resume.skills) {
      const cat = skill.category || "other";
      if (!skillsByCategory.has(cat)) skillsByCategory.set(cat, []);
      skillsByCategory.get(cat)!.push(skill.name);
    }
    let skillsSection = "## Skills\n\n";
    for (const [category, skills] of skillsByCategory) {
      skillsSection += `**${category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}**: ${skills.join(", ")}\n\n`;
    }
    sections.push(skillsSection);
  }

  if (resume.experience.length > 0) {
    let expSection = "## Experience\n\n";
    for (const exp of resume.experience) {
      expSection += `### ${exp.title} — ${exp.company}\n`;
      expSection += `*${exp.startDate} – ${exp.endDate || "Present"}*\n\n`;
      if (exp.highlights.length > 0) {
        for (const h of exp.highlights) {
          expSection += `- ${h}\n`;
        }
      } else if (exp.description) {
        expSection += `${exp.description}\n`;
      }
      expSection += "\n";
    }
    sections.push(expSection);
  }

  if (resume.education.length > 0) {
    let eduSection = "## Education\n\n";
    for (const edu of resume.education) {
      eduSection += `**${edu.degree} in ${edu.field}** — ${edu.institution} (${edu.startYear}–${edu.endYear})\n\n`;
    }
    sections.push(eduSection);
  }

  return sections.join("\n");
}
