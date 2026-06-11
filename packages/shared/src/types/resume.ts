export interface Skill {
  name: string;
  category: SkillCategory;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience: number;
}

export type SkillCategory =
  | "programming_language"
  | "framework"
  | "database"
  | "cloud"
  | "devops"
  | "soft_skill"
  | "domain_knowledge"
  | "tool"
  | "other";

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string; // ISO date
  endDate: string | null; // null = current
  description: string;
  highlights: string[];
  skillsUsed: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number;
  gpa?: string;
}

export interface ParsedResume {
  id: string;
  fileName: string;
  uploadDate: string;
  rawText: string;
  summary: string;
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  preferredRoles: string[];
  preferredLocations: string[];
  totalYearsOfExperience: number;
  currentRole: string;
  embeddingId?: string; // ChromaDB embedding reference
}

export interface ResumeUploadResponse {
  success: boolean;
  resumeId?: string;
  parsed?: ParsedResume;
  error?: string;
}
