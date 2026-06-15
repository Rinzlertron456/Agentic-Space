import { Router, Request, Response } from "express";
import { tailorResume, getTailoredResume } from "../services/tailor.js";
import type { JobContext } from "../services/tailor.js";

export const tailorRouter = Router();

tailorRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { resumeId, jobId, jobTitle, jobDescription, jobCompany, jobRequirements, jobSkills } = req.body;
    if (!resumeId || !jobId) {
      return res.status(400).json({ success: false, error: "resumeId and jobId are required" });
    }

    const jobContext: JobContext = {
      title: jobTitle,
      description: jobDescription,
      company: jobCompany,
      requirements: jobRequirements,
      skills: jobSkills,
    };

    const result = await tailorResume(resumeId, jobId, jobContext);
    return res.json(result);
  } catch (error) {
    console.error("Tailor error:", error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

tailorRouter.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const tailorId = req.params.id;
    const result = await getTailoredResume(tailorId);

    if (!result) {
      return res.status(404).json({ success: false, error: "Tailored resume not found" });
    }

    // Return as markdown file download
    const format = (req.query.format as string) || "markdown";

    if (format === "json") {
      return res.json({
        success: true,
        tailorId,
        markdown: result.markdown,
        resumeId: result.resumeId,
        jobId: result.jobId,
      });
    }

    // Default: download as .md file
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tailored-resume-${tailorId.substring(0, 8)}.md"`,
    );
    return res.send(result.markdown);
  } catch (error) {
    console.error("Tailor download error:", error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});
