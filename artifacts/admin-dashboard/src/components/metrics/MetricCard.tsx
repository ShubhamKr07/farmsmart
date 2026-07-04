import React, { useMemo } from "react";
import { resolveRenderer, type MetricDataMap, type RendererProps } from "./renderers";
import { spanClass } from "./MetricGrid";
import type { MetricDef } from "@workspace/metrics";

interface MetricCardProps {
  def: MetricDef;
  data: MetricDataMap;
}

/**
 * Wraps a metric renderer in the grid span. The renderer owns the full Card
 * (so default widgets keep today's exact pixels incl. testids + panel clicks).
 * ⓘ definition tooltips + CSV export arrive in M3.
 */
export function MetricCard({ def, data }: MetricCardProps) {
  const Renderer = useMemo(() => resolveRenderer(def), [def]);
  const props: RendererProps = { def, data };
  return <div className={spanClass(def)}><Renderer {...props} /></div>;
}
