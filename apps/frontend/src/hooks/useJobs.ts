import { useState, useCallback } from "react";
import type { JobListing, SearchFilters } from "@agentic-space/shared";
import { api } from "../services/api";

export function useJobs() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const search = useCallback(async (resumeId: string, filters: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchJobs(resumeId, filters);
      if (result.success) {
        setJobs(result.results);
      } else {
        setError(result.errors?.join(", ") || "Search failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const batchAction = useCallback(async (jobIds: string[], action: string) => {
    setActionLoading(true);
    try {
      const result: any = await api.batchAction(jobIds, action);
      if (result.success) {
        if (action === "apply") {
          for (const jobId of jobIds) {
            const redirect: any = await api.getJobRedirect(jobId);
            if (redirect.redirectUrl) {
              window.open(redirect.redirectUrl, "_blank");
            }
          }
        } else if (action === "skip") {
          setJobs((prev) => prev.filter((j) => !jobIds.includes(j.id)));
        } else if (action === "save") {
          setJobs((prev) =>
            prev.map((j) =>
              jobIds.includes(j.id) ? { ...j, status: "saved" as const } : j
            )
          );
        }
      }
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch action failed");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setJobs([]);
    setError(null);
  }, []);

  return { jobs, loading, error, actionLoading, search, batchAction, clear };
}
