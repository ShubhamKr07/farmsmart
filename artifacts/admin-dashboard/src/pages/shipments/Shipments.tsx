import React, { useState, useMemo } from "react";
import {
  useListShipments,
  useCreateShipment,
  useUpdateShipment,
  useDeleteShipment,
  getListShipmentsQueryKey,
  type Shipment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { Truck, Plus, DollarSign, PackageCheck, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QueryError } from "@/components/ui/query-error";
import { DataTable, type Column } from "@/components/data-table";
import { getMetricDef } from "@workspace/metrics";
import { useMetricSelection } from "@/hooks/use-metric-selection";
import { MetricPicker } from "@/components/metrics/MetricPicker";
import { MetricGrid } from "@/components/metrics/MetricGrid";
import { MetricCard } from "@/components/metrics/MetricCard";
import type { MetricDataMap } from "@/components/metrics/renderers";

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
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const { data: shipments, isLoading, isError, refetch } = useListShipments();
  const createShipment = useCreateShipment();
  const updateShipment = useUpdateShipment();
  const deleteShipment = useDeleteShipment();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [deleting, setDeleting] = useState<Shipment | null>(null);

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });

  const onCreateSubmit = (data: z.infer<typeof shipmentSchema>) => {
    createShipment.mutate(
      { data },
      {
        onSuccess: () => {
          invalidate();
          setIsAddModalOpen(false);
          form.reset();
          toast("Shipment created successfully");
        },
        onError: () => toast.error("Failed to create shipment"),
      },
    );
  };

  const onEditSubmit = (data: z.infer<typeof shipmentSchema>) => {
    if (!editing) return;
    updateShipment.mutate(
      { id: editing.id, data },
      {
        onSuccess: () => {
          invalidate();
          setEditing(null);
          form.reset();
          toast("Shipment updated");
        },
        onError: () => toast.error("Failed to update shipment"),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteShipment.mutate(
      { id: deleting.id },
      {
        onSuccess: () => {
          invalidate();
          toast("Shipment deleted");
        },
        onError: () => toast.error("Failed to delete shipment"),
      },
    );
    setDeleting(null);
  };

  const openEdit = (s: Shipment) => {
    setEditing(s);
    form.reset({
      client: s.client,
      productDescription: s.productDescription ?? "",
      yieldSoldKg: s.yieldSoldKg ?? 0,
      revenueUsd: s.revenueUsd ?? 0,
      status: s.status,
      shippingDate: s.shippingDate ?? new Date().toISOString().split("T")[0],
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
    return items.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (thisWeekOnly && s.shippingDate) {
        if (new Date(s.shippingDate) < weekStart) return false;
      }
      return true;
    });
  }, [items, statusFilter, thisWeekOnly, weekStart]);

  const totalYield = items.reduce((sum, s) => sum + (s.yieldSoldKg || 0), 0);
  const totalRevenue = items.reduce((sum, s) => sum + (s.revenueUsd || 0), 0);
  const completedCount = items.filter((s) => s.status === "complete").length;
  const pendingCount = items.filter((s) => s.status === "pending").length;
  const uniqueClients = Array.from(new Set(items.map((s) => s.client))).filter(Boolean);

  const { selected, selectable, toggle, reset } = useMetricSelection("shipments");
  const metricData: MetricDataMap = { shipments: items };

  if (isLoading) return <div className="p-6 space-y-6"><Skeleton className="h-[400px] w-full" /></div>;

  if (isError) {
    return (
      <div className="p-6">
        <QueryError resource="shipments" onRetry={() => refetch()} />
      </div>
    );
  }

  const columns: Column<Shipment>[] = [
    {
      key: "shortId",
      header: "ID",
      accessor: (s) => s.shortId,
      sortable: true,
      cell: (s) => <span className="font-mono text-xs text-muted-foreground">{s.shortId}</span>,
    },
    {
      key: "client",
      header: "Client",
      accessor: (s) => s.client,
      sortable: true,
      cell: (s) => <span className="font-medium">{s.client}</span>,
    },
    {
      key: "productDescription",
      header: "Product",
      accessor: (s) => s.productDescription ?? "",
      cell: (s) => <span className="text-muted-foreground">{s.productDescription || "—"}</span>,
    },
    {
      key: "yieldSoldKg",
      header: "Yield (kg)",
      accessor: (s) => s.yieldSoldKg ?? 0,
      sortable: true,
      align: "right",
      cell: (s) => formatNumber(s.yieldSoldKg || 0),
    },
    {
      key: "revenueUsd",
      header: "Revenue",
      accessor: (s) => s.revenueUsd ?? 0,
      sortable: true,
      align: "right",
      cell: (s) => formatCurrency(s.revenueUsd || 0),
    },
    {
      key: "shippingDate",
      header: "Ship Date",
      accessor: (s) => s.shippingDate ?? "",
      sortable: true,
      cell: (s) => (s.shippingDate ? <span className="whitespace-nowrap">{formatDate(s.shippingDate)}</span> : "—"),
    },
    {
      key: "status",
      header: "Status",
      accessor: (s) => s.status,
      sortable: true,
      cell: (s) => (
        <Badge variant={s.status === "complete" ? "default" : s.status === "in_progress" ? "secondary" : "outline"}>
          {s.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Edit ${s.shortId}`}
            onClick={() => openEdit(s)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label={`Delete ${s.shortId}`}
            onClick={() => setDeleting(s)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
        <div className="flex items-center gap-2">
          <MetricPicker
            tab="shipments"
            selectable={selectable}
            selected={selected}
            onToggle={toggle}
            onReset={reset}
          />
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
            <ShipmentForm form={form} onSubmit={onCreateSubmit} submitLabel={createShipment.isPending ? "Creating..." : "Create Shipment"} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Metric cards (selectable) */}
      <MetricGrid>
        {selected.map((id) => {
          const def = getMetricDef(id);
          if (!def) return null;
          return <MetricCard key={id} def={def} data={metricData} />;
        })}
      </MetricGrid>

      {/* Filter + table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pending", "in_progress", "complete"] as StatusFilter[]).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="capitalize min-h-[44px]"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </Button>
              ))}
              <Button
                variant={thisWeekOnly ? "default" : "outline"}
                size="sm"
                className="shrink-0 min-h-[44px]"
                onClick={() => setThisWeekOnly((v) => !v)}
              >
                <CalendarDays className="h-3 w-3 mr-1" />
                This Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            data={filteredItems}
            columns={columns}
            rowKey={(s) => s.id}
            searchFn={(s, t) =>
              s.client.toLowerCase().includes(t) ||
              (s.productDescription ?? "").toLowerCase().includes(t) ||
              s.shortId.toLowerCase().includes(t)
            }
            searchPlaceholder="Filter by client, product, or ID…"
            emptyState="No shipments match the current filters."
            caption="Shipments"
          />
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shipment {editing?.shortId}</DialogTitle>
          </DialogHeader>
          <ShipmentForm form={form} onSubmit={onEditSubmit} submitLabel={updateShipment.isPending ? "Saving..." : "Save Changes"} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shipment {deleting?.shortId}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the shipment. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardHeaderTitle({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-muted-foreground">{children}</span>;
}

function ShipmentForm({
  form,
  onSubmit,
  submitLabel,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof shipmentSchema>>>;
  onSubmit: (data: z.infer<typeof shipmentSchema>) => void;
  submitLabel: string;
}) {
  return (
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
        <Button type="submit" className="w-full">{submitLabel}</Button>
      </form>
    </Form>
  );
}
