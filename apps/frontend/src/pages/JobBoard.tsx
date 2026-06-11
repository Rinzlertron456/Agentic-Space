import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { JobCard } from "../components/JobCard";
import { BatchActions } from "../components/BatchActions";
import { FilterBar } from "../components/FilterBar";
import { useJobs } from "../hooks/useJobs";
import { useBatchSelect } from "../hooks/useBatchSelect";
import { useResume } from "../hooks/useResume";
import type { SearchFilters } from "@agentic-space/shared";

export default function JobBoard() {
  const { jobs, loading, error, search } = useJobs();
  const { getFirst } = useResume();
  const navigate = useNavigate();
  const batch = useBatchSelect<string>();
  const firstResume = getFirst();

  useEffect(() => {
    if (!firstResume) navigate("/");
  }, [firstResume, navigate]);

  const handleSearch = (filters: SearchFilters) => {
    if (firstResume) search(firstResume.id, filters);
  };

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
      <FilterBar onSearch={handleSearch} loading={loading} />
      <BatchActions
        count={batch.count}
        total={jobs.length}
        onSelectAll={() => batch.selectAll(jobs.map((j) => j.id))}
        onClearAll={batch.clearAll}
        onApply={() => {}}
        onTailor={() => {}}
        onSave={() => {}}
      />
      {loading && (
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="font-display font-bold text-sm">Searching jobs...</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
