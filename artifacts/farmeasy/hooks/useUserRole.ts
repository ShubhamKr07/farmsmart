import { useUser } from "@clerk/expo";
import { type UserRole, USER_ROLE_LABELS, isSupervisorOrLead } from "@workspace/api-zod";

export type { UserRole };

export function useUserRole(): {
  role: UserRole;
  label: string;
  isSupervisor: boolean;
} {
  const { user } = useUser();
  const role = ((user?.publicMetadata?.role as UserRole) ?? "technician") as UserRole;
  return {
    role,
    label: USER_ROLE_LABELS[role] ?? "Technician",
    isSupervisor: isSupervisorOrLead(role),
  };
}
