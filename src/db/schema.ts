import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  engineer: text("engineer").notNull(),
  client: text("client").default(""),
  location: text("location").default(""),
  status: text("status").notNull().default("Active"),
  startDate: text("start_date"),
  targetDate: text("target_date"),
  budget: doublePrecision("budget").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  notes: text("notes").default(""),
  color: text("color").default("#2563eb"),
});

export const boqs = pgTable("boqs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  siteId: integer("site_id").notNull(),
  status: text("status").notNull().default("Active"),
  date: text("date"),
  createdBy: text("created_by").default("Faheem"),
  notes: text("notes").default(""),
  archived: boolean("archived").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const boqItems = pgTable("boq_items", {
  id: serial("id").primaryKey(),
  boqId: integer("boq_id").notNull(),
  sl: integer("sl").notNull(),
  category: text("category").notNull().default("General"),
  description: text("description").notNull(),
  unit: text("unit").notNull().default("Cum"),
  qty: doublePrecision("qty").notNull().default(0),
  rate: doublePrecision("rate").notNull().default(0),
  actualCost: doublePrecision("actual_cost"),
  overheadPct: doublePrecision("overhead_pct").notNull().default(10),
  progress: integer("progress").notNull().default(0),
  remarks: text("remarks").default(""),
});

export const dailyEntries = pgTable("daily_entries", {
  id: serial("id").primaryKey(),
  entryDate: text("entry_date"),
  dateRaw: text("date_raw"),
  siteId: integer("site_id").notNull(),
  category: text("category").notNull(),
  name: text("name").notNull().default(""),
  head: text("head").notNull().default(""),
  qty: doublePrecision("qty").notNull().default(0),
  rate: doublePrecision("rate").notNull().default(0),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  supplier: text("supplier").default(""),
  purchaseDate: text("purchase_date"),
  siteId: integer("site_id").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  unit: text("unit").notNull().default("nos"),
  rate: doublePrecision("rate").notNull().default(0),
  gstPct: doublePrecision("gst_pct").notNull().default(0),
  transport: doublePrecision("transport").notNull().default(0),
  used: doublePrecision("used").notNull().default(0),
  status: text("status").notNull().default("In Stock"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  siteId: integer("site_id"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("Medium"),
  dueDate: text("due_date"),
  assignee: text("assignee").default(""),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("Viewer"),
  active: boolean("active").notNull().default(true),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  detail: text("detail").default(""),
  actor: text("actor").default("Faheem"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").default(""),
  kind: text("kind").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
