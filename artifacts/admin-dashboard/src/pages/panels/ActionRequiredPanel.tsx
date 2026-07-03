import React from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Scissors, Droplets, AlertTriangle, CheckCircle2 } from "lucide-react";
import { QueryError } from "@/components/ui/query-error";

export function ActionRequiredPanel() {
  const { data: dashboard, isLoading, isError, refetch } = useGetDashboard();
  const items = dashboard?.actionRequired || [];

  const harvests = items.filter((i) => i.type === "harvest");
  const fertigations = items.filter((i) => i.type === "fertigation");
  const criticalCount = items.filter((i) => i.daysOverdue >= 3).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">Cycles Needing Action</h2>
          <p className="text-sm text-muted-foreground">{items.length} cycles overdue for transition or harvest</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive" /> Critical
          </p>
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">≥ 3 days overdue</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Scissors className="h-3 w-3 text-status-warn" /> Harvest
          </p>
          <p className="text-2xl font-bold">{harvests.length}</p>
          <p className="text-xs text-muted-foreground">ready to cut</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Droplets className="h-3 w-3 text-primary" /> Fertigation
          </p>
          <p className="text-2xl font-bold">{fertigations.length}</p>
          <p className="text-xs text-muted-foreground">transition needed</p>
        </div>
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : isError ? (
        <QueryError resource="action-required cycles" onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-3 text-primary/40" />
          <p className="font-medium">All cycles on schedule</p>
          <p className="text-sm mt-1">No overdue transitions or harvests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isCritical = item.daysOverdue >= 3;
            const isHarvest = item.type === "harvest";
            return (
              <div
                key={item.cycleId}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isCritical ? "border-destructive/40 bg-destructive/5" : "border-status-warn/30 bg-status-warn/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${isCritical ? "bg-destructive/10" : "bg-status-warn/10"}`}>
                    {isHarvest
                      ? <Scissors className={`h-4 w-4 ${isCritical ? "text-destructive" : "text-status-warn"}`} />
                      : <Droplets className={`h-4 w-4 ${isCritical ? "text-destructive" : "text-status-warn"}`} />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.seedName}</span>
                      <span className="font-mono text-xs text-muted-foreground">#{item.cycleShortId}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isHarvest ? "Ready for harvest" : "Ready for fertigation transition"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={isCritical ? "destructive" : "secondary"}>
                    {isHarvest ? "Harvest" : "Fertigation"}
                  </Badge>
                  <span className={`text-sm font-bold ${isCritical ? "text-destructive" : "text-status-warn"}`}>
                    {item.daysOverdue}d overdue
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
