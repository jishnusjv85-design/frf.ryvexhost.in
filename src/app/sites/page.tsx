"use client";

import { motion } from "framer-motion";
import { AlertCircle, Building2, CalendarRange, FileSpreadsheet, HardHat, MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Button, Field, inputCls, Modal, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { fmtDate, inr, inrCompact } from "@/lib/format";
import { boqTotal, siteCategoryTotals, type Site } from "@/lib/types";

type SiteForm = {
  name: string;
  code: string;
  engineer: string;
  client: string;
  location: string;
  status: string;
  startDate: string;
  targetDate: string;
  budget: string;
  progress: string;
  notes: string;
  color: string;
};

const emptyForm: SiteForm = {
  name: "",
  code: "",
  engineer: "",
  client: "",
  location: "",
  status: "Active",
  startDate: new Date().toISOString().slice(0, 10),
  targetDate: "",
  budget: "0",
  progress: "0",
  notes: "",
  color: "#2563eb",
};

export default function SitesPage() {
  const { data, loading, refresh } = useData();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdSite, setCreatedSite] = useState<Site | null>(null);

  if (loading || !data) return <Spinner />;

  const openAdd = () => {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const saveSite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Site name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: parseFloat(form.budget) || 0,
          progress: parseFloat(form.progress) || 0,
        }),
      });

      if (!res.ok) throw new Error("Create site failed");
      const site = (await res.json()) as Site;
      await refresh();
      setModalOpen(false);
      setCreatedSite(site);
    } catch {
      setError("Could not create the site. Please check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const createBoqForSite = () => {
    if (!createdSite) return;
    setCreatedSite(null);
    router.push(`/boq?create=1&siteId=${createdSite.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Sites"
        subtitle="Every project site with live cost, progress and profitability."
        actions={
          <Button onClick={openAdd}>
            <Plus size={15} /> Add Site
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {data.sites.map((s, i) => {
          const sum = siteCategoryTotals(data.daily, s.id);
          const siteBoqs = data.boqs.filter((b) => b.siteId === s.id);
          const boqValue = siteBoqs.reduce((acc, b) => acc + boqTotal(data.boqItems, b.id), 0);
          const profit = s.budget - sum.grand;
          const labour = sum.byCategory.get("Labour") || 0;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="glass group cursor-pointer overflow-hidden rounded-2xl transition-shadow hover:shadow-xl"
              onClick={() => router.push(`/sites/${s.id}`)}
            >
              <div className="relative h-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">Site {i + 1} - {s.name}</p>
                    <p className="flex items-center gap-1 text-xs text-blue-200"><MapPin size={11} /> {s.location}</p>
                  </div>
                  <Badge status={s.status} className="!bg-white/15 !text-white !ring-white/30" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500"><HardHat size={14} /> Engineer <b className="text-slate-800 dark:text-slate-100">{s.engineer}</b></span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarRange size={12} /> {fmtDate(s.startDate)} to {fmtDate(s.targetDate)}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Completion</span><span className="font-semibold text-slate-600 dark:text-slate-300">{s.progress}%</span></div>
                  <ProgressBar value={s.progress} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Cost", value: inr(sum.grand) },
                    { label: "Contract / Budget", value: inrCompact(s.budget) },
                    { label: "Labour Spend", value: inrCompact(labour) },
                    { label: "BOQ Value", value: inrCompact(boqValue) },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl bg-slate-50/80 px-3.5 py-2.5 dark:bg-slate-800/50">
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{k.label}</p>
                      <p className="text-[13.5px] font-bold text-slate-800 tabular-nums dark:text-white">{k.value}</p>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5 ${profit >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10"}`}>
                  <span className={`text-xs font-semibold ${profit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                    Projected {profit >= 0 ? "Profit" : "Loss"}
                  </span>
                  <span className={`font-bold tabular-nums ${profit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{inr(Math.abs(profit))}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: data.sites.length * 0.07 }}
          className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-blue-400 hover:text-blue-500 dark:border-slate-700"
          onClick={openAdd}
        >
          <Building2 size={32} />
          <p className="mt-2 text-sm font-semibold">New Site</p>
          <p className="text-xs">Onboard the next project</p>
        </motion.div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Site" wide>
        <form onSubmit={saveSite} className="space-y-5">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Site Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Palazhi-3 Residence"
                className={inputCls}
                disabled={submitting}
                required
              />
            </Field>
            <Field label="Site Code">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Auto generated if blank"
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Engineer">
              <input
                value={form.engineer}
                onChange={(e) => setForm({ ...form, engineer: e.target.value })}
                placeholder="Site engineer"
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Client">
              <input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Client name"
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Location" className="sm:col-span-2">
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Kozhikode, Kerala"
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Target Date">
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Budget">
              <input
                type="number"
                min="0"
                step="any"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Progress %">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
                className={inputCls}
                disabled={submitting}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputCls}
                disabled={submitting}
              >
                {["Active", "Draft", "On Hold", "Completed"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Accent Color">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-[42px] w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                disabled={submitting}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Scope, phase, or internal notes"
                className={`${inputCls} min-h-24 resize-y`}
                disabled={submitting}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.name.trim()}>
              {submitting ? "Saving..." : "Create Site"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!createdSite} onClose={() => setCreatedSite(null)} title="Site Created">
        {createdSite ? (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-500/10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{createdSite.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Create a BOQ for this site now so estimates, billing value and profit views can start from the same project record.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreatedSite(null)}>
                Later
              </Button>
              <Button onClick={createBoqForSite}>
                <Plus size={15} /> Create BOQ
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
