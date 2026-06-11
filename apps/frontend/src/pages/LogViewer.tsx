import { useState } from "react";
export default function LogViewer() {
  const [logs] = useState<string[]>([]);
  return (
    <div className="space-y-4">
      <div className="text-center mb-4"><h2 className="text-xl mb-1">Activity Logs</h2><p className="text-xs opacity-60">Agent actions and history</p></div>
      {logs.length === 0 && <div className="card text-center py-8"><span className="text-3xl block mb-2">📋</span><p className="font-display font-bold text-sm">No logs yet</p><p className="text-xs opacity-60 mt-1">Logs will appear here once you start searching jobs</p></div>}
      {logs.length > 0 && <div className="space-y-2">{logs.map((log, i) => <div key={i} className="card text-xs font-mono">{log}</div>)}</div>}
    </div>
  );
}
