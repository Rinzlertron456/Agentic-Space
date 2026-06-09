import { discoverAllLeads } from "./providers";
import { runStore, tailorResume } from "../lib/pythonBridge";

type RunRecord = { id: string; status: string };

export async function runDiscovery(options: { tailorTop?: number } = {}) {
  const run = runStore<RunRecord>("create_run", { kind: "discovery" });
  try {
    const jobs = discoverAllLeads();
    const upserted = runStore<{ inserted: number; updated: number; total: number }>("upsert_jobs", { jobs });
    const tailorTop = options.tailorTop ?? 10;
    const tailored = [];
    for (const job of jobs.slice(0, tailorTop)) {
      tailored.push(tailorResume(job.id));
    }
    const summary = `Discovered ${jobs.length} safe-mode leads, inserted ${upserted.inserted}, updated ${upserted.updated}, tailored ${tailored.length}.`;
    runStore("finish_run", { id: run.id, status: "completed", summary });
    return { run, jobs, upserted, tailored, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runStore("finish_run", { id: run.id, status: "failed", summary: message });
    throw error;
  }
}

if (process.argv[1]?.endsWith("discover.ts")) {
  runDiscovery()
    .then((result) => {
      console.log(JSON.stringify({ summary: result.summary }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
