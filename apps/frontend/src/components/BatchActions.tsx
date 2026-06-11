interface Props {
  count: number; total: number;
  onSelectAll: () => void; onClearAll: () => void;
  onApply: () => void; onTailor: () => void; onSave: () => void;
}
export function BatchActions({ count, total, onSelectAll, onClearAll, onApply, onTailor, onSave }: Props) {
  if (total === 0) return null;
  return (
    <div className="card mb-4 bg-yellow-100">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm">{count > 0 ? `${count} selected` : "No selection"}</span>
        <div className="flex gap-1">
          <button onClick={onSelectAll} className="btn-secondary btn-small">Select All</button>
          {count > 0 && <button onClick={onClearAll} className="btn-danger btn-small">Clear</button>}
        </div>
      </div>
      {count > 0 && (
        <div className="flex gap-2">
          <button onClick={onApply} className="btn-primary btn-small flex-1">Apply ({count})</button>
          <button onClick={onTailor} className="btn-secondary btn-small flex-1">Tailor All</button>
          <button onClick={onSave} className="btn-secondary btn-small flex-1">Save</button>
        </div>
      )}
    </div>
  );
}
