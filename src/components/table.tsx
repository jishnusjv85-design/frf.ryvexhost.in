"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Empty } from "@/components/ui";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string;
};

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  pageSize = 15,
  onRowClick,
  selectable = false,
  onBulkDelete,
  footer,
  dense = false,
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onBulkDelete?: (ids: number[]) => void;
  footer?: ReactNode;
  dense?: boolean;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
  }, [rows, sortKey, sortDir, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pages - 1);
  const view = sorted.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 1) setSortDir(-1);
      else {
        setSortKey(null);
        setSortDir(1);
      }
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const allChecked = view.length > 0 && view.every((r) => selected.has(r.id));

  return (
    <div>
      {selectable && selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm dark:border-blue-800 dark:bg-blue-500/10">
          <span className="font-semibold text-blue-700 dark:text-blue-300">{selected.size} selected</span>
          <button
            onClick={() => {
              onBulkDelete?.([...selected]);
              setSelected(new Set());
            }}
            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Delete selected
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl">
        <table className="table-sticky w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50/95 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (allChecked) view.forEach((r) => next.delete(r.id));
                      else view.forEach((r) => next.add(r.id));
                      setSelected(next);
                    }}
                    className="accent-blue-600"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={`px-3 py-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                >
                  {c.sortValue ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-blue-600">
                      {c.label}
                      {sortKey === c.key ? (
                        sortDir === 1 ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-slate-100/80 transition-colors last:border-0 dark:border-slate-800/60 ${
                  onRowClick ? "cursor-pointer" : ""
                } hover:bg-blue-50/50 dark:hover:bg-blue-500/5`}
              >
                {selectable && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(row.id)) next.delete(row.id);
                        else next.add(row.id);
                        setSelected(next);
                      }}
                      className="accent-blue-600"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 ${dense ? "py-2" : "py-2.5"} text-slate-700 dark:text-slate-200 ${
                      c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : ""
                    }`}
                  >
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer}
        </table>
        {rows.length === 0 && <Empty icon={Inbox} title="No records found" sub="Try adjusting filters or add a new entry." />}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span className="text-xs">
            Showing {clampedPage * pageSize + 1}–{Math.min((clampedPage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={clampedPage === 0}
              onClick={() => setPage(clampedPage - 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-xs font-semibold">
              {clampedPage + 1} / {pages}
            </span>
            <button
              disabled={clampedPage >= pages - 1}
              onClick={() => setPage(clampedPage + 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
