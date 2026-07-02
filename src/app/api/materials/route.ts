import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { logActivity, toNum, toStr, toStrOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function values(b: Record<string, unknown>) {
  const qty = toNum(b.qty);
  const used = toNum(b.used);
  const remaining = qty - used;
  const status =
    toStr(b.status) ||
    (remaining <= 0 ? "Out of Stock" : remaining / Math.max(qty, 1) < 0.15 ? "Low Stock" : "In Stock");
  return {
    name: toStr(b.name, "Material"),
    category: toStr(b.category, "Materials"),
    supplier: toStr(b.supplier),
    purchaseDate: toStrOrNull(b.purchaseDate),
    siteId: toNum(b.siteId, 1),
    qty,
    unit: toStr(b.unit, "nos"),
    rate: toNum(b.rate),
    gstPct: toNum(b.gstPct),
    transport: toNum(b.transport),
    used,
    status,
  };
}

export async function POST(req: Request) {
  const b = await req.json();
  const [row] = await db.insert(materials).values(values(b)).returning();
  await logActivity("Material added", `${row.name} · ${row.qty} ${row.unit}`);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  const [row] = await db.update(materials).set(values(b)).where(eq(materials.id, id)).returning();
  await logActivity("Material updated", row?.name ?? `#${id}`);
  return NextResponse.json(row ?? {});
}

export async function DELETE(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  await db.delete(materials).where(eq(materials.id, id));
  await logActivity("Material deleted", `Material #${id}`);
  return NextResponse.json({ ok: true });
}
