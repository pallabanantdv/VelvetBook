import assert from "node:assert/strict";
import test from "node:test";
import { organizationMembers } from "../db/schema/organizations/organization-members";
import {
  ROLE_PERMISSIONS,
  MEMBERSHIP_ROLE_NAMES,
} from "../modules/authorization/application/policy/role-permissions.server";
import type { SessionContext } from "../modules/identity/application/public";
import type {
  AuthorizedOperation,
  AuthorizationRequest,
  TenantContext,
  PlatformContext,
  ResourceOwnership,
} from "../modules/authorization/application/public";

type Assert<T extends true> = T;
/** Compile-time checks; no fabricated trusted context or runtime decision handler. */
export type TrustBoundaryChecks = [
  Assert<Omit<SessionContext, symbol> extends SessionContext ? false : true>,
  Assert<Omit<TenantContext, symbol> extends TenantContext ? false : true>,
  Assert<Omit<PlatformContext, symbol> extends PlatformContext ? false : true>,
  Assert<
    Omit<ResourceOwnership, symbol> extends ResourceOwnership ? false : true
  >,
  Assert<
    Omit<AuthorizedOperation, symbol> extends AuthorizedOperation ? false : true
  >,
  Assert<
    Extract<
      AuthorizationRequest,
      { scope: "organization" }
    >["permission"]["scope"] extends "organization"
      ? true
      : false
  >,
  Assert<
    Extract<
      AuthorizationRequest,
      { scope: "platform" }
    >["permission"]["scope"] extends "platform"
      ? true
      : false
  >,
  Assert<
    Extract<
      Extract<AuthorizationRequest, { scope: "customer" }>["target"],
      { kind: "platform_collection" }
    > extends never
      ? true
      : false
  >,
];

const permissionKeys = (role: keyof typeof ROLE_PERMISSIONS) =>
  ROLE_PERMISSIONS[role].map(
    (permission) =>
      `${permission.scope}:${permission.resource}:${permission.action}`,
  );

test("static bundles separate customer, organization, and platform namespaces", () => {
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const scope =
      role === "customer"
        ? "customer"
        : role === "platform_admin"
          ? "platform"
          : "organization";
    for (const permission of permissions)
      assert.equal(permission.scope, scope, role);
    const keys = permissions.map((p) => `${p.scope}:${p.resource}:${p.action}`);
    assert.equal(new Set(keys).size, keys.length, role);
    assert.ok(keys.every((key) => !key.includes("*")));
  }
});

test("ordinary members have no implicit organization capability", () => {
  assert.deepEqual(ROLE_PERMISSIONS.member, []);
});

test("managers and staff cannot assign roles or mutate payments", () => {
  for (const role of ["organization_manager", "staff"] as const) {
    const keys = permissionKeys(role);
    assert.ok(!keys.includes("organization:membership:manage"));
    assert.ok(!keys.some((key) => key.startsWith("platform:")));
    assert.ok(
      !keys.some(
        (key) =>
          key.startsWith("organization:payment:") && !key.endsWith(":read"),
      ),
    );
  }
  assert.ok(
    permissionKeys("organization_owner").includes(
      "organization:membership:manage",
    ),
  );
});

test("staff gets assignment-specific booking mutation, not general management", () => {
  const keys = permissionKeys("staff");
  assert.ok(keys.includes("organization:booking:update_assigned"));
  assert.ok(!keys.includes("organization:booking:manage"));
  assert.ok(!keys.includes("organization:payment:read"));
});

test("schema membership roles align with mappings and exclude platform admin", () => {
  assert.deepEqual(
    [...organizationMembers.role.enumValues!].sort(),
    Object.keys(MEMBERSHIP_ROLE_NAMES).sort(),
  );
  assert.equal("platform_admin" in MEMBERSHIP_ROLE_NAMES, false);
  assert.equal(MEMBERSHIP_ROLE_NAMES.manager, "organization_manager");
  assert.equal(MEMBERSHIP_ROLE_NAMES.owner, "organization_owner");
});

test("platform capabilities do not contain tenant booking/payment or impersonation", () => {
  const keys = permissionKeys("platform_admin");
  assert.deepEqual(
    keys.sort(),
    [
      "platform:organization:read",
      "platform:organization:suspend",
      "platform:user:read",
      "platform:user:disable",
      "platform:audit:read",
      "platform:onboarding:read",
      "platform:onboarding:review",
    ].sort(),
  );
});
