import React from "react";
import type { MetricDef, MetricRender } from "@workspace/metrics";

/**
 * Default lg (4-col) span by render type. KPIs/stat/gauge/progress span 1;
 * charts and tables span 2; overridden by `MetricDef.span` when set.
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

export function spanClass(def: MetricDef): string {
  const span = def.span ?? defaultSpan(def.render);
  return `lg:col-span-${span} md:col-span-${Math.min(span, 2)}`;
}

interface MetricGridProps {
  children: React.ReactNode;
}

/**
 * Responsive metric grid: 1 col (sm) / 2 (md) / 4 (lg). Cards carry their own
 * `lg:col-span-*` class (via `spanClass`) so KPIs and charts size differently.
 */
export function MetricGrid({ children }: MetricGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
