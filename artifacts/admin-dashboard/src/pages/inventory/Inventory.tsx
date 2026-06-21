import React, { useState, useRef } from "react";
import { useListInventory, useCreateInventoryItem, useGetDashboard, getListInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatNumber } from "@/lib/format";
import { Package, Plus, AlertCircle, Sprout, QrCode, Printer, Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import QRCodeSVG from "react-qr-code";

type SeedLot = { id: number; seedName: string; qrCode: string };

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  category: z.string().optional(),
  currentQty: z.coerce.number().min(0),
  maxQty: z.coerce.number().min(1),
  unit: z.string().min(1, "Unit is required"),
});

export function Inventory() {
  const { data: inventory, isLoading: inventoryLoading } = useListInventory();
  const { data: dashboard, isLoading: dashboardLoading } = useGetDashboard();
  const createItem = useCreateInventoryItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrLot, setQrLot] = useState<SeedLot | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!qrLot) return;
    const svgEl = printRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — ${qrLot.qrCode}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
            .lot-code { font-size: 13px; color: #555; margin-top: 12px; letter-spacing: 0.05em; }
            .seed-name { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
            .label { font-size: 11px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
            svg { width: 200px; height: 200px; }
            @media print { @page { margin: 0.5cm; } }
          </style>
        </head>
        <body>
          ${svgData}
          <div class="seed-name">${qrLot.seedName}</div>
          <div class="lot-code">${qrLot.qrCode}</div>
          <div class="label">Seed Lot · HydroFarm</div>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownloadSVG = () => {
    if (!qrLot) return;
    const svgEl = printRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${qrLot.qrCode.replace(/[^a-z0-9]/gi, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "",
      currentQty: 0,
      maxQty: 100,
      unit: "kg",
    },
  });

  const onSubmit = (data: z.infer<typeof itemSchema>) => {
    createItem.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        setIsAddModalOpen(false);
        form.reset();
        toast({ title: "Item added successfully" });
      },
      onError: () => {
        toast({ title: "Failed to add item", variant: "destructive" });
      }
    });
  };

  if (inventoryLoading || dashboardLoading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  const items = inventory || [];
  const lowStockItems = items.filter(item => (item.currentQty / item.maxQty) < 0.2);

  const chartData = items.reduce((acc, item) => {
    const cat = item.category || 'Other';
    const existing = acc.find(x => x.name === cat);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: cat, value: 1 });
    }
    return acc;
  }, [] as {name: string, value: number}[]);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const seedLots = (dashboard as { activeSeedLotDetails?: { id: number; seedName: string; qrCode: string }[] })?.activeSeedLotDetails || [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Inventory Item</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="brand" render={({ field }) => (
                    <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="currentQty" render={({ field }) => (
                    <FormItem><FormLabel>Current Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="maxQty" render={({ field }) => (
                    <FormItem><FormLabel>Max Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createItem.isPending}>
                  {createItem.isPending ? "Adding..." : "Add Item"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Supply Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{chartData.length} categories</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Items below 20%</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Seed Lots</CardTitle>
            <Sprout className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeSeedLots || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in rotation</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Crop Types</CardTitle>
            <Sprout className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeCropTypes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Distinct varieties growing</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Seed Lots */}
      {seedLots.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Active Seed Lots in Rotation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Lot Code</th>
                    <th className="p-3 text-left font-medium">Crop Name</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">QR Code</th>
                  </tr>
                </thead>
                <tbody>
                  {seedLots.map(lot => (
                    <tr key={lot.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{lot.qrCode}</td>
                      <td className="p-3 font-medium">{lot.seedName}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          Growing
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setQrLot(lot)}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Generate QR
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      <Dialog open={!!qrLot} onOpenChange={(open) => !open && setQrLot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Seed Lot QR Code
            </DialogTitle>
          </DialogHeader>

          {qrLot && (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* QR display */}
              <div
                ref={printRef}
                className="bg-white p-4 rounded-xl border-2 border-border shadow-sm"
              >
                <QRCodeSVG
                  value={qrLot.qrCode}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="M"
                />
              </div>

              {/* Lot info */}
              <div className="text-center space-y-0.5">
                <p className="text-base font-bold text-foreground">{qrLot.seedName}</p>
                <p className="text-xs font-mono text-muted-foreground">{qrLot.qrCode}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  Seed Lot · HydroFarm
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full pt-1">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleDownloadSVG}
                >
                  <Download className="h-4 w-4" />
                  Download SVG
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplies Stock + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Supplies Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Item</th>
                      <th className="p-3 text-left font-medium">Category</th>
                      <th className="p-3 text-left font-medium">Stock Level</th>
                      <th className="p-3 text-right font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const percentage = (item.currentQty / item.maxQty) * 100;
                      const isLow = percentage < 20;
                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-3 font-medium">{item.name}</td>
                          <td className="p-3 text-muted-foreground">{item.category}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Progress value={percentage} className={`h-2 w-24 ${isLow ? '[&>div]:bg-destructive' : ''}`} />
                              <span className={`text-xs ${isLow ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">{formatNumber(item.currentQty)} {item.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {chartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
