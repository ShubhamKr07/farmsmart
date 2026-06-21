import React, { useState, useMemo } from "react";
import { useListShipments, useCreateShipment, getListShipmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { Truck, Plus, DollarSign, PackageCheck, Search, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const shipmentSchema = z.object({
  client: z.string().min(1, "Client is required"),
  productDescription: z.string().optional(),
  yieldSoldKg: z.coerce.number().min(0),
  revenueUsd: z.coerce.number().min(0),
  status: z.enum(["in_progress", "complete", "pending"]),
  shippingDate: z.string().optional(),
});

type StatusFilter = "all" | "in_progress" | "complete" | "pending";

export function Shipments() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [clientFilter, setClientFilter] = useState("");
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const { data: shipments, isLoading } = useListShipments();
  const createShipment = useCreateShipment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const form = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      client: "",
      productDescription: "",
      yieldSoldKg: 0,
      revenueUsd: 0,
      status: "pending",
      shippingDate: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = (data: z.infer<typeof shipmentSchema>) => {
    createShipment.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
        setIsAddModalOpen(false);
        form.reset();
        toast({ title: "Shipment created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create shipment", variant: "destructive" });
      }
    });
  };

  const items = shipments || [];

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(s => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (clientFilter && !s.client.toLowerCase().includes(clientFilter.toLowerCase())) return false;
      if (thisWeekOnly && s.shippingDate) {
        const shipDate = new Date(s.shippingDate);
        if (shipDate < weekStart) return false;
      }
      return true;
    });
  }, [items, statusFilter, clientFilter, thisWeekOnly, weekStart]);

  const totalYield = items.reduce((sum, s) => sum + (s.yieldSoldKg || 0), 0);
  const totalRevenue = items.reduce((sum, s) => sum + (s.revenueUsd || 0), 0);
  const completedCount = items.filter(s => s.status === "complete").length;
  const pendingCount = items.filter(s => s.status === "pending").length;

  const uniqueClients = Array.from(new Set(items.map(s => s.client))).filter(Boolean);

  if (isLoading) return <div className="p-6 space-y-6"><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-shipment">
              <Plus className="h-4 w-4 mr-2" />
              New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shipment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="client" render={({ field }) => (
                  <FormItem><FormLabel>Client</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="productDescription" render={({ field }) => (
                  <FormItem><FormLabel>Product Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="yieldSoldKg" render={({ field }) => (
                    <FormItem><FormLabel>Yield (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="revenueUsd" render={({ field }) => (
                    <FormItem><FormLabel>Revenue (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="shippingDate" render={({ field }) => (
                    <FormItem><FormLabel>Shipping Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createShipment.isPending}>
                  {createShipment.isPending ? "Creating..." : "Create Shipment"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Yield Sold</CardTitle>
            <PackageCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalYield)} kg</div>
            <p className="text-xs text-muted-foreground mt-1">{items.length} shipments total</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{uniqueClients.length} clients</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Delivered shipments</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <PackageCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting dispatch</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            {/* Status filters */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pending", "in_progress", "complete"] as StatusFilter[]).map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </Button>
              ))}
            </div>
            {/* Client + Week filters */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant={thisWeekOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setThisWeekOnly(v => !v)}
                className="shrink-0"
              >
                <CalendarDays className="h-3 w-3 mr-1" />
                This Week
              </Button>
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by client..."
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">ID</th>
                  <th className="p-3 text-left font-medium">Client</th>
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-right font-medium">Yield (kg)</th>
                  <th className="p-3 text-right font-medium">Revenue</th>
                  <th className="p-3 text-left font-medium">Ship Date</th>
                  <th className="p-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{item.shortId}</td>
                    <td className="p-3 font-medium">{item.client}</td>
                    <td className="p-3 text-muted-foreground">{item.productDescription || "—"}</td>
                    <td className="p-3 text-right">{formatNumber(item.yieldSoldKg || 0)}</td>
                    <td className="p-3 text-right">{formatCurrency(item.revenueUsd || 0)}</td>
                    <td className="p-3 whitespace-nowrap">{item.shippingDate ? formatDate(item.shippingDate) : "—"}</td>
                    <td className="p-3">
                      <Badge variant={item.status === "complete" ? "default" : item.status === "in_progress" ? "secondary" : "outline"}>
                        {item.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No shipments match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-right">
              Showing {filteredItems.length} of {items.length} shipments
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
