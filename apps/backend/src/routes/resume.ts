import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { parseResume } from "../services/parser.js";
import { analyzeResume } from "../services/analyzer.js";
import { saveResume, getResume, getAllResumes, deleteResumeFile } from "../services/resume-store.js";
import { log } from "../services/logger.js";
import fs from "fs";

const upload = multer({
  dest: config.paths.uploads,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
});

export const resumeRouter = Router();

// POST /api/resume/upload — Upload and analyze one or more resumes
resumeRouter.post("/upload", upload.array("resumes", 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const results = [];
    for (const file of files) {
      const resumeId = uuidv4();
      log("resume_upload", `Processing ${file.originalname}`, { fileSize: file.size, mimeType: file.mimetype }, undefined, resumeId);

      // Step 1: Parse
      const rawText = await parseResume(file.path, file.mimetype || "");

      // Step 2: Analyze
      const analyzed = await analyzeResume(resumeId, file.originalname, rawText);

      // Step 3: Persist
      if (analyzed.success && analyzed.resume) {
        saveResume(analyzed.resume);
      }

      // Step 4: Clean up uploaded temp file
      try { fs.unlinkSync(file.path); } catch {}

      results.push({
        resumeId,
        ...analyzed,
      });
    }

    return res.json({
      success: true,
      count: results.length,
      resumes: results,
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process resume",
    });
  }
});

// GET /api/resume — List all stored resumes (must be before /:id)
resumeRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const resumes = getAllResumes();
    return res.json({
      success: true,
      count: resumes.length,
      resumes: resumes.map((r) => ({
        id: r.id,
        fileName: r.fileName,
        uploadDate: r.uploadDate,
        skillCount: r.skills.length,
        experienceCount: r.experience.length,
        currentRole: r.currentRole,
        preferredRoles: r.preferredRoles,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list resumes",
    });
  }
});

// GET /api/resume/:id/skills — Get extracted skills (must be before /:id)
resumeRouter.get("/:id/skills", async (req: Request, res: Response) => {
  try {
    const resume = getResume(req.params.id);
    if (!resume) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }
    return res.json({ success: true, skills: resume.skills });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch skills",
    });
  }
});

// GET /api/resume/:id — Get a single resume by ID (catch-all, must be last GET)
resumeRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const resume = getResume(req.params.id);
    if (!resume) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }
    return res.json({ success: true, resume });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch resume",
    });
  }
});

// DELETE /api/resume/:id — Delete a stored resume
resumeRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = deleteResumeFile(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }
    log("resume_upload", `Deleted resume ${req.params.id}`, {}, undefined, req.params.id);
    return res.json({ success: true, message: `Resume ${req.params.id} deleted` });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete resume",
    });
  }
});
