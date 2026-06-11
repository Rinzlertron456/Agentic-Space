export interface RoleDefinition {
  title: string;
  aliases: string[];
  category: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  typicalExperience: string;
}

export const ROLE_TAXONOMY: RoleDefinition[] = [
  {
    title: "Full Stack Developer",
    aliases: ["Full Stack Engineer", "Fullstack Developer", "MERN Developer", "MEAN Developer"],
    category: "software_engineering",
    requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git"],
    niceToHaveSkills: ["Docker", "AWS", "GraphQL", "Next.js", "PostgreSQL"],
    typicalExperience: "2-5 years",
  },
  {
    title: "Frontend Developer",
    aliases: ["Frontend Engineer", "UI Developer", "React Developer", "Vue Developer"],
    category: "software_engineering",
    requiredSkills: ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Git"],
    niceToHaveSkills: ["Next.js", "Tailwind CSS", "Redux", "Jest", "Storybook"],
    typicalExperience: "1-5 years",
  },
  {
    title: "Backend Developer",
    aliases: ["Backend Engineer", "API Developer", "Server-Side Developer"],
    category: "software_engineering",
    requiredSkills: ["Node.js", "SQL", "REST APIs", "Git", "Python"],
    niceToHaveSkills: ["Docker", "Kubernetes", "PostgreSQL", "MongoDB", "GraphQL"],
    typicalExperience: "2-6 years",
  },
  {
    title: "DevOps Engineer",
    aliases: ["Cloud Engineer", "SRE", "Platform Engineer", "Infra Engineer"],
    category: "devops",
    requiredSkills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform"],
    niceToHaveSkills: ["Helm", "Prometheus", "Grafana", "Ansible", "Go"],
    typicalExperience: "3-7 years",
  },
  {
    title: "Data Engineer",
    aliases: ["Big Data Engineer", "ETL Developer", "Data Pipeline Engineer"],
    category: "data",
    requiredSkills: ["Python", "SQL", "Spark", "ETL", "AWS", "Airflow"],
    niceToHaveSkills: ["Kafka", "Databricks", "Snowflake", "dbt", "Scala"],
    typicalExperience: "2-6 years",
  },
  {
    title: "Data Scientist",
    aliases: ["ML Engineer", "AI Engineer", "Applied Scientist"],
    category: "data",
    requiredSkills: ["Python", "Machine Learning", "SQL", "Statistics", "TensorFlow", "PyTorch"],
    niceToHaveSkills: ["NLP", "Computer Vision", "MLOps", "Kubeflow", "LLM"],
    typicalExperience: "2-6 years",
  },
  {
    title: "Product Manager",
    aliases: ["PM", "Technical Product Manager", "Associate PM"],
    category: "product",
    requiredSkills: ["Product Strategy", "User Research", "Agile", "Data Analysis", "Stakeholder Management"],
    niceToHaveSkills: ["SQL", "Figma", "Jira", "A/B Testing", "Technical Background"],
    typicalExperience: "2-7 years",
  },
  {
    title: "QA Engineer",
    aliases: ["Test Engineer", "SDET", "Quality Engineer", "Automation Tester"],
    category: "quality",
    requiredSkills: ["Selenium", "Cypress", "JavaScript", "Test Planning", "CI/CD"],
    niceToHaveSkills: ["Playwright", "Appium", "JMeter", "API Testing", "Python"],
    typicalExperience: "1-5 years",
  },
  {
    title: "Software Architect",
    aliases: ["Solution Architect", "Technical Architect", "System Architect"],
    category: "software_engineering",
    requiredSkills: ["System Design", "Cloud Architecture", "Microservices", "Leadership", "Java"],
    niceToHaveSkills: ["Kubernetes", "Event-Driven Architecture", "DDD", "TOGAF", "AWS Solutions Architect"],
    typicalExperience: "7-12 years",
  },
  {
    title: "Security Engineer",
    aliases: ["Cybersecurity Engineer", "InfoSec Engineer", "AppSec Engineer"],
    category: "security",
    requiredSkills: ["Network Security", "Penetration Testing", "Python", "OWASP", "SIEM"],
    niceToHaveSkills: ["CISSP", "CEH", "Cloud Security", "SOC", "Threat Modeling"],
    typicalExperience: "3-8 years",
  },
];

export function getRolesBySkill(skillName: string): RoleDefinition[] {
  const skill = skillName.toLowerCase();
  return ROLE_TAXONOMY.filter(
    (role) =>
      role.requiredSkills.some((s) => s.toLowerCase().includes(skill)) ||
      role.niceToHaveSkills.some((s) => s.toLowerCase().includes(skill))
  );
}

export function getRoleByTitle(title: string): RoleDefinition | undefined {
  const t = title.toLowerCase();
  return ROLE_TAXONOMY.find(
    (role) =>
      role.title.toLowerCase() === t || role.aliases.some((a) => a.toLowerCase() === t)
  );
}
