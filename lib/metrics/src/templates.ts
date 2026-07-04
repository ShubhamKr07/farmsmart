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

export type TemplateName = "scalarAgg" | "groupBy" | "timeBucket" | "ratio" | "table";

export interface TemplateParamsMap {
  scalarAgg: ScalarAggParams;
  groupBy: GroupByParams;
  timeBucket: TimeBucketParams;
  ratio: RatioParams;
  table: TableParams;
}
