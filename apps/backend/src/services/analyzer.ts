import { ParsedResume, Skill, SkillCategory, WorkExperience, Education } from "@agentic-space/shared";
import { getRolesBySkill, ROLE_TAXONOMY } from "@agentic-space/shared";
import { generate, embed } from "./ollama.js";
import { log } from "./logger.js";

export interface AnalyzeResult {
  success: boolean;
  resume: ParsedResume | null;
  suggestedRoles: string[];
  embeddingId?: string;
}

function buildPrompt(rawText: string): string {
  return `Analyze this resume text and extract structured information. Return ONLY a valid JSON object with no additional text.

RESUME TEXT:
---
${rawText.slice(0, 8000)}
---

REQUIRED JSON SCHEMA:
{
  "summary": "2-3 sentence professional summary",
  "skills": [{"name": "skill name", "category": "programming_language|framework|database|cloud|devops|soft_skill|domain_knowledge|tool|other", "proficiency": "beginner|intermediate|advanced|expert", "yearsOfExperience": number}],
  "experience": [{"company": "company name", "title": "job title", "startDate": "YYYY-MM or YYYY", "endDate": "YYYY-MM or YYYY or null if current", "description": "1-2 sentences", "highlights": ["achievement 1", "achievement 2"], "skillsUsed": ["skill1", "skill2"]}],
  "education": [{"institution": "name", "degree": "degree name", "field": "field of study", "startYear": number, "endYear": number}],
  "preferredRoles": ["role title 1", "role title 2", "role title 3"],
  "preferredLocations": ["city1", "city2"],
  "totalYearsOfExperience": number,
  "currentRole": "current or most recent job title"
}

RULES:
- Extract at least 5 skills from the resume
- Infer yearsOfExperience from date ranges
- If a field cannot be determined, use empty array [] or null
- preferredRoles should be realistic job titles this person qualifies for
- DO NOT include markdown, explanations, or any text outside the JSON object
- Output valid JSON only`;
}

function parseOllamaResponse(rawResponse: string): Partial<ParsedResume> | null {
  // Strip any markdown code fences
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON object between braces
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function skillCategoryFromString(s: string): SkillCategory {
  const valid: SkillCategory[] = [
    "programming_language", "framework", "database", "cloud",
    "devops", "soft_skill", "domain_knowledge", "tool", "other",
  ];
  const normalized = s.toLowerCase().replace(/[^a-z_]/g, "_");
  return valid.includes(normalized as SkillCategory) ? (normalized as SkillCategory) : "other";
}

export async function analyzeResume(
  resumeId: string,
  fileName: string,
  rawText: string
): Promise<AnalyzeResult> {
  const baseResume: ParsedResume = {
    id: resumeId,
    fileName,
    uploadDate: new Date().toISOString(),
    rawText,
    summary: "",
    skills: [],
    experience: [],
    education: [],
    preferredRoles: [],
    preferredLocations: [],
    totalYearsOfExperience: 0,
    currentRole: "",
  };

  try {
    const prompt = buildPrompt(rawText);
    log("resume_analyzed", "Sending resume to Ollama for analysis", { textLength: rawText.length }, undefined, resumeId);

    const response = await generate(prompt);
    const parsed = parseOllamaResponse(response);

    if (!parsed) {
      log("error", "Failed to parse Ollama response as JSON", { responsePreview: response.slice(0, 200) }, undefined, resumeId);
      return { success: false, resume: baseResume, suggestedRoles: [] };
    }

    // Normalize skills
    const skills: Skill[] = (parsed.skills || []).map((s: any) => ({
      name: s.name || s,
      category: skillCategoryFromString(s.category || "other"),
      proficiency: (["beginner", "intermediate", "advanced", "expert"].includes(s.proficiency) ? s.proficiency : "intermediate") as Skill["proficiency"],
      yearsOfExperience: typeof s.yearsOfExperience === "number" ? s.yearsOfExperience : 0,
    }));

    // Normalize experience
    const experience: WorkExperience[] = (parsed.experience || []).map((e: any) => ({
      company: e.company || "",
      title: e.title || "",
      startDate: e.startDate || "",
      endDate: e.endDate || null,
      description: e.description || "",
      highlights: Array.isArray(e.highlights) ? e.highlights : [],
      skillsUsed: Array.isArray(e.skillsUsed) ? e.skillsUsed : [],
    }));

    // Normalize education
    const education: Education[] = (parsed.education || []).map((ed: any) => ({
      institution: ed.institution || "",
      degree: ed.degree || "",
      field: ed.field || "",
      startYear: typeof ed.startYear === "number" ? ed.startYear : 0,
      endYear: typeof ed.endYear === "number" ? ed.endYear : 0,
    }));

    // Build the complete resume
    const resume: ParsedResume = {
      ...baseResume,
      summary: parsed.summary || "",
      skills,
      experience,
      education,
      preferredRoles: Array.isArray(parsed.preferredRoles) ? parsed.preferredRoles : [],
      preferredLocations: Array.isArray(parsed.preferredLocations) ? parsed.preferredLocations : [],
      totalYearsOfExperience: typeof parsed.totalYearsOfExperience === "number" ? parsed.totalYearsOfExperience : 0,
      currentRole: parsed.currentRole || "",
    };

    // Suggest roles based on extracted role titles AND matched skills
    const roleMatches = new Set<string>();
    for (const role of resume.preferredRoles) {
      roleMatches.add(role);
    }
    // Also match against the role taxonomy based on skills
    for (const skill of resume.skills) {
      const matched = getRolesBySkill(skill.name);
      for (const r of matched) {
        roleMatches.add(r.title);
      }
    }
    const suggestedRoles = Array.from(roleMatches).slice(0, 10);

    // Generate and store embedding
    try {
      const embedding = await embed(resume.summary + " " + resume.skills.map((s) => s.name).join(" "));
      const { storeResumeEmbedding } = await import("./chroma.js");
      await storeResumeEmbedding(resumeId, resume.summary, embedding);
      resume.embeddingId = resumeId;
    } catch (embedErr) {
      // Embedding failure is non-fatal
      console.warn("[Analyzer] Embedding storage failed (ChromaDB may not be running):", embedErr);
    }

    log("resume_analyzed", `Extracted ${skills.length} skills, ${experience.length} jobs, ${suggestedRoles.length} suggested roles`, {
      skillCount: skills.length,
      experienceCount: experience.length,
      educationCount: education.length,
      suggestedRoles,
    }, undefined, resumeId);

    return { success: true, resume, suggestedRoles, embeddingId: resume.embeddingId };

  } catch (error) {
    // If Ollama is unavailable, return a minimal analysis with regex-based fallback
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    log("error", `Resume analysis failed: ${errMsg}`, {}, undefined, resumeId);

    console.warn(`[Analyzer] Ollama unavailable (${errMsg}). Using regex fallback.`);

    // Simple regex fallback: extract email, phone, possible skills from text
    const fallbackSkills = extractSkillsFallback(rawText);
    const fallbackResume: ParsedResume = {
      ...baseResume,
      summary: "Analysis requires Ollama. Basic text extraction only.",
      skills: fallbackSkills,
      preferredRoles: [],
      preferredLocations: [],
    };

    return { success: true, resume: fallbackResume, suggestedRoles: [] };
  }
}

/**
 * Basic regex-based skill extraction when Ollama is unavailable.
 * Scans for known tech keywords in the resume text.
 */
const KNOWN_SKILL_PATTERNS: [RegExp, SkillCategory][] = [
  [/JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|Ruby|PHP|Swift|Kotlin|Scala|SQL|R|Dart|Perl|MATLAB/i, "programming_language"],
  [/React|Angular|Vue|Next\.?js|Nuxt|Svelte|Node\.?js|Express|Fastify|Django|Flask|Spring|Rails|Laravel|FastAPI|GraphQL|REST/i, "framework"],
  [/PostgreSQL|MySQL|MongoDB|SQLite|Redis|Cassandra|DynamoDB|Elasticsearch|Firebase|Supabase|Oracle|SQL Server/i, "database"],
  [/AWS|Azure|GCP|Google Cloud|DigitalOcean|Heroku|Vercel|Netlify|Cloudflare|Lambda|S3|EC2|CloudFront/i, "cloud"],
  [/Docker|Kubernetes|Terraform|Ansible|Jenkins|GitHub Actions|GitLab CI|CircleCI|Prometheus|Grafana|Helm|ArgoCD|CI\/CD|DevOps/i, "devops"],
  [/Git|GitHub|GitLab|Bitbucket|Jira|Confluence|Figma|Slack|Notion|MS Office|Excel|PowerPoint/i, "tool"],
  [/Agile|Scrum|Kanban|Waterfall|SAFe|SDLC|Leadership|Communication|Teamwork|Problem.solving|Critical.thinking/i, "soft_skill"],
];

function extractSkillsFallback(text: string): Skill[] {
  const found = new Map<string, Skill>();

  for (const [pattern, category] of KNOWN_SKILL_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      const uniqueMatches = [...new Set(matches.map((m) => m.trim()))];
      for (const name of uniqueMatches) {
        if (!found.has(name.toLowerCase())) {
          found.set(name.toLowerCase(), {
            name,
            category,
            proficiency: "intermediate",
            yearsOfExperience: 0,
          });
        }
      }
    }
  }

  return Array.from(found.values());
}
