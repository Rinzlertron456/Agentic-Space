import { describe, expect, it } from "vitest";
import { classifyRole, scoreJob, screeningAnswersFor } from "../src/lib/scoring";

describe("job scoring", () => {
  it("classifies React dashboard roles", () => {
    expect(classifyRole("React TypeScript dashboard performance frontend")).toBe("React Frontend Engineer");
  });

  it("rewards matching skills, target location, and company apply path", () => {
    const score = scoreJob({
      title: "Full Stack Developer React Node.js",
      description: "React TypeScript Node.js REST APIs SQL optimization dashboards",
      location: "Bengaluru",
      jobId: "12345",
      companyUrl: "https://example.com/jobs/12345",
      postedAt: new Date().toISOString()
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("uses stored screening defaults", () => {
    const answers = screeningAnswersFor("React Node role");
    expect(answers.find((item) => item.question === "Current CTC")?.answer).toBe("7 LPA");
    expect(answers.find((item) => item.question === "Expected CTC")?.answer).toContain("16 LPA");
  });
});
