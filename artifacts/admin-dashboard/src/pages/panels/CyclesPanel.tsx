import React, { useState } from "react";
import { useListCycles } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { Factory, Sprout, Droplets, Scissors } from "lucide-react";
import { QueryError } from "@/components/ui/query-error";

const STAGE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  germination: { label: "Germination", color: "bg-status-ok/10 text-status-ok border-status-ok/20", icon: <Sprout className="h-3 w-3" /> },
  fertigation: { label: "Fertigation", color: "bg-primary/10 text-primary border-primary/20", icon: <Droplets className="h-3 w-3" /> },
  harvest:     { label: "Harvest Ready", color: "bg-status-warn/10 text-status-warn border-status-warn/20", icon: <Scissors className="h-3 w-3" /> },
};

type StageFilter = "all" | "germination" | "fertigation" | "harvest";

export function CyclesPanel() {
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const { data: cycles, isLoading, isError, refetch } = useListCycles({ status: "ongoing" });

  const filtered = (cycles || []).filter(
    (c) => stageFilter === "all" || c.status === stageFilter
  );

  const counts = {
    germination: (cycles || []).filter((c) => c.status === "germination").length,
    fertigation: (cycles || []).filter((c) => c.status === "fertigation").length,
    harvest: (cycles || []).filter((c) => c.status === "harvest").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Factory className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">Active Cycles</h2>
          <p className="text-sm text-muted-foreground">{(cycles || []).length} grow cycles currently running</p>
        </div>
      </div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["germination", "fertigation", "harvest"] as const).map((stage) => {
          const meta = STAGE_META[stage];
          return (
            <button
              key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
              className={`text-left p-3 rounded-lg border transition-all ${
                stageFilter === stage
                  ? "ring-2 ring-primary border-primary/40 bg-primary/5"
                  : "bg-card hover:bg-muted/50 border-border"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-muted-foreground">
                {meta.icon}
                {meta.label}
              </div>
              <div className="text-2xl font-bold">{counts[stage]}</div>
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 text-sm">
        {(["all", "germination", "fertigation", "harvest"] as StageFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStageFilter(f)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              stageFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All Stages" : STAGE_META[f]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : isError ? (
        <QueryError resource="cycles" onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Factory className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No cycles in this stage</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Crop</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Trays</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Seeded</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((cycle) => {
                const meta = STAGE_META[cycle.status];
                const totalTrays = cycle.fullTrays + cycle.halfTrays;
                const isOverdue =
                  (cycle.daysOverdueFertigation ?? 0) > 0 ||
                  (cycle.daysOverdueHarvest ?? 0) > 0;
                const overdueDays =
                  Math.max(cycle.daysOverdueFertigation ?? 0, cycle.daysOverdueHarvest ?? 0);
                return (
                  <tr key={cycle.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{cycle.shortId}
                    </td>
                    <td className="px-4 py-3 font-medium">{cycle.seedName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta?.color}`}>
                        {meta?.icon}{meta?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cycle.trayPosition || "—"}</td>
                    <td className="px-4 py-3 text-right">{totalTrays}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(cycle.seedingDate)}</td>
                    <td className="px-4 py-3 text-right">
                      {isOverdue ? (
                        <span className="text-destructive font-semibold">{overdueDays}d</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">On schedule</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
