export type LogType = "maintenance" | "waste" | "env_check" | "cleaning" | "receiving" | "visitor";

export type FieldConfig =
  | { key: string; label: string; type: "text"; optional?: boolean; placeholder?: string }
  | { key: string; label: string; type: "number"; optional?: boolean; placeholder?: string }
  | { key: string; label: string; type: "select"; options: { label: string; value: string }[]; optional?: boolean }
  | { key: string; label: string; type: "months"; optional?: boolean };

export interface LogTypeDef {
  type: LogType;
  title: string;
  subtitle: string;
  icon: string;
  fields: FieldConfig[];
}

/**
 * Adapted from a reference project's log-type list, not copy-pasted — see
 * docs/alpha-app.md for what was and wasn't ported. "Facility Contact" is
 * plain free text, replacing the reference's org-specific "GPC Point of
 * Contact" dropdown (no such concept exists in FarmSmart).
 */
export const LOG_TYPES: LogTypeDef[] = [
  {
    type: "maintenance",
    title: "Equipment Maintenance",
    subtitle: "Racks, pumps, lighting, HVAC",
    icon: "tool",
    fields: [
      { key: "areaItem", label: "Area & Item", type: "text", placeholder: "e.g. Rack 3 pump" },
      { key: "frequency", label: "Frequency", type: "text", placeholder: "e.g. Monthly" },
      { key: "year", label: "Year", type: "number", placeholder: "2026" },
      { key: "monthsCompleted", label: "Months Completed", type: "months" },
    ],
  },
  {
    type: "waste",
    title: "Waste & Compost",
    subtitle: "Spent media, plant waste",
    icon: "trash-2",
    fields: [
      { key: "wasteType", label: "Waste Type", type: "text", placeholder: "e.g. Spent grow media" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unit", label: "Unit", type: "text", placeholder: "kg" },
      { key: "disposalMethod", label: "Disposal Method", type: "text", placeholder: "e.g. Municipal compost pickup" },
    ],
  },
  {
    type: "env_check",
    title: "Manual Environmental Check",
    subtitle: "Temp/RH/pH spot-check",
    icon: "thermometer",
    fields: [
      { key: "zone", label: "Zone", type: "text", placeholder: "e.g. Germination room" },
      { key: "tempC", label: "Temperature (°C)", type: "number", optional: true },
      { key: "humidityPct", label: "Humidity (%)", type: "number", optional: true },
      { key: "ph", label: "pH", type: "number", optional: true },
    ],
  },
  {
    type: "cleaning",
    title: "Cleaning & Sanitation",
    subtitle: "Room/rack sanitation",
    icon: "droplet",
    fields: [
      { key: "area", label: "Area", type: "text", placeholder: "e.g. Fertigation room" },
      { key: "cleaningType", label: "Cleaning Type", type: "text", placeholder: "e.g. Full sanitation" },
      { key: "productUsed", label: "Product Used", type: "text", optional: true },
    ],
  },
  {
    type: "receiving",
    title: "Receiving Log",
    subtitle: "Seed lots, nutrients, supplies",
    icon: "package",
    fields: [
      {
        key: "itemType", label: "Item Type", type: "select", options: [
          { label: "Seed Lot", value: "seed_lot" },
          { label: "Nutrient", value: "nutrient" },
          { label: "Supply", value: "supply" },
        ],
      },
      { key: "itemName", label: "Item Name", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unit", label: "Unit", type: "text", placeholder: "kg" },
      { key: "supplier", label: "Supplier", type: "text", optional: true },
    ],
  },
  {
    type: "visitor",
    title: "Visitor / Access Log",
    subtitle: "Facility access tracking",
    icon: "user-check",
    fields: [
      { key: "visitDate", label: "Date", type: "text", placeholder: "YYYY-MM-DD" },
      { key: "timeIn", label: "Time In", type: "text", placeholder: "e.g. 09:00" },
      { key: "timeOut", label: "Time Out", type: "text", optional: true, placeholder: "e.g. 11:00" },
      { key: "firstName", label: "First Name", type: "text" },
      { key: "lastName", label: "Last Name", type: "text" },
      { key: "organization", label: "Organization", type: "text", optional: true },
      { key: "contactInfo", label: "Contact Information", type: "text", optional: true },
      { key: "facilityContact", label: "Facility Contact", type: "text", placeholder: "Who they're visiting" },
    ],
  },
];

export function getLogTypeDef(type: string): LogTypeDef | undefined {
  return LOG_TYPES.find((t) => t.type === type);
}
