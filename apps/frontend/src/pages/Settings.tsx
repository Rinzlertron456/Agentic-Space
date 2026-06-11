import { useState } from "react";

export default function Settings() {
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [careerSiteCount] = useState(90);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLastUploaded(file.name);
      // TODO: Send to backend /api/career-sites/upload
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl mb-1">Settings</h2>
        <p className="text-xs opacity-60">Configure your agent</p>
      </div>

      {/* Ollama Config */}
      <div className="card">
        <h3 className="text-xs mb-3">🦙 Ollama Configuration</h3>
        <label className="block">
          <span className="text-xs font-display font-bold">Host URL</span>
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            className="input mt-1"
          />
        </label>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs">Connected</span>
        </div>
      </div>

      {/* Career Sites Database */}
      <div className="card">
        <h3 className="text-xs mb-3">🏢 Career Sites Database</h3>
        <p className="text-xs opacity-60 mb-2">
          {careerSiteCount} curated Indian company career sites loaded
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          <span className="badge bg-yellow-200 text-[9px]">Top Companies</span>
          <span className="badge bg-cyan-200 text-[9px]">Mid-Size</span>
          <span className="badge bg-lime-200 text-[9px]">Startups</span>
        </div>

        <div className="border-2 border-dashed border-black p-3 text-center">
          <p className="text-xs font-display font-bold mb-1">
            Upload new career sites data
          </p>
          <p className="text-[10px] opacity-60 mb-2">
            Supports .xlsx or .csv with Company Name + Career URL columns
          </p>
          <label className="btn-secondary btn-small cursor-pointer inline-block">
            Browse File
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {lastUploaded && (
            <p className="text-[10px] text-green-600 mt-1">
              ✓ Uploaded: {lastUploaded}
            </p>
          )}
        </div>

        <details className="mt-3">
          <summary className="text-xs font-display font-bold cursor-pointer">
            View all {careerSiteCount} companies
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto border-2 border-black p-2 text-[10px]">
            <p className="opacity-60">Fetching from backend... (Phase 2)</p>
          </div>
        </details>
      </div>

      {/* Job Preferences */}
      <div className="card">
        <h3 className="text-xs mb-3">🎯 Job Preferences</h3>
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs font-display font-bold">Locations</span>
            <input
              type="text"
              defaultValue="Hyderabad, Bengaluru, Pune"
              className="input mt-1"
            />
          </label>
          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-xs">Skip LinkedIn Easy Apply jobs</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-xs">Search company career sites</span>
          </label>
        </div>
      </div>

      {/* Notion */}
      <div className="card">
        <h3 className="text-xs mb-3">📝 Notion Integration</h3>
        <p className="text-xs opacity-60">
          Connect Notion to sync activity logs (optional)
        </p>
        <button className="btn-secondary btn-small mt-2">Connect Notion</button>
      </div>
    </div>
  );
}
