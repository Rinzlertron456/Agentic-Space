import fs from "fs";
import path from "path";
import { config } from "../config.js";
import type { ParsedResume } from "@agentic-space/shared";

const STORE_DIR = path.join(config.paths.logs, "resumes");

if (!fs.existsSync(STORE_DIR)) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

function getFilePath(resumeId: string): string {
  return path.join(STORE_DIR, `${resumeId}.json`);
}

export function saveResume(resume: ParsedResume): void {
  fs.writeFileSync(getFilePath(resume.id), JSON.stringify(resume, null, 2), "utf-8");
}

export function getResume(resumeId: string): ParsedResume | null {
  const fp = getFilePath(resumeId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

export function getAllResumes(): ParsedResume[] {
  if (!fs.existsSync(STORE_DIR)) return [];
  return fs
    .readdirSync(STORE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(STORE_DIR, f), "utf-8")) as ParsedResume;
      } catch {
        return null;
      }
    })
    .filter((r): r is ParsedResume => r !== null);
}

export function deleteResumeFile(resumeId: string): boolean {
  const fp = getFilePath(resumeId);
  if (!fs.existsSync(fp)) return false;
  fs.unlinkSync(fp);
  return true;
}
