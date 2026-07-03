"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Lock,
  Minus,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, Field, inputCls, Modal, PageHeader, Spinner, Button } from "@/components/ui";
import { useData } from "@/lib/data-context";

const ROLE_STYLES: Record<string, string> = {
  Admin: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  Manager: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20",
  Engineer: "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20",
  "Site Supervisor": "bg-sky-500/10 text-sky-500 border border-sky-500/20",
  Viewer: "bg-slate-500/10 text-slate-500 border border-slate-500/20",
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

type EditingUser = {
  id?: number;
  name: string;
  email: string;
  role: string;
  password?: string;
  active?: boolean;
};

export default function UsersPage() {
  const { data, loading, mutate } = useData();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);

  // Modal / Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Viewer");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("frf-user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        Promise.resolve().then(() => {
          setCurrentUser(u);
        });
      } catch {}
    }
  }, []);

  if (loading || !data) return <Spinner />;

  const isAdmin = currentUser?.role === "Admin";

  const openAdd = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("Viewer");
    setActive(true);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
    setActive(u.active !== false);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!name || !email || !role) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    if (!editing && !password) {
      setError("Password is required for new accounts.");
      setSubmitting(false);
      return;
    }

    const payload: EditingUser = {
      name,
      email,
      role,
      active,
    };

    if (password) {
      payload.password = password;
    }

    let success = false;
    if (editing) {
      payload.id = editing.id;
      success = await mutate("/api/users", "PATCH", payload);
    } else {
      success = await mutate("/api/users", "POST", payload);
    }

    if (success) {
      setModalOpen(false);
    } else {
      setError("Action failed. Ensure email is unique and roles/permissions are valid.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action is permanent.`)) {
      return;
    }
    const success = await mutate("/api/users", "DELETE", { id });
    if (!success) {
      alert("Failed to delete user. Locked default users cannot be deleted.");
    }
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Team members and role-based permissions across the platform."
        actions={
          isAdmin && (
            <Button onClick={openAdd}>
              <Plus size={15} /> Add Team Member
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.users.map((u, i) => {
          const isDefault = u.email === "faheem@frfdevelopers.com" || u.email === "support@ryvexhost.in";
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass flex items-center justify-between gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-xl ${
                !u.active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
                  {u.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{u.name}</p>
                    {!u.active && (
                      <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-400">{u.email}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ROLE_STYLES[u.role] ?? "bg-slate-400 text-white"}`}>
                  {u.role}
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                      title="Edit Profile"
                    >
                      <Pencil size={13} />
                    </button>
                    {isDefault ? (
                      <span className="p-1 text-slate-400" title="Locked Default Profile">
                        <Lock size={13} className="opacity-50" />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        title="Delete Profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
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
        Roles map to what your team already does: Admin manages settings and users, engineers log daily progress, and viewers audit statements.
      </Card>

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Team Member" : "Add Team Member"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Field label="Full Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Faheem"
                disabled={submitting}
                className={inputCls}
                required
              />
            </Field>
          </div>

          <div>
            <Field label="Email Address">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faheem@frfdevelopers.com"
                disabled={submitting || !!(editing && (editing.email === "faheem@frfdevelopers.com" || editing.email === "support@ryvexhost.in"))}
                className={inputCls}
                required
              />
            </Field>
          </div>

          <div>
            <Field label={editing ? "Password (leave blank to keep current)" : "Password"}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                className={inputCls}
                required={!editing}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Field label="Platform Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={submitting || !!(editing && (editing.email === "faheem@frfdevelopers.com" || editing.email === "support@ryvexhost.in"))}
                  className={inputCls}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <Field label="Account Status">
                <select
                  value={active ? "Active" : "Inactive"}
                  onChange={(e) => setActive(e.target.value === "Active")}
                  disabled={submitting || !!(editing && (editing.email === "faheem@frfdevelopers.com" || editing.email === "support@ryvexhost.in"))}
                  className={inputCls}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Save Changes" : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
