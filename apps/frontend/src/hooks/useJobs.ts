import { useState, useCallback } from "react";
import type { JobListing, SearchFilters } from "@agentic-space/shared";
import { api } from "../services/api";

export function useJobs() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const clear = useCallback(() => {
    setJobs([]);
    setError(null);
  }, []);

  return { jobs, loading, error, search, clear };
}
