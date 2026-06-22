import React, { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Wifi,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetLayout,
  getGetLayoutQueryKey,
  useCreateChannel,
  useUpdateChannel,
  useDeleteChannel,
  useUpdateChannelMonitoring,
  useCreateRack,
  useUpdateRack,
  useDeleteRack,
  useSetRackTrayCount,
} from "@workspace/api-client-react";
import type { RoomItem, ChannelItem, RackItem } from "@workspace/api-client-react";

const ROOM_LABELS: Record<string, string> = {
  seeding: "Seeding",
  fertigation: "Fertigation",
  harvesting: "Harvesting",
};

const ROOM_COLORS: Record<string, string> = {
  seeding: "bg-green-50 border-green-200",
  fertigation: "bg-blue-50 border-blue-200",
  harvesting: "bg-amber-50 border-amber-200",
};

const ROOM_HEADER_COLORS: Record<string, string> = {
  seeding: "bg-green-100 text-green-800",
  fertigation: "bg-blue-100 text-blue-800",
  harvesting: "bg-amber-100 text-amber-800",
};

interface QRTarget {
  type: "channel" | "rack";
  room: string;
  channel: string;
  rack?: string;
}

interface MonitoringTarget {
  id: number;
  label: string;
  temp: string;
  waterLevel: string;
  ph: string;
}

interface AddDialogState {
  type: "channel" | "rack";
  parentId: number;
  title: string;
  placeholder: string;
}

interface DeleteDialogState {
  type: "channel" | "rack";
  id: number;
  label: string;
  warning: string;
}

function InlineEdit({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(value);
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-7 text-sm w-40"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave(val)}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
        <X className="h-3.5 w-3.5 text-red-500" />
      </Button>
    </div>
  );
}

function AddItemDialog({
  state,
  onConfirm,
  onClose,
}: {
  state: AddDialogState | null;
  onConfirm: (type: AddDialogState["type"], parentId: number, label: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");

  React.useEffect(() => {
    if (state) setLabel("");
  }, [state]);

  const handleSubmit = () => {
    if (!state || !label.trim()) return;
    onConfirm(state.type, state.parentId, label.trim());
    onClose();
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              autoFocus
              placeholder={state?.placeholder}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!label.trim()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  state,
  onConfirm,
  onClose,
}: {
  state: DeleteDialogState | null;
  onConfirm: (type: DeleteDialogState["type"], id: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{state?.label}"?</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-3 py-2">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{state?.warning}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (state) onConfirm(state.type, state.id);
              onClose();
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrayCountInput({
  rackId,
  currentCount,
  onSet,
}: {
  rackId: number;
  currentCount: number;
  onSet: (rackId: number, count: number) => void;
}) {
  const [value, setValue] = useState(String(currentCount));
  const [dirty, setDirty] = useState(false);

  React.useEffect(() => {
    setValue(String(currentCount));
    setDirty(false);
  }, [currentCount]);

  const commit = () => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0 && n !== currentCount) {
      onSet(rackId, n);
    } else {
      setValue(String(currentCount));
    }
    setDirty(false);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
      <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of trays</Label>
      <Input
        type="number"
        min={0}
        className="h-7 w-20 text-sm"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(String(currentCount));
            setDirty(false);
          }
        }}
      />
      {dirty && (
        <span className="text-xs text-muted-foreground">Press Enter to save</span>
      )}
    </div>
  );
}

function RackRow({
  rack,
  roomName,
  channelLabel,
  onQR,
  onDelete,
  onRename,
  onSetTrayCount,
}: {
  rack: RackItem;
  roomName: string;
  channelLabel: string;
  onQR: (target: QRTarget) => void;
  onDelete: (id: number, label: string) => void;
  onRename: (id: number, label: string) => void;
  onSetTrayCount: (rackId: number, count: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </Button>

        {editing ? (
          <InlineEdit
            value={rack.label}
            onSave={(v) => {
              onRename(rack.id, v);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="text-sm font-medium flex-1">{rack.label}</span>
        )}

        <span className="text-xs text-muted-foreground mr-1">
          {rack.trays.length} tray{rack.trays.length !== 1 ? "s" : ""}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="QR Code"
          onClick={() =>
            onQR({ type: "rack", room: roomName, channel: channelLabel, rack: rack.label })
          }
        >
          <QrCode className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Rename"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          title="Delete"
          onClick={() => onDelete(rack.id, rack.label)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <TrayCountInput
          rackId={rack.id}
          currentCount={rack.trays.length}
          onSet={onSetTrayCount}
        />
      )}
    </div>
  );
}

function ChannelRow({
  channel,
  roomName,
  onQR,
  onDelete,
  onRename,
  onMonitoring,
  onAddRack,
  onDeleteRack,
  onRenameRack,
  onSetTrayCount,
}: {
  channel: ChannelItem;
  roomName: string;
  onQR: (target: QRTarget) => void;
  onDelete: (id: number, label: string) => void;
  onRename: (id: number, label: string) => void;
  onMonitoring: (target: MonitoringTarget) => void;
  onAddRack: (channelId: number, channelLabel: string) => void;
  onDeleteRack: (id: number, label: string) => void;
  onRenameRack: (id: number, label: string) => void;
  onSetTrayCount: (rackId: number, count: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {editing ? (
          <InlineEdit
            value={channel.label}
            onSave={(v) => {
              onRename(channel.id, v);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="font-medium flex-1">{channel.label}</span>
        )}

        <span className="text-xs text-muted-foreground mr-1">
          {channel.racks.length} rack{channel.racks.length !== 1 ? "s" : ""}
          {" · "}
          {channel.racks.reduce((sum, r) => sum + r.trays.length, 0)} tray{channel.racks.reduce((sum, r) => sum + r.trays.length, 0) !== 1 ? "s" : ""}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="QR Code"
          onClick={() =>
            onQR({ type: "channel", room: roomName, channel: channel.label })
          }
        >
          <QrCode className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Monitoring APIs"
          onClick={() =>
            onMonitoring({
              id: channel.id,
              label: channel.label,
              temp: channel.monitoringApiTemp ?? "",
              waterLevel: channel.monitoringApiWaterLevel ?? "",
              ph: channel.monitoringApiPh ?? "",
            })
          }
        >
          <Wifi className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Rename"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Delete"
          onClick={() => onDelete(channel.id, channel.label)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {channel.racks.map((rack) => (
            <RackRow
              key={rack.id}
              rack={rack}
              roomName={roomName}
              channelLabel={channel.label}
              onQR={onQR}
              onDelete={onDeleteRack}
              onRename={onRenameRack}
              onSetTrayCount={onSetTrayCount}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm w-full mt-1"
            onClick={() => onAddRack(channel.id, channel.label)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Rack
          </Button>
        </div>
      )}
    </div>
  );
}

function RoomSection({
  room,
  onQR,
  onMonitoring,
  onAddChannel,
  onDeleteChannel,
  onRenameChannel,
  onAddRack,
  onDeleteRack,
  onRenameRack,
  onSetTrayCount,
}: {
  room: RoomItem;
  onQR: (target: QRTarget) => void;
  onMonitoring: (target: MonitoringTarget) => void;
  onAddChannel: (roomId: number) => void;
  onDeleteChannel: (id: number, label: string) => void;
  onRenameChannel: (id: number, label: string) => void;
  onAddRack: (channelId: number, channelLabel: string) => void;
  onDeleteRack: (id: number, label: string) => void;
  onRenameRack: (id: number, label: string) => void;
  onSetTrayCount: (rackId: number, count: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const colorClass = ROOM_COLORS[room.name] ?? "bg-gray-50 border-gray-200";
  const headerClass = ROOM_HEADER_COLORS[room.name] ?? "bg-gray-100 text-gray-800";

  return (
    <div className={`rounded-xl border ${colorClass}`}>
      <button
        className={`w-full flex items-center justify-between px-5 py-3 rounded-xl font-semibold text-base ${headerClass} ${open ? "rounded-b-none" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{ROOM_LABELS[room.name] ?? room.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal opacity-70">
            {room.channels.length} channel{room.channels.length !== 1 ? "s" : ""}
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-2">
          {room.channels.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              roomName={room.name}
              onQR={onQR}
              onDelete={onDeleteChannel}
              onRename={onRenameChannel}
              onMonitoring={onMonitoring}
              onAddRack={onAddRack}
              onDeleteRack={onDeleteRack}
              onRenameRack={onRenameRack}
              onSetTrayCount={onSetTrayCount}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={() => onAddChannel(room.id)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Channel
          </Button>
        </div>
      )}
    </div>
  );
}

function QRModal({ target, onClose }: { target: QRTarget | null; onClose: () => void }) {
  const svgRef = useRef<HTMLDivElement>(null);

  const payload = target
    ? target.type === "channel"
      ? JSON.stringify({ type: "layout", facility: "FarmEasy", room: target.room, channel: target.channel })
      : JSON.stringify({ type: "layout", facility: "FarmEasy", room: target.room, channel: target.channel, rack: target.rack })
    : "";

  const handleDownload = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `qr-${target?.room}-${target?.channel}${target?.rack ? `-${target.rack}` : ""}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = url;
  }, [target]);

  const handlePrint = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const label = target?.type === "rack"
      ? `${target.room} / ${target.channel} / ${target.rack}`
      : `${target?.room} / ${target?.channel}`;
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><title>QR – ${label}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; display: flex; flex-direction: column;
         align-items: center; justify-content: center; min-height: 100vh;
         padding: 24px; background: #fff; }
  .label { margin-bottom: 16px; font-size: 14px; font-weight: 600;
           color: #333; text-align: center; }
  .payload { margin-top: 12px; font-size: 10px; color: #888;
             word-break: break-all; text-align: center; max-width: 260px; }
  @media print { body { padding: 0; min-height: auto; } }
</style></head>
<body>
  <div class="label">${label}</div>
  ${svgData}
  <div class="payload">${payload}</div>
  <script>window.onload = () => { window.print(); };<\/script>
</body></html>`);
    win.document.close();
  }, [target, payload]);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            QR Code — {target?.type === "rack" ? `${target.channel} / ${target.rack}` : target?.channel}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={svgRef} className="bg-white p-4 rounded-lg border">
            <QRCode value={payload} size={200} />
          </div>
          <p className="text-xs text-muted-foreground text-center break-all max-w-xs">{payload}</p>
          <div className="flex gap-2 w-full">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              Print
            </Button>
            <Button onClick={handleDownload} className="flex-1">
              Download PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MonitoringModal({
  target,
  onClose,
  onSave,
}: {
  target: MonitoringTarget | null;
  onClose: () => void;
  onSave: (id: number, temp: string, waterLevel: string, ph: string) => void;
}) {
  const [temp, setTemp] = useState(target?.temp ?? "");
  const [waterLevel, setWaterLevel] = useState(target?.waterLevel ?? "");
  const [ph, setPh] = useState(target?.ph ?? "");

  React.useEffect(() => {
    if (target) {
      setTemp(target.temp);
      setWaterLevel(target.waterLevel);
      setPh(target.ph);
    }
  }, [target]);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Monitoring APIs — {target?.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Temperature API URL</Label>
            <Input
              placeholder="https://api.example.com/temp"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Water Level API URL</Label>
            <Input
              placeholder="https://api.example.com/water"
              value={waterLevel}
              onChange={(e) => setWaterLevel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>pH API URL</Label>
            <Input
              placeholder="https://api.example.com/ph"
              value={ph}
              onChange={(e) => setPh(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => target && onSave(target.id, temp, waterLevel, ph)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Layout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rooms = [], isLoading } = useGetLayout();

  const [qrTarget, setQrTarget] = useState<QRTarget | null>(null);
  const [monTarget, setMonTarget] = useState<MonitoringTarget | null>(null);
  const [addDialog, setAddDialog] = useState<AddDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetLayoutQueryKey() });
  }, [queryClient]);

  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const updateMonitoring = useUpdateChannelMonitoring();
  const createRack = useCreateRack();
  const updateRack = useUpdateRack();
  const deleteRack = useDeleteRack();
  const setTrayCount = useSetRackTrayCount();

  const handleAddChannel = useCallback((roomId: number) => {
    setAddDialog({ type: "channel", parentId: roomId, title: "Add Channel", placeholder: "e.g. Channel A" });
  }, []);

  const handleAddRack = useCallback((channelId: number, channelLabel: string) => {
    setAddDialog({ type: "rack", parentId: channelId, title: `Add Rack to ${channelLabel}`, placeholder: "e.g. Rack 1" });
  }, []);

  const handleAddConfirm = useCallback(
    (type: AddDialogState["type"], parentId: number, label: string) => {
      if (type === "channel") {
        createChannel.mutate(
          { data: { roomId: parentId, label } },
          {
            onSuccess: () => { invalidate(); toast({ title: "Channel added" }); },
            onError: () => toast({ title: "Failed to add channel", variant: "destructive" }),
          },
        );
      } else {
        createRack.mutate(
          { data: { channelId: parentId, label } },
          {
            onSuccess: () => { invalidate(); toast({ title: "Rack added" }); },
            onError: () => toast({ title: "Failed to add rack", variant: "destructive" }),
          },
        );
      }
    },
    [createChannel, createRack, invalidate, toast],
  );

  const handleDeleteChannel = useCallback((id: number, label: string) => {
    setDeleteDialog({ type: "channel", id, label, warning: "This will permanently delete the channel and all its racks and trays." });
  }, []);

  const handleDeleteRack = useCallback((id: number, label: string) => {
    setDeleteDialog({ type: "rack", id, label, warning: "This will permanently delete the rack and all its trays." });
  }, []);

  const handleDeleteConfirm = useCallback(
    (type: DeleteDialogState["type"], id: number) => {
      if (type === "channel") {
        deleteChannel.mutate(
          { id },
          {
            onSuccess: () => { invalidate(); toast({ title: "Channel deleted" }); },
            onError: () => toast({ title: "Failed to delete channel", variant: "destructive" }),
          },
        );
      } else {
        deleteRack.mutate(
          { id },
          {
            onSuccess: () => { invalidate(); toast({ title: "Rack deleted" }); },
            onError: () => toast({ title: "Failed to delete rack", variant: "destructive" }),
          },
        );
      }
    },
    [deleteChannel, deleteRack, invalidate, toast],
  );

  const handleRenameChannel = useCallback(
    (id: number, label: string) => {
      if (!label.trim()) return;
      updateChannel.mutate(
        { id, data: { label: label.trim() } },
        {
          onSuccess: () => { invalidate(); toast({ title: "Channel renamed" }); },
          onError: () => toast({ title: "Failed to rename channel", variant: "destructive" }),
        },
      );
    },
    [updateChannel, invalidate, toast],
  );

  const handleRenameRack = useCallback(
    (id: number, label: string) => {
      if (!label.trim()) return;
      updateRack.mutate(
        { id, data: { label: label.trim() } },
        {
          onSuccess: () => { invalidate(); toast({ title: "Rack renamed" }); },
          onError: () => toast({ title: "Failed to rename rack", variant: "destructive" }),
        },
      );
    },
    [updateRack, invalidate, toast],
  );

  const handleSetTrayCount = useCallback(
    (rackId: number, count: number) => {
      setTrayCount.mutate(
        { id: rackId, data: { count } },
        {
          onSuccess: () => { invalidate(); toast({ title: `Tray count updated to ${count}` }); },
          onError: () => toast({ title: "Failed to update tray count", variant: "destructive" }),
        },
      );
    },
    [setTrayCount, invalidate, toast],
  );

  const handleSaveMonitoring = useCallback(
    (id: number, temp: string, waterLevel: string, ph: string) => {
      updateMonitoring.mutate(
        {
          id,
          data: {
            monitoringApiTemp: temp || null,
            monitoringApiWaterLevel: waterLevel || null,
            monitoringApiPh: ph || null,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            setMonTarget(null);
            toast({ title: "Monitoring config saved" });
          },
          onError: () => toast({ title: "Failed to save monitoring config", variant: "destructive" }),
        },
      );
    },
    [updateMonitoring, invalidate, toast],
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        Loading facility layout…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Facility Layout</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage rooms, channels, racks, and trays. Generate QR codes and configure monitoring APIs.
        </p>
      </div>

      {rooms.map((room) => (
        <RoomSection
          key={room.id}
          room={room}
          onQR={setQrTarget}
          onMonitoring={setMonTarget}
          onAddChannel={handleAddChannel}
          onDeleteChannel={handleDeleteChannel}
          onRenameChannel={handleRenameChannel}
          onAddRack={handleAddRack}
          onDeleteRack={handleDeleteRack}
          onRenameRack={handleRenameRack}
          onSetTrayCount={handleSetTrayCount}
        />
      ))}

      <AddItemDialog
        state={addDialog}
        onConfirm={handleAddConfirm}
        onClose={() => setAddDialog(null)}
      />
      <DeleteConfirmDialog
        state={deleteDialog}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteDialog(null)}
      />
      <QRModal target={qrTarget} onClose={() => setQrTarget(null)} />
      <MonitoringModal
        target={monTarget}
        onClose={() => setMonTarget(null)}
        onSave={handleSaveMonitoring}
      />
    </div>
  );
}
