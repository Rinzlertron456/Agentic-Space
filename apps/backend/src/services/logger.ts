import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { LogEntry, LogAction } from "@agentic-space/shared";
import { v4 as uuidv4 } from "uuid";

const logsDir = config.paths.logs;

try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  // Cloud Run container filesystem is read-only outside /tmp; writes below will fail gracefully
}

export function log(
  action: LogAction,
  message: string,
  details?: Record<string, unknown>,
  jobId?: string,
  resumeId?: string
): LogEntry {
  const entry: LogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    message,
    details,
    jobId,
    resumeId,
  };

  const mdLine = [
    `## [${entry.timestamp}] ${action}`,
    `- **Message**: ${message}`,
    details ? `- **Details**: \`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`` : "",
    jobId ? `- **Job**: ${jobId}` : "",
    resumeId ? `- **Resume**: ${resumeId}` : "",
    "---\n",
  ]
    .filter(Boolean)
    .join("\n");

  const dateStr = new Date().toISOString().split("T")[0];
  const logFile = path.join(logsDir, `${dateStr}.md`);

  try {
    fs.appendFileSync(logFile, mdLine + "\n");
  } catch {
    // Cloud Run read-only filesystem: soft fail so requests still succeed
  }

  // Sync to Notion (async, non-blocking)
  import("./notion.js").then((m) => m.syncToNotion(entry)).catch(() => {});

  return entry;
}
