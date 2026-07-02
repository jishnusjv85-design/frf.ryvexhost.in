import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boqItems } from "@/db/schema";
import { logActivity, toNum, toStr } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const [row] = await db
    .insert(boqItems)
    .values({
      boqId: toNum(b.boqId),
      sl: toNum(b.sl, 1),
      category: toStr(b.category, "General"),
      description: toStr(b.description, "New item"),
      unit: toStr(b.unit, "Cum"),
      qty: toNum(b.qty),
      rate: toNum(b.rate),
      actualCost: b.actualCost === null || b.actualCost === undefined || b.actualCost === "" ? null : toNum(b.actualCost),
      overheadPct: toNum(b.overheadPct, 10),
      progress: toNum(b.progress),
      remarks: toStr(b.remarks),
    })
    .returning();
  await logActivity("BOQ item added", row.description);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  const set: Record<string, unknown> = {};
  if (b.sl !== undefined) set.sl = toNum(b.sl, 1);
  if (b.category !== undefined) set.category = toStr(b.category, "General");
  if (b.description !== undefined) set.description = toStr(b.description);
  if (b.unit !== undefined) set.unit = toStr(b.unit, "Cum");
  if (b.qty !== undefined) set.qty = toNum(b.qty);
  if (b.rate !== undefined) set.rate = toNum(b.rate);
  if (b.actualCost !== undefined)
    set.actualCost = b.actualCost === null || b.actualCost === "" ? null : toNum(b.actualCost);
  if (b.overheadPct !== undefined) set.overheadPct = toNum(b.overheadPct, 10);
  if (b.progress !== undefined) set.progress = toNum(b.progress);
  if (b.remarks !== undefined) set.remarks = toStr(b.remarks);
  const [row] = await db.update(boqItems).set(set).where(eq(boqItems.id, id)).returning();
  return NextResponse.json(row ?? {});
}

export async function DELETE(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  await db.delete(boqItems).where(eq(boqItems.id, id));
  await logActivity("BOQ item deleted", `Item #${id}`);
  return NextResponse.json({ ok: true });
}
