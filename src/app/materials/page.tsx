"use client";

import { Download, History, Package, Pencil, Plus, QrCode, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { DataTable, type Column } from "@/components/table";
import { Badge, Button, Card, Field, inputCls, Modal, PageHeader, Spinner, StatCard } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { downloadCsv, fmtDate, inr, num } from "@/lib/format";
import { entryTotal, MATERIAL_CATEGORIES, type Material } from "@/lib/types";

type Form = {
  name: string; category: string; supplier: string; purchaseDate: string; siteId: string;
  qty: string; unit: string; rate: string; gstPct: string; transport: string; used: string;
};
const emptyForm: Form = { name: "", category: "Cement", supplier: "", purchaseDate: new Date().toISOString().slice(0, 10), siteId: "", qty: "0", unit: "Bag", rate: "0", gstPct: "0", transport: "0", used: "0" };

const totalCost = (m: { qty: number; rate: number; gstPct: number; transport: number }) =>
  m.qty * m.rate * (1 + m.gstPct / 100) + m.transport;

export default function MaterialsPage() {
  const { data, loading, mutate } = useData();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [qrFor, setQrFor] = useState<Material | null>(null);
  const [historyFor, setHistoryFor] = useState<Material | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.materials
      .filter((m) => (catFilter ? m.category === catFilter : true))
      .filter((m) => (siteFilter ? m.siteId === siteFilter : true))
      .filter((m) => (query ? `${m.name} ${m.supplier} ${m.category}`.toLowerCase().includes(query) : true));
  }, [data, q, catFilter, siteFilter]);

  if (loading || !data) return <Spinner />;

  const siteName = (id: number) => data.sites.find((s) => s.id === id)?.name ?? "—";
  const totalValue = data.materials.reduce((s, m) => s + totalCost(m), 0);
  const lowStock = data.materials.filter((m) => m.status !== "In Stock").length;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, siteId: String(data.sites[0]?.id ?? "") });
    setModalOpen(true);
  };
  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({ name: m.name, category: m.category, supplier: m.supplier ?? "", purchaseDate: m.purchaseDate ?? "", siteId: String(m.siteId), qty: String(m.qty), unit: m.unit, rate: String(m.rate), gstPct: String(m.gstPct), transport: String(m.transport), used: String(m.used) });
    setModalOpen(true);
  };
  const save = async () => {
    await mutate("/api/materials", editing ? "PATCH" : "POST", {
      id: editing?.id, name: form.name, category: form.category, supplier: form.supplier, purchaseDate: form.purchaseDate,
      siteId: Number(form.siteId), qty: parseFloat(form.qty) || 0, unit: form.unit, rate: parseFloat(form.rate) || 0,
      gstPct: parseFloat(form.gstPct) || 0, transport: parseFloat(form.transport) || 0, used: parseFloat(form.used) || 0,
    });
    setModalOpen(false);
  };
  const remove = async (m: Material) => {
    if (confirm(`Delete ${m.name}?`)) await mutate("/api/materials", "DELETE", { id: m.id });
  };

  const exportCsv = () =>
    downloadCsv(
      "materials.csv",
      ["Material", "Category", "Supplier", "Purchase Date", "Site", "Qty", "Unit", "Rate", "GST %", "Transport", "Total Cost", "Used", "Remaining", "Status"],
      rows.map((m) => [m.name, m.category, m.supplier ?? "", m.purchaseDate ?? "", siteName(m.siteId), m.qty, m.unit, m.rate, m.gstPct, m.transport, totalCost(m).toFixed(2), m.used, m.qty - m.used, m.status]),
    );

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    let imported = 0;
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 6 || !cols[0]) continue;
      await mutate("/api/materials", "POST", {
        name: cols[0], category: cols[1] || "Materials", supplier: cols[2] || "", purchaseDate: cols[3] || null,
        siteId: data.sites.find((s) => s.name === cols[4])?.id ?? data.sites[0]?.id,
        qty: parseFloat(cols[5]) || 0, unit: cols[6] || "nos", rate: parseFloat(cols[7]) || 0,
        gstPct: parseFloat(cols[8]) || 0, transport: parseFloat(cols[9]) || 0, used: parseFloat(cols[11]) || 0,
      });
      imported++;
    }
    alert(`Imported ${imported} materials.`);
  };

  const columns: Column<Material>[] = [
    { key: "name", label: "Material", sortValue: (m) => m.name, render: (m) => (
      <span>
        <span className="block font-semibold text-slate-800 dark:text-slate-100">{m.name}</span>
        <span className="block text-[11px] text-slate-400">{m.category} · {m.supplier}</span>
      </span>
    ) },
    { key: "date", label: "Purchased", sortValue: (m) => m.purchaseDate ?? "", render: (m) => <span className="whitespace-nowrap text-slate-500">{fmtDate(m.purchaseDate)}</span> },
    { key: "site", label: "Site", sortValue: (m) => siteName(m.siteId), render: (m) => <span className="text-xs font-semibold whitespace-nowrap text-blue-700 dark:text-blue-300">{siteName(m.siteId)}</span> },
    { key: "qty", label: "Qty", align: "right", sortValue: (m) => m.qty, render: (m) => <span>{num(m.qty)} <span className="text-[11px] text-slate-400">{m.unit}</span></span> },
    { key: "rate", label: "Rate", align: "right", sortValue: (m) => m.rate, render: (m) => inr(m.rate) },
    { key: "gst", label: "GST", align: "right", sortValue: (m) => m.gstPct, render: (m) => `${m.gstPct}%` },
    { key: "transport", label: "Transport", align: "right", sortValue: (m) => m.transport, render: (m) => inr(m.transport) },
    { key: "total", label: "Total Cost", align: "right", sortValue: (m) => totalCost(m), render: (m) => <b>{inr(totalCost(m))}</b> },
    { key: "used", label: "Used", align: "right", sortValue: (m) => m.used, render: (m) => num(m.used) },
    { key: "rem", label: "Remaining", align: "right", sortValue: (m) => m.qty - m.used, render: (m) => <span className={m.qty - m.used <= 0 ? "font-semibold text-rose-500" : ""}>{num(m.qty - m.used)}</span> },
    { key: "status", label: "Status", sortValue: (m) => m.status, render: (m) => <Badge status={m.status} /> },
    { key: "actions", label: "", render: (m) => (
      <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <button title="QR code" onClick={() => setQrFor(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><QrCode size={14} /></button>
        <button title="History" onClick={() => setHistoryFor(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><History size={14} /></button>
        <button title="Edit" onClick={() => openEdit(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><Pencil size={14} /></button>
        <button title="Delete" onClick={() => void remove(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 size={14} /></button>
      </span>
    ) },
  ];

  const history = historyFor
    ? data.daily.filter((d) => d.siteId === historyFor.siteId && d.category === historyFor.category).sort((a, b) => b.id - a.id)
    : [];

  return (
    <div>
      <PageHeader
        title="Materials"
        subtitle="Purchases, stock, consumption and landed cost — with GST and transport included."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import Excel/CSV</Button>
            <Button variant="outline" onClick={exportCsv}><Download size={15} /> Export</Button>
            <Button onClick={openAdd}><Plus size={15} /> Add Material</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Package} label="Materials Tracked" value={String(data.materials.length)} sub={`${MATERIAL_CATEGORIES.length} categories`} tone="blue" />
        <StatCard icon={Download} label="Inventory Value" value={inr(totalValue)} sub="Incl. GST + transport" tone="cyan" delay={0.05} />
        <StatCard icon={History} label="Low / Out of Stock" value={String(lowStock)} sub="Needs reorder attention" tone={lowStock ? "amber" : "emerald"} delay={0.1} />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search material, supplier…" className={`${inputCls} !pl-9`} />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${inputCls} !w-auto`}>
            <option value="">All categories</option>
            {MATERIAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={siteFilter} onChange={(e) => setSiteFilter(Number(e.target.value))} className={`${inputCls} !w-auto`}>
            <option value={0}>All sites</option>
            {data.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <DataTable columns={columns} rows={rows} pageSize={12} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Material" : "Add Material"} wide>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Material Name" className="col-span-2"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {MATERIAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Supplier"><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputCls} /></Field>
          <Field label="Purchase Date"><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className={inputCls} /></Field>
          <Field label="Site">
            <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className={inputCls}>
              {data.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity"><input type="number" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className={inputCls} /></Field>
          <Field label="Unit">
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls}>
              {["Bag", "Kg", "cft", "load", "nos", "month", "Cum", "SqM"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Rate (₹)"><input type="number" step="any" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputCls} /></Field>
          <Field label="GST %"><input type="number" step="any" value={form.gstPct} onChange={(e) => setForm({ ...form, gstPct: e.target.value })} className={inputCls} /></Field>
          <Field label="Transport (₹)"><input type="number" step="any" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} className={inputCls} /></Field>
          <Field label="Used"><input type="number" step="any" value={form.used} onChange={(e) => setForm({ ...form, used: e.target.value })} className={inputCls} /></Field>
          <Field label="Total Cost (auto)">
            <div className="flex h-[42px] items-center rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 text-sm font-bold text-blue-700 tabular-nums dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
              {inr(totalCost({ qty: parseFloat(form.qty) || 0, rate: parseFloat(form.rate) || 0, gstPct: parseFloat(form.gstPct) || 0, transport: parseFloat(form.transport) || 0 }))}
            </div>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={!form.name}>{editing ? "Save Changes" : "Add Material"}</Button>
        </div>
      </Modal>

      <Modal open={!!qrFor} onClose={() => setQrFor(null)} title={`QR Code — ${qrFor?.name ?? ""}`}>
        {qrFor && (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="QR code"
              className="rounded-2xl border border-slate-200 p-2 dark:border-slate-700 dark:bg-white"
              width={220}
              height={220}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`FRF-MAT-${qrFor.id}|${qrFor.name}|${siteName(qrFor.siteId)}|${qrFor.qty}${qrFor.unit}`)}`}
            />
            <p className="text-center text-xs text-slate-400">Scan on site to identify this material batch.<br />ID: FRF-MAT-{qrFor.id}</p>
          </div>
        )}
      </Modal>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={`History — ${historyFor?.category ?? ""} @ ${historyFor ? siteName(historyFor.siteId) : ""}`} wide>
        <div className="max-h-[55vh] overflow-y-auto">
          {history.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No ledger entries for this material category.</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-slate-800">
              <span>
                <span className="block font-medium dark:text-slate-100">{h.name || h.head}</span>
                <span className="block text-xs text-slate-400">{fmtDate(h.entryDate, h.dateRaw)} · {h.head}</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular-nums dark:text-white">{inr(entryTotal(h))}</span>
                <span className="block text-xs text-slate-400">{num(h.qty)} × {inr(h.rate)}</span>
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
