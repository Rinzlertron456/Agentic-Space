import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { LogEntry, LogAction } from "@agentic-space/shared";
import { v4 as uuidv4 } from "uuid";

const logsDir = config.paths.logs;

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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

  const dateStr = new Date().toISOString().split("T")[0];
  const logFile = path.join(logsDir, `${dateStr}.md`);

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

  fs.appendFileSync(logFile, mdLine + "\n");
  return entry;
}
