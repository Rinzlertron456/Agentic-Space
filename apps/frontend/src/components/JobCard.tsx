import type { JobListing } from "@agentic-space/shared";
import { MatchBadge } from "./MatchBadge";

interface Props {
  job: JobListing;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export function JobCard({ job, selected, onToggleSelect }: Props) {
  const daysAgo = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
  return (
    <div className={`card transition-all ${selected ? "ring-2 ring-yellow-400" : ""}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => onToggleSelect(job.id)} className={`mt-1 w-5 h-5 border-2 border-black flex-shrink-0 flex items-center justify-center ${selected ? "bg-yellow-400" : "bg-white"}`}>
          {selected && <span className="text-sm font-bold">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-sm truncate">{job.title}</h3>
            <MatchBadge score={job.matchScore} />
          </div>
          <p className="font-bold text-xs mt-0.5">{job.company}</p>
          <p className="text-xs opacity-60 mt-0.5">{job.location}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="badge bg-gray-100 text-[10px]">{daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</span>
            {job.isEasyApply && <span className="badge bg-green-100 text-[10px]">Easy Apply</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t-2 border-black">
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-small flex-1 text-center">Apply ↗</a>
        <button className="btn-secondary btn-small flex-1">Tailor</button>
      </div>
    </div>
  );
}
