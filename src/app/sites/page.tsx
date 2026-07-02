"use client";

import { motion } from "framer-motion";
import { Building2, CalendarRange, HardHat, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { fmtDate, inr, inrCompact } from "@/lib/format";
import { boqTotal, siteCategoryTotals } from "@/lib/types";

export default function SitesPage() {
  const { data, loading } = useData();
  const router = useRouter();
  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Sites" subtitle="Every project site with live cost, progress and profitability." />
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
                    <p className="text-lg font-bold text-white">Site {i + 1} · {s.name}</p>
                    <p className="flex items-center gap-1 text-xs text-blue-200"><MapPin size={11} /> {s.location}</p>
                  </div>
                  <Badge status={s.status} className="!bg-white/15 !text-white !ring-white/30" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500"><HardHat size={14} /> Engineer <b className="text-slate-800 dark:text-slate-100">{s.engineer}</b></span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarRange size={12} /> {fmtDate(s.startDate)} → {fmtDate(s.targetDate)}</span>
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
          onClick={() => alert("New site onboarding — configure name, engineer, budget & timeline. (Add via Settings → Sites)")}
        >
          <Building2 size={32} />
          <p className="mt-2 text-sm font-semibold">New Site</p>
          <p className="text-xs">Onboard the next project</p>
        </motion.div>
      </div>
    </div>
  );
}
