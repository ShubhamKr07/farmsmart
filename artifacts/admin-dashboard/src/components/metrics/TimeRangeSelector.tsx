import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MetricRange = "7d" | "30d" | "90d" | "all";

const RANGES: { id: MetricRange; label: string }[] = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "all", label: "All" },
];

interface TimeRangeSelectorProps {
  range: MetricRange;
  onChange: (r: MetricRange) => void;
}

/** Per-tab time-range selector; feeds the `range` param to /api/metrics. */
export function TimeRangeSelector({ range, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5">
      <CalendarRange className="h-4 w-4 mx-1.5 text-muted-foreground" />
      {RANGES.map((r) => (
        <Button
          key={r.id}
          variant={range === r.id ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(r.id)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
