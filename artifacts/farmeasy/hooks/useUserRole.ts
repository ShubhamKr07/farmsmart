import { useUser } from "@clerk/expo";

export type UserRole =
  | "technician"
  | "supervisor"
  | "quality_lead"
  | "facility_lead";

const ROLE_LABELS: Record<UserRole, string> = {
  technician: "Technician",
  supervisor: "Supervisor",
  quality_lead: "Quality Lead",
  facility_lead: "Facility Lead",
};

export function useUserRole(): {
  role: UserRole;
  label: string;
  isSupervisor: boolean;
} {
  const { user } = useUser();
  const role = ((user?.publicMetadata?.role as UserRole) ?? "technician") as UserRole;
  return {
    role,
    label: ROLE_LABELS[role] ?? "Technician",
    isSupervisor: role === "supervisor" || role === "facility_lead",
  };
}
