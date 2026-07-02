import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { toNum } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const b = await req.json();
  if (b.all) {
    await db.update(notifications).set({ read: true });
    return NextResponse.json({ ok: true });
  }
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, toNum(b.id)));
  return NextResponse.json({ ok: true });
}
