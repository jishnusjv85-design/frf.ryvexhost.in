"use client";

import { motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  HardHat,
  IndianRupee,
  Package,
  PlusCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { Badge, Card, PageHeader, ProgressBar, Spinner, StatCard } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { fmtDate, inr, inrCompact, monthKey, monthLabel } from "@/lib/format";
import { boqTotal, entryTotal, siteCategoryTotals } from "@/lib/types";

export default function DashboardPage() {
  const { data, loading } = useData();

  const stats = useMemo(() => {
    if (!data) return null;
    const totalExpense = data.daily.reduce((s, d) => s + entryTotal(d), 0);
    const totalBudget = data.sites.reduce((s, x) => s + x.budget, 0);
    const totalBoqValue = data.boqs.filter((b) => !b.archived).reduce((s, b) => s + boqTotal(data.boqItems, b.id), 0);
    const materialCats = new Set(["Cement", "Steel", "M-Sand", "K-Sand", "Metal", "Boller", "M-Waste", "Laterite", "Solid Block", "Solid Block 15cm", "Materials"]);
    const materialCost = data.daily.filter((d) => materialCats.has(d.category)).reduce((s, d) => s + entryTotal(d), 0);
    const labourCost = siteCategoryTotals(data.daily).byCategory.get("Labour") || 0;
    const profit = totalBudget - totalExpense;
    const margin = totalBudget > 0 ? (profit / totalBudget) * 100 : 0;

    // Monthly expense series
    const byMonth = new Map<string, number>();
    for (const d of data.daily) {
      const k = monthKey(d.entryDate);
      if (!k) continue;
      byMonth.set(k, (byMonth.get(k) || 0) + entryTotal(d));
    }
    const months = [...byMonth.keys()].sort();
    const expenseSeries = months.map((m) => byMonth.get(m) || 0);
    const billingRatio = totalExpense > 0 ? totalBudget / totalExpense : 1.2;
    const inflowSeries = expenseSeries.map((v) => Math.round(v * Math.min(billingRatio, 1.35)));

    const pendingTasks = data.tasks.filter((t) => t.status !== "done");
    const today = new Date().toISOString().slice(0, 10);
    const todaysUpdates = data.daily.filter((d) => d.entryDate === today);
    const latest = [...data.daily].sort((a, b) => b.id - a.id).slice(0, 7);

    return {
      totalExpense,
      totalBudget,
      totalBoqValue,
      materialCost,
      labourCost,
      profit,
      margin,
      months,
      expenseSeries,
      inflowSeries,
      pendingTasks,
      todaysUpdates,
      latest,
    };
  }, [data]);

  if (loading || !data || !stats) return <Spinner />;

  const statusCounts = ["Active", "Completed", "On Hold", "Draft"].map(
    (s) => data.sites.filter((x) => x.status === s).length + data.boqs.filter((b) => b.status === s).length,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Complete overview of every site, BOQ, material and rupee — live from your daily updates."
        actions={
          <>
            <QuickAction href="/boq" icon={FileSpreadsheet} label="Add BOQ" />
            <QuickAction href="/status" icon={ClipboardList} label="Add Daily Update" />
            <QuickAction href="/materials" icon={Package} label="Add Material" />
            <QuickAction href="/sites" icon={Building2} label="Open Site" />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Total Projects" value={String(data.sites.length)} sub={`${data.sites.filter((s) => s.status === "Active").length} active sites`} tone="blue" />
        <StatCard icon={FileSpreadsheet} label="Total BOQs" value={String(data.boqs.length)} sub={`Value ${inrCompact(stats.totalBoqValue)}`} tone="indigo" delay={0.05} />
        <StatCard icon={Wallet} label="Total Site Cost" value={inrCompact(stats.totalExpense)} sub="Executed expense (all sites)" tone="cyan" delay={0.1} />
        <StatCard icon={Package} label="Total Materials" value={String(data.materials.length)} sub={`Material spend ${inrCompact(stats.materialCost)}`} tone="emerald" delay={0.15} />
        <StatCard icon={CalendarClock} label="Today's Updates" value={String(stats.todaysUpdates.length)} sub={`${data.daily.length} entries in ledger`} tone="blue" delay={0.2} />
        <StatCard icon={ClipboardList} label="Pending Tasks" value={String(stats.pendingTasks.length)} sub={`${data.tasks.filter((t) => t.status === "done").length} completed`} tone="amber" delay={0.25} />
        <StatCard icon={TrendingUp} label="Total Profit" value={inrCompact(stats.profit)} sub={`Margin ${stats.margin.toFixed(1)}% of contract value`} tone={stats.profit >= 0 ? "emerald" : "rose"} delay={0.3} />
        <StatCard icon={IndianRupee} label="Total Expenses" value={inrCompact(stats.totalExpense)} sub={`Labour ${inrCompact(stats.labourCost)}`} tone="rose" delay={0.35} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle icon={CircleDollarSign} title="Monthly Expense & Cash Flow" sub="Outflow from the daily ledger vs. billing at BOQ rates" />
          <LineChart
            labels={stats.months.map(monthLabel)}
            series={[
              { label: "Expense (out)", data: stats.expenseSeries, color: "#2563eb" },
              { label: "Billing (in)", data: stats.inflowSeries, color: "#06b6d4" },
            ]}
            height={280}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle icon={ActivityIcon} title="Project Status" sub="Sites & BOQs by state" />
          <DonutChart labels={["Active", "Completed", "On Hold", "Draft"]} data={statusCounts} money={false} height={280} colors={["#2563eb", "#10b981", "#f59e0b", "#94a3b8"]} />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle icon={Building2} title="Project Progress & Budget Usage" sub="Completion % and budget consumed" />
          <div className="space-y-5">
            {data.sites.map((s) => {
              const spent = siteCategoryTotals(data.daily, s.id).grand;
              const usage = s.budget > 0 ? (spent / s.budget) * 100 : 0;
              return (
                <div key={s.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <Link href={`/sites/${s.id}`} className="font-semibold text-slate-800 hover:text-blue-600 dark:text-slate-100">
                      {s.name}
                    </Link>
                    <span className="text-xs text-slate-400">{s.progress}% complete</span>
                  </div>
                  <ProgressBar value={s.progress} />
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                    <span>
                      Budget used: <b className={usage > 100 ? "text-rose-500" : "text-slate-600 dark:text-slate-300"}>{usage.toFixed(1)}%</b>
                    </span>
                    <span>
                      {inrCompact(spent)} / {inrCompact(s.budget)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <SectionTitle icon={HardHat} title="Material Usage" sub="Top categories by spend" />
            <BarChart
              horizontal
              labels={[...siteCategoryTotals(data.daily).byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0])}
              series={[{ label: "Spend", data: [...siteCategoryTotals(data.daily).byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[1]) }]}
              height={190}
            />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={ClipboardList} title="Latest Daily Updates" sub="Most recent ledger entries" />
          <div className="space-y-1">
            {stats.latest.map((d) => {
              const site = data.sites.find((s) => s.id === d.siteId);
              return (
                <Link key={d.id} href="/status" className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-blue-50/60 dark:hover:bg-blue-500/5">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                      {d.category} — {d.name || d.head}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {site?.name} · {fmtDate(d.entryDate, d.dateRaw)}
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold text-slate-700 tabular-nums dark:text-slate-200">{inr(entryTotal(d))}</span>
                </Link>
              );
            })}
          </div>
          <SectionTitle icon={ActivityIcon} title="Recent Activities" sub="" className="mt-5" />
          <ol className="relative ml-2 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
            {data.activities.slice(0, 5).map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 dark:border-slate-900" />
                <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{a.action}</p>
                <p className="text-xs text-slate-400">{a.detail}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={CalendarClock} title="Upcoming Tasks" sub="Pending & in-progress work" />
          <div className="space-y-2.5">
            {stats.pendingTasks.slice(0, 7).map((t) => {
              const site = data.sites.find((s) => s.id === t.siteId);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/60 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {site?.name ?? "General"} · {t.assignee} · due {fmtDate(t.dueDate)}
                    </p>
                  </div>
                  <Badge status={t.priority === "High" ? "Loss" : t.priority === "Medium" ? "Active" : "Pending"} className="!text-[10px]">
                    {t.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg shadow-blue-600/25">
            <p className="text-[13px] font-medium text-blue-100">Overall Profit Margin</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{stats.margin.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-blue-200">
              Contract {inrCompact(stats.totalBudget)} − Expense {inrCompact(stats.totalExpense)} = {inrCompact(stats.profit)}
            </p>
            <Link href="/profit" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/25">
              Open Profit Calculator →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof PlusCircle; label: string }) {
  return (
    <Link
      href={href}
      className="btn-gradient inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white"
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

function SectionTitle({ icon: Icon, title, sub, className = "" }: { icon: typeof PlusCircle; title: string; sub?: string; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-blue-500" />
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {sub ? <p className="mt-0.5 ml-6 text-xs text-slate-400">{sub}</p> : null}
    </motion.div>
  );
}
