import { Router, Request, Response } from "express";
import { draftConnectionMessage, draftReferralRequest, draftHrEmail } from "../services/network.js";

export const networkRouter = Router();

networkRouter.post("/linkedin-message", async (req: Request, res: Response) => {
  try {
    const { jobId, resumeId, role, company } = req.body;
    if (!jobId) return res.status(400).json({ success: false, error: "jobId is required" });

    const result = await draftConnectionMessage(jobId, resumeId || "", role || "Software Engineer", company || "Company");
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) });
  }
});

networkRouter.post("/referral-request", async (req: Request, res: Response) => {
  try {
    const { jobId, resumeId, connectionName, role, company } = req.body;
    if (!jobId || !connectionName)
      return res.status(400).json({ success: false, error: "jobId and connectionName are required" });

    const result = await draftReferralRequest(jobId, resumeId || "", connectionName, role || "", company || "");
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) });
  }
});

networkRouter.post("/email-hr", async (req: Request, res: Response) => {
  try {
    const { jobId, resumeId, hrEmail, role, company } = req.body;
    if (!jobId || !hrEmail)
      return res.status(400).json({ success: false, error: "jobId and hrEmail are required" });

    const result = await draftHrEmail(jobId, resumeId || "", hrEmail, role || "", company || "");
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) });
  }
});
