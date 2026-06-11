import { Router, Request, Response } from "express";

export const tailorRouter = Router();

tailorRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { resumeId, jobId } = req.body;
    if (!resumeId || !jobId) {
      return res.status(400).json({ success: false, error: "resumeId and jobId are required" });
    }
    const { tailorResume } = await import("../services/tailor.js");
    const result = await tailorResume(resumeId, jobId);
    return res.json(result);
  } catch (error) {
    console.error("Tailor error:", error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

tailorRouter.get("/:id/download", async (req: Request, res: Response) => {
  try {
    return res.json({ success: true, tailorId: req.params.id });
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) });
  }
});
