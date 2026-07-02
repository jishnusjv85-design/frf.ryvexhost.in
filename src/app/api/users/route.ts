import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logActivity } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const callerRole = req.headers.get("X-User-Role");
    const callerEmail = req.headers.get("X-User-Email");

    if (callerRole !== "Admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const { name, email, role, password } = await req.json();

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists
    const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Email address is already in use" }, { status: 400 });
    }

    const [row] = await db
      .insert(users)
      .values({
        name,
        email: cleanEmail,
        role,
        password,
        active: true,
      })
      .returning();

    await logActivity("User created", `${name} (${cleanEmail}) as ${role}`, callerEmail || "Admin");

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("POST /api/users failed", e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const callerRole = req.headers.get("X-User-Role");
    const callerEmail = req.headers.get("X-User-Email");

    if (callerRole !== "Admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const b = await req.json();
    const id = Number(b.id);

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Default users validation
    const isDefault = target.email === "faheem@frfdevelopers.com" || target.email === "support@ryvexhost.in";

    if (isDefault) {
      if (b.email !== undefined && b.email.toLowerCase().trim() !== target.email) {
        return NextResponse.json({ error: "Email address of default users cannot be modified." }, { status: 400 });
      }
      if (b.role !== undefined && b.role !== "Admin") {
        return NextResponse.json({ error: "Role of default users must remain Admin." }, { status: 400 });
      }
      if (b.active !== undefined && !b.active) {
        return NextResponse.json({ error: "Default users cannot be deactivated." }, { status: 400 });
      }
    }

    const set: Record<string, unknown> = {};
    if (b.name !== undefined) set.name = String(b.name);
    if (b.email !== undefined && !isDefault) set.email = String(b.email).toLowerCase().trim();
    if (b.role !== undefined && !isDefault) set.role = String(b.role);
    if (b.active !== undefined && !isDefault) set.active = Boolean(b.active);
    if (b.password !== undefined) set.password = String(b.password);

    const [row] = await db.update(users).set(set).where(eq(users.id, id)).returning();

    await logActivity("User updated", `${row.name} (${row.email})`, callerEmail || "Admin");

    return NextResponse.json(row);
  } catch (e) {
    console.error("PATCH /api/users failed", e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const callerRole = req.headers.get("X-User-Role");
    const callerEmail = req.headers.get("X-User-Email");

    if (callerRole !== "Admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const { id } = await req.json();
    const idNum = Number(id);

    if (!idNum) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const [target] = await db.select().from(users).where(eq(users.id, idNum)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isDefault = target.email === "faheem@frfdevelopers.com" || target.email === "support@ryvexhost.in";
    if (isDefault) {
      return NextResponse.json({ error: "Default users (Faheem & RyvexHost) are locked and cannot be deleted." }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, idNum));

    await logActivity("User deleted", `${target.name} (${target.email})`, callerEmail || "Admin");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/users failed", e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
