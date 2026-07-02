"use client";

import { motion } from "framer-motion";
import { ArrowRight, HardHat, Info, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoFull } from "@/components/logo";

const SEED_USERS = [
  { name: "Faheem", email: "faheem@frfdevelopers.com", role: "Admin", password: "admin123" },
  { name: "RyvexHost", email: "support@ryvexhost.in", role: "Admin", password: "Jishnusjv95@" },
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Manager: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  Engineer: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "Site Supervisor": "bg-sky-500/10 text-sky-500 border-sky-500/20",
  Viewer: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          localStorage.setItem("frf-user", JSON.stringify(data.user));
          window.location.href = "/";
        } else {
          setError(data.error || "Authentication failed. Check credentials.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Network error. Please try again.");
        setLoading(false);
      });
  };

  const selectUser = (user: typeof SEED_USERS[number]) => {
    setEmail(user.email);
    setPassword(user.password);
    setError(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070b14]">
      {/* Left split pane: Branding and marketing (desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex">
        {/* Background decorative patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950" />
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <LogoFull light />
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-semibold tracking-wide text-blue-300 uppercase">
              <HardHat size={13} className="text-blue-400" />
              Active Site Management
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            Real-time control <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              for every site.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base leading-relaxed text-slate-400"
          >
            Streamline your construction workflows. Replaces complex Excel spreadsheets with structured BOQs, daily progress tracking, material stock ledgers, and dynamic financial analysis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10"
          >
            <div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">Single source of truth</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Zero</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">Spreadsheet chaos</p>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-slate-600">
          © {new Date().getFullYear()} FRF Developers. All rights reserved.
        </div>
      </div>

      {/* Right split pane: Login card */}
      <div className="flex w-full flex-col justify-center p-6 sm:p-12 lg:w-1/2 lg:p-20 relative">
        <div className="absolute top-10 right-10 lg:hidden">
          <LogoFull />
        </div>

        <div className="mx-auto w-full max-w-[420px] space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sign in with your team credentials to access the project workspace.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400"
            >
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@frfdevelopers.com"
                  disabled={loading}
                  className="w-full pl-10 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full pl-10 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Select Grid */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Quick Select Team Profile
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {SEED_USERS.map((user) => {
                const initials = user.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase();
                const active = email === user.email;

                return (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => selectUser(user)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10"
                        : "border-slate-200/80 hover:border-blue-300 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-[11px] font-bold text-white">
                      {initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                        {user.name}
                      </span>
                      <span
                        className={`inline-block border rounded px-1.5 py-0.5 text-[9px] font-semibold mt-0.5 ${
                          ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
