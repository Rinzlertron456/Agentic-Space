import { useState } from "react";
import type { SearchFilters } from "@agentic-space/shared";
import { DEFAULT_SEARCH_FILTERS } from "@agentic-space/shared";

interface Props {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
}

export function FilterBar({ onSearch, loading }: Props) {
  const [keywords, setKeywords] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      ...DEFAULT_SEARCH_FILTERS,
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
    };
    onSearch(filters);
  };

  return (
    <div className="card mb-4">
      <div className="flex gap-2">
        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Job keywords (comma-separated)" className="input flex-1" onKeyDown={e => e.key === "Enter" && handleSearch()} />
        <button onClick={handleSearch} disabled={loading || !keywords} className="btn-primary">{loading ? "..." : "Search"}</button>
      </div>
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-display font-bold mt-2 underline">{showAdvanced ? "Hide" : "Show"} advanced filters</button>
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t-2 border-black space-y-2">
          <div className="flex gap-2">
            <label className="flex-1"><span className="text-xs font-display font-bold">Location</span><select className="input text-xs"><option>Hyderabad</option><option>Bengaluru</option><option>Pune</option><option>All</option></select></label>
            <label className="flex-1"><span className="text-xs font-display font-bold">Posted</span><select className="input text-xs"><option value="last_hour">Past Hour</option><option value="last_24_hours">Past 24 Hours</option><option value="last_week">Past Week</option></select></label>
          </div>
          <div className="flex gap-2">
            <label className="flex-1"><span className="text-xs font-display font-bold">Experience</span><select className="input text-xs"><option>Associate</option><option>Mid-Senior</option><option>Senior</option></select></label>
            <label className="flex-1"><span className="text-xs font-display font-bold">Type</span><select className="input text-xs"><option>Full-Time</option><option>Contract</option></select></label>
          </div>
        </div>
      )}
    </div>
  );
}
