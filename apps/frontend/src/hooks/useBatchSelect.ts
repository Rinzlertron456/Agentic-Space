import { useState, useCallback } from "react";

export function useBatchSelect<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  return {
    selected: Array.from(selected),
    count: selected.size,
    toggle,
    selectAll,
    clearAll,
    isSelected,
  };
}
