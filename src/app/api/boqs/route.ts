import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { boqItems, boqs } from "@/db/schema";
import { logActivity, toNum, toStr, toStrOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const [row] = await db
    .insert(boqs)
    .values({
      name: toStr(b.name, "Untitled BOQ"),
      siteId: toNum(b.siteId, 1),
      status: toStr(b.status, "Draft"),
      date: toStrOrNull(b.date),
      createdBy: toStr(b.createdBy, "Faheem"),
      notes: toStr(b.notes),
    })
    .returning();

  const duplicateFrom = toNum(b.duplicateFrom, 0);
  if (duplicateFrom > 0) {
    const items = await db.select().from(boqItems).where(eq(boqItems.boqId, duplicateFrom)).orderBy(asc(boqItems.sl));
    if (items.length) {
      await db.insert(boqItems).values(
        items.map((i) => ({
          boqId: row.id,
          sl: i.sl,
          category: i.category,
          description: i.description,
          unit: i.unit,
          qty: i.qty,
          rate: i.rate,
          overheadPct: i.overheadPct,
          progress: 0,
          remarks: i.remarks,
        })),
      );
    }
    await logActivity("BOQ duplicated", `${row.name} (from #${duplicateFrom})`);
  } else {
    await logActivity("New BOQ created", row.name);
  }
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) set.name = toStr(b.name);
  if (b.siteId !== undefined) set.siteId = toNum(b.siteId, 1);
  if (b.status !== undefined) set.status = toStr(b.status, "Draft");
  if (b.date !== undefined) set.date = toStrOrNull(b.date);
  if (b.notes !== undefined) set.notes = toStr(b.notes);
  if (b.archived !== undefined) set.archived = Boolean(b.archived);
  const [row] = await db.update(boqs).set(set).where(eq(boqs.id, id)).returning();
  await logActivity("BOQ updated", row?.name ?? `#${id}`);
  return NextResponse.json(row ?? {});
}

export async function DELETE(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  await db.delete(boqItems).where(eq(boqItems.boqId, id));
  await db.delete(boqs).where(eq(boqs.id, id));
  await logActivity("BOQ deleted", `BOQ #${id}`);
  return NextResponse.json({ ok: true });
}
