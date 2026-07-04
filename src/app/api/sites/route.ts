import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { logActivity, toNum, toStr, toStrOrNull } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function makeCode(name: string) {
  const code = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return code || "NEW-SITE";
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = toStr(b.name).trim();

    if (!name) {
      return NextResponse.json({ error: "Site name is required" }, { status: 400 });
    }

    const progress = Math.max(0, Math.min(100, Math.round(toNum(b.progress))));
    const [row] = await db
      .insert(sites)
      .values({
        name,
        code: toStr(b.code, makeCode(name)).trim() || makeCode(name),
        engineer: toStr(b.engineer, "Unassigned").trim() || "Unassigned",
        client: toStr(b.client).trim(),
        location: toStr(b.location).trim(),
        status: toStr(b.status, "Active"),
        startDate: toStrOrNull(b.startDate),
        targetDate: toStrOrNull(b.targetDate),
        budget: toNum(b.budget),
        progress,
        notes: toStr(b.notes).trim(),
        color: toStr(b.color, "#2563eb"),
      })
      .returning();

    await logActivity("Site created", `${row.name} at ${row.location ?? "site location"}`);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("POST /api/sites failed", e);
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 });
  }
}
