import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function LogViewer() {
  const [dates, setDates] = useState<{ date: string; file: string; size: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [raw, setRaw] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getLogs().then((r: any) => {
      if (r.success) setDates(r.dates);
    }).catch(() => {});
  }, []);

  const loadDate = async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    try {
      const r: any = await api.getLogByDate(date);
      if (r.success) {
        setEntries(r.entries || []);
        setRaw(r.raw || "");
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl mb-1">Activity Logs</h2>
        <p className="text-xs opacity-60">Agent actions and history</p>
      </div>

      {dates.length === 0 && !loading && (
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">📋</span>
          <p className="font-display font-bold text-sm">No logs yet</p>
          <p className="text-xs opacity-60 mt-1">Logs appear here once you use the agent</p>
        </div>
      )}

      {dates.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {dates.map((d) => (
            <button
              key={d.date}
              onClick={() => loadDate(d.date)}
              className={`btn-small ${selectedDate === d.date ? "btn-primary" : "btn-secondary"}`}
            >
              {d.date}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="card text-center py-4"><p className="font-display font-bold text-xs">Loading logs...</p></div>}

      {entries.length > 0 && !loading && (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-yellow-200 text-[9px]">{e.action}</span>
                <span className="text-[10px] opacity-60">{new Date(e.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs">{e.message}</p>
              {e.details && (
                <pre className="text-[9px] opacity-60 mt-1 overflow-x-auto">
                  {JSON.stringify(e.details, null, 1).slice(0, 500)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
