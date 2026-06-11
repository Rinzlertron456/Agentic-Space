import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { config } from "../config.js";

export const logsRouter = Router();

const logsDir = config.paths.logs;

// GET /api/logs — List all available daily log files
logsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(logsDir)) {
      return res.json({ success: true, dates: [], files: [] });
    }

    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    const entries = files.map((f) => ({
      date: f.replace(".md", ""),
      file: f,
      size: fs.statSync(path.join(logsDir, f)).size,
    }));

    return res.json({ success: true, count: files.length, dates: entries });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list logs",
    });
  }
});

// GET /api/logs/:date — Get full log content for a specific date
logsRouter.get("/:date", async (req: Request, res: Response) => {
  try {
    const dateFile = `${req.params.date}.md`;
    const filePath = path.join(logsDir, dateFile);

    // Also try without .md extension
    const actualPath = fs.existsSync(filePath)
      ? filePath
      : fs.existsSync(path.join(logsDir, `${req.params.date}`))
        ? path.join(logsDir, `${req.params.date}`)
        : null;

    if (!actualPath) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    const content = fs.readFileSync(actualPath, "utf-8");

    // Parse into structured entries
    const entries: { timestamp: string; action: string; message: string; details?: any }[] = [];
    const blocks = content.split("\n## ").filter(Boolean);

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const header = lines[0];
      const timestampMatch = header.match(/^\[(.*?)\]\s*(\S+)/);

      if (timestampMatch) {
        const entry: any = {
          timestamp: timestampMatch[1],
          action: timestampMatch[2],
        };

        for (const line of lines) {
          if (line.startsWith("- **Message**: ")) {
            entry.message = line.replace("- **Message**: ", "");
          } else if (line.startsWith("- **Details**: ")) {
            try {
              const jsonStr = line.replace("- **Details**: ```json\n", "").replace("\n```", "").trim();
              entry.details = JSON.parse(jsonStr);
            } catch {}
          } else if (line.startsWith("- **Job**: ")) {
            entry.jobId = line.replace("- **Job**: ", "");
          } else if (line.startsWith("- **Resume**: ")) {
            entry.resumeId = line.replace("- **Resume**: ", "");
          }
        }

        entries.push(entry);
      }
    }

    return res.json({
      success: true,
      date: req.params.date,
      raw: content,
      entries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch log",
    });
  }
});
