import React from "react";
import type { MetricDef, MetricRender } from "@workspace/metrics";

/**
 * Default column span (out of a 4-col grid) by render type. KPIs/stat/gauge/
 * progress span 1; charts and tables span 2; overridden by `MetricDef.span`.
 */
function defaultSpan(render: MetricRender): 1 | 2 | 4 {
  switch (render) {
    case "kpi":
    case "stat":
    case "gauge":
    case "progress":
      return 1;
    default:
      return 2;
  }
}

export function cardSpan(def: MetricDef): 1 | 2 | 4 {
  return def.span ?? defaultSpan(def.render);
}

/** @deprecated use `cardSpan` + inline `gridColumn` style (see DraggableMetricGrid). */
export function spanClass(def: MetricDef): string {
  const span = cardSpan(def);
  return `lg:col-span-${span} md:col-span-${Math.min(span, 2)}`;
}

interface MetricGridProps {
  children: React.ReactNode;
}

/**
 * Responsive metric grid: 1 col (sm) / 2 (md) / 4 (lg). Cards carry their own
 * `lg:col-span-*` class (via `spanClass`) so KPIs and charts size differently.
 * Prefer DraggableMetricGrid (auto-fill + dense packing, no wasted space) for
 * new usage — this fixed-column variant is kept for any non-tab consumer.
 */
export function MetricGrid({ children }: MetricGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
