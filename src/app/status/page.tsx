"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Download,
  HardHat,
  ListTodo,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable, type Column } from "@/components/table";
import { Badge, Button, Card, Field, inputCls, Modal, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { useData, useDraft } from "@/lib/data-context";
import { downloadCsv, fmtDate, inr, num } from "@/lib/format";
import { DAILY_CATEGORIES, entryTotal, siteCategoryTotals, type DailyEntry } from "@/lib/types";

const TABS = ["Overview", "Daily Update Status", "Work Progress", "Labour Status", "Issues & Remarks"] as const;

type DraftForm = {
  entryDate: string;
  siteId: string;
  category: string;
  name: string;
  head: string;
  qty: string;
  rate: string;
  notes: string;
};

const emptyForm: DraftForm = {
  entryDate: new Date().toISOString().slice(0, 10),
  siteId: "",
  category: "Labour",
  name: "",
  head: "",
  qty: "1",
  rate: "0",
  notes: "",
};

type ImportRow = {
  rowNo: number;
  entryDate: string;
  siteId: string;
  siteLabel: string;
  category: string;
  name: string;
  head: string;
  qty: number;
  rate: number;
  notes: string;
  errors: string[];
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      i++;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSiteKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!slash) return raw;
  const day = slash[1].padStart(2, "0");
  const month = slash[2].padStart(2, "0");
  const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
  return `${year}-${month}-${day}`;
}

function parseDailyStatusCsv(text: string, sites: { id: number; name: string; code: string }[]) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const siteByKey = new Map<string, number>();
  sites.forEach((site) => {
    siteByKey.set(normalizeSiteKey(site.name), site.id);
    siteByKey.set(normalizeSiteKey(site.code), site.id);
  });

  const valueAt = (cells: string[], names: string[]) => {
    const index = names.map(normalizeHeader).map((name) => headers.indexOf(name)).find((i) => i >= 0);
    return index === undefined ? "" : cells[index] ?? "";
  };

  return lines.slice(1).map((line, index): ImportRow => {
    const cells = parseCsvLine(line);
    const siteLabel = valueAt(cells, ["Site", "Site Code", "Project", "Project Site"]);
    const category = valueAt(cells, ["Type", "Category", "Daily Type"]) || "Expense";
    const name = valueAt(cells, ["Name/Description", "Name", "Description", "Material", "Labour"]);
    const head = valueAt(cells, ["Category/Unit/Head", "Head", "Unit", "Work Head"]);
    const qty = parseFloat(valueAt(cells, ["Qty/Day", "Qty", "Quantity", "Days"])) || 0;
    const rate = parseFloat(valueAt(cells, ["Rate", "Rate Rs", "Amount Rate"])) || 0;
    const siteId = siteByKey.get(normalizeSiteKey(siteLabel));
    const errors: string[] = [];

    if (!siteId) errors.push("Site not found");
    if (!name.trim()) errors.push("Name missing");
    if (!DAILY_CATEGORIES.includes(category as (typeof DAILY_CATEGORIES)[number])) errors.push("Unknown type");

    return {
      rowNo: index + 2,
      entryDate: normalizeDate(valueAt(cells, ["Date", "Entry Date", "EntryDate"])),
      siteId: siteId ? String(siteId) : "",
      siteLabel,
      category,
      name,
      head,
      qty,
      rate,
      notes: valueAt(cells, ["Notes", "Remarks"]),
      errors,
    };
  });
}

export default function StatusPage() {
  const { data, loading, mutate, refresh } = useData();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Daily Update Status");
  const [q, setQ] = useState("");
  const [siteFilter, setSiteFilter] = useState<number | 0>(0);
  const [catFilter, setCatFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DailyEntry | null>(null);
  const [form, setForm, clearDraft] = useDraft<DraftForm>("daily-update", emptyForm);
  const [saving, setSaving] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [syncingImport, setSyncingImport] = useState(false);

  const [prepUser, setPrepUser] = useState("Faheem");
  const [currentRole, setCurrentRole] = useState("Viewer");
  useEffect(() => {
    const raw = localStorage.getItem("frf-user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u && u.name) {
          Promise.resolve().then(() => {
            setPrepUser(u.name);
            setCurrentRole(u.role || "Viewer");
          });
        }
      } catch {}
    }
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.daily
      .filter((d) => (siteFilter ? d.siteId === siteFilter : true))
      .filter((d) => (catFilter ? d.category === catFilter : true))
      .filter((d) =>
        query
          ? [d.name, d.head, d.category, d.entryDate ?? "", d.dateRaw ?? ""].join(" ").toLowerCase().includes(query)
          : true,
      )
      .sort((a, b) => b.id - a.id);
  }, [data, q, siteFilter, catFilter]);

  if (loading || !data) return <Spinner />;

  const siteName = (id: number) => data.sites.find((s) => s.id === id)?.name ?? "—";

  const openAdd = () => {
    setEditing(null);
    if (!form.siteId) setForm({ ...form, siteId: String(data.sites[0]?.id ?? "") });
    setModalOpen(true);
  };
  const openEdit = (d: DailyEntry) => {
    setEditing(d);
    setForm({
      entryDate: d.entryDate ?? "",
      siteId: String(d.siteId),
      category: d.category,
      name: d.name,
      head: d.head,
      qty: String(d.qty),
      rate: String(d.rate),
      notes: d.notes ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      id: editing?.id,
      entryDate: form.entryDate || null,
      siteId: Number(form.siteId) || data.sites[0]?.id,
      category: form.category,
      name: form.name,
      head: form.head,
      qty: parseFloat(form.qty) || 0,
      rate: parseFloat(form.rate) || 0,
      notes: form.notes,
    };
    await mutate("/api/daily", editing ? "PATCH" : "POST", body);
    setSaving(false);
    setModalOpen(false);
    if (!editing) clearDraft();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this daily update entry?")) return;
    await mutate("/api/daily", "DELETE", { id });
  };

  const exportCsv = () => {
    downloadCsv(
      "daily-update-status.csv",
      ["Date", "Site", "Type", "Name/Description", "Category/Unit/Head", "Qty/Day", "Rate", "Total"],
      filtered.map((d) => [d.entryDate ?? d.dateRaw ?? "", siteName(d.siteId), d.category, d.name, d.head, d.qty, d.rate, entryTotal(d)]),
    );
  };

  const importCsv = async (file: File) => {
    setImportError(null);
    const rows = parseDailyStatusCsv(await file.text(), data.sites);
    if (rows.length === 0) {
      setImportRows([]);
      setImportError("No daily status rows found. Use a CSV with headers like Date, Site, Type, Name/Description, Category/Unit/Head, Qty/Day and Rate.");
    } else {
      setImportRows(rows);
    }
    setImportOpen(true);
  };

  const syncImportedRows = async () => {
    if (currentRole !== "Admin") {
      setImportError("Only Admin can sync verified import data.");
      return;
    }

    const invalidRows = importRows.filter((row) => row.errors.length > 0);
    if (invalidRows.length) {
      setImportError("Fix or remove invalid rows before syncing.");
      return;
    }

    setSyncingImport(true);
    setImportError(null);
    try {
      const raw = localStorage.getItem("frf-user");
      const user = raw ? JSON.parse(raw) : {};
      const res = await fetch("/api/daily/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email || "",
          "X-User-Role": user.role || "",
        },
        body: JSON.stringify({
          entries: importRows.map((row) => ({
            entryDate: row.entryDate || null,
            siteId: Number(row.siteId),
            category: row.category,
            name: row.name,
            head: row.head,
            qty: row.qty,
            rate: row.rate,
            notes: row.notes,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Import sync failed");
      }

      await refresh();
      setImportOpen(false);
      setImportRows([]);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import sync failed");
    } finally {
      setSyncingImport(false);
    }
  };

  const columns: Column<DailyEntry>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (d) => d.entryDate ?? "",
      render: (d) => <span className="whitespace-nowrap text-slate-500">{fmtDate(d.entryDate, d.dateRaw)}</span>,
      width: "110px",
    },
    { key: "site", label: "Site", sortValue: (d) => siteName(d.siteId), render: (d) => <span className="whitespace-nowrap text-xs font-semibold text-blue-700 dark:text-blue-300">{siteName(d.siteId)}</span> },
    {
      key: "category",
      label: "Type",
      sortValue: (d) => d.category,
      render: (d) => <Badge status={d.category === "Labour" ? "Active" : d.category === "Expense" ? "Pending" : "In Stock"} className="!text-[10px]">{d.category}</Badge>,
    },
    { key: "name", label: "Name / Description", sortValue: (d) => d.name, render: (d) => <span className="font-medium text-slate-800 dark:text-slate-100">{d.name || "—"}</span> },
    { key: "head", label: "Category / Unit / Head", sortValue: (d) => d.head, render: (d) => <span className="text-slate-500">{d.head || "—"}</span> },
    { key: "qty", label: "Qty / Day", align: "right", sortValue: (d) => d.qty, render: (d) => num(d.qty) },
    { key: "rate", label: "Rate", align: "right", sortValue: (d) => d.rate, render: (d) => inr(d.rate) },
    {
      key: "total",
      label: "Total",
      align: "right",
      sortValue: (d) => entryTotal(d),
      render: (d) => <span className="font-semibold text-slate-900 dark:text-white">{inr(entryTotal(d))}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (d) => (
        <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><Pencil size={14} /></button>
          <button onClick={() => void remove(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 size={14} /></button>
        </span>
      ),
    },
  ];

  const filteredTotal = filtered.reduce((s, d) => s + entryTotal(d), 0);
  const importValidRows = importRows.filter((row) => row.errors.length === 0);
  const importInvalidRows = importRows.length - importValidRows.length;
  const isAdmin = currentRole === "Admin";

  // Summary by Site (exact replica of the sheet's summary block)
  const summaryCats = ["Labour", "Cement", "Steel", "M-Sand", "K-Sand", "Metal", "Boller", "M-Waste", "Laterite", "Expense"];

  const labourByPerson = new Map<string, { days: number; total: number; skill: string; site: string }>();
  data.daily.filter((d) => d.category === "Labour").forEach((d) => {
    const k = d.name.toLowerCase();
    const cur = labourByPerson.get(k) || { days: 0, total: 0, skill: d.head, site: siteName(d.siteId) };
    cur.days += d.qty;
    cur.total += entryTotal(d);
    labourByPerson.set(k, cur);
  });
  const labourRows = [...labourByPerson.entries()].map(([name, v], i) => ({ id: i + 1, name, ...v })).sort((a, b) => b.total - a.total);

  return (
    <div>
      <PageHeader
        title="Status"
        subtitle={`Prepared by ${prepUser} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importCsv(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}><Upload size={15} /> Import Daily Status</Button>
            <Button variant="outline" onClick={exportCsv}><Download size={15} /> Export</Button>
            <Button onClick={openAdd}><Plus size={15} /> Add Daily Update</Button>
          </>
        }
      />

      <div className="no-print mb-5 flex flex-wrap gap-1.5 rounded-2xl bg-white/70 p-1.5 shadow-sm ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/60 dark:ring-slate-700/60">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative rounded-xl px-4 py-2 text-[13px] font-semibold transition ${
              tab === t ? "text-white" : "text-slate-500 hover:text-blue-600 dark:text-slate-400"
            }`}
          >
            {tab === t && <motion.span layoutId="status-tab" className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/30" />}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {tab === "Overview" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {data.sites.map((s) => {
                const sum = siteCategoryTotals(data.daily, s.id);
                return (
                  <Card key={s.id} className="p-5" hover>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.code} · Engineer {s.engineer}</p>
                      </div>
                      <Badge status={s.status} />
                    </div>
                    <ProgressBar value={s.progress} />
                    <p className="mt-1.5 text-[11px] text-slate-400">{s.progress}% work progress · Timeline {fmtDate(s.startDate)} → {fmtDate(s.targetDate)}</p>
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[13px] dark:border-slate-800">
                      {[...sum.byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => (
                        <div key={c} className="flex justify-between">
                          <span className="text-slate-500">{c}</span>
                          <span className="font-medium tabular-nums dark:text-slate-200">{inr(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-slate-100 pt-2 font-bold dark:border-slate-800">
                        <span className="dark:text-white">Grand Total</span>
                        <span className="tabular-nums dark:text-white">{inr(sum.grand)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <Card className="p-5 lg:col-span-3">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><ClipboardList size={16} className="text-blue-500" /> Summary by Site — exactly as the Excel sheet</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                        <th className="px-3 py-2.5">Site</th>
                        {summaryCats.map((c) => <th key={c} className="px-3 py-2.5 text-right">Total {c === "Expense" ? "Expenses" : c}</th>)}
                        <th className="px-3 py-2.5 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sites.map((s) => {
                        const sum = siteCategoryTotals(data.daily, s.id);
                        return (
                          <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                            <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-blue-700 dark:text-blue-300">{s.code}</td>
                            {summaryCats.map((c) => (
                              <td key={c} className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{inr(sum.byCategory.get(c) || 0)}</td>
                            ))}
                            <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-900 dark:text-white">{inr(sum.grand)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-50/60 font-bold dark:bg-blue-500/10">
                        <td className="px-3 py-2.5 dark:text-white">ALL SITES</td>
                        {summaryCats.map((c) => (
                          <td key={c} className="px-3 py-2.5 text-right tabular-nums dark:text-white">{inr(siteCategoryTotals(data.daily).byCategory.get(c) || 0)}</td>
                        ))}
                        <td className="px-3 py-2.5 text-right tabular-nums text-blue-700 dark:text-blue-300">{inr(siteCategoryTotals(data.daily).grand)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {tab === "Daily Update Status" && (
            <Card className="p-5">
              <div className="no-print mb-4 flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[220px] flex-1">
                  <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, head, category…" className={`${inputCls} !pl-9`} />
                </div>
                <select value={siteFilter} onChange={(e) => setSiteFilter(Number(e.target.value))} className={`${inputCls} !w-auto`}>
                  <option value={0}>All sites</option>
                  {data.sites.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${inputCls} !w-auto`}>
                  <option value="">All types</option>
                  {DAILY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="ml-auto rounded-xl bg-blue-50 px-3.5 py-2 text-[13px] font-bold text-blue-700 tabular-nums dark:bg-blue-500/10 dark:text-blue-300">
                  Total: {inr(filteredTotal)}
                </span>
              </div>
              <DataTable
                columns={columns}
                rows={filtered}
                pageSize={20}
                selectable
                onBulkDelete={(ids) => {
                  if (confirm(`Delete ${ids.length} entries?`)) ids.forEach((id) => void mutate("/api/daily", "DELETE", { id }));
                }}
                dense
              />
            </Card>
          )}

          {tab === "Work Progress" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><ListTodo size={16} className="text-blue-500" /> Pending Works</h3>
                <div className="space-y-2.5">
                  {data.tasks.filter((t) => t.status !== "done").map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800">
                      <div>
                        <p className="text-sm font-medium dark:text-slate-100">{t.title}</p>
                        <p className="text-xs text-slate-400">{siteName(t.siteId ?? 0)} · due {fmtDate(t.dueDate)} · {t.assignee}</p>
                      </div>
                      <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => void mutate("/api/tasks", "PATCH", { id: t.id, status: "done" })}>
                        Mark done
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><ClipboardList size={16} className="text-emerald-500" /> Completed Works & Project Timeline</h3>
                <div className="space-y-2.5">
                  {data.tasks.filter((t) => t.status === "done").map((t) => (
                    <div key={t.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-500/5">
                      <span className="font-medium text-emerald-800 dark:text-emerald-300">✓ {t.title}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {data.sites.map((s) => (
                    <div key={s.id}>
                      <div className="mb-1 flex justify-between text-sm"><span className="font-semibold dark:text-slate-100">{s.name}</span><span className="text-xs text-slate-400">{fmtDate(s.startDate)} → {fmtDate(s.targetDate)}</span></div>
                      <ProgressBar value={s.progress} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === "Labour Status" && (
            <Card className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><HardHat size={16} className="text-blue-500" /> Labour Status — aggregated from the daily ledger</h3>
              <DataTable
                columns={[
                  { key: "name", label: "Labour / Crew", sortValue: (r) => r.name, render: (r) => <span className="font-medium capitalize dark:text-slate-100">{r.name}</span> },
                  { key: "skill", label: "Category", sortValue: (r) => r.skill, render: (r) => <span className="text-slate-500 capitalize">{r.skill || "—"}</span> },
                  { key: "site", label: "Primary Site", sortValue: (r) => r.site },
                  { key: "days", label: "Total Days", align: "right", sortValue: (r) => r.days, render: (r) => num(r.days) },
                  { key: "total", label: "Total Wages", align: "right", sortValue: (r) => r.total, render: (r) => <b>{inr(r.total)}</b> },
                ]}
                rows={labourRows}
                pageSize={15}
              />
            </Card>
          )}

          {tab === "Issues & Remarks" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><AlertTriangle size={16} className="text-amber-500" /> Issues</h3>
                <div className="space-y-2.5">
                  {data.notifications.map((n) => (
                    <div key={n.id} className={`rounded-xl border px-4 py-3 ${n.kind === "danger" ? "border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-500/5" : n.kind === "warning" ? "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-500/5" : "border-slate-100 dark:border-slate-800"}`}>
                      <p className="text-sm font-semibold dark:text-slate-100">{n.title}</p>
                      <p className="text-xs text-slate-500">{n.body}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><StickyNote size={16} className="text-blue-500" /> Remarks & Site Photos</h3>
                <div className="space-y-2.5">
                  {data.sites.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="text-sm font-semibold dark:text-slate-100">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.notes}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-300 dark:border-slate-700">
                      <Camera size={22} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">Upload site photos, drawings & documents from the site detail page.</p>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Verify Daily Status Import" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
              <p className="text-[11px] font-semibold tracking-wider text-blue-500 uppercase">Rows Found</p>
              <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">{importRows.length}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
              <p className="text-[11px] font-semibold tracking-wider text-emerald-500 uppercase">Ready</p>
              <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">{importValidRows.length}</p>
            </div>
            <div className={`rounded-xl px-4 py-3 ${importInvalidRows ? "bg-rose-50 dark:bg-rose-500/10" : "bg-slate-50 dark:bg-slate-800"}`}>
              <p className={`text-[11px] font-semibold tracking-wider uppercase ${importInvalidRows ? "text-rose-500" : "text-slate-400"}`}>Needs Review</p>
              <p className={`mt-1 text-xl font-bold ${importInvalidRows ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}`}>{importInvalidRows}</p>
            </div>
          </div>

          {importError ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertTriangle size={15} />
              <span>{importError}</span>
            </div>
          ) : null}

          {!isAdmin ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300">
              You can review imported rows here, but only an Admin can sync them into existing daily status data.
            </div>
          ) : null}

          <div className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                  <th className="px-3 py-2.5">Row</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Site</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Name / Description</th>
                  <th className="px-3 py-2.5">Head</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((row) => (
                  <tr key={row.rowNo} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2.5 text-slate-400">{row.rowNo}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.entryDate || "-"}</td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-blue-700 dark:text-blue-300">{row.siteLabel || "-"}</td>
                    <td className="px-3 py-2.5">{row.category}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{row.name || "-"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{row.head || "-"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(row.qty)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{inr(row.rate)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{inr(row.qty * row.rate)}</td>
                    <td className="px-3 py-2.5">
                      {row.errors.length ? (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">{row.errors.join(", ")}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {importRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-400">No rows loaded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setImportOpen(false)} disabled={syncingImport}>
              Cancel
            </Button>
            <Button
              onClick={() => void syncImportedRows()}
              disabled={syncingImport || !isAdmin || importRows.length === 0 || importInvalidRows > 0}
            >
              {syncingImport ? "Syncing..." : "Sync Verified Data"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Daily Update" : "Add Daily Update"} wide>
        <p className="-mt-3 mb-4 text-xs text-slate-400">{editing ? "" : "Auto-saved as draft while you type."}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date"><input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className={inputCls} /></Field>
          <Field label="Site">
            <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className={inputCls}>
              {data.sites.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {DAILY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Name / Description" className="sm:col-span-2"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. hackeem, Cement, jayesh FOUNDATION" className={inputCls} /></Field>
          <Field label="Category / Unit / Head"><input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} placeholder="e.g. Skilled, Bag, load" className={inputCls} /></Field>
          <Field label="Qty / Day"><input type="number" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className={inputCls} /></Field>
          <Field label="Rate (₹)"><input type="number" step="any" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputCls} /></Field>
          <Field label="Total (auto)">
            <div className="flex h-[42px] items-center rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 font-bold text-blue-700 tabular-nums dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
              {inr((parseFloat(form.qty) || 0) * (parseFloat(form.rate) || 0))}
            </div>
          </Field>
          <Field label="Notes / Remarks" className="sm:col-span-3"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional remarks" className={inputCls} /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving || !form.name}>{saving ? "Saving…" : editing ? "Save Changes" : "Add Update"}</Button>
        </div>
      </Modal>
    </div>
  );
}
