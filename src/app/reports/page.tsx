"use client";

import { motion } from "framer-motion";
import { CalendarDays, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, PageHeader, Spinner, inputCls } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { downloadCsv, fmtDate, inr, num } from "@/lib/format";
import { boqTotal, entryTotal, itemAmount, siteCategoryTotals } from "@/lib/types";

const REPORTS = [
  { key: "daily", label: "Daily Report", desc: "All ledger entries for a selected day" },
  { key: "weekly", label: "Weekly Report", desc: "Last 7 days of site activity" },
  { key: "monthly", label: "Monthly Report", desc: "Month-wise expenditure summary" },
  { key: "boq", label: "BOQ Report", desc: "Every BOQ with items and totals" },
  { key: "material", label: "Material Report", desc: "Stock, usage and landed cost" },
  { key: "site", label: "Site Report", desc: "Category totals per site" },
  { key: "profit", label: "Profit Report", desc: "Revenue vs expense per site" },
  { key: "gst", label: "GST Report", desc: "GST paid on material purchases" },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

export default function ReportsPage() {
  const { data, loading } = useData();
  const [report, setReport] = useState<ReportKey>("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const table = useMemo(() => {
    if (!data) return { headers: [] as string[], rows: [] as (string | number)[][], title: "" };
    const siteName = (id: number) => data.sites.find((s) => s.id === id)?.name ?? "—";
    switch (report) {
      case "daily": {
        const rows = data.daily.filter((d) => d.entryDate === date);
        return {
          title: `Daily Report — ${fmtDate(date)}`,
          headers: ["Site", "Type", "Name/Description", "Head", "Qty", "Rate", "Total"],
          rows: rows.map((d) => [siteName(d.siteId), d.category, d.name, d.head, d.qty, d.rate, entryTotal(d)]),
        };
      }
      case "weekly": {
        const from = new Date(date);
        from.setDate(from.getDate() - 6);
        const fromKey = from.toISOString().slice(0, 10);
        const rows = data.daily.filter((d) => d.entryDate && d.entryDate >= fromKey && d.entryDate <= date);
        return {
          title: `Weekly Report — ${fmtDate(fromKey)} to ${fmtDate(date)}`,
          headers: ["Date", "Site", "Type", "Name", "Qty", "Rate", "Total"],
          rows: rows.map((d) => [d.entryDate ?? "", siteName(d.siteId), d.category, d.name, d.qty, d.rate, entryTotal(d)]),
        };
      }
      case "monthly": {
        const map = new Map<string, number>();
        data.daily.forEach((d) => {
          if (!d.entryDate) return;
          const k = `${d.entryDate.slice(0, 7)}|${siteName(d.siteId)}`;
          map.set(k, (map.get(k) || 0) + entryTotal(d));
        });
        return {
          title: "Monthly Report — expenditure by month & site",
          headers: ["Month", "Site", "Total Expense"],
          rows: [...map.entries()].sort().map(([k, v]) => [...k.split("|"), Math.round(v * 100) / 100]),
        };
      }
      case "boq":
        return {
          title: "BOQ Report — all bills of quantities",
          headers: ["BOQ", "Site", "Status", "Sl", "Description", "Unit", "Qty", "Rate", "Amount"],
          rows: data.boqItems.map((i) => {
            const b = data.boqs.find((x) => x.id === i.boqId);
            return [b?.name ?? "", siteName(b?.siteId ?? 0), b?.status ?? "", i.sl, i.description, i.unit, i.qty, i.rate, itemAmount(i)];
          }),
        };
      case "material":
        return {
          title: "Material Report",
          headers: ["Material", "Category", "Supplier", "Site", "Qty", "Unit", "Rate", "GST %", "Transport", "Total Cost", "Used", "Remaining", "Status"],
          rows: data.materials.map((m) => [m.name, m.category, m.supplier ?? "", siteName(m.siteId), m.qty, m.unit, m.rate, m.gstPct, m.transport, Math.round((m.qty * m.rate * (1 + m.gstPct / 100) + m.transport) * 100) / 100, m.used, m.qty - m.used, m.status]),
        };
      case "site":
        return {
          title: "Site Report — category totals",
          headers: ["Site", "Category", "Total"],
          rows: data.sites.flatMap((s) =>
            [...siteCategoryTotals(data.daily, s.id).byCategory.entries()].map(([c, v]) => [s.name, c, Math.round(v * 100) / 100]),
          ),
        };
      case "profit":
        return {
          title: "Profit Report",
          headers: ["Site", "Contract Revenue", "BOQ Value", "Executed Expense", "Profit/(Loss)", "Margin %"],
          rows: data.sites.map((s) => {
            const spent = siteCategoryTotals(data.daily, s.id).grand;
            const bv = data.boqs.filter((b) => b.siteId === s.id).reduce((acc, b) => acc + boqTotal(data.boqItems, b.id), 0);
            const p = s.budget - spent;
            return [s.name, s.budget, Math.round(bv), Math.round(spent), Math.round(p), s.budget ? ((p / s.budget) * 100).toFixed(1) : "—"];
          }),
        };
      case "gst":
        return {
          title: "GST Report — input tax on purchases",
          headers: ["Material", "Site", "Taxable Value", "GST %", "GST Amount", "Invoice Value"],
          rows: data.materials.map((m) => {
            const taxable = m.qty * m.rate;
            const gstAmt = taxable * (m.gstPct / 100);
            return [m.name, siteName(m.siteId), Math.round(taxable), m.gstPct, Math.round(gstAmt), Math.round(taxable + gstAmt + m.transport)];
          }),
        };
    }
  }, [data, report, date]);

  if (loading || !data) return <Spinner />;

  const numericTotal = table.rows.reduce((s, r) => {
    const last = r[r.length - 1];
    return typeof last === "number" ? s + last : s;
  }, 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate, print and export any report — daily to GST — straight from live data."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv(`${report}-report.csv`, table.headers, table.rows)}><Download size={15} /> Excel Export</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> PDF / Print</Button>
          </>
        }
      />

      <div className="no-print mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {REPORTS.map((r, i) => (
          <motion.button
            key={r.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setReport(r.key)}
            className={`rounded-2xl p-4 text-left transition-all ${
              report === r.key
                ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-600/30"
                : "glass hover:-translate-y-0.5 hover:shadow-lg"
            }`}
          >
            <FileText size={17} className={report === r.key ? "text-blue-200" : "text-blue-500"} />
            <p className={`mt-2 text-[13.5px] font-bold ${report === r.key ? "" : "dark:text-white"}`}>{r.label}</p>
            <p className={`text-[11px] ${report === r.key ? "text-blue-200" : "text-slate-400"}`}>{r.desc}</p>
          </motion.button>
        ))}
      </div>

      {(report === "daily" || report === "weekly") && (
        <div className="no-print mb-4 flex items-center gap-2">
          <CalendarDays size={16} className="text-slate-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} !w-auto`} />
        </div>
      )}

      <Card className="print-area overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="flex items-center gap-2 font-bold dark:text-white"><FileSpreadsheet size={16} className="text-blue-500" /> {table.title}</h3>
            <p className="text-xs text-slate-400">FRF Developers · Generated {new Date().toLocaleString("en-IN")}</p>
          </div>
          <p className="text-sm font-bold text-blue-700 tabular-nums dark:text-blue-300">{numericTotal > 0 && `Total: ${inr(numericTotal)}`}</p>
        </div>
        <div className="max-h-[62vh] overflow-auto">
          <table className="table-sticky w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                {table.headers.map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-slate-800/50 dark:hover:bg-slate-800/40">
                  {r.map((c, j) => (
                    <td key={j} className={`px-4 py-2.5 ${typeof c === "number" ? "text-right tabular-nums font-medium dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
                      {typeof c === "number" ? num(c) : c}
                    </td>
                  ))}
                </tr>
              ))}
              {table.rows.length === 0 && (
                <tr><td colSpan={table.headers.length} className="px-4 py-10 text-center text-slate-400">No data for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
