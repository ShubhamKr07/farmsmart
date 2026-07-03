import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  real,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const cycleStatusEnum = pgEnum("cycle_status", [
  "germination",
  "fertigation",
  "harvest",
  "completed",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical",
  "warning",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "current",
  "resolved",
  "dismissed",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "in_progress",
  "complete",
  "pending",
]);

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
  supplier: text("supplier"),
  productLink: text("product_link"),
  itemNumber: text("item_number"),
  vendorShort: text("vendor_short"),
  gpcCode: text("gpc_code"),
  type: text("type"),
  success: text("success"),
  growTime: text("grow_time"),
  usedIn: text("used_in"),
  currentlyGrown: boolean("currently_grown"),
});

export const cyclesTable = pgTable(
  "cycles",
  {
    id: serial("id").primaryKey(),
    shortId: text("short_id").notNull().unique(),
    seedLotQrCodes: text("seed_lot_qr_codes").array().notNull(),
    seedName: text("seed_name").notNull(),
    fullTrays: integer("full_trays").notNull().default(0),
    halfTrays: integer("half_trays").notNull().default(0),
    seedWeightTray: numeric("seed_weight_tray").notNull(),
    growthProfileId: integer("growth_profile_id")
      .notNull()
      .references(() => growthProfilesTable.id),
    seedingDate: text("seeding_date").notNull(),
    status: cycleStatusEnum("status").notNull().default("germination"),
    trayPosition: text("tray_position"),
    germinationStartedAt: timestamp("germination_started_at"),
    fertigationStartedAt: timestamp("fertigation_started_at"),
    harvestStartedAt: timestamp("harvest_started_at"),
    harvestedQty: numeric("harvested_qty"),
    closedAt: timestamp("closed_at"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cycles_status_idx").on(table.status),
    index("cycles_closed_at_idx").on(table.closedAt),
    index("cycles_created_at_idx").on(table.createdAt),
    check("cycles_full_trays_nonneg", sql`${table.fullTrays} >= 0`),
    check("cycles_half_trays_nonneg", sql`${table.halfTrays} >= 0`),
  ],
);

export const manualChecksTable = pgTable(
  "manual_checks",
  {
    id: serial("id").primaryKey(),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cyclesTable.id, { onDelete: "restrict" }),
    fullTrays: integer("full_trays").notNull().default(0),
    halfTrays: integer("half_trays").notNull().default(0),
    isBadTrays: boolean("is_bad_trays").notNull().default(false),
    issue: text("issue"),
    notes: text("notes"),
    photoUrls: text("photo_urls").array().notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("manual_checks_created_at_idx").on(table.createdAt),
    index("manual_checks_cycle_id_idx").on(table.cycleId),
  ],
);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  severity: alertSeverityEnum("severity").notNull().default("warning"),
  status: alertStatusEnum("status").notNull().default("current"),
  actionType: text("action_type"),
  actionNotes: text("action_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
},
  (table) => [
    index("alerts_status_idx").on(table.status),
    uniqueIndex("alerts_current_title_location_uniq")
      .on(table.title, table.location)
      .where(sql`${table.status} = 'current'`),
  ],
);

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category"),
  qrCode: text("qr_code"),
  currentQty: numeric("current_qty").notNull().default("0"),
  maxQty: numeric("max_qty").notNull().default("0"),
  unit: text("unit").notNull().default("g"),
  arrivalDate: text("arrival_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
},
  (table) => [
    index("inventory_category_idx").on(table.category),
    check("inventory_qty_range", sql`${table.currentQty} <= ${table.maxQty}`),
  ],
);

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  shortId: text("short_id").notNull().unique(),
  client: text("client").notNull(),
  productDescription: text("product_description"),
  yieldSoldKg: numeric("yield_sold_kg"),
  revenueUsd: numeric("revenue_usd"),
  shippingDate: text("shipping_date"),
  status: shipmentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
},
  (table) => [
    index("shipments_status_idx").on(table.status),
    index("shipments_shipping_date_idx").on(table.shippingDate),
  ],
);

export const roomNameEnum = pgEnum("room_name", [
  "seeding",
  "fertigation",
  "harvesting",
]);

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: roomNameEnum("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const channelsTable = pgTable("channels", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => roomsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  positionIndex: integer("position_index").notNull().default(0),
  monitoringApiTemp: text("monitoring_api_temp"),
  monitoringApiWaterLevel: text("monitoring_api_water_level"),
  monitoringApiPh: text("monitoring_api_ph"),
});

export const racksTable = pgTable("racks", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channelsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  positionIndex: integer("position_index").notNull().default(0),
});

export const traysTable = pgTable("trays", {
  id: serial("id").primaryKey(),
  rackId: integer("rack_id")
    .notNull()
    .references(() => racksTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  positionIndex: integer("position_index").notNull().default(0),
});

export const sensorStatusTable = pgTable("sensor_status", {
  id: serial("id").primaryKey(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  sensorsOnline: integer("sensors_online"),
  sensorsTotal: integer("sensors_total"),
  acidityPh: real("acidity_ph"),
  waterLevelPct: real("water_level_pct"),
  tempCelsius: real("temp_celsius"),
  humidityPct: real("humidity_pct"),
  nutrientMix: text("nutrient_mix"),
});
