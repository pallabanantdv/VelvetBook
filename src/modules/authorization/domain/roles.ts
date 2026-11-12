export type OrganizationRoleName =
  "organization_owner" | "organization_manager" | "staff" | "member";
export type Role =
  | { readonly scope: "customer"; readonly name: "customer" }
  | { readonly scope: "organization"; readonly name: OrganizationRoleName }
  | { readonly scope: "platform"; readonly name: "platform_admin" };
