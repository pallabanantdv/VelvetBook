import "server-only";
import { ROLE_PERMISSIONS } from "./policy/role-permissions.server";
import type { Permission } from "../domain/permissions";
import type { Role } from "../domain/roles";

export class AuthorizationDenied extends Error {
  constructor() {
    super("Access denied.");
  }
}
export function hasPermission(
  role: Role["name"],
  permission: Permission,
): boolean {
  return (
    ROLE_PERMISSIONS[role]?.some(
      (candidate) =>
        candidate.scope === permission.scope &&
        candidate.resource === permission.resource &&
        candidate.action === permission.action,
    ) ?? false
  );
}
export type OrganizationTarget = {
  kind:
    | "organization"
    | "membership"
    | "store"
    | "service"
    | "product"
    | "staff"
    | "booking"
    | "payment";
  id: string;
};
