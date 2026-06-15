import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { JobCard } from "../components/JobCard";
import { BatchActions } from "../components/BatchActions";
import { FilterBar } from "../components/FilterBar";
import { useJobs } from "../hooks/useJobs";
import { useBatchSelect } from "../hooks/useBatchSelect";
import { useResume } from "../hooks/useResume";
import type { SearchFilters } from "@agentic-space/shared";
import { DEFAULT_SEARCH_FILTERS } from "@agentic-space/shared";

export default function JobBoard() {
  const { jobs, loading, actionLoading, error, search, batchAction, clear } = useJobs();
  const { getFirst } = useResume();
  const navigate = useNavigate();
  const location = useLocation();
  const batch = useBatchSelect();
  const firstResume = getFirst();
  const resumeId = firstResume?.id || "";
  const hasJobs = jobs.length > 0;
  const autoSearchTriggered = useRef(false);

  // Check if we arrived from Dashboard with autoSearch intent
  const navState = location.state as { resumeId?: string; autoSearch?: boolean } | null;

  useEffect(() => {
    if (!firstResume) navigate("/");
  }, [firstResume, navigate]);

  // Auto-search on mount when navigated from Dashboard "Find Jobs"
  useEffect(() => {
    if (
      navState?.autoSearch &&
      resumeId &&
      !autoSearchTriggered.current &&
      !loading &&
      !hasJobs
    ) {
      autoSearchTriggered.current = true;

      // Build default filters — let the backend use resume skills as keywords
      const preferredRoles = firstResume?.preferredRoles || [];
      const autoKeywords = preferredRoles.length > 0
        ? preferredRoles.slice(0, 3)
        : []; // empty = backend uses resume skills

      const filters: SearchFilters = {
        ...DEFAULT_SEARCH_FILTERS,
        keywords: autoKeywords,
        sources: ["linkedin", "naukri", "indeed", "google_jobs", "company_portal"],
      };
      search(resumeId, filters);
    }
  }, [navState, resumeId, loading, hasJobs, firstResume, search]);

  const handleSearch = useCallback(
    (filters: SearchFilters) => {
      if (resumeId) search(resumeId, filters);
    },
    [resumeId, search],
  );

  const handleApply = useCallback(() => {
    if (batch.count > 0) batchAction(batch.selected, "apply");
  }, [batch, batchAction]);

  const handleTailor = useCallback(() => {
    if (batch.count > 0) batchAction(batch.selected, "tailor");
  }, [batch, batchAction]);

  const handleSave = useCallback(() => {
    if (batch.count > 0) batchAction(batch.selected, "save");
  }, [batch, batchAction]);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl mb-1">Job Board</h2>
        {firstResume && (
          <p className="text-xs opacity-60">
            Matching from: {firstResume.fileName}
          </p>
        )}
      </div>

      <FilterBar onSearch={handleSearch} loading={loading || actionLoading} />

      {hasJobs && (
        <BatchActions
          count={batch.count}
          total={jobs.length}
          onSelectAll={() => batch.selectAll(jobs.map((j) => j.id))}
          onClearAll={batch.clearAll}
          onApply={handleApply}
          onTailor={handleTailor}
          onSave={handleSave}
          loading={actionLoading}
        />
      )}

      {loading && (
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="font-display font-bold text-sm">Searching jobs...</p>
        </div>
      )}

      {actionLoading && (
        <div className="card text-center py-4 bg-yellow-100">
          <p className="font-display font-bold text-xs">Processing batch action...</p>
        </div>
      )}

      {error && (
        <div className="card bg-red-100 border-red-400">
          <p className="text-xs font-bold text-red-600">{error}</p>
        </div>
      )}

      {!loading && !hasJobs && !error && (
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">💼</span>
          <p className="font-display font-bold text-sm">No jobs yet</p>
          <p className="text-xs opacity-60 mt-1">
            Search for jobs using keywords above
          </p>
        </div>
      )}

      {!loading && hasJobs && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={batch.isSelected(job.id)}
              onToggleSelect={batch.toggle}
              onViewDetail={(jobId) => {
                const jobData = jobs.find((j) => j.id === jobId);
                navigate(`/jobs/${jobId}`, { state: { job: jobData } });
              }}
            />
          ))}
        </div>
      )}

      {hasJobs && (
        <button onClick={clear} className="btn-secondary btn-small w-full">
          Clear Results
        </button>
      )}
    </div>
  );
}
