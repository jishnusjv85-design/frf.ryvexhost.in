export type Site = {
  id: number;
  name: string;
  code: string;
  engineer: string;
  client: string | null;
  location: string | null;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  budget: number;
  progress: number;
  notes: string | null;
  color: string | null;
};

export type Boq = {
  id: number;
  name: string;
  siteId: number;
  status: string;
  date: string | null;
  createdBy: string | null;
  notes: string | null;
  archived: boolean;
  updatedAt: string;
};

export type BoqItem = {
  id: number;
  boqId: number;
  sl: number;
  category: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
  actualCost: number | null;
  overheadPct: number;
  progress: number;
  remarks: string | null;
};

export type DailyEntry = {
  id: number;
  entryDate: string | null;
  dateRaw: string | null;
  siteId: number;
  category: string;
  name: string;
  head: string;
  qty: number;
  rate: number;
  notes: string | null;
  createdAt: string;
};

export type Material = {
  id: number;
  name: string;
  category: string;
  supplier: string | null;
  purchaseDate: string | null;
  siteId: number;
  qty: number;
  unit: string;
  rate: number;
  gstPct: number;
  transport: number;
  used: number;
  status: string;
};

export type Task = {
  id: number;
  title: string;
  siteId: number | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: string | null;
};

export type User = { id: number; name: string; email: string; role: string; active: boolean };

export type Activity = { id: number; action: string; detail: string | null; actor: string | null; createdAt: string };

export type Notification = {
  id: number;
  title: string;
  body: string | null;
  kind: string;
  read: boolean;
  createdAt: string;
};

export type Snapshot = {
  sites: Site[];
  boqs: Boq[];
  boqItems: BoqItem[];
  daily: DailyEntry[];
  materials: Material[];
  tasks: Task[];
  users: User[];
  activities: Activity[];
  notifications: Notification[];
};

/** Canonical daily-ledger categories — exactly as used in the Excel workbook. */
export const DAILY_CATEGORIES = [
  "Labour",
  "Cement",
  "Steel",
  "M-Sand",
  "K-Sand",
  "Metal",
  "Boller",
  "M-Waste",
  "Laterite",
  "Solid Block",
  "Solid Block 15cm",
  "Materials",
  "Rent",
  "Expense",
] as const;

export const MATERIAL_CATEGORIES = DAILY_CATEGORIES.filter((c) => c !== "Labour" && c !== "Expense" && c !== "Rent");

export const entryTotal = (e: { qty: number; rate: number }) => e.qty * e.rate;
export const itemAmount = (i: { qty: number; rate: number }) => i.qty * i.rate;

/** Summary-by-Site block of the `daily` sheet: per-category totals + grand total. */
export function siteCategoryTotals(daily: DailyEntry[], siteId?: number) {
  const rows = siteId ? daily.filter((d) => d.siteId === siteId) : daily;
  const map = new Map<string, number>();
  for (const d of rows) map.set(d.category, (map.get(d.category) || 0) + entryTotal(d));
  const grand = rows.reduce((s, d) => s + entryTotal(d), 0);
  return { byCategory: map, grand };
}

export function boqTotal(items: BoqItem[], boqId: number) {
  return items.filter((i) => i.boqId === boqId).reduce((s, i) => s + itemAmount(i), 0);
}

export const CATEGORY_COLORS: Record<string, string> = {
  Labour: "#2563eb",
  Cement: "#0ea5e9",
  Steel: "#6366f1",
  "M-Sand": "#06b6d4",
  "K-Sand": "#38bdf8",
  Metal: "#3b82f6",
  Boller: "#1d4ed8",
  "M-Waste": "#818cf8",
  Laterite: "#f59e0b",
  "Solid Block": "#10b981",
  "Solid Block 15cm": "#34d399",
  Materials: "#a855f7",
  Rent: "#f43f5e",
  Expense: "#64748b",
};

export const STATUS_STYLES: Record<string, string> = {
  Active: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",
  Draft: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  Archived: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
  "On Hold": "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
  "In Stock": "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Low Stock": "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
  "Out of Stock": "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300",
  Profit: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  Loss: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300",
  Pending: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
};
