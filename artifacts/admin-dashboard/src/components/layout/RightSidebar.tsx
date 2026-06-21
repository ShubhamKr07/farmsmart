import React from "react";
import { useGetDashboard, useListAlerts } from "@workspace/api-client-react";
import { AlertCircle, CheckCircle2, Activity, Droplets, Thermometer, Wind } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePanel } from "@/context/PanelContext";

export function RightSidebar() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetDashboard();
  const { data: alerts, isLoading: isLoadingAlerts } = useListAlerts({ status: "current", limit: 2 });
  const { open } = usePanel();

  return (
    <aside className="w-[280px] border-l bg-background hidden xl:flex flex-col flex-shrink-0 min-h-[100dvh]">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          System Status
        </h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4 border-b">
        {isLoadingDashboard ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sensors</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {dashboard?.sensorStatus?.sensorsOnline} / {dashboard?.sensorStatus?.sensorsTotal} Online
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Card className="shadow-none border-border/50 bg-muted/30">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                  <Droplets className="h-4 w-4 text-blue-500 mb-1" />
                  <span className="text-xs text-muted-foreground">pH</span>
                  <span className="font-semibold text-sm">{dashboard?.sensorStatus?.acidityPh}</span>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border/50 bg-muted/30">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                  <Droplets className="h-4 w-4 text-cyan-500 mb-1" />
                  <span className="text-xs text-muted-foreground">Water</span>
                  <span className="font-semibold text-sm">{dashboard?.sensorStatus?.waterLevelPct}%</span>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border/50 bg-muted/30">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                  <Thermometer className="h-4 w-4 text-orange-500 mb-1" />
                  <span className="text-xs text-muted-foreground">Temp</span>
                  <span className="font-semibold text-sm">{dashboard?.sensorStatus?.tempCelsius}°C</span>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border/50 bg-muted/30">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                  <Wind className="h-4 w-4 text-slate-500 mb-1" />
                  <span className="text-xs text-muted-foreground">Humidity</span>
                  <span className="font-semibold text-sm">{dashboard?.sensorStatus?.humidityPct}%</span>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Recent Alerts
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {isLoadingAlerts ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : alerts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mb-2 text-primary/40" />
              <p className="text-sm">No active alerts</p>
            </div>
          ) : (
            alerts?.map(alert => (
              <Card
                key={alert.id}
                className="shadow-none border-border/50 cursor-pointer hover:border-destructive/40 transition-colors"
                onClick={() => open("alerts")}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.severity === 'critical' ? 'bg-destructive' : 'bg-orange-500'}`} />
                    <div>
                      <h4 className="text-sm font-semibold leading-tight">{alert.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase">{alert.location || 'System'}</span>
                    <span className="text-[10px] text-primary">View all →</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
