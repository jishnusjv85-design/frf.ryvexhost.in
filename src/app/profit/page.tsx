"use client";

import { Calculator, IndianRupee, Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { BarChart, DonutChart } from "@/components/charts";
import { Badge, Card, PageHeader, Spinner, StatCard, inputCls } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { inr, inrCompact, pct } from "@/lib/format";
import { boqTotal, entryTotal, itemAmount, siteCategoryTotals } from "@/lib/types";

const MATERIAL_SET = new Set(["Cement", "Steel", "M-Sand", "K-Sand", "Metal", "Boller", "M-Waste", "Laterite", "Solid Block", "Solid Block 15cm", "Materials"]);

export default function ProfitPage() {
  const { data, loading, mutate } = useData();
  const [siteId, setSiteId] = useState(0);
  const [overhead, setOverhead] = useState(10);
  const [gst, setGst] = useState(0);
  const [editingActual, setEditingActual] = useState<{ id: number; value: string } | null>(null);

  const calc = useMemo(() => {
    if (!data) return null;
    const daily = siteId ? data.daily.filter((d) => d.siteId === siteId) : data.daily;
    const sitesInScope = siteId ? data.sites.filter((s) => s.id === siteId) : data.sites;
    const boqAmount = data.boqs
      .filter((b) => !b.archived && (siteId ? b.siteId === siteId : true))
      .reduce((s, b) => s + boqTotal(data.boqItems, b.id), 0);
    const revenue = sitesInScope.reduce((s, x) => s + x.budget, 0);
    const materialCost = daily.filter((d) => MATERIAL_SET.has(d.category)).reduce((s, d) => s + entryTotal(d), 0);
    const labourCost = daily.filter((d) => d.category === "Labour").reduce((s, d) => s + entryTotal(d), 0);
    const transport = daily
      .filter((d) => d.category === "Expense" && `${d.name} ${d.head}`.toLowerCase().includes("transport"))
      .reduce((s, d) => s + entryTotal(d), 0);
    const equipment = daily
      .filter((d) => d.category === "Rent" || `${d.name} ${d.head}`.toLowerCase().match(/rent|machine|hittachi|moter/))
      .reduce((s, d) => s + entryTotal(d), 0);
    const misc = daily.reduce((s, d) => s + entryTotal(d), 0) - materialCost - labourCost - transport - equipment;
    const subTotal = materialCost + labourCost + transport + equipment + misc;
    const gstAmount = subTotal * (gst / 100);
    const overheadAmount = subTotal * (overhead / 100);
    const totalExpense = subTotal + gstAmount + overheadAmount;
    const netProfit = revenue - totalExpense;
    const profitPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { boqAmount, revenue, materialCost, labourCost, transport, equipment, misc, gstAmount, overheadAmount, totalExpense, netProfit, profitPct, subTotal };
  }, [data, siteId, overhead, gst]);

  if (loading || !data || !calc) return <Spinner />;

  const profitBoq = data.boqs.find((b) => b.name.toLowerCase().includes("nachu")) ?? data.boqs[0];
  const profitItems = data.boqItems.filter((i) => i.boqId === profitBoq?.id).sort((a, b) => a.sl - b.sl);

  const saveActual = async (id: number, value: string) => {
    await mutate("/api/boq-items", "PATCH", { id, actualCost: value === "" ? null : parseFloat(value) || 0, overheadPct: overhead });
    setEditingActual(null);
  };

  return (
    <div>
      <PageHeader
        title="Profit Calculator"
        subtitle="Automatic profitability from BOQ value, ledger cost, overheads and GST — the digital Profit sheet."
        actions={
          <select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))} className={`${inputCls} !w-auto`}>
            <option value={0}>All sites</option>
            {data.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="BOQ Amount" value={inrCompact(calc.boqAmount)} sub="Contracted bill of quantities" tone="blue" />
        <StatCard icon={IndianRupee} label="Total Expense" value={inrCompact(calc.totalExpense)} sub={`Incl. ${overhead}% overhead + ${gst}% GST`} tone="rose" delay={0.05} />
        <StatCard icon={calc.netProfit >= 0 ? TrendingUp : TrendingDown} label="Net Profit" value={inrCompact(calc.netProfit)} sub={`Revenue ${inrCompact(calc.revenue)}`} tone={calc.netProfit >= 0 ? "emerald" : "rose"} delay={0.1} />
        <StatCard icon={Percent} label="Profit %" value={pct(calc.profitPct)} sub="Of contract revenue" tone="indigo" delay={0.15} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold dark:text-white"><Calculator size={16} className="text-blue-500" /> Cost Build-up</h3>
          <p className="mb-4 text-xs text-slate-400">Adjust overhead & GST — everything recalculates instantly.</p>
          <div className="space-y-2 text-sm">
            {[
              ["Material Cost", calc.materialCost],
              ["Labour Cost", calc.labourCost],
              ["Transport", calc.transport],
              ["Equipment & Rent", calc.equipment],
              ["Miscellaneous", calc.misc],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="text-slate-500">{l}</span>
                <span className="font-semibold tabular-nums dark:text-slate-100">{inr(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-100 px-2 pt-2 dark:border-slate-800">
              <span className="text-slate-500">Overhead ({overhead}%)</span>
              <span className="font-semibold tabular-nums dark:text-slate-100">{inr(calc.overheadAmount)}</span>
            </div>
            <div className="flex justify-between px-2">
              <span className="text-slate-500">GST ({gst}%)</span>
              <span className="font-semibold tabular-nums dark:text-slate-100">{inr(calc.gstAmount)}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-blue-50 px-3 py-2.5 font-bold dark:bg-blue-500/10">
              <span className="text-blue-800 dark:text-blue-300">Total Expense</span>
              <span className="tabular-nums text-blue-800 dark:text-blue-300">{inr(calc.totalExpense)}</span>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500"><span>Overhead %</span><span>{overhead}%</span></div>
              <input type="range" min={0} max={30} value={overhead} onChange={(e) => setOverhead(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500"><span>GST %</span><span>{gst}%</span></div>
              <input type="range" min={0} max={28} value={gst} onChange={(e) => setGst(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-bold dark:text-white">Expense Composition</h3>
          <DonutChart
            labels={["Material", "Labour", "Transport", "Equipment", "Misc", "Overhead", "GST"]}
            data={[calc.materialCost, calc.labourCost, calc.transport, calc.equipment, calc.misc, calc.overheadAmount, calc.gstAmount]}
            height={300}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-bold dark:text-white">Site Profit Comparison</h3>
          <BarChart
            labels={data.sites.map((s) => s.name)}
            series={[
              { label: "Revenue", data: data.sites.map((s) => s.budget), color: "#ffb08a" },
              { label: "Expense", data: data.sites.map((s) => siteCategoryTotals(data.daily, s.id).grand), color: "#ff6b35" },
              { label: "Profit", data: data.sites.map((s) => s.budget - siteCategoryTotals(data.daily, s.id).grand), color: "#10b981" },
            ]}
            height={300}
          />
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold dark:text-white">Detailed BOQ vs Actual Breakdown — Profit sheet</h3>
          <p className="text-xs text-slate-400">
            {profitBoq?.name} · Click an “Actual Cost” cell to record it — Cost w/ Overhead, Profit, Profit % Cost, Profit % BOQ and Status compute automatically.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                <th className="w-12 px-4 py-3">Sl</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">BOQ Amount</th>
                <th className="px-4 py-3 text-right">Total Actual Cost</th>
                <th className="px-4 py-3 text-right">Cost w/ Overhead</th>
                <th className="px-4 py-3 text-right">Profit/(Loss)</th>
                <th className="px-4 py-3 text-right">Profit % Cost</th>
                <th className="px-4 py-3 text-right">Profit % BOQ</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {profitItems.map((i) => {
                const boqAmt = itemAmount(i);
                const actual = i.actualCost;
                const withOh = actual !== null ? actual * (1 + overhead / 100) : null;
                const profit = withOh !== null ? boqAmt - withOh : null;
                const isEditing = editingActual?.id === i.id;
                return (
                  <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-slate-800/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-slate-400">{i.sl}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{i.description}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold dark:text-white">{inr(boqAmt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          defaultValue={actual ?? ""}
                          onBlur={(e) => void saveActual(i.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") void saveActual(i.id, (e.target as HTMLInputElement).value); }}
                          className="w-28 rounded-lg border border-blue-300 px-2 py-1 text-right text-sm outline-none dark:bg-slate-800 dark:text-white"
                        />
                      ) : (
                        <button onClick={() => setEditingActual({ id: i.id, value: String(actual ?? "") })} className="rounded-lg px-2 py-1 tabular-nums text-slate-600 underline decoration-dotted underline-offset-4 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-500/10">
                          {actual !== null ? inr(actual) : "＋ enter"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{withOh !== null ? inr(withOh) : "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${profit === null ? "text-slate-400" : profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                      {profit !== null ? inr(profit) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{withOh ? pct((profit! / withOh) * 100) : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{profit !== null && boqAmt > 0 ? pct((profit / boqAmt) * 100) : "—"}</td>
                    <td className="px-4 py-2.5"><Badge status={profit === null ? "Pending" : profit >= 0 ? "Profit" : "Loss"} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/70 font-bold dark:bg-blue-500/10">
                <td colSpan={2} className="px-4 py-3 dark:text-white">TOTAL</td>
                <td className="px-4 py-3 text-right tabular-nums text-blue-800 dark:text-blue-300">{inr(profitItems.reduce((s, i) => s + itemAmount(i), 0))}</td>
                <td className="px-4 py-3 text-right tabular-nums dark:text-white">{inr(profitItems.reduce((s, i) => s + (i.actualCost ?? 0), 0))}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
