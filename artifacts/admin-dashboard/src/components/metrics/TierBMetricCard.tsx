import React from "react";
import { useListMetrics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatNumber } from "@/lib/format";
import type { MetricDef } from "@workspace/metrics";
import type { MetricRange } from "./TimeRangeSelector";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
};
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface SeriesPoint { label: string; value: number }

interface TierBMetricCardProps {
  def: MetricDef;
  range: MetricRange;
}

/**
 * Tier-B metric card: fetches its value from /api/metrics (one React Query per
 * card, scoped by id+range) and renders per the metric's `render` type.
 */
export function TierBMetricCard({ def, range }: TierBMetricCardProps) {
  const { data, isLoading, isError } = useListMetrics({
    tab: def.tab,
    keys: def.id,
    range,
  });

  const payload = data?.[def.id];

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {def.label}{def.unit && def.unit !== "count" ? ` (${def.unit})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[120px] w-full" />
        ) : isError || (payload && typeof payload === "object" && "error" in payload) ? (
          <Empty className="h-[120px]">Unable to load metric</Empty>
        ) : (
          <Body def={def} payload={payload} />
        )}
      </CardContent>
    </Card>
  );
}

function Body({ def, payload }: { def: MetricDef; payload: unknown }) {
  switch (def.render) {
    case "kpi":
    case "stat":
    case "gauge": {
      const v = (payload as { value?: number } | undefined)?.value ?? 0;
      const display = def.unit === "USD" ? `$${formatNumber(v)}` : def.unit === "%" ? `${formatNumber(v)}%` : def.unit === "USD/kg" ? `$${formatNumber(v)}/kg` : formatNumber(v);
      return <div className="text-2xl font-bold">{display}</div>;
    }
    case "area":
    case "bar":
    case "line": {
      const rows = (payload as SeriesPoint[] | undefined) ?? [];
      if (rows.length === 0) return <Empty className="h-[180px]">No data</Empty>;
      return <SeriesChart def={def} rows={rows} />;
    }
    case "donut": {
      const rows = (payload as SeriesPoint[] | undefined) ?? [];
      if (rows.length === 0) return <Empty className="h-[180px]">No data</Empty>;
      return <Donut rows={rows} />;
    }
    case "hbar": {
      const rows = (payload as SeriesPoint[] | undefined) ?? [];
      if (rows.length === 0) return <Empty className="h-[180px]">No data</Empty>;
      return <HBar rows={rows} />;
    }
    case "table": {
      const rows = (payload as Record<string, unknown>[] | undefined) ?? [];
      if (rows.length === 0) return <Empty className="h-[180px]">No rows</Empty>;
      return <Table rows={rows} />;
    }
    default:
      return <Empty className="h-[120px]">Unsupported render type</Empty>;
  }
}

function SeriesChart({ def, rows }: { def: MetricDef; rows: SeriesPoint[] }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        {def.render === "bar" ? (
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dx={-8} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : def.render === "line" ? (
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dx={-8} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <AreaChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dx={-8} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.15} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function Donut({ rows }: { rows: SeriesPoint[] }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HBar({ rows }: { rows: SeriesPoint[] }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={rows}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={90} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Table({ rows }: { rows: Record<string, unknown>[] }) {
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  return (
    <div className="overflow-x-auto rounded-md border max-h-[240px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
          <tr>{cols.map((c) => <th key={c} className="p-2 text-left">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => <td key={c} className="p-2">{String(r[c] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
