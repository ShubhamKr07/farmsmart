/**
 * Query-template param shapes. The runtime SQL lives in the API server
 * (artifacts/api-server/src/lib/metrics/templates/*); these shared types keep
 * the registry's `templateParams` typed and document each shape.
 *
 * All `table`/`measure`/`dim`/`dateCol`/`where` values come from the registry
 * (trusted, authored by us — never user input). User input is limited to the
 * `range` query param (7d/30d/90d/custom), which is parameterized server-side.
 */

export interface ScalarAggParams {
  table: string;
  /** SQL measure expression, e.g. "harvested_qty" or "full_trays+half_trays*0.5". */
  measure: string;
  agg?: "sum" | "count" | "avg" | "min" | "max";
  /** Optional WHERE fragment (trusted SQL). */
  where?: string;
  /** Optional join fragment (trusted SQL), e.g. "cycles c ON c.id = shipments.cycle_id". */
  join?: string;
}

export interface GroupByParams {
  table: string;
  measure: string;
  /** Grouping column/expr, e.g. "status", "crop_id". */
  dim: string;
  agg?: "sum" | "count" | "avg";
  where?: string;
  order?: "asc" | "desc";
  limit?: number;
  /** Optional join fragment (trusted SQL). */
  join?: string;
}

export interface TimeBucketParams {
  table: string;
  measure: string;
  dateCol: string;
  bucket: "hour" | "day" | "week" | "month";
  where?: string;
  /** For sensor_readings: filter sensors.type (temp/ph/water/humidity/ec). */
  sensorType?: string;
}

export interface RatioParams {
  numTable: string;
  numMeasure: string;
  denTable: string;
  denMeasure: string;
  numWhere?: string;
  denWhere?: string;
  /** If set, group by this dim → {label,value}[] (e.g. pricePerKgByClient). */
  dim?: string;
  window?: "7d" | "30d" | "90d" | "range" | "all";
}

export interface TableParams {
  table: string;
  /** Comma-separated columns to select. */
  cols: string;
  where?: string;
  /** Optional join fragments (trusted SQL). */
  join?: string;
  order?: "asc" | "desc";
  limit?: number;
}

/**
 * Escape hatch for metrics whose SQL doesn't fit the 5 generic shapes
 * (multi-CTE queries, window functions, correlated subqueries). `key` selects
 * a hand-written query function in api-server/src/lib/metrics/custom.ts,
 * keyed by metric id — not free-form SQL from the registry.
 */
export interface CustomParams {
  key: string;
}

/**
 * QuickBooks Online Reports/Query API dispatch. `key` selects a hand-written
 * fetcher in api-server/src/lib/metrics/quickbooks-reports.ts, keyed by
 * metric id — mirrors CustomParams but calls the QBO API instead of Postgres.
 * Every accounting-tab metric uses this template.
 */
export interface QuickbooksParams {
  key: string;
}

export type TemplateName =
  | "scalarAgg"
  | "groupBy"
  | "timeBucket"
  | "ratio"
  | "table"
  | "custom"
  | "quickbooks";

export interface TemplateParamsMap {
  scalarAgg: ScalarAggParams;
  groupBy: GroupByParams;
  timeBucket: TimeBucketParams;
  ratio: RatioParams;
  table: TableParams;
  custom: CustomParams;
  quickbooks: QuickbooksParams;
}
