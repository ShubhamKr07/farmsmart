import type { MetricDef, MetricTab } from "./types";
import { OVERVIEW_METRICS } from "./registry-overview";
import { SHIPMENTS_METRICS } from "./registry-shipments";
import { INVENTORY_METRICS } from "./registry-inventory";

/** Flat catalog — every metric across all tabs. */
export const METRICS: MetricDef[] = [
  ...OVERVIEW_METRICS,
  ...SHIPMENTS_METRICS,
  ...INVENTORY_METRICS,
];

export const METRICS_BY_ID: ReadonlyMap<string, MetricDef> = new Map(
  METRICS.map((m) => [m.id, m]),
);

export const METRICS_BY_TAB: Record<MetricTab, MetricDef[]> = {
  overview: OVERVIEW_METRICS,
  shipments: SHIPMENTS_METRICS,
  inventory: INVENTORY_METRICS,
};

export function getMetricDef(id: string): MetricDef | undefined {
  return METRICS_BY_ID.get(id);
}

export function metricsForTab(tab: MetricTab): MetricDef[] {
  return METRICS_BY_TAB[tab] ?? [];
}

/** Default-selected metric ids for a tab (reproduces today's widgets in M1). */
export function defaultKeysForTab(tab: MetricTab): string[] {
  return metricsForTab(tab)
    .filter((m) => m.defaultSelected)
    .map((m) => m.id);
}

/**
 * Tier-A metric ids for a tab — derivable from existing list/dashboard payloads,
 * visible in the M1 picker. Tier-B (`source: "metrics"`) entries are hidden
 * until the `/api/metrics` endpoint ships in M2.
 */
export function tierAKeysForTab(tab: MetricTab): string[] {
  return metricsForTab(tab)
    .filter((m) => m.source !== "metrics")
    .map((m) => m.id);
}
