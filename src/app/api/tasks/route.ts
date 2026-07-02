import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { logActivity, toNum, toStr, toStrOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const [row] = await db
    .insert(tasks)
    .values({
      title: toStr(b.title, "New task"),
      siteId: b.siteId ? toNum(b.siteId) : null,
      status: toStr(b.status, "todo"),
      priority: toStr(b.priority, "Medium"),
      dueDate: toStrOrNull(b.dueDate),
      assignee: toStr(b.assignee),
    })
    .returning();
  await logActivity("Task created", row.title);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const id = toNum(b.id);
  const set: Record<string, unknown> = {};
  if (b.title !== undefined) set.title = toStr(b.title);
  if (b.status !== undefined) set.status = toStr(b.status, "todo");
  if (b.priority !== undefined) set.priority = toStr(b.priority, "Medium");
  if (b.dueDate !== undefined) set.dueDate = toStrOrNull(b.dueDate);
  if (b.assignee !== undefined) set.assignee = toStr(b.assignee);
  if (b.siteId !== undefined) set.siteId = b.siteId ? toNum(b.siteId) : null;
  const [row] = await db.update(tasks).set(set).where(eq(tasks.id, id)).returning();
  return NextResponse.json(row ?? {});
}

export async function DELETE(req: Request) {
  const b = await req.json();
  await db.delete(tasks).where(eq(tasks.id, toNum(b.id)));
  return NextResponse.json({ ok: true });
}
