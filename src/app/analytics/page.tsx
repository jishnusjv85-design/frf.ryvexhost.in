"use client";

import { Card, PageHeader, Spinner } from "@/components/ui";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { useData } from "@/lib/data-context";
import { inrCompact, monthKey, monthLabel } from "@/lib/format";
import { boqTotal, CATEGORY_COLORS, entryTotal, siteCategoryTotals } from "@/lib/types";
import { useMemo } from "react";

export default function AnalyticsPage() {
  const { data, loading } = useData();

  const calc = useMemo(() => {
    if (!data) return null;
    const byMonth = new Map<string, number>();
    const labourByMonth = new Map<string, number>();
    for (const d of data.daily) {
      const k = monthKey(d.entryDate);
      if (!k) continue;
      byMonth.set(k, (byMonth.get(k) || 0) + entryTotal(d));
      if (d.category === "Labour") labourByMonth.set(k, (labourByMonth.get(k) || 0) + entryTotal(d));
    }
    const months = [...byMonth.keys()].sort();
    const expense = months.map((m) => byMonth.get(m) || 0);
    const labour = months.map((m) => labourByMonth.get(m) || 0);
    const totalBudget = data.sites.reduce((s, x) => s + x.budget, 0);
    const totalExpense = data.daily.reduce((s, d) => s + entryTotal(d), 0);
    const billingRatio = totalExpense > 0 ? Math.min(totalBudget / totalExpense, 1.35) : 1.2;
    const revenue = expense.map((v) => Math.round(v * billingRatio));
    let cumProfit = 0;
    const profitTrend = months.map((m, i) => {
      cumProfit += revenue[i] - expense[i];
      return cumProfit;
    });
    return { months, expense, labour, revenue, profitTrend, totalBudget, totalExpense };
  }, [data]);

  if (loading || !data || !calc) return <Spinner />;

  const cats = [...siteCategoryTotals(data.daily).byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const activeBoqs = data.boqs.filter((b) => !b.archived);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Deep insight into spending, profitability, productivity and project health." />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <ChartTitle title="Expense Trend" sub="Monthly outflow from the daily ledger" />
          <LineChart labels={calc.months.map(monthLabel)} series={[{ label: "Expense", data: calc.expense, color: "#2563eb" }]} />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Profit Trend" sub="Cumulative billing minus expense" />
          <LineChart labels={calc.months.map(monthLabel)} series={[{ label: "Cumulative profit", data: calc.profitTrend, color: "#10b981" }]} />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Cash Flow" sub="Inflow (billing) vs outflow (expense)" />
          <BarChart
            labels={calc.months.map(monthLabel)}
            series={[
              { label: "Inflow", data: calc.revenue, color: "#06b6d4" },
              { label: "Outflow", data: calc.expense, color: "#2563eb" },
            ]}
          />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Material Usage" sub="Spend by ledger category" />
          <BarChart horizontal labels={cats.map((c) => c[0])} series={[{ label: "Spend", data: cats.map((c) => c[1]) }]} height={300} />
        </Card>
        <Card className="p-5">
          <ChartTitle title="BOQ Comparison" sub="Total value per BOQ" />
          <BarChart labels={activeBoqs.map((b) => b.name)} series={[{ label: "BOQ value", data: activeBoqs.map((b) => boqTotal(data.boqItems, b.id)), color: "#6366f1" }]} />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Site Comparison" sub="Category-wise expenditure per site (like the Dashboard sheet)" />
          <BarChart
            stacked
            labels={data.sites.map((s) => s.name)}
            series={cats.slice(0, 8).map(([c]) => ({
              label: c,
              data: data.sites.map((s) => siteCategoryTotals(data.daily, s.id).byCategory.get(c) || 0),
              color: CATEGORY_COLORS[c],
            }))}
            height={300}
          />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Completion %" sub="Physical progress per site" />
          <BarChart horizontal money={false} labels={data.sites.map((s) => s.name)} series={[{ label: "Completion %", data: data.sites.map((s) => s.progress), color: "#0ea5e9" }]} height={220} />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Labour Productivity" sub="Monthly labour spend" />
          <LineChart labels={calc.months.map(monthLabel)} series={[{ label: "Labour", data: calc.labour, color: "#f59e0b" }]} height={220} />
        </Card>
        <Card className="p-5">
          <ChartTitle title="Project Health" sub="Budget consumed vs completion" />
          <div className="space-y-4 pt-2">
            {data.sites.map((s) => {
              const spent = siteCategoryTotals(data.daily, s.id).grand;
              const usage = s.budget > 0 ? (spent / s.budget) * 100 : 0;
              const healthy = usage <= s.progress + 15;
              return (
                <div key={s.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold dark:text-white">{s.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${healthy ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                      {healthy ? "Healthy" : "Watch budget"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Budget used {usage.toFixed(1)}% · Work done {s.progress}% · Spend {inrCompact(spent)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <ChartTitle title="Revenue" sub="Contract value distribution across sites" />
          <DonutChart labels={data.sites.map((s) => s.name)} data={data.sites.map((s) => s.budget)} height={280} />
        </Card>
      </div>
    </div>
  );
}

function ChartTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
