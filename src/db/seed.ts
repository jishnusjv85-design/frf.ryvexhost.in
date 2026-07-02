import { count } from "drizzle-orm";
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
import { BOQ_ITEMS, DAILY_ROWS } from "@/db/seed-data";

function phaseFor(sl: number): string {
  if (sl <= 5) return "Foundation & Basement";
  if (sl <= 13) return "Ground Floor (GF)";
  if (sl <= 20) return "First Floor (FF)";
  return "Masonry & Finishing";
}

let seeding: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    const [{ value: siteCount }] = await db.select({ value: count() }).from(sites);
    if (siteCount > 0) return;

    const boqBudget = BOQ_ITEMS.reduce((s, i) => s + i.qty * i.rate, 0);

    const insertedSites = await db
      .insert(sites)
      .values([
        {
          name: "Palazhi-1",
          code: "PALAZHI1 (NACHU)",
          engineer: "Nachu",
          client: "Nachu Residence",
          location: "Palazhi, Kozhikode, Kerala",
          status: "Active",
          startDate: "2025-04-28",
          targetDate: "2026-06-30",
          budget: boqBudget,
          progress: 46,
          notes: "Two-storey residential project. BOQ as per Nachu's BOQ sheet.",
          color: "#2563eb",
        },
        {
          name: "Palazhi-2",
          code: "PALAZHI2 (RAJ)",
          engineer: "Raj",
          client: "Raj Residence",
          location: "Palazhi, Kozhikode, Kerala",
          status: "Active",
          startDate: "2025-05-12",
          targetDate: "2026-08-31",
          budget: 3450000,
          progress: 28,
          notes: "Residential build — structure up to GF lintel.",
          color: "#0ea5e9",
        },
        {
          name: "Parayencheri",
          code: "PARAYENCHERI (RASH)",
          engineer: "Rash",
          client: "Rash Residence",
          location: "Parayencheri, Kozhikode, Kerala",
          status: "Active",
          startDate: "2025-03-15",
          targetDate: "2026-03-31",
          budget: 5200000,
          progress: 62,
          notes: "Fast-track site — FF slab completed.",
          color: "#6366f1",
        },
      ])
      .returning({ id: sites.id, code: sites.code });

    const siteByCode = new Map(insertedSites.map((s) => [s.code, s.id]));
    const s1 = siteByCode.get("PALAZHI1 (NACHU)")!;
    const s2 = siteByCode.get("PALAZHI2 (RAJ)")!;
    const s3 = siteByCode.get("PARAYENCHERI (RASH)")!;

    const insertedBoqs = await db
      .insert(boqs)
      .values([
        { name: "Nachu's BOQ — Palazhi-1", siteId: s1, status: "Active", date: "2025-04-28", createdBy: "Faheem", notes: "Master BOQ replicated from the RAW BOQ sheet." },
        { name: "Palazhi-2 BOQ", siteId: s2, status: "Active", date: "2025-05-12", createdBy: "Faheem", notes: "Working BOQ for Palazhi-2 (Raj)." },
        { name: "Example BOQ", siteId: s3, status: "Draft", date: "2025-06-01", createdBy: "Faheem", notes: "Template BOQ for new estimates." },
      ])
      .returning({ id: boqs.id, name: boqs.name });

    const b1 = insertedBoqs[0].id;
    const b2 = insertedBoqs[1].id;
    const b3 = insertedBoqs[2].id;

    await db.insert(boqItems).values([
      ...BOQ_ITEMS.map((i) => ({
        boqId: b1,
        sl: i.sl,
        category: phaseFor(i.sl),
        description: i.description,
        unit: i.unit,
        qty: i.qty,
        rate: i.rate,
        overheadPct: 10,
        progress: i.sl <= 13 ? 100 : i.sl <= 20 ? 45 : 10,
      })),
      ...BOQ_ITEMS.slice(0, 13).map((i) => ({
        boqId: b2,
        sl: i.sl,
        category: phaseFor(i.sl),
        description: i.description,
        unit: i.unit,
        qty: Math.round(i.qty * 0.86 * 100) / 100,
        rate: i.rate,
        overheadPct: 10,
        progress: i.sl <= 6 ? 100 : 30,
      })),
      { boqId: b3, sl: 1, category: "Foundation & Basement", description: "Earth work excavation", unit: "Cum", qty: 120, rate: 450, overheadPct: 10, progress: 0 },
      { boqId: b3, sl: 2, category: "Foundation & Basement", description: "Rubble masonry foundation", unit: "Cum", qty: 95, rate: 2137, overheadPct: 10, progress: 0 },
      { boqId: b3, sl: 3, category: "Ground Floor (GF)", description: "Laterite masonry below lintel", unit: "Cum", qty: 44, rate: 7966.2, overheadPct: 10, progress: 0 },
      { boqId: b3, sl: 4, category: "Ground Floor (GF)", description: "RCC slab 12cm", unit: "Cum", qty: 16.5, rate: 21644.15, overheadPct: 10, progress: 0 },
      { boqId: b3, sl: 5, category: "Masonry & Finishing", description: "Plastering (internal + external)", unit: "SqM", qty: 1200, rate: 362.78, overheadPct: 10, progress: 0 },
    ]);

    // ---- Daily Update Status ledger (every row from the `daily` sheet) ----
    const dailyValues = DAILY_ROWS.map((r) => ({
      entryDate: r.date,
      dateRaw: r.dateRaw,
      siteId: siteByCode.get(r.site) ?? s1,
      category: r.type,
      name: r.name,
      head: r.head,
      qty: r.qty,
      rate: r.rate,
    }));
    for (let i = 0; i < dailyValues.length; i += 250) {
      await db.insert(dailyEntries).values(dailyValues.slice(i, i + 250));
    }

    await db.insert(materials).values([
      { name: "Cement (PPC 50kg)", category: "Cement", supplier: "Ramco Dealers", purchaseDate: "2025-08-26", siteId: s1, qty: 340, unit: "Bag", rate: 380, gstPct: 28, transport: 1950, used: 315, status: "Low Stock" },
      { name: "TMT Steel Fe550", category: "Steel", supplier: "Kairali Steels", purchaseDate: "2025-08-09", siteId: s1, qty: 3401, unit: "Kg", rate: 66, gstPct: 18, transport: 2400, used: 3200, status: "Low Stock" },
      { name: "M-Sand", category: "M-Sand", supplier: "Jayesh", purchaseDate: "2025-06-12", siteId: s1, qty: 1200, unit: "cft", rate: 56, gstPct: 5, transport: 0, used: 980, status: "In Stock" },
      { name: "K-Sand (Plastering)", category: "K-Sand", supplier: "Jayesh", purchaseDate: "2025-05-30", siteId: s1, qty: 800, unit: "cft", rate: 30, gstPct: 5, transport: 0, used: 420, status: "In Stock" },
      { name: "Metal 20mm", category: "Metal", supplier: "Jayesh", purchaseDate: "2025-06-14", siteId: s1, qty: 450, unit: "cft", rate: 46, gstPct: 5, transport: 0, used: 450, status: "Out of Stock" },
      { name: "Laterite Stone", category: "Laterite", supplier: "Jayesh", purchaseDate: "2025-08-27", siteId: s1, qty: 2652, unit: "nos", rate: 56, gstPct: 5, transport: 1800, used: 2137, status: "In Stock" },
      { name: "Solid Block 20cm", category: "Solid Block", supplier: "Ummalathoor Blocks", purchaseDate: "2025-08-27", siteId: s1, qty: 420, unit: "nos", rate: 35, gstPct: 12, transport: 600, used: 330, status: "In Stock" },
      { name: "Cement (OPC 50kg)", category: "Cement", supplier: "Ramco Dealers", purchaseDate: "2025-07-18", siteId: s2, qty: 120, unit: "Bag", rate: 375, gstPct: 28, transport: 900, used: 112, status: "Low Stock" },
      { name: "TMT Steel Fe550", category: "Steel", supplier: "Kairali Steels", purchaseDate: "2025-07-02", siteId: s2, qty: 1074, unit: "Kg", rate: 66, gstPct: 18, transport: 1200, used: 1074, status: "Out of Stock" },
      { name: "Laterite Stone", category: "Laterite", supplier: "Local Quarry", purchaseDate: "2025-07-25", siteId: s2, qty: 2094, unit: "nos", rate: 56, gstPct: 5, transport: 1500, used: 1860, status: "In Stock" },
      { name: "Cement (PPC 50kg)", category: "Cement", supplier: "Ultratech Depot", purchaseDate: "2025-08-20", siteId: s3, qty: 420, unit: "Bag", rate: 372, gstPct: 28, transport: 2200, used: 401, status: "In Stock" },
      { name: "TMT Steel Fe550", category: "Steel", supplier: "Kairali Steels", purchaseDate: "2025-08-05", siteId: s3, qty: 7556, unit: "Kg", rate: 66, gstPct: 18, transport: 3600, used: 7100, status: "Low Stock" },
      { name: "M-Sand", category: "M-Sand", supplier: "Jayesh", purchaseDate: "2025-08-11", siteId: s3, qty: 1560, unit: "cft", rate: 56, gstPct: 5, transport: 0, used: 1490, status: "Low Stock" },
      { name: "Shuttering Rent", category: "Rent", supplier: "Calicut Scaffolds", purchaseDate: "2025-08-01", siteId: s3, qty: 2, unit: "month", rate: 8800, gstPct: 18, transport: 0, used: 2, status: "In Stock" },
    ]);

    await db.insert(users).values([
      { name: "Faheem", email: "faheem@frfdevelopers.com", role: "Admin" },
      { name: "Nachu", email: "nachu@frfdevelopers.com", role: "Engineer" },
      { name: "Raj", email: "raj@frfdevelopers.com", role: "Site Supervisor" },
      { name: "Rash", email: "rash@frfdevelopers.com", role: "Engineer" },
      { name: "Office Desk", email: "office@frfdevelopers.com", role: "Manager" },
      { name: "Auditor", email: "audit@frfdevelopers.com", role: "Viewer" },
    ]);

    await db.insert(tasks).values([
      { title: "Pour FF roof slab — Palazhi-1", siteId: s1, status: "inprogress", priority: "High", dueDate: "2026-07-08", assignee: "Nachu" },
      { title: "Order 200 bags cement", siteId: s1, status: "todo", priority: "High", dueDate: "2026-07-04", assignee: "Faheem" },
      { title: "Electrical conduiting GF", siteId: s2, status: "todo", priority: "Medium", dueDate: "2026-07-12", assignee: "Raj" },
      { title: "Plastering external walls", siteId: s3, status: "inprogress", priority: "Medium", dueDate: "2026-07-15", assignee: "Rash" },
      { title: "Settle boller supplier bill (Jayesh)", siteId: s1, status: "todo", priority: "High", dueDate: "2026-07-05", assignee: "Faheem" },
      { title: "Approve Palazhi-2 revised BOQ", siteId: s2, status: "todo", priority: "Low", dueDate: "2026-07-20", assignee: "Faheem" },
      { title: "Waterproofing sunshade FF", siteId: s1, status: "done", priority: "Medium", dueDate: "2026-06-25", assignee: "Nachu" },
      { title: "Site survey — new Parayencheri annex", siteId: s3, status: "todo", priority: "Medium", dueDate: "2026-07-18", assignee: "Rash" },
    ]);

    await db.insert(notifications).values([
      { title: "Budget alert — Parayencheri", body: "Executed expense crossed 35% of contract value this month.", kind: "warning" },
      { title: "Low stock: Cement (Palazhi-1)", body: "Only 25 bags remaining. Reorder before slab work.", kind: "danger" },
      { title: "New BOQ created", body: "Example BOQ drafted for the new site estimate.", kind: "info" },
      { title: "Pending daily update", body: "Palazhi-2 has no daily update logged today.", kind: "warning" },
      { title: "Steel fully consumed — Palazhi-2", body: "TMT Fe550 stock is exhausted on site.", kind: "danger" },
    ]);

    await db.insert(activities).values([
      { action: "Daily update added", detail: "Cement · 40 Bag @ ₹360 — Palazhi-1", actor: "Nachu" },
      { action: "BOQ updated", detail: "Nachu's BOQ — plastering quantity revised to 1599.47 SqM", actor: "Faheem" },
      { action: "Material received", detail: "Laterite 2652 nos from Jayesh — Palazhi-1", actor: "Nachu" },
      { action: "Labour logged", detail: "appijul, kamal, HASIL — GF below lintel", actor: "Nachu" },
      { action: "Expense recorded", detail: "Shuttering rent ₹8,800 — Parayencheri", actor: "Rash" },
      { action: "Task completed", detail: "Waterproofing sunshade FF — Palazhi-1", actor: "Nachu" },
    ]);
  })().finally(() => {
    // allow retry on failure
  });
  try {
    await seeding;
  } catch (e) {
    seeding = null;
    throw e;
  }
}
