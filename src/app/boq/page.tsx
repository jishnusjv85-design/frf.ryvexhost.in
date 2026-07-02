"use client";

import { motion } from "framer-motion";
import { Archive, Calendar, Copy, FileSpreadsheet, MoreVertical, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, inputCls, Modal, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { fmtDate, inr, inrCompact } from "@/lib/format";
import { boqTotal, type Boq } from "@/lib/types";

type Form = { name: string; siteId: string; status: string; date: string; notes: string };
const emptyForm: Form = { name: "", siteId: "", status: "Draft", date: new Date().toISOString().slice(0, 10), notes: "" };

export default function BoqPage() {
  const { data, loading, mutate } = useData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<"recent" | "amount" | "name">("recent");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Boq | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const list = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    let rows = data.boqs.filter((b) => (showArchived ? true : !b.archived));
    if (statusFilter) rows = rows.filter((b) => b.status === statusFilter);
    if (query) rows = rows.filter((b) => b.name.toLowerCase().includes(query));
    const total = (b: Boq) => boqTotal(data.boqItems, b.id);
    if (sort === "amount") rows = [...rows].sort((a, b) => total(b) - total(a));
    else if (sort === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    else rows = [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return rows;
  }, [data, q, statusFilter, sort, showArchived]);

  if (loading || !data) return <Spinner />;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, siteId: String(data.sites[0]?.id ?? "") });
    setModalOpen(true);
  };
  const openEdit = (b: Boq) => {
    setEditing(b);
    setForm({ name: b.name, siteId: String(b.siteId), status: b.status, date: b.date ?? "", notes: b.notes ?? "" });
    setModalOpen(true);
  };
  const save = async () => {
    const body = { id: editing?.id, name: form.name, siteId: Number(form.siteId), status: form.status, date: form.date, notes: form.notes };
    await mutate("/api/boqs", editing ? "PATCH" : "POST", body);
    setModalOpen(false);
  };
  const duplicate = async (b: Boq) => {
    await mutate("/api/boqs", "POST", { name: `${b.name} (Copy)`, siteId: b.siteId, status: "Draft", date: new Date().toISOString().slice(0, 10), duplicateFrom: b.id });
  };
  const archive = async (b: Boq) => {
    await mutate("/api/boqs", "PATCH", { id: b.id, archived: !b.archived, status: b.archived ? "Active" : "Archived" });
  };
  const remove = async (b: Boq) => {
    if (confirm(`Delete "${b.name}" and all its items?`)) await mutate("/api/boqs", "DELETE", { id: b.id });
  };

  return (
    <div onClick={() => setMenuFor(null)}>
      <PageHeader
        title="BOQ Management"
        subtitle="Every Bill of Quantities — searchable, versioned and always in sync with site expenses."
        actions={<Button onClick={openCreate}><Plus size={15} /> Create BOQ</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1 sm:flex-none sm:basis-72">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search BOQs…" className={`${inputCls} !pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} !w-auto`}>
          <option value="">All statuses</option>
          {["Active", "Draft", "Completed", "Archived"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={`${inputCls} !w-auto`}>
          <option value="recent">Sort: Last updated</option>
          <option value="amount">Sort: Total amount</option>
          <option value="name">Sort: Name</option>
        </select>
        <label className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-blue-600" />
          Show archived
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((b, i) => {
          const site = data.sites.find((s) => s.id === b.siteId);
          const items = data.boqItems.filter((x) => x.boqId === b.id);
          const total = items.reduce((s, x) => s + x.qty * x.rate, 0);
          const progress = items.length ? Math.round(items.reduce((s, x) => s + x.progress, 0) / items.length) : 0;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="glass group relative cursor-pointer rounded-2xl p-5 transition-shadow hover:shadow-xl"
              onClick={() => router.push(`/boq/${b.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge status={b.status} />
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenuFor(menuFor === b.id ? null : b.id)} className="rounded-lg p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <MoreVertical size={16} />
                    </button>
                    {menuFor === b.id && (
                      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <MenuBtn icon={Pencil} label="Edit BOQ" onClick={() => { setMenuFor(null); openEdit(b); }} />
                        <MenuBtn icon={Copy} label="Duplicate BOQ" onClick={() => { setMenuFor(null); void duplicate(b); }} />
                        <MenuBtn icon={Archive} label={b.archived ? "Unarchive" : "Archive BOQ"} onClick={() => { setMenuFor(null); void archive(b); }} />
                        <MenuBtn icon={Trash2} label="Delete BOQ" danger onClick={() => { setMenuFor(null); void remove(b); }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{b.name}</h3>
              <p className="mt-0.5 text-xs text-slate-400">{site?.name} · {site?.code}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(b.date)}</span>
                <span className="flex items-center gap-1.5"><User size={12} /> {b.createdBy}</span>
                <span className="col-span-2">Budget {inrCompact(site?.budget ?? 0)} · {items.length} items · Updated {new Date(b.updatedAt).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Total Amount</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums dark:text-white">{inr(total)}</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100 dark:text-blue-300">Open →</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit BOQ" : "Create BOQ"}>
        <div className="space-y-4">
          <Field label="BOQ Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nachu's BOQ — Palazhi-1" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site">
              <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className={inputCls}>
                {data.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {["Draft", "Active", "Completed", "Archived"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={!form.name}>{editing ? "Save Changes" : "Create BOQ"}</Button>
        </div>
      </Modal>
    </div>
  );
}

function MenuBtn({ icon: Icon, label, onClick, danger = false }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium ${danger ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
