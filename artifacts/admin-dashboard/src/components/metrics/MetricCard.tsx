import React, { useMemo } from "react";
import { resolveRenderer, type MetricDataMap, type RendererProps } from "./renderers";
import { spanClass } from "./MetricGrid";
import { TierBMetricCard } from "./TierBMetricCard";
import type { MetricRange } from "./TimeRangeSelector";
import type { MetricDef } from "@workspace/metrics";

interface MetricCardProps {
  def: MetricDef;
  data: MetricDataMap;
  range: MetricRange;
}

/**
 * Wraps a metric renderer in the grid span. Tier-A metrics render from the
 * page's existing data hooks (renderer owns the full Card, preserving today's
 * pixels). Tier-B metrics (source: "metrics" + a query template) render via
 * TierBMetricCard, which fetches /api/metrics. ⓘ tooltips + CSV export arrive in M3.
 */
export function MetricCard({ def, data, range }: MetricCardProps) {
  if (def.source === "metrics" && def.template && def.templateParams) {
    return <div className={spanClass(def)}><TierBMetricCard def={def} range={range} /></div>;
  }

  const Renderer = useMemo(() => resolveRenderer(def), [def]);
  const props: RendererProps = { def, data };
  return <div className={spanClass(def)}><Renderer {...props} /></div>;
}
