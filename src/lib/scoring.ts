import { candidateProfile } from "./profile";

const familyWeights: Record<string, string[]> = {
  "Full Stack Developer": ["react", "node", "typescript", "rest", "microservice", "mysql", "fastapi"],
  "React Frontend Engineer": ["react", "typescript", "frontend", "ui", "redux", "dashboard", "material ui", "performance"],
  "Node.js Developer": ["node", "express", "api", "backend", "microservice", "mysql", "mongodb"],
  "MERN Stack Developer": ["react", "node", "express", "mongodb", "redux", "javascript"],
  "UI Dashboard Engineer": ["dashboard", "echarts", "ag grid", "leaflet", "visualization", "react", "performance"],
  "AI-enabled Full Stack Developer": ["llm", "rag", "vector", "ai", "chatbot", "prompt", "fastapi", "react"]
};

export function classifyRole(text: string): string {
  const lower = text.toLowerCase();
  let best = "Full Stack Developer";
  let bestScore = 0;
  for (const [family, keywords] of Object.entries(familyWeights)) {
    const score = keywords.reduce((sum, keyword) => sum + (lower.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = family;
      bestScore = score;
    }
  }
  return best;
}

export function scoreJob(input: {
  title: string;
  description?: string;
  requirements?: string;
  location?: string;
  jobId?: string | null;
  companyUrl?: string | null;
  postedAt?: string | null;
}): number {
  const haystack = `${input.title} ${input.description ?? ""} ${input.requirements ?? ""}`.toLowerCase();
  let score = 35;

  for (const skill of candidateProfile.strengths) {
    if (haystack.includes(skill.toLowerCase())) {
      score += 2;
    }
  }

  const roleFamily = classifyRole(haystack);
  for (const keyword of familyWeights[roleFamily] ?? []) {
    if (haystack.includes(keyword)) score += 3;
  }

  if (input.location && candidateProfile.locations.some((location) => input.location?.toLowerCase().includes(location.toLowerCase()))) {
    score += 10;
  }
  if (input.jobId) score += 6;
  if (input.companyUrl) score += 5;
  if (input.postedAt) score += 4;

  return Math.max(0, Math.min(100, score));
}

export function screeningAnswersFor(description: string) {
  const lower = description.toLowerCase();
  return [
    {
      question: "Current CTC",
      answer: candidateProfile.defaults.currentCtc,
      confidence: "default" as const
    },
    {
      question: "Expected CTC",
      answer: candidateProfile.defaults.expectedCtc,
      confidence: "default" as const
    },
    {
      question: "Notice period",
      answer: candidateProfile.defaults.noticePeriod,
      confidence: "default" as const
    },
    {
      question: "Serving notice",
      answer: candidateProfile.defaults.servingNotice,
      confidence: "default" as const
    },
    {
      question: "Reason for change",
      answer:
        lower.includes("ai") || lower.includes("llm") || lower.includes("rag")
          ? "I am looking for a role where I can combine full-stack product engineering with AI-enabled workflows, LLM integrations, and stronger technical ownership."
          : candidateProfile.defaults.reasonForChange,
      confidence: "jd-aware" as const
    }
  ];
}
