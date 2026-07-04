import React, { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import type { MetricDef, MetricTab } from "@workspace/metrics";

interface MetricPickerProps {
  tab: MetricTab;
  selectable: MetricDef[];
  selected: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
}

export function MetricPicker({
  selectable,
  selected,
  onToggle,
  onReset,
}: MetricPickerProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Group by category, preserving registry order.
  const groups = useMemo(() => {
    const map = new Map<string, MetricDef[]>();
    for (const m of selectable) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return Array.from(map.entries());
  }, [selectable]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Metrics
          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {selected.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search metrics…" />
          <CommandList>
            <CommandEmpty>No metrics found.</CommandEmpty>
            {groups.map(([category, metrics]) => (
              <CommandGroup key={category} heading={category}>
                {metrics.map((m) => {
                  const checked = selectedSet.has(m.id);
                  return (
                    <CommandItem
                      key={m.id}
                      value={`${m.label} ${m.category} ${m.id}`}
                      onSelect={() => onToggle(m.id)}
                      className="gap-2"
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm">{m.label}</span>
                        {m.unit && (
                          <span className="text-xs text-muted-foreground">
                            {m.unit}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="flex items-center justify-end border-t p-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
