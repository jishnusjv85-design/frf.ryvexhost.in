import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyEntries } from "@/db/schema";
import { logActivity, toNum, toStr, toStrOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

type ImportEntry = {
  entryDate?: unknown;
  siteId?: unknown;
  category?: unknown;
  name?: unknown;
  head?: unknown;
  qty?: unknown;
  rate?: unknown;
  notes?: unknown;
};

export async function POST(req: Request) {
  try {
    const callerRole = req.headers.get("X-User-Role");
    const callerEmail = req.headers.get("X-User-Email");

    if (callerRole !== "Admin") {
      return NextResponse.json({ error: "Only Admin can sync imported daily status data." }, { status: 403 });
    }

    const body = await req.json();
    const entries = Array.isArray(body.entries) ? (body.entries as ImportEntry[]) : [];
    if (entries.length === 0) {
      return NextResponse.json({ error: "No rows to sync" }, { status: 400 });
    }

    const values = entries.map((entry) => {
      const siteId = toNum(entry.siteId);
      const name = toStr(entry.name).trim();
      const category = toStr(entry.category, "Expense").trim();

      if (!siteId || !name || !category) {
        throw new Error("Imported rows must include site, type and name.");
      }

      return {
        entryDate: toStrOrNull(entry.entryDate),
        siteId,
        category,
        name,
        head: toStr(entry.head).trim(),
        qty: toNum(entry.qty),
        rate: toNum(entry.rate),
        notes: toStr(entry.notes).trim(),
      };
    });

    const rows = await db.insert(dailyEntries).values(values).returning();
    await logActivity("Daily status import synced", `${rows.length} verified rows`, callerEmail || "Admin");

    return NextResponse.json({ ok: true, count: rows.length }, { status: 201 });
  } catch (e) {
    console.error("POST /api/daily/import failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to sync import" }, { status: 400 });
  }
}
