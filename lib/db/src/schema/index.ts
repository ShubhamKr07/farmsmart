import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const growthProfilesTable = pgTable("growth_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  seedName: text("seed_name").notNull(),
  germinationDays: integer("germination_days").notNull(),
  fertigationDays: integer("fertigation_days").notNull(),
});

export const seedLotsTable = pgTable("seed_lots", {
  id: serial("id").primaryKey(),
  qrCode: text("qr_code").notNull().unique(),
  seedName: text("seed_name").notNull(),
});

export const cyclesTable = pgTable("cycles", {
  id: serial("id").primaryKey(),
  shortId: text("short_id").notNull().unique(),
  seedLotQrCodes: text("seed_lot_qr_codes").array().notNull(),
  seedName: text("seed_name").notNull(),
  fullTrays: integer("full_trays").notNull().default(0),
  halfTrays: integer("half_trays").notNull().default(0),
  seedWeightTray: numeric("seed_weight_tray").notNull(),
  growthProfileId: integer("growth_profile_id").notNull(),
  seedingDate: text("seeding_date").notNull(),
  status: text("status").notNull().default("germination"),
  trayPosition: text("tray_position"),
  germinationStartedAt: timestamp("germination_started_at"),
  fertigationStartedAt: timestamp("fertigation_started_at"),
  harvestStartedAt: timestamp("harvest_started_at"),
  harvestedQty: numeric("harvested_qty"),
  closedAt: timestamp("closed_at"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const manualChecksTable = pgTable("manual_checks", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  fullTrays: integer("full_trays").notNull().default(0),
  halfTrays: integer("half_trays").notNull().default(0),
  isBadTrays: boolean("is_bad_trays").notNull().default(false),
  issue: text("issue"),
  notes: text("notes"),
  photoUrls: text("photo_urls").array().notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
