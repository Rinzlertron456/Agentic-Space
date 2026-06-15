import type { JobListing } from "@agentic-space/shared";
import { MatchBadge } from "./MatchBadge";
import { useNavigate } from "react-router-dom";

interface Props {
  job: JobListing;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onViewDetail?: (id: string) => void;
}

export function JobCard({ job, selected, onToggleSelect, onViewDetail }: Props) {
  const navigate = useNavigate();
  const daysAgo = Math.floor(
    (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  const handleDetail = () => {
    if (onViewDetail) onViewDetail(job.id);
    else navigate(`/jobs/${job.id}`);
  };
  return (
    <div
      className={`card transition-all cursor-pointer ${
        selected ? "ring-2 ring-yellow-400 shadow-brutalLg" : "hover:shadow-brutalLg"
      }`}
      onClick={handleDetail}
    >
      <div className="flex items-start gap-3">
        {onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(job.id);
            }}
            className={`mt-1 w-5 h-5 border-2 border-black flex-shrink-0 flex items-center justify-center ${
              selected ? "bg-yellow-400" : "bg-white"
            }`}
          >
            {selected && <span className="text-sm font-bold leading-none">✓</span>}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-sm truncate">
              {job.title}
            </h3>
            <MatchBadge score={job.matchScore} />
          </div>
          <p className="font-bold text-xs mt-0.5">{job.company}</p>
          <p className="text-xs opacity-60 mt-0.5">{job.location}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="badge bg-gray-100 text-[10px]">
              {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
            </span>
            {job.isEasyApply && (
              <span className="badge bg-green-100 text-[10px]">Easy Apply</span>
            )}
            <span className="badge bg-cyan-100 text-[10px]">{job.source}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t-2 border-black">
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-small flex-1 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            Apply ↗
          </a>
        ) : (
          <button
            type="button"
            className="btn-secondary btn-small flex-1 text-center opacity-50 cursor-not-allowed"
            disabled
          >
            No direct apply URL
          </button>
        )}
      </div>
    </div>
  );
}
