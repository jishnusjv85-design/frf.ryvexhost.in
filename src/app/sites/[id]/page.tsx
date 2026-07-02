"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  HardHat,
  MapPin,
  Package,
  StickyNote,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BarChart, DonutChart } from "@/components/charts";
import { DataTable } from "@/components/table";
import { Badge, Card, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { fmtDate, inr, inrCompact, num } from "@/lib/format";
import { boqTotal, CATEGORY_COLORS, entryTotal, siteCategoryTotals } from "@/lib/types";

const TABS = ["Overview", "BOQs", "Materials", "Daily Updates", "Expenses & Revenue", "Labours", "Docs & Notes"] as const;

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>();
  const siteId = Number(params.id);
  const { data, loading } = useData();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  const site = data?.sites.find((s) => s.id === siteId);
  const daily = useMemo(() => (data?.daily ?? []).filter((d) => d.siteId === siteId), [data, siteId]);

  if (loading || !data) return <Spinner />;
  if (!site) return <div className="py-20 text-center text-slate-400">Site not found.</div>;

  const sum = siteCategoryTotals(data.daily, siteId);
  const siteBoqs = data.boqs.filter((b) => b.siteId === siteId);
  const boqValue = siteBoqs.reduce((acc, b) => acc + boqTotal(data.boqItems, b.id), 0);
  const siteMaterials = data.materials.filter((m) => m.siteId === siteId);
  const labourEntries = daily.filter((d) => d.category === "Labour");
  const profit = site.budget - sum.grand;
  const catEntries = [...sum.byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const labourByPerson = new Map<string, { days: number; total: number; skill: string }>();
  labourEntries.forEach((d) => {
    const k = d.name.toLowerCase();
    const cur = labourByPerson.get(k) || { days: 0, total: 0, skill: d.head };
    cur.days += d.qty;
    cur.total += entryTotal(d);
    labourByPerson.set(k, cur);
  });
  const labourRows = [...labourByPerson.entries()].map(([name, v], i) => ({ id: i + 1, name, ...v })).sort((a, b) => b.total - a.total);

  return (
    <div>
      <Link href="/sites" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-300">
        <ArrowLeft size={15} /> All Sites
      </Link>
      <PageHeader
        title={site.name}
        subtitle={`${site.code} · Engineer ${site.engineer} · ${site.location}`}
        actions={
          <>
            <Badge status={site.status} className="!px-3 !py-1 !text-xs" />
            <span className="flex items-center gap-1.5 rounded-xl bg-white/70 px-3.5 py-2 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900/60 dark:ring-slate-700">
              <CalendarRange size={13} /> {fmtDate(site.startDate)} → {fmtDate(site.targetDate)}
            </span>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Total Cost", value: inr(sum.grand), tone: "text-blue-700 dark:text-blue-300" },
          { label: "Contract / Budget", value: inrCompact(site.budget), tone: "text-slate-900 dark:text-white" },
          { label: "BOQ Value", value: inrCompact(boqValue), tone: "text-indigo-600 dark:text-indigo-300" },
          { label: `Projected ${profit >= 0 ? "Profit" : "Loss"}`, value: inr(Math.abs(profit)), tone: profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300" },
          { label: "Completion", value: `${site.progress}%`, tone: "text-slate-900 dark:text-white", bar: true },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-4">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{k.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${k.tone}`}>{k.value}</p>
            {k.bar && <ProgressBar value={site.progress} className="mt-2" />}
          </motion.div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl bg-white/70 p-1.5 shadow-sm ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/60 dark:ring-slate-700/60">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative rounded-xl px-4 py-2 text-[13px] font-semibold transition ${tab === t ? "text-white" : "text-slate-500 hover:text-blue-600 dark:text-slate-400"}`}>
            {tab === t && <motion.span layoutId="site-tab" className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/30" />}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {tab === "Overview" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><Wallet size={16} className="text-blue-500" /> Category-wise Expenditure</h3>
                <DonutChart labels={catEntries.map((e) => e[0])} data={catEntries.map((e) => e[1])} colors={catEntries.map((e) => CATEGORY_COLORS[e[0]] || "#93c5fd")} height={280} />
              </Card>
              <Card className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><FileSpreadsheet size={16} className="text-blue-500" /> Total Expenditure by Category</h3>
                <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                  {catEntries.map(([c, v]) => (
                    <div key={c} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c] || "#93c5fd" }} />
                        {c}
                      </span>
                      <span className="font-semibold tabular-nums dark:text-slate-100">{inr(v)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-100 px-2.5 pt-2.5 font-bold dark:border-slate-800">
                    <span className="dark:text-white">Grand Total</span>
                    <span className="tabular-nums text-blue-700 dark:text-blue-300">{inr(sum.grand)}</span>
                  </div>
                </div>
              </Card>
              <Card className="p-5 xl:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><MapPin size={16} className="text-blue-500" /> Project Timeline & Location</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-400">Start</p>
                    <p className="font-bold dark:text-white">{fmtDate(site.startDate)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-400">Target Completion</p>
                    <p className="font-bold dark:text-white">{fmtDate(site.targetDate)}</p>
                  </div>
                  <a
                    className="rounded-xl bg-blue-50 p-4 transition hover:bg-blue-100 dark:bg-blue-500/10"
                    href={`https://www.google.com/maps/search/${encodeURIComponent(site.location ?? "Kozhikode")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <p className="text-xs text-blue-500">Google Maps</p>
                    <p className="font-bold text-blue-700 dark:text-blue-300">Open location →</p>
                  </a>
                </div>
              </Card>
            </div>
          )}

          {tab === "BOQs" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {siteBoqs.map((b) => (
                <Card key={b.id} className="cursor-pointer p-5" hover>
                  <div onClick={() => router.push(`/boq/${b.id}`)}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold dark:text-white">{b.name}</h4>
                      <Badge status={b.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{fmtDate(b.date)} · by {b.createdBy}</p>
                    <p className="mt-3 text-xl font-bold text-blue-700 tabular-nums dark:text-blue-300">{inr(boqTotal(data.boqItems, b.id))}</p>
                  </div>
                </Card>
              ))}
              {siteBoqs.length === 0 && <p className="py-10 text-sm text-slate-400">No BOQs for this site yet.</p>}
            </div>
          )}

          {tab === "Materials" && (
            <Card className="p-5">
              <DataTable
                columns={[
                  { key: "name", label: "Material", sortValue: (m) => m.name, render: (m) => <b className="dark:text-slate-100">{m.name}</b> },
                  { key: "supplier", label: "Supplier", sortValue: (m) => m.supplier ?? "" },
                  { key: "qty", label: "Qty", align: "right", sortValue: (m) => m.qty, render: (m) => `${num(m.qty)} ${m.unit}` },
                  { key: "used", label: "Used", align: "right", sortValue: (m) => m.used, render: (m) => num(m.used) },
                  { key: "rem", label: "Remaining", align: "right", sortValue: (m) => m.qty - m.used, render: (m) => num(m.qty - m.used) },
                  { key: "status", label: "Status", render: (m) => <Badge status={m.status} /> },
                ]}
                rows={siteMaterials}
              />
            </Card>
          )}

          {tab === "Daily Updates" && (
            <Card className="p-5">
              <DataTable
                columns={[
                  { key: "date", label: "Date", sortValue: (d) => d.entryDate ?? "", render: (d) => <span className="whitespace-nowrap text-slate-500">{fmtDate(d.entryDate, d.dateRaw)}</span> },
                  { key: "cat", label: "Type", sortValue: (d) => d.category, render: (d) => <Badge status="Active">{d.category}</Badge> },
                  { key: "name", label: "Name / Description", sortValue: (d) => d.name, render: (d) => <span className="font-medium dark:text-slate-100">{d.name}</span> },
                  { key: "head", label: "Head", sortValue: (d) => d.head },
                  { key: "qty", label: "Qty", align: "right", sortValue: (d) => d.qty, render: (d) => num(d.qty) },
                  { key: "rate", label: "Rate", align: "right", sortValue: (d) => d.rate, render: (d) => inr(d.rate) },
                  { key: "total", label: "Total", align: "right", sortValue: (d) => entryTotal(d), render: (d) => <b>{inr(entryTotal(d))}</b> },
                ]}
                rows={[...daily].sort((a, b) => b.id - a.id)}
                pageSize={15}
                dense
              />
            </Card>
          )}

          {tab === "Expenses & Revenue" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-4 text-[15px] font-bold dark:text-white">Expense by Category</h3>
                <BarChart horizontal labels={catEntries.map((e) => e[0])} series={[{ label: "Spend", data: catEntries.map((e) => e[1]) }]} height={360} />
              </Card>
              <Card className="p-5">
                <h3 className="mb-4 text-[15px] font-bold dark:text-white">Revenue vs Cost</h3>
                <div className="space-y-3">
                  {[
                    { label: "Contract / Budget (Revenue)", value: site.budget, cls: "text-blue-700 dark:text-blue-300" },
                    { label: "Executed Expense", value: sum.grand, cls: "text-rose-600 dark:text-rose-300" },
                    { label: "Labour Cost", value: sum.byCategory.get("Labour") || 0, cls: "text-slate-700 dark:text-slate-200" },
                    { label: `Net ${profit >= 0 ? "Profit" : "Loss"}`, value: Math.abs(profit), cls: profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                      <span className="text-sm text-slate-500">{r.label}</span>
                      <span className={`font-bold tabular-nums ${r.cls}`}>{inr(r.value)}</span>
                    </div>
                  ))}
                  <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white">
                    <p className="text-xs text-blue-200">Margin on contract</p>
                    <p className="text-2xl font-bold">{site.budget > 0 ? ((profit / site.budget) * 100).toFixed(1) : "—"}%</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === "Labours" && (
            <Card className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold dark:text-white"><HardHat size={16} className="text-blue-500" /> Labour Register</h3>
              <DataTable
                columns={[
                  { key: "name", label: "Name", sortValue: (r) => r.name, render: (r) => <b className="capitalize dark:text-slate-100">{r.name}</b> },
                  { key: "skill", label: "Skill / Head", sortValue: (r) => r.skill, render: (r) => <span className="capitalize">{r.skill || "—"}</span> },
                  { key: "days", label: "Days", align: "right", sortValue: (r) => r.days, render: (r) => num(r.days) },
                  { key: "total", label: "Wages", align: "right", sortValue: (r) => r.total, render: (r) => <b>{inr(r.total)}</b> },
                ]}
                rows={labourRows}
              />
            </Card>
          )}

          {tab === "Docs & Notes" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold dark:text-white"><StickyNote size={16} className="text-blue-500" /> Notes</h3>
                <p className="text-sm text-slate-500 dark:text-slate-300">{site.notes}</p>
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold dark:text-white"><Camera size={16} className="text-blue-500" /> Photos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <button key={i} className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-300 transition hover:border-blue-300 hover:text-blue-400 dark:border-slate-700">
                      <Camera size={18} />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">Click to upload site photos</p>
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold dark:text-white"><FileText size={16} className="text-blue-500" /> Documents & Drawings</h3>
                <div className="space-y-2">
                  {["Approved plan.pdf", "Structural drawings.dwg", "Agreement copy.pdf"].map((d) => (
                    <div key={d} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm dark:border-slate-800">
                      <FileText size={15} className="text-blue-400" />
                      <span className="dark:text-slate-200">{d}</span>
                    </div>
                  ))}
                  <button className="w-full rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-blue-300 hover:text-blue-500 dark:border-slate-700">
                    + Upload Excel, PDF, images, drawings
                  </button>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        <Card className="p-4 text-center text-xs text-slate-400">
          <Package size={14} className="mr-1 inline" /> All figures update automatically from the Daily Update Status ledger — the same numbers as your Excel sheet, always current.
        </Card>
      </div>
    </div>
  );
}
