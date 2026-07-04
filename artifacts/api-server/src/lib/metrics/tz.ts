import { sql } from "drizzle-orm";

/**
 * §1.5 global-rule helpers for metric query templates. Applied centrally so
 * individual templates can't forget them.
 *
 * Columns are zoneless `timestamp` (not `timestamptz`) storing facility-local
 * time (dictionary rule 1, zoneless note). Bucketing therefore uses plain
 * `date_trunc('<unit>', col)` (calendar-buckets in the column's native
 * facility-local representation). `now()` is timestamptz (UTC), so window
 * bounds convert it to facility-local via `now() AT TIME ZONE :tz` before
 * subtracting intervals — keeping zoneless-to-zoneless comparisons consistent.
 */

export const FACILITY_TIMEZONE = process.env.FACILITY_TIMEZONE ?? "America/New_York";

/** Cutover date for bad-trays source (dictionary rule 4). Phase 2a migration 0003. */
export const BAD_TRAYS_CUTOVER_DATE = process.env.BAD_TRAYS_CUTOVER_DATE ?? "2026-07-03";

/** Tables that carry a `deleted_at` soft-delete column (rule 2). */
const SOFT_DELETE_TABLES = new Set(["cycles", "shipments", "inventory_items"]);

/** "table.deleted_at IS NULL" if the table soft-deletes, else "TRUE". */
export function softDelete(table: string): string {
  return SOFT_DELETE_TABLES.has(table) ? `${table}.deleted_at IS NULL` : "TRUE";
}

/** date_trunc('<unit>', <colExpr>) — facility-local calendar bucket (rule 1). */
export function dateTrunc(unit: string, colExpr: string): string {
  return `date_trunc('${unit}', ${colExpr})`;
}

/** Facility-local "now" as a zoneless timestamp, for window bounds. */
export function facilityNow(): string {
  return `now() AT TIME ZONE '${FACILITY_TIMEZONE}'`;
}

/**
 * WHERE fragment restricting `<colExpr>` to the last `days` days (facility-local).
 * Returns "" for unbounded (all-time).
 */
export function rangeWindow(colExpr: string, range: string | undefined): string {
  const days = rangeToDays(range);
  if (days == null) return "";
  return `${colExpr} >= (${facilityNow()}) - interval '${days} days'`;
}

export function rangeToDays(range: string | undefined): number | null {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return null; // "all" / "custom" (custom not yet wired) → unbounded
  }
}

/** Combined WHERE: join fragments with AND, wrapping in parentheses. */
export function andWhere(...fragments: (string | undefined)[]): string {
  const parts = fragments.filter((f): f is string => !!f && f.length > 0);
  if (parts.length === 0) return "TRUE";
  return parts.map((p) => `(${p})`).join(" AND ");
}

/** Execute a raw SQL string via drizzle. */
export function execRaw(query: string) {
  return sql.raw(query);
}
