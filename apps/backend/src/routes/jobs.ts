import { Router, Request, Response } from "express";
import { searchJobs } from "../services/search-orchestrator.js";
import { tailorResume } from "../services/tailor.js";
import { log } from "../services/logger.js";

export const jobsRouter = Router();

// POST /api/jobs/search — Search jobs across all portals
jobsRouter.post("/search", async (req: Request, res: Response) => {
  try {
    const { resumeId, filters } = req.body;
    if (!resumeId) {
      return res.status(400).json({ success: false, error: "resumeId is required" });
    }

    const results = await searchJobs(resumeId, filters || {});
    return res.json(results);
  } catch (error) {
    console.error("Job search error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to search jobs",
    });
  }
});

// GET /api/jobs — List recent search results (if available)
jobsRouter.get("/", async (req: Request, res: Response) => {
  try {
    // Return empty list by default — jobs are ephemeral (not stored)
    // The frontend will initiate a search to populate the board
    return res.json({
      success: true,
      count: 0,
      results: [],
      message: "Use POST /search to find jobs",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list jobs",
    });
  }
});

// GET /api/jobs/:id — Get job details (from LinkedIn URL redirect)
jobsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Jobs are ephemeral in the current architecture.
    // The job ID encodes source info — redirects are handled by /:id/redirect.
    // For now, return a structured response that the frontend can display.
    return res.json({
      success: true,
      jobId: id,
      message: "Job details available via the job source URL",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch job",
    });
  }
});

// GET /api/jobs/:id/redirect — Get the direct apply URL for a job
jobsRouter.get("/:id/redirect", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // If the ID contains "linkedin", build a LinkedIn URL
    if (id.includes("linkedin")) {
      const jobId = id.replace("linkedin-", "");
      return res.json({
        success: true,
        redirectUrl: `https://www.linkedin.com/jobs/view/${jobId}/`,
      });
    }

    // If the ID contains "naukri", redirect to Naukri
    if (id.includes("naukri")) {
      return res.json({
        success: true,
        redirectUrl: "https://www.naukri.com/",
      });
    }

    // For company portal or other sources
    return res.json({
      success: true,
      jobId: id,
      redirectUrl: "",
      message: "Redirect URL not available for this job source",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get redirect URL",
    });
  }
});

// POST /api/jobs/batch — Batch actions on selected jobs
jobsRouter.post("/batch", async (req: Request, res: Response) => {
  try {
    const { jobIds, action, resumeId } = req.body;
    if (!jobIds || !Array.isArray(jobIds)) {
      return res.status(400).json({ success: false, error: "jobIds array is required" });
    }
    if (!action) {
      return res.status(400).json({ success: false, error: "action is required" });
    }

    const validActions = ["apply", "tailor", "save", "skip"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action: ${action}. Valid: ${validActions.join(", ")}`,
      });
    }

    const results: { jobId: string; success: boolean; message: string; tailoredResumeUrl?: string }[] = [];

    for (const jobId of jobIds) {
      switch (action) {
        case "apply":
          // HITL: Return the job's apply URL for the user to visit
          results.push({
            jobId,
            success: true,
            message: "Ready for HITL redirect",
          });
          break;
        case "tailor":
          // Trigger resume tailoring for this job
          if (resumeId) {
            const tailorResult = await tailorResume(resumeId, jobId);
            results.push({
              jobId,
              success: tailorResult.success,
              message: tailorResult.success ? "Tailored" : (tailorResult.error || "Tailoring failed"),
              tailoredResumeUrl: tailorResult.downloadUrl,
            });
          } else {
            results.push({
              jobId,
              success: false,
              message: "resumeId required for tailoring",
            });
          }
          break;
        case "save":
          results.push({
            jobId,
            success: true,
            message: "Job saved",
          });
          break;
        case "skip":
          results.push({
            jobId,
            success: true,
            message: "Job skipped",
          });
          break;
      }
    }

    log("job_viewed", `Batch ${action}: ${jobIds.length} jobs processed`, { action, count: jobIds.length });

    return res.json({
      success: true,
      processed: jobIds.length,
      action,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process batch action",
    });
  }
});
