export type LogType = "maintenance" | "waste" | "env_check" | "cleaning" | "receiving" | "visitor";

export type FieldConfig =
  | { key: string; label: string; type: "text"; optional?: boolean; placeholder?: string; autocomplete?: "layout" | "recent" }
  | { key: string; label: string; type: "number"; optional?: boolean; placeholder?: string; stepper?: boolean; step?: number; defaultValue?: () => string }
  | { key: string; label: string; type: "select"; options: { label: string; value: string }[]; optional?: boolean }
  | { key: string; label: string; type: "months"; optional?: boolean }
  | { key: string; label: string; type: "date"; optional?: boolean }
  | { key: string; label: string; type: "time"; optional?: boolean }
  | { key: string; label: string; type: "photo"; maxPhotos?: number };

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
      { key: "areaItem", label: "Area & Item", type: "text", placeholder: "e.g. Rack 3 pump", autocomplete: "recent" },
      { key: "frequency", label: "Frequency", type: "text", placeholder: "e.g. Monthly", autocomplete: "recent" },
      { key: "year", label: "Year", type: "number", stepper: true, defaultValue: () => String(new Date().getFullYear()) },
      { key: "monthsCompleted", label: "Months Completed", type: "months" },
    ],
  },
  {
    type: "waste",
    title: "Waste & Compost",
    subtitle: "Spent media, plant waste",
    icon: "trash-2",
    fields: [
      { key: "wasteType", label: "Waste Type", type: "text", placeholder: "e.g. Spent grow media", autocomplete: "recent" },
      { key: "quantity", label: "Quantity", type: "number", stepper: true },
      { key: "unit", label: "Unit", type: "text", placeholder: "kg", autocomplete: "recent" },
      { key: "disposalMethod", label: "Disposal Method", type: "text", placeholder: "e.g. Municipal compost pickup", autocomplete: "recent" },
      { key: "photoUrls", label: "Photos", type: "photo", maxPhotos: 4 },
    ],
  },
  {
    type: "env_check",
    title: "Manual Environmental Check",
    subtitle: "Temp/RH/pH spot-check",
    icon: "thermometer",
    fields: [
      { key: "zone", label: "Zone", type: "text", placeholder: "e.g. Germination room", autocomplete: "layout" },
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
      { key: "area", label: "Area", type: "text", placeholder: "e.g. Fertigation room", autocomplete: "layout" },
      { key: "cleaningType", label: "Cleaning Type", type: "text", placeholder: "e.g. Full sanitation", autocomplete: "recent" },
      { key: "productUsed", label: "Product Used", type: "text", optional: true, autocomplete: "recent" },
      { key: "photoUrls", label: "Photos", type: "photo", maxPhotos: 4 },
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
      { key: "itemName", label: "Item Name", type: "text", autocomplete: "recent" },
      { key: "quantity", label: "Quantity", type: "number", stepper: true },
      { key: "unit", label: "Unit", type: "text", placeholder: "kg", autocomplete: "recent" },
      { key: "supplier", label: "Supplier", type: "text", optional: true, autocomplete: "recent" },
      { key: "photoUrls", label: "Photos", type: "photo", maxPhotos: 4 },
    ],
  },
  {
    type: "visitor",
    title: "Visitor / Access Log",
    subtitle: "Facility access tracking",
    icon: "user-check",
    fields: [
      { key: "visitDate", label: "Date", type: "date" },
      { key: "timeIn", label: "Time In", type: "time" },
      { key: "timeOut", label: "Time Out", type: "time", optional: true },
      { key: "firstName", label: "First Name", type: "text" },
      { key: "lastName", label: "Last Name", type: "text" },
      { key: "organization", label: "Organization", type: "text", optional: true, autocomplete: "recent" },
      { key: "contactInfo", label: "Contact Information", type: "text", optional: true },
      { key: "facilityContact", label: "Facility Contact", type: "text", placeholder: "Who they're visiting", autocomplete: "recent" },
    ],
  },
];

export function getLogTypeDef(type: string): LogTypeDef | undefined {
  return LOG_TYPES.find((t) => t.type === type);
}
