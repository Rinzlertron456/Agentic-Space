import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const python = process.env.PYTHON_BIN ?? "python";

export function runStore<T>(command: string, payload: unknown = {}): T {
  const script = path.join(root, "scripts", "store.py");
  const result = spawnSync(python, [script, command], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`store.py ${command} failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout) as T;
}

export function tailorResume<T>(jobId: string): T {
  const script = path.join(root, "scripts", "tailor_resume.py");
  const result = spawnSync(python, [script, jobId], {
    encoding: "utf-8",
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`tailor_resume.py failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout) as T;
}
