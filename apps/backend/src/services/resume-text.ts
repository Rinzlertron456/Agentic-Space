import type { ParsedResume } from "@agentic-space/shared";

export interface ResumeTextOptions {
  /** Maximum character length for the output (default: no limit) */
  maxLength?: number;
  /** Include skill category in parentheses (default: true) */
  includeCategory?: boolean;
}

/**
 * Build a unified text representation of a resume for LLM prompts and embeddings.
 *
 * Used by both the tailoring service and the RAG matcher to ensure a consistent
 * view of the candidate's profile.
 */
export function buildResumeText(
  resume: ParsedResume,
  options: ResumeTextOptions = {},
): string {
  const { maxLength, includeCategory = true } = options;

  const parts: string[] = [];

  if (resume.summary) {
    parts.push(resume.summary);
  }

  if (resume.currentRole) {
    parts.push(`Current Role: ${resume.currentRole}`);
  }

  if (resume.totalYearsOfExperience) {
    parts.push(`Total Experience: ${resume.totalYearsOfExperience} years`);
  }

  if (resume.skills.length > 0) {
    const skillsList = resume.skills
      .map((s) =>
        includeCategory
          ? `${s.name} (${s.category}, ${s.proficiency})`
          : `${s.name} (${s.proficiency})`,
      )
      .join(", ");
    parts.push(`Skills: ${skillsList}`);
  }

  if (resume.experience.length > 0) {
    const expEntries = resume.experience.map((e) => {
      const highlights =
        e.highlights.length > 0 ? `: ${e.highlights.join(". ")}` : "";
      return `${e.title} at ${e.company}${highlights}`;
    });
    parts.push(`Experience: ${expEntries.join(". ")}`);
  }

  if (resume.education.length > 0) {
    const eduEntries = resume.education.map(
      (e) =>
        `${e.degree} in ${e.field} from ${e.institution} (${e.startYear}-${e.endYear})`,
    );
    parts.push(`Education: ${eduEntries.join(". ")}`);
  }

  if (resume.preferredRoles.length > 0) {
    parts.push(`Preferred Roles: ${resume.preferredRoles.join(", ")}`);
  }

  const text = parts.filter(Boolean).join(". ");
  return maxLength ? text.slice(0, maxLength) : text;
}
