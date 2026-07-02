"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Building2,
  Calculator,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { LogoFull, LogoMark } from "@/components/logo";
import { Spinner } from "@/components/ui";
import { useData } from "@/lib/data-context";
import { inrCompact } from "@/lib/format";
import { boqTotal } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/boq", label: "BOQ", icon: FileSpreadsheet },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/sites", label: "Sites", icon: Building2 },
  { href: "/status", label: "Status", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profit", label: "Profit Calculator", icon: Calculator },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "User Management", icon: Users },
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <LogoFull />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all ${
                active
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-semibold shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-500"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon
                size={18}
                strokeWidth={2}
                className={active ? "text-blue-500" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"}
              />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 mb-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-800/20 dark:text-slate-400">
        <p className="font-semibold text-slate-800 dark:text-slate-200">FRF Developers</p>
        <p className="mt-1 leading-relaxed">Replacing spreadsheets with a single source of truth for every site.</p>
      </div>
    </div>
  );
}

function subscribeToThemeClass(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useTheme() {
  const dark = useSyncExternalStore(
    subscribeToThemeClass,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("frf-theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const close = () => {
    setQ("");
    onClose();
  };

  const results = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    const out: { group: string; label: string; sub: string; href: string }[] = [];
    const push = (group: string, label: string, sub: string, href: string) => {
      if (!query || label.toLowerCase().includes(query) || sub.toLowerCase().includes(query)) {
        out.push({ group, label, sub, href });
      }
    };
    NAV.forEach((n) => push("Pages", n.label, "Navigate", n.href));
    data.sites.forEach((s) => push("Sites", s.name, `${s.engineer} · ${s.location ?? ""}`, `/sites/${s.id}`));
    data.boqs.forEach((b) =>
      push("BOQs", b.name, `${inrCompact(boqTotal(data.boqItems, b.id))} · ${b.status}`, `/boq/${b.id}`),
    );
    data.materials.forEach((m) => push("Materials", m.name, `${m.category} · ${m.supplier ?? ""}`, "/materials"));
    if (query) {
      data.daily
        .filter(
          (d) => d.name.toLowerCase().includes(query) || d.category.toLowerCase().includes(query) || d.head.toLowerCase().includes(query),
        )
        .slice(0, 8)
        .forEach((d) => push("Daily Updates", `${d.category} — ${d.name}`, `${d.qty} × ₹${d.rate}`, "/status"));
    }
    return out.slice(0, 18);
  }, [data, q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
              <Search size={18} className="text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search BOQs, materials, sites, daily updates…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
              />
              <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-400">No results</p>}
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    router.push(r.href);
                    close();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-500/10"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{r.label}</span>
                    <span className="block text-xs text-slate-400">{r.sub}</span>
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                    {r.group}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, mutate } = useData();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("frf-user");
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem("frf-user");
      }
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser && pathname !== "/login") {
      router.replace("/login");
    } else if (currentUser && pathname === "/login") {
      router.replace("/");
    }
  }, [currentUser, pathname, authLoading, router]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const unread = data?.notifications.filter((n) => !n.read) ?? [];

  if (authLoading || (!currentUser && pathname !== "/login")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] dark:bg-[#0b1220]">
        <Spinner />
      </div>
    );
  }

  if (pathname === "/login") {
    return <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b1220]">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sidebar-gradient fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="sidebar-gradient fixed inset-y-0 left-0 z-50 w-[248px] lg:hidden"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 text-white/70">
                <X size={20} />
              </button>
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <header className="no-print fixed inset-x-0 top-0 z-30 lg:left-[248px]">
        <div className="glass mx-3 mt-3 flex items-center gap-3 rounded-2xl px-4 py-2.5 sm:mx-5">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800">
            <Menu size={20} />
          </button>
          <span className="lg:hidden">
            <LogoMark size={28} />
          </span>
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden flex-1 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2 text-sm text-slate-400 transition hover:border-blue-300 sm:flex dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Search size={15} />
            <span>Search everything…</span>
            <kbd className="ml-auto rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold dark:border-slate-600">
              ⌘K
            </kbd>
          </button>
          <div className="flex-1 sm:hidden" />
          <button
            onClick={toggle}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unread.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unread.length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <p className="text-sm font-bold dark:text-white">Notifications</p>
                    <button
                      onClick={() => void mutate("/api/notifications", "PATCH", { all: true })}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {(data?.notifications ?? []).slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => void mutate("/api/notifications", "PATCH", { id: n.id })}
                        className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50"
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            n.read ? "bg-slate-300 dark:bg-slate-600" : n.kind === "danger" ? "bg-rose-500" : n.kind === "warning" ? "bg-amber-500" : "bg-blue-500"
                          }`}
                        />
                        <span>
                          <span className={`block text-[13px] ${n.read ? "text-slate-500" : "font-semibold text-slate-800 dark:text-slate-100"}`}>
                            {n.title}
                          </span>
                          <span className="block text-xs text-slate-400">{n.body}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/30">
                {currentUser ? getInitials(currentUser.name) : "US"}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] leading-tight font-semibold text-slate-800 dark:text-white">
                  {currentUser?.name || "User"}
                </span>
                <span className="block text-[11px] leading-tight text-slate-400">
                  {currentUser?.role || "Viewer"}
                </span>
              </span>
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                >
                  {[
                    { label: "Profile & Settings", href: "/settings" },
                    { label: "User Management", href: "/users" },
                    { label: "Reports", href: "/reports" },
                  ].map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {i.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      localStorage.removeItem("frf-user");
                      setCurrentUser(null);
                      setProfileOpen(false);
                      router.push("/login");
                    }}
                    className="block w-full text-left px-4 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <main className="hero-gradient min-h-screen px-3 pt-24 pb-12 sm:px-5 lg:ml-[248px] lg:px-8">
        {children}
      </main>
    </div>
  );
}
