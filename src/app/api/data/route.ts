import { NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  boqItems,
  boqs,
  dailyEntries,
  materials,
  notifications,
  sites,
  tasks,
  users,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const [sitesR, boqsR, boqItemsR, dailyR, materialsR, tasksR, usersR, activitiesR, notificationsR] =
      await Promise.all([
        db.select().from(sites).orderBy(asc(sites.id)),
        db.select().from(boqs).orderBy(asc(boqs.id)),
        db.select().from(boqItems).orderBy(asc(boqItems.boqId), asc(boqItems.sl)),
        db.select().from(dailyEntries).orderBy(asc(dailyEntries.id)),
        db.select().from(materials).orderBy(asc(materials.id)),
        db.select().from(tasks).orderBy(asc(tasks.id)),
        db.select().from(users).orderBy(asc(users.id)),
        db.select().from(activities).orderBy(desc(activities.createdAt)),
        db.select().from(notifications).orderBy(desc(notifications.createdAt)),
      ]);
    return NextResponse.json({
      sites: sitesR,
      boqs: boqsR,
      boqItems: boqItemsR,
      daily: dailyR,
      materials: materialsR,
      tasks: tasksR,
      users: usersR,
      activities: activitiesR,
      notifications: notificationsR,
    });
  } catch (e) {
    console.error("GET /api/data failed", e);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
