import { db } from "@/db";
import { activities } from "@/db/schema";

export async function logActivity(action: string, detail: string, actor = "Faheem") {
  try {
    await db.insert(activities).values({ action, detail, actor });
  } catch {
    // non-fatal
  }
}

export function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function toStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function toStrOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
