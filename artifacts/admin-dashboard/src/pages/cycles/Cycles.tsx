import React, { useState } from "react";
import { useListCycles } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table";
import { QueryError } from "@/components/ui/query-error";
import { formatDate } from "@/lib/format";
import { Factory, Sprout, Droplets, Scissors } from "lucide-react";

interface CycleRow {
  id: number;
  shortId: string;
  seedName: string;
  status: string;
  trayPosition: string | null | undefined;
  fullTrays: number;
  halfTrays: number;
  seedingDate: string;
  daysOverdueFertigation?: number | null;
  daysOverdueHarvest?: number | null;
}

const STAGE_META: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  germination: { label: "Germination", badge: "bg-status-ok/10 text-status-ok border-status-ok/20", icon: <Sprout className="h-3 w-3" /> },
  fertigation: { label: "Fertigation", badge: "bg-primary/10 text-primary border-primary/20", icon: <Droplets className="h-3 w-3" /> },
  harvest: { label: "Harvest Ready", badge: "bg-status-warn/10 text-status-warn border-status-warn/20", icon: <Scissors className="h-3 w-3" /> },
};

type StageFilter = "all" | "germination" | "fertigation" | "harvest";

function StageBadge({ status }: { status: string }) {
  const meta = STAGE_META[status];
  if (!meta) return <Badge variant="outline">{status}</Badge>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.badge}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

export function Cycles() {
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const { data: cycles, isLoading, isError, refetch } = useListCycles({ status: "ongoing" });

  const all = (cycles || []) as unknown as CycleRow[];
  const counts = {
    germination: all.filter((c) => c.status === "germination").length,
    fertigation: all.filter((c) => c.status === "fertigation").length,
    harvest: all.filter((c) => c.status === "harvest").length,
  };
  const filtered = stageFilter === "all" ? all : all.filter((c) => c.status === stageFilter);

  const columns: Column<CycleRow>[] = [
    {
      key: "shortId",
      header: "ID",
      accessor: (c) => c.shortId,
      sortable: true,
      cell: (c) => <span className="font-mono text-xs text-muted-foreground">#{c.shortId}</span>,
    },
    {
      key: "seedName",
      header: "Crop",
      accessor: (c) => c.seedName,
      sortable: true,
      cell: (c) => <span className="font-medium">{c.seedName}</span>,
    },
    {
      key: "status",
      header: "Stage",
      accessor: (c) => c.status,
      sortable: true,
      cell: (c) => <StageBadge status={c.status} />,
    },
    {
      key: "trayPosition",
      header: "Position",
      accessor: (c) => c.trayPosition ?? "",
      cell: (c) => <span className="text-muted-foreground">{c.trayPosition || "—"}</span>,
    },
    {
      key: "trays",
      header: "Trays",
      accessor: (c) => c.fullTrays + c.halfTrays,
      sortable: true,
      align: "right",
      cell: (c) => c.fullTrays + c.halfTrays,
    },
    {
      key: "seedingDate",
      header: "Seeded",
      accessor: (c) => c.seedingDate,
      sortable: true,
      align: "right",
      cell: (c) => <span className="text-muted-foreground">{formatDate(c.seedingDate)}</span>,
    },
    {
      key: "overdue",
      header: "Overdue",
      accessor: (c) => Math.max(c.daysOverdueFertigation ?? 0, c.daysOverdueHarvest ?? 0),
      sortable: true,
      align: "right",
      cell: (c) => {
        const overdue = Math.max(c.daysOverdueFertigation ?? 0, c.daysOverdueHarvest ?? 0);
        return overdue > 0 ? (
          <span className="text-destructive font-semibold">{overdue}d</span>
        ) : (
          <span className="text-muted-foreground text-xs">On schedule</span>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-muted p-2.5 rounded-lg">
          <Factory className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grow Cycles</h1>
          <p className="text-sm text-muted-foreground">{all.length} cycles currently running.</p>
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "germination", "fertigation", "harvest"] as StageFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStageFilter(f)}
            className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
              stageFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? `All (${all.length})` : `${STAGE_META[f]?.label} (${counts[f]})`}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        errorResource="cycles"
        searchFn={(c, t) => c.seedName.toLowerCase().includes(t) || c.shortId.toLowerCase().includes(t)}
        searchPlaceholder="Filter by crop or ID…"
        emptyState="No cycles in this stage."
        caption="Active grow cycles"
      />
    </div>
  );
}
