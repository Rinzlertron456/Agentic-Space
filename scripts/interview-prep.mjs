const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

async function generate(prompt) {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mistral", prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.response;
}

const prompt = `You are an interview coach preparing a candidate for a Deloitte interview.

ROLE: Specialist, AI and Data Science - Strategic Growth Market at Deloitte (Hyderabad)

CANDIDATE RESUME:
Sreeramula Vinayak Santhosh - Full Stack Software Engineer with 3+ years experience in React, Node.js, FastAPI, TypeScript. Specialized in LLM integrations, microservices, frontend optimization, data visualization.

Work Experience:
- Incedo Technologies (Oct 2025-June 2026): Full Stack Web Developer. Refactored monolithic React into hooks. Built ECharts/MUI dashboards. Leaflet live maps (thousands of markers). HITL RCA with VectorDB. Contextual follow-up prompts. Node.js/FastAPI microservices. SQL optimization across millions of records. SingleStore RowStore to ColumnStore migration. Cron-based aggregation snapshots.
- Wipro Technologies (Mar 2023-July 2025): Front End Web Developer. Revamped modals, tabs, navigation in React/Redux. Lazy loading, Suspense, code splitting. REST API integration.

Projects: ShopKart (React/Redux ecommerce), Multiplayer Chess (WebSockets, React/TypeScript/Node.js)

Education: B.Tech CMRIT (2018-2022) 8.40 CGPA

Skills: React.js, Redux, TypeScript, Node.js, FastAPI, MUI, Tailwind, ECharts, Leaflet, Docker, Kubernetes, GitLab CI/CD, ArgoCD, MySQL, MongoDB, SingleStore, LLM Integrations, RAG Pipelines, Vector DBs, Prompt Engineering, MCP, Claude Code, AWS Certified Cloud Practitioner

Generate 12 likely interview questions for this Deloitte AI & Data Science role. For each question provide: the question itself, why it is likely asked, and a STAR-format framework using the candidate's actual resume experience.

Also include:
- 3 talking points the candidate MUST cover during the interview
- 2 questions the candidate should ask the interviewer
- Key strengths to highlight from the resume
- Potential weak spots to prepare for

Format clearly with markdown headings.`;

try {
  const response = await generate(prompt);
  console.log(response);
} catch (e) {
  console.error("Ollama error:", e.message);
}
