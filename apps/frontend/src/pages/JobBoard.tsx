import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { JobCard } from "../components/JobCard";
import { BatchActions } from "../components/BatchActions";
import { FilterBar } from "../components/FilterBar";
import { useJobs } from "../hooks/useJobs";
import { useBatchSelect } from "../hooks/useBatchSelect";
import { useResume } from "../hooks/useResume";
import type { SearchFilters } from "@agentic-space/shared";

export default function JobBoard() {
  const { jobs, loading, actionLoading, error, search, batchAction, clear } = useJobs();
  const { getFirst } = useResume();
  const navigate = useNavigate();
  const batch = useBatchSelect<string>();
  const firstResume = getFirst();
  const resumeId = firstResume?.id || "";

  useEffect(() => {
    if (!firstResume) navigate("/");
  }, [firstResume, navigate]);

  const handleSearch = useCallback(
    (filters: SearchFilters) => {
      if (resumeId) search(resumeId, filters);
    },
    [resumeId, search]
  );

  const handleApply = useCallback(() => {
    if (batch.selected.length > 0) {
      batchAction(batch.selected, "apply");
    }
  }, [batch.selected, batchAction]);

  const handleTailor = useCallback(() => {
    if (batch.selected.length > 0) {
      batchAction(batch.selected, "tailor");
    }
  }, [batch.selected, batchAction]);

  const handleSave = useCallback(() => {
    if (batch.selected.length > 0) {
      batchAction(batch.selected, "save");
    }
  }, [batch.selected, batchAction]);

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

      <BatchActions
        count={batch.count}
        total={jobs.length}
        onSelectAll={() => batch.selectAll(jobs.map((j) => j.id))}
        onClearAll={batch.clearAll}
        onApply={handleApply}
        onTailor={handleTailor}
        onSave={handleSave}
      />

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

      {!loading && jobs.length === 0 && !error && (
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">💼</span>
          <p className="font-display font-bold text-sm">No jobs yet</p>
          <p className="text-xs opacity-60 mt-1">
            Search for jobs using keywords above
          </p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={batch.isSelected(job.id)}
              onToggleSelect={batch.toggle}
              onViewDetail={(id) => navigate(`/jobs/${id}`)}
            />
          ))}
        </div>
      )}

      {jobs.length > 0 && (
        <button onClick={clear} className="btn-secondary btn-small w-full">
          Clear Results
        </button>
      )}
    </div>
  );
}
