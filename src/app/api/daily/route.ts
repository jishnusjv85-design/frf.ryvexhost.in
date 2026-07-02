import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyEntries } from "@/db/schema";
import { logActivity, toNum, toStr, toStrOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const [row] = await db
    .insert(dailyEntries)
    .values({
      entryDate: toStrOrNull(b.entryDate),
      dateRaw: toStrOrNull(b.dateRaw),
      siteId: toNum(b.siteId, 1),
      category: toStr(b.category, "Expense"),
      name: toStr(b.name),
      head: toStr(b.head),
      qty: toNum(b.qty),
      rate: toNum(b.rate),
      notes: toStr(b.notes),
    })
    .returning();
  await logActivity("Daily update added", `${row.category} · ${row.name} — ${row.qty} × ₹${row.rate}`);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  const [row] = await db
    .update(dailyEntries)
    .set({
      entryDate: toStrOrNull(b.entryDate),
      dateRaw: toStrOrNull(b.dateRaw),
      siteId: toNum(b.siteId, 1),
      category: toStr(b.category, "Expense"),
      name: toStr(b.name),
      head: toStr(b.head),
      qty: toNum(b.qty),
      rate: toNum(b.rate),
      notes: toStr(b.notes),
    })
    .where(eq(dailyEntries.id, id))
    .returning();
  await logActivity("Daily update edited", `#${id} ${row?.name ?? ""}`);
  return NextResponse.json(row ?? {});
}

export async function DELETE(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  await db.delete(dailyEntries).where(eq(dailyEntries.id, id));
  await logActivity("Daily update deleted", `Entry #${id}`);
  return NextResponse.json({ ok: true });
}
