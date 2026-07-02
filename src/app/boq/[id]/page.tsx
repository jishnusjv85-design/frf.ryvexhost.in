"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Download, FileSpreadsheet, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, inputCls, Modal, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { downloadCsv, fmtDate, inr, num } from "@/lib/format";
import { itemAmount, type BoqItem } from "@/lib/types";

type ItemForm = {
  sl: string;
  category: string;
  description: string;
  unit: string;
  qty: string;
  rate: string;
  progress: string;
  remarks: string;
};

export default function BoqDetailPage() {
  const params = useParams<{ id: string }>();
  const boqId = Number(params.id);
  const { data, loading, mutate } = useData();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BoqItem | null>(null);
  const [form, setForm] = useState<ItemForm>({ sl: "1", category: "General", description: "", unit: "Cum", qty: "0", rate: "0", progress: "0", remarks: "" });

  const boq = data?.boqs.find((b) => b.id === boqId);
  const site = data?.sites.find((s) => s.id === boq?.siteId);
  const items = useMemo(() => (data?.boqItems ?? []).filter((i) => i.boqId === boqId).sort((a, b) => a.sl - b.sl), [data, boqId]);

  const groups = useMemo(() => {
    const map = new Map<string, BoqItem[]>();
    for (const i of items) {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    }
    return [...map.entries()];
  }, [items]);

  if (loading || !data) return <Spinner />;
  if (!boq) return <div className="py-20 text-center text-slate-400">BOQ not found.</div>;

  const grandTotal = items.reduce((s, i) => s + itemAmount(i), 0);
  const executed = items.reduce((s, i) => s + itemAmount(i) * (i.progress / 100), 0);
  const avgProgress = items.length ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0;

  const toggle = (g: string) => {
    const next = new Set(collapsed);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setCollapsed(next);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ sl: String(items.length + 1), category: groups[groups.length - 1]?.[0] ?? "General", description: "", unit: "Cum", qty: "0", rate: "0", progress: "0", remarks: "" });
    setModalOpen(true);
  };
  const openEdit = (i: BoqItem) => {
    setEditing(i);
    setForm({ sl: String(i.sl), category: i.category, description: i.description, unit: i.unit, qty: String(i.qty), rate: String(i.rate), progress: String(i.progress), remarks: i.remarks ?? "" });
    setModalOpen(true);
  };
  const save = async () => {
    const body = {
      id: editing?.id,
      boqId,
      sl: Number(form.sl) || 1,
      category: form.category,
      description: form.description,
      unit: form.unit,
      qty: parseFloat(form.qty) || 0,
      rate: parseFloat(form.rate) || 0,
      progress: Number(form.progress) || 0,
      remarks: form.remarks,
    };
    await mutate("/api/boq-items", editing ? "PATCH" : "POST", body);
    setModalOpen(false);
  };
  const removeItem = async (i: BoqItem) => {
    if (confirm(`Delete item ${i.sl} — ${i.description}?`)) await mutate("/api/boq-items", "DELETE", { id: i.id });
  };

  const exportCsv = () =>
    downloadCsv(
      `${boq.name}.csv`,
      ["Sl no.", "Description", "Unit", "Qty", "Rate", "Amount", "Progress %", "Remarks"],
      [...items.map((i) => [i.sl, i.description, i.unit, i.qty, i.rate, itemAmount(i), i.progress, i.remarks ?? ""] as (string | number)[]), ["TOTAL", "", "", "", "", grandTotal, "", ""]],
    );

  return (
    <div>
      <Link href="/boq" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-300">
        <ArrowLeft size={15} /> All BOQs
      </Link>
      <PageHeader
        title={boq.name}
        subtitle={`${site?.name ?? ""} · ${site?.code ?? ""} · Created by ${boq.createdBy} on ${fmtDate(boq.date)}`}
        actions={
          <>
            <Badge status={boq.status} className="!px-3 !py-1 !text-xs" />
            <Button variant="outline" onClick={exportCsv}><Download size={15} /> Excel</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> PDF / Print</Button>
            <Button onClick={openAdd}><Plus size={15} /> Add Item</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total BOQ Amount", value: inr(grandTotal), tone: "text-blue-700 dark:text-blue-300" },
          { label: "Executed Value", value: inr(executed), tone: "text-emerald-600 dark:text-emerald-300" },
          { label: "Balance Value", value: inr(grandTotal - executed), tone: "text-amber-600 dark:text-amber-300" },
          { label: "Overall Progress", value: `${avgProgress}%`, tone: "text-slate-900 dark:text-white" },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-4">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{k.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${k.tone}`}>{k.value}</p>
            {k.label === "Overall Progress" && <ProgressBar value={avgProgress} className="mt-2" />}
          </motion.div>
        ))}
      </div>

      <Card className="print-area overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 font-bold dark:text-white"><FileSpreadsheet size={17} className="text-blue-500" /> Bill of Quantities</h2>
          <p className="text-xs text-slate-400">Sl no. · Description · Unit · Qty · Rate · Amount — auto-calculated</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                <th className="w-16 px-4 py-3">Sl no.</th>
                <th className="px-4 py-3">Description</th>
                <th className="w-20 px-4 py-3">Unit</th>
                <th className="w-24 px-4 py-3 text-right">Qty</th>
                <th className="w-32 px-4 py-3 text-right">Rate</th>
                <th className="w-36 px-4 py-3 text-right">Amount</th>
                <th className="w-32 px-4 py-3">Progress</th>
                <th className="no-print w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([group, rows]) => {
                const subtotal = rows.reduce((s, i) => s + itemAmount(i), 0);
                const isCollapsed = collapsed.has(group);
                return (
                  <FragmentGroup key={group}>
                    <tr className="cursor-pointer bg-blue-50/70 hover:bg-blue-100/60 dark:bg-blue-500/10 dark:hover:bg-blue-500/15" onClick={() => toggle(group)}>
                      <td colSpan={5} className="px-4 py-2.5">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-blue-800 dark:text-blue-300">
                          <motion.span animate={{ rotate: isCollapsed ? -90 : 0 }}><ChevronDown size={15} /></motion.span>
                          {group}
                          <span className="text-[11px] font-medium text-blue-500/80">({rows.length} items)</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-bold text-blue-800 tabular-nums dark:text-blue-300">{inr(subtotal)}</td>
                      <td colSpan={2} className="px-4 py-2.5 text-right text-[11px] text-blue-500/80">Subtotal</td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {!isCollapsed &&
                        rows.map((i) => (
                          <motion.tr
                            key={i.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/70 dark:border-slate-800/50 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-4 py-2.5 text-slate-400 tabular-nums">{i.sl}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                              {i.description}
                              {i.remarks ? <span className="block text-[11px] font-normal text-slate-400">✎ {i.remarks}</span> : null}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{i.unit}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{num(i.qty)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{inr(i.rate)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{inr(itemAmount(i))}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <ProgressBar value={i.progress} className="!h-1.5 w-14" />
                                <span className="text-[11px] text-slate-400 tabular-nums">{i.progress}%</span>
                              </div>
                            </td>
                            <td className="no-print px-4 py-2.5">
                              <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                                <button onClick={() => openEdit(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><Pencil size={13} /></button>
                                <button onClick={() => void removeItem(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 size={13} /></button>
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                    </AnimatePresence>
                  </FragmentGroup>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <td colSpan={5} className="px-4 py-3.5 text-sm font-bold tracking-wide">TOTAL</td>
                <td className="px-4 py-3.5 text-right text-base font-bold tabular-nums">{inr(grandTotal)}</td>
                <td colSpan={2} className="px-4 py-3.5 text-right text-xs text-blue-100">{items.length} line items</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {boq.notes ? (
        <Card className="mt-5 p-5">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Remarks</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{boq.notes}</p>
        </Card>
      ) : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit Item ${editing.sl}` : "Add BOQ Item"} wide>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Sl no."><input type="number" value={form.sl} onChange={(e) => setForm({ ...form, sl: e.target.value })} className={inputCls} /></Field>
          <Field label="Category / Section" className="col-span-2">
            <input list="boq-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
            <datalist id="boq-cats">{groups.map(([g]) => <option key={g} value={g} />)}</datalist>
          </Field>
          <Field label="Unit">
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls}>
              {["Cum", "SqM", "RM", "Nos", "Kg", "Bag", "load", "LS"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Description" className="col-span-2 sm:col-span-4"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. RUBBLE MASONRY (80CM & 130CM)" className={inputCls} /></Field>
          <Field label="Qty"><input type="number" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className={inputCls} /></Field>
          <Field label="Rate (₹)"><input type="number" step="any" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputCls} /></Field>
          <Field label="Amount (auto)">
            <div className="flex h-[42px] items-center rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 text-sm font-bold text-blue-700 tabular-nums dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
              {inr((parseFloat(form.qty) || 0) * (parseFloat(form.rate) || 0))}
            </div>
          </Field>
          <Field label="Progress %"><input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} className={inputCls} /></Field>
          <Field label="Remarks" className="col-span-2 sm:col-span-4"><input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={!form.description}>{editing ? "Save Changes" : "Add Item"}</Button>
        </div>
      </Modal>
    </div>
  );
}

function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
