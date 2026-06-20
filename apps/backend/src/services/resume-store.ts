import fs from "fs";
import path from "path";
import { config } from "../config.js";
import type { ParsedResume } from "@agentic-space/shared";

function safeMkdirSync(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Cloud Run can be read-only outside /tmp
  }
}

function getStoreDir(): string {
  const base = process.env.NODE_ENV === "production" ? "/tmp" : config.paths.logs;
  const dir = path.join(base, "resumes");
  safeMkdirSync(dir);
  return dir;
}

let _storeDir: string | null = null;
function storeDir(): string {
  if (!_storeDir) _storeDir = getStoreDir();
  return _storeDir;
}

function getFilePath(resumeId: string): string {
  return path.join(storeDir(), `${resumeId}.json`);
}

export function saveResume(resume: ParsedResume): void {
  const fp = getFilePath(resume.id);
  try {
    fs.writeFileSync(fp, JSON.stringify(resume, null, 2), "utf-8");
  } catch (err) {
    console.error("[resume-store] writeFileSync failed:", err);
    throw new Error("Failed to save resume");
  }
}

export function getResume(resumeId: string): ParsedResume | null {
  const fp = getFilePath(resumeId);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return null;
  }
}

export function getAllResumes(): ParsedResume[] {
  const dir = storeDir();
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as ParsedResume;
        } catch {
          return null;
        }
      })
      .filter((r): r is ParsedResume => r !== null);
  } catch (err) {
    console.error("[resume-store] getAllResumes failed:", err);
    return [];
  }
}

export function deleteResumeFile(resumeId: string): boolean {
  const fp = getFilePath(resumeId);
  if (!fs.existsSync(fp)) return false;
  try {
    fs.unlinkSync(fp);
    return true;
  } catch (err) {
    console.error("[resume-store] delete failed:", err);
    return false;
  }
}
