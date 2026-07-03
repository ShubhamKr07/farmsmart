import React from "react";
import { useGetDashboard, useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend, LineChart, Line
} from "recharts";
import { formatNumber } from "@/lib/format";
import {
  Sprout, Layers, Factory, AlertTriangle,
  TrendingUp, Leaf, Package, ArrowUp, ArrowDown
} from "lucide-react";
import { usePanel } from "@/context/PanelContext";
import { QueryError } from "@/components/ui/query-error";
import { a11yClick } from "@/lib/utils";

export function Overview() {
  const { data: dashboard, isLoading, isError, refetch } = useGetDashboard();
  const { data: alerts } = useListAlerts({ status: "current", limit: 3 });
  const { open } = usePanel();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <QueryError resource="the dashboard" onRetry={() => refetch()} />
      </div>
    );
  }

  const running = dashboard?.totalRunningCycles || 0;
  const total = dashboard?.totalChannels ?? 0;
  const utilPct = ((dashboard?.channelUtilization || 0) * 100).toFixed(1);

  const yieldByDayData = dashboard?.yieldByDay || [];
  const seedingByDayData = dashboard?.seedingByDay || [];
  const badTrayByDayData = dashboard?.badTrayByDay || [];
  const yieldByWeekData = dashboard?.yieldByWeek || [];
  const lastYw = yieldByWeekData[yieldByWeekData.length - 1]?.value ?? 0;
  const prevYw = yieldByWeekData[yieldByWeekData.length - 2]?.value ?? 0;
  const yieldDeltaPct = prevYw > 0 ? ((lastYw - prevYw) / prevYw) * 100 : null;

  const combinedDayData = yieldByDayData.map((d, i) => ({
    label: d.label,
    yield: d.value,
    seeding: seedingByDayData[i]?.value || 0,
    badTrays: badTrayByDayData[i]?.value || 0,
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Yield (Week)</CardTitle>
            <Sprout className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-yield-week">
              {formatNumber(dashboard?.totalYieldThisWeek || 0)} kg
            </div>
            {yieldDeltaPct != null ? (
              <p className={`text-xs mt-1 flex items-center gap-1 ${yieldDeltaPct >= 0 ? "text-status-ok" : "text-status-warn"}`}>
                {yieldDeltaPct >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(yieldDeltaPct).toFixed(0)}% vs last week
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(dashboard?.totalYieldThisMonth || 0)} kg this month
              </p>
            )}
            {yieldByWeekData.length > 1 && (
              <div className="h-8 mt-2" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yieldByWeekData}>
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className="shadow-sm cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...a11yClick(() => open("cycles"))}
          title="Open Active Cycles"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cycles</CardTitle>
            <Factory className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-cycles">
              {formatNumber(running)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.activeCropTypes || 0} crop types · <span className="text-primary">View →</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Channel Utilization</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-channel-util">
              {utilPct}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {running} of {total} channels active
            </p>
          </CardContent>
        </Card>

        <Card
          className="shadow-sm cursor-pointer hover:border-destructive/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...a11yClick(() => open("bad-trays"))}
          title="Open Bad Trays Analysis"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bad Trays</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-bad-trays">
              {formatNumber(dashboard?.totalBadTrays || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.badTraysCount || 0} added this week · <span className="text-primary">View →</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="shadow-sm cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...a11yClick(() => open("seed-lots"))}
          title="Open Active Seed Lots"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Seed Lots</CardTitle>
            <Leaf className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboard?.activeSeedLots || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in rotation · <span className="text-primary">View →</span>
            </p>
          </CardContent>
        </Card>

        <Card
          className="shadow-sm cursor-pointer hover:border-status-warn/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...a11yClick(() => open("alerts"))}
          title="Open System Alerts"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts Requiring Action</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-warn" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-warn">{(alerts || []).length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(dashboard as { criticalAlertsCount?: number })?.criticalAlertsCount || 0} critical · <span className="text-primary">View →</span>
            </p>
          </CardContent>
        </Card>

        <Card
          className="shadow-sm cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...a11yClick(() => open("action-required"))}
          title="Open Cycles Needing Action"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cycles Needing Action</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(dashboard?.actionRequired || []).length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overdue transitions · <span className="text-primary">View →</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Yield trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Yield by Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yieldByWeekData}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number) => [`${formatNumber(v)} kg`, "Yield"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorYield)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Daily Yield vs Seeding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={combinedDayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="yield" name="Yield (kg)" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="seeding" name="Seeding (g)" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Channel grid + Action required */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Channel Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div className="text-4xl font-bold text-primary">{utilPct}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {running} of {total} channels active
              </p>
            </div>
            <Progress value={Number(utilPct)} className="h-2 mb-4" />
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>Active ({running})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
                <span>Idle ({Math.max(0, total - running)})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            {(dashboard?.actionRequired || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Package className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">All cycles on schedule</p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-md border overflow-hidden max-h-[240px] overflow-y-auto">
                {(dashboard?.actionRequired || []).map((item) => (
                  <div key={item.cycleId} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <span className="font-medium">{item.seedName}</span>
                      <span className="text-muted-foreground ml-2 text-xs">#{item.cycleShortId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === "harvest" ? "destructive" : "secondary"}>
                        {item.type}
                      </Badge>
                      <span className="text-xs text-destructive font-medium">
                        {item.daysOverdue}d overdue
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Bad tray trend */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>7-Day Trend: Yield · Seeding · Bad Trays</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedDayData}>
                <defs>
                  <linearGradient id="gYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gSeeding" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gBad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Area type="monotone" dataKey="yield" name="Yield (kg)" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gYield)" />
                <Area type="monotone" dataKey="seeding" name="Seeding (g)" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#gSeeding)" />
                <Area type="monotone" dataKey="badTrays" name="Bad Trays (g)" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#gBad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
