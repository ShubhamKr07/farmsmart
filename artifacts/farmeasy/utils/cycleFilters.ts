/** Pure cycle filter functions extracted for testability. */

export type CycleFilterable = {
  shortId: string;
  seedName: string;
  growthProfileName: string;
  seedLotQrCodes: string[];
  status: string;
  seedingDate: string;
};

export function matchesSearch(cycle: CycleFilterable, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    cycle.shortId.toLowerCase().includes(q) ||
    cycle.seedName.toLowerCase().includes(q) ||
    cycle.growthProfileName.toLowerCase().includes(q) ||
    cycle.seedLotQrCodes.some((code) => code.toLowerCase().includes(q))
  );
}

export function matchesStage(cycle: CycleFilterable, stage: string | null): boolean {
  if (!stage) return true;
  return cycle.status === stage;
}

export function matchesDateRange(cycle: CycleFilterable, from: string, to: string): boolean {
  const date = cycle.seedingDate;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
