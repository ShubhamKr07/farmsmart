/**
 * CSV export for table/list metric cards. Only tabular data is exportable —
 * charts (bar/line/area/donut/scatter/heatmap) and scalar KPIs have no
 * meaningful row export, so callers should gate on render type before using
 * this (see isExportableRender).
 */
import type { MetricDef, MetricRender } from "@workspace/metrics";

const EXPORTABLE_RENDERS: MetricRender[] = ["table", "list"];

export function isExportableRender(render: MetricRender): boolean {
  return EXPORTABLE_RENDERS.includes(render);
}

export function toCsv(label: string, unit: string | undefined, rows: Record<string, unknown>[]): string {
  if (!Array.isArray(rows) || rows.length === 0) return "no data\n";
  const cols = Object.keys(rows[0]!);
  const header = cols.map((c) => (c === "value" && unit ? `value (${unit})` : c)).join(",");
  const body = rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, label: string, unit: string | undefined, rows: Record<string, unknown>[]) {
  const csv = toCsv(label, unit, rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
