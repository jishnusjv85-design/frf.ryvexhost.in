"use client";

import { motion } from "framer-motion";
import { Check, Minus, ShieldCheck, Users } from "lucide-react";
import { Card, PageHeader, Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";

const ROLE_STYLES: Record<string, string> = {
  Admin: "bg-blue-600 text-white",
  Manager: "bg-indigo-500 text-white",
  Engineer: "bg-cyan-500 text-white",
  "Site Supervisor": "bg-sky-500 text-white",
  Viewer: "bg-slate-400 text-white",
};

const PERMISSIONS = [
  { feature: "View dashboards & reports", roles: ["Admin", "Manager", "Engineer", "Site Supervisor", "Viewer"] },
  { feature: "Add daily updates", roles: ["Admin", "Manager", "Engineer", "Site Supervisor"] },
  { feature: "Edit / delete daily updates", roles: ["Admin", "Manager", "Engineer"] },
  { feature: "Create & edit BOQs", roles: ["Admin", "Manager", "Engineer"] },
  { feature: "Delete / archive BOQs", roles: ["Admin", "Manager"] },
  { feature: "Manage materials & stock", roles: ["Admin", "Manager", "Engineer", "Site Supervisor"] },
  { feature: "View profit & financials", roles: ["Admin", "Manager"] },
  { feature: "Export & print reports", roles: ["Admin", "Manager", "Engineer"] },
  { feature: "Manage users & settings", roles: ["Admin"] },
];

const ALL_ROLES = ["Admin", "Manager", "Engineer", "Site Supervisor", "Viewer"];

export default function UsersPage() {
  const { data, loading } = useData();
  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="User Management" subtitle="Team members and role-based permissions across the platform." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.users.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass flex items-center gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
              {u.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900 dark:text-white">{u.name}</p>
              <p className="truncate text-xs text-slate-400">{u.email}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ROLE_STYLES[u.role] ?? "bg-slate-400 text-white"}`}>
              {u.role}
            </span>
          </motion.div>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <ShieldCheck size={17} className="text-blue-500" />
          <h3 className="font-bold dark:text-white">Role-Based Permission Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                <th className="px-5 py-3">Capability</th>
                {ALL_ROLES.map((r) => <th key={r} className="px-4 py-3 text-center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.feature} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                  <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-200">{p.feature}</td>
                  {ALL_ROLES.map((r) => (
                    <td key={r} className="px-4 py-3 text-center">
                      {p.roles.includes(r) ? (
                        <Check size={16} className="mx-auto text-emerald-500" />
                      ) : (
                        <Minus size={16} className="mx-auto text-slate-300 dark:text-slate-600" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5 flex items-center gap-3 p-4 text-xs text-slate-400">
        <Users size={15} className="text-blue-400" />
        Roles map to what your team already does: Faheem administers everything, engineers log daily updates from site, and viewers audit reports.
      </Card>
    </div>
  );
}
