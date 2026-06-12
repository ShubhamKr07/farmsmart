export type UserRole = "technician" | "supervisor" | "quality_lead" | "facility_lead";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  technician: "Technician",
  supervisor: "Supervisor",
  quality_lead: "Quality Lead",
  facility_lead: "Facility Lead",
};

export function isSupervisorOrLead(role: UserRole): boolean {
  return role === "supervisor" || role === "facility_lead";
}
