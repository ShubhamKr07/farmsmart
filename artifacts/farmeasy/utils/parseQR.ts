export interface SeedLotQR {
  type: "seed_lot";
  lotId?: string;
  seedName?: string;
  variety?: string;
  batchWeight?: number;
  unit?: string;
}

export interface RackPositionQR {
  type: "rack_position";
  position?: string;
  humidity?: number;
  temperature?: number;
  ph?: number;
  waterLevel?: number;
  nutrientMix?: string;
}

export interface LayoutQR {
  type: "layout";
  facility: string;
  room: string;
  channel: string;
  rack?: string;
}

export type ParsedQR = SeedLotQR | RackPositionQR | LayoutQR;

export function parseQR(raw: string): ParsedQR | null {
  try {
    const data = JSON.parse(raw);
    if (data && data.type === "seed_lot") return data as SeedLotQR;
    if (data && data.type === "rack_position") return data as RackPositionQR;
    if (data && data.type === "layout" && data.facility && data.room && data.channel)
      return data as LayoutQR;
  } catch {
    // not JSON — treat as plain string code
  }
  return null;
}
