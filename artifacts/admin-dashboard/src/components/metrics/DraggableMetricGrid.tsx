import React, { useState } from "react";
import { GripVertical } from "lucide-react";
import { getMetricDef } from "@workspace/metrics";
import { spanClass } from "./MetricGrid";

interface DraggableMetricGridProps {
  ids: string[];
  onReorder: (next: string[]) => void;
  renderItem: (id: string) => React.ReactNode;
}

/**
 * Same grid layout as MetricGrid, with native HTML5 drag-and-drop reordering
 * (no extra dependency — dnd-kit was more than this needs). Each card gets a
 * small grip handle in its top-left corner; dragging one over another swaps
 * their position in `ids` and calls `onReorder` with the new order.
 *
 * The grid item wrapper (not `renderItem`'s own div) carries the lg:col-span
 * class, so `renderItem` should return the bare card content (a Card or
 * MetricCard) without an outer spanning div.
 */
export function DraggableMetricGrid({ ids, onReorder, renderItem }: DraggableMetricGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {ids.map((id) => {
        const def = getMetricDef(id);
        const span = def ? spanClass(def) : "";
        return (
          <div
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (overId !== id) setOverId(id);
            }}
            onDragLeave={() => setOverId((cur) => (cur === id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            className={`relative group ${span} ${dragId === id ? "opacity-50" : ""} ${overId === id && dragId && dragId !== id ? "ring-2 ring-primary rounded-lg" : ""}`}
          >
            <div
              className="absolute left-1 top-1 z-10 cursor-grab rounded p-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity bg-background/80"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {renderItem(id)}
          </div>
        );
      })}
    </div>
  );
}
