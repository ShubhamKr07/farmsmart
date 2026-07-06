import { useGetLayout } from "@workspace/api-client-react";

const ROOM_LABEL: Record<string, string> = {
  seeding: "Seeding room",
  fertigation: "Fertigation room",
  harvesting: "Harvesting room",
};

/**
 * Real room names FarmSmart already has (`rooms` table, via the existing
 * /api/layout endpoint — generated hook was unused anywhere in mobile until
 * now), surfaced as suggestions for Zone/Area fields (Phase 5 P1) instead of
 * retyping the same room name by hand every time.
 */
export function useLayoutZoneSuggestions(): string[] {
  const layout = useGetLayout();
  return (layout.data ?? []).map((room) => ROOM_LABEL[room.name] ?? room.name);
}
