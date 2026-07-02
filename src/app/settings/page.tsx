"use client";

import { Building2, Command, DatabaseBackup, Keyboard, Moon, Palette, Save } from "lucide-react";
import { useState } from "react";
import { Button, Card, Field, inputCls, PageHeader } from "@/components/ui";
import { useData } from "@/lib/data-context";

export default function SettingsPage() {
  const { data } = useData();
  const [company, setCompany] = useState({
    name: "FRF Developers",
    email: "office@frfdevelopers.com",
    phone: "+91 98470 00000",
    address: "Kozhikode, Kerala, India",
    gstin: "32ABCDE1234F1Z5",
    currency: "INR (₹)",
  });
  const [saved, setSaved] = useState(false);

  const backup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `frf-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company profile, appearance, backups and shortcuts." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-5 flex items-center gap-2 font-bold dark:text-white"><Building2 size={17} className="text-blue-500" /> Company Profile</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company Name"><input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Email"><input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className={inputCls} /></Field>
            <Field label="Phone"><input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="GSTIN"><input value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value })} className={inputCls} /></Field>
            <Field label="Address" className="sm:col-span-2"><input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} className={inputCls} /></Field>
            <Field label="Currency"><input value={company.currency} disabled className={inputCls} /></Field>
          </div>
          <Button className="mt-5" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }}>
            <Save size={15} /> {saved ? "Saved ✓" : "Save Changes"}
          </Button>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold dark:text-white"><Palette size={17} className="text-blue-500" /> Appearance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <Moon size={14} className="mr-1 inline text-blue-400" />
              Toggle dark mode anytime from the top bar. Your preference is remembered on this device.
            </p>
            <div className="mt-4 flex gap-2">
              {["#2563eb", "#0ea5e9", "#6366f1", "#06b6d4"].map((c) => (
                <span key={c} className="h-8 w-8 rounded-xl ring-2 ring-white shadow dark:ring-slate-700" style={{ background: c }} />
              ))}
              <span className="ml-2 self-center text-xs text-slate-400">FRF brand palette</span>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold dark:text-white"><DatabaseBackup size={17} className="text-blue-500" /> Backup & Data</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Download a full JSON snapshot of every site, BOQ, material and daily update. Auto-backup runs with every export.
            </p>
            <Button variant="outline" className="mt-4" onClick={backup}><DatabaseBackup size={15} /> Download Backup</Button>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold dark:text-white"><Keyboard size={17} className="text-blue-500" /> Keyboard Shortcuts</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { keys: "⌘ / Ctrl + K", desc: "Open command palette & global search" },
                { keys: "Esc", desc: "Close dialogs and palette" },
                { keys: "⌘ / Ctrl + P", desc: "Print current report (browser)" },
              ].map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{s.desc}</span>
                  <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Command size={10} className="mr-1 inline" />{s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
