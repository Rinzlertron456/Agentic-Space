import { useState } from "react";
import type { SearchFilters } from "@agentic-space/shared";
import { DEFAULT_SEARCH_FILTERS } from "@agentic-space/shared";

interface Props {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
}

export function FilterBar({ onSearch, loading }: Props) {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("Hyderabad");
  const [postedWithin, setPostedWithin] = useState<"last_hour" | "last_24_hours" | "last_week">("last_24_hours");
  const [experience, setExperience] = useState("associate,mid_senior");
  const [empType, setEmpType] = useState("full_time");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      ...DEFAULT_SEARCH_FILTERS,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      locations: location === "All" ? ["Hyderabad", "Bengaluru", "Pune"] : [location],
      postedWithin,
      experienceLevels: experience.split(",") as SearchFilters["experienceLevels"],
      employmentTypes: [empType] as SearchFilters["employmentTypes"],
      sources: ["linkedin", "naukri", "indeed", "google_jobs", "company_portal"],
    };
    onSearch(filters);
  };

  return (
    <div className="card mb-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Job keywords (leave empty to use resume skills)"
          className="input flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading} className="btn-primary">
          {loading ? "..." : "Search"}
        </button>
      </div>
      {!keywords.trim() && (
        <p className="text-[10px] opacity-50 mt-1">
          💡 Leave empty to auto-search using your resume skills
        </p>
      )}

      <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-display font-bold mt-2 underline">
        {showAdvanced ? "Hide" : "Show"} advanced filters
      </button>

      {showAdvanced && (
        <div className="mt-3 pt-3 border-t-2 border-black space-y-2">
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-xs font-display font-bold">Location</span>
              <select className="input text-xs" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option>Hyderabad</option>
                <option>Bengaluru</option>
                <option>Pune</option>
                <option>All</option>
              </select>
            </label>
            <label className="flex-1">
              <span className="text-xs font-display font-bold">Posted</span>
              <select className="input text-xs" value={postedWithin} onChange={(e) => setPostedWithin(e.target.value as any)}>
                <option value="last_hour">Past Hour</option>
                <option value="last_24_hours">Past 24 Hours</option>
                <option value="last_week">Past Week</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-xs font-display font-bold">Experience</span>
              <select className="input text-xs" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option value="associate,mid_senior">Associate & Mid-Senior</option>
                <option value="entry,associate">Entry & Associate</option>
                <option value="mid_senior,senior">Mid-Senior & Senior</option>
                <option value="senior,director">Senior & Director</option>
              </select>
            </label>
            <label className="flex-1">
              <span className="text-xs font-display font-bold">Type</span>
              <select className="input text-xs" value={empType} onChange={(e) => setEmpType(e.target.value)}>
                <option value="full_time">Full-Time</option>
                <option value="contract">Contract</option>
                <option value="part_time">Part-Time</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
