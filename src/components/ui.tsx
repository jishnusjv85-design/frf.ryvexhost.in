"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_STYLES } from "@/lib/types";

export function Card({ children, className = "", hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`glass rounded-2xl ${hover ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px] dark:text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "blue",
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "blue" | "cyan" | "emerald" | "amber" | "rose" | "indigo";
  delay?: number;
}) {
  const tones: Record<string, string> = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    cyan: "from-cyan-500 to-sky-600 shadow-cyan-500/30",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
    amber: "from-amber-500 to-orange-500 shadow-amber-500/30",
    rose: "from-rose-500 to-pink-600 shadow-rose-500/30",
    indigo: "from-indigo-500 to-violet-600 shadow-indigo-500/30",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {sub ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p> : null}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${tones[tone]}`}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>
    </motion.div>
  );
}

export function Badge({ status, className = "", children }: { status: string; className?: string; children?: ReactNode }) {
  const style = STATUS_STYLES[status] || "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style} ${className}`}>
      {children ?? status}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "btn-gradient text-white",
    ghost:
      "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    outline:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700",
    danger: "bg-rose-600 text-white shadow-md shadow-rose-600/25 hover:bg-rose-700",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function ProgressBar({ value, className = "", tone }: { value: number; className?: string; tone?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone || (v >= 80 ? "bg-emerald-500" : v >= 40 ? "bg-blue-500" : "bg-cyan-500");
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60 ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm sm:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`mt-6 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export function Empty({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
        <Icon size={26} />
      </div>
      <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {sub ? <p className="mt-1 max-w-sm text-sm text-slate-400">{sub}</p> : null}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
    </div>
  );
}
