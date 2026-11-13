import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { adminAccessRequestSchema } from "../modules/admin/presentation/validation.server";
import { platformSettingChangeSchema } from "../modules/platform-settings/presentation/validation.server";
import { ROLE_PERMISSIONS } from "../modules/authorization/application/policy/role-permissions.server";
import type {
  AdminOperationContext,
  PreparedAdminActionContext,
  SensitiveAdminContext,
  VerifiedAdminScope,
  IndependentApprovalReceipt,
  PreparedAdminAuditReceipt,
} from "../modules/admin/application/public";
import type {
  UserAccountReadContext,
  UserAccountMutationContext,
} from "../modules/user-management/application/public";
import type {
  ReportReadContext,
  ReportExportContext,
  ReportMetrics,
} from "../modules/reports/application/public";
import type {
  SettingsProposeContext,
  SettingsApplyContext,
} from "../modules/platform-settings/application/public";
import type {
  AuditEvent,
  AuditMetadata,
  AuditWriteContext,
} from "../modules/audit-logs/application/public";

type Assert<T extends true> = T;
export type AdminTrustBoundaryChecks = [
  Assert<
    PreparedAdminActionContext extends SensitiveAdminContext ? false : true
  >,
  Assert<
    Omit<PreparedAdminActionContext, symbol> extends PreparedAdminActionContext
      ? false
      : true
  >,
  Assert<
    Omit<AdminOperationContext, symbol> extends AdminOperationContext
      ? false
      : true
  >,
  Assert<
    Omit<SensitiveAdminContext, symbol> extends SensitiveAdminContext
      ? false
      : true
  >,
  Assert<
    Omit<VerifiedAdminScope, symbol> extends VerifiedAdminScope ? false : true
  >,
  Assert<
    Omit<IndependentApprovalReceipt, symbol> extends IndependentApprovalReceipt
      ? false
      : true
  >,
  Assert<
    Omit<PreparedAdminAuditReceipt, symbol> extends PreparedAdminAuditReceipt
      ? false
      : true
  >,
  Assert<
    Omit<AuditWriteContext, symbol> extends AuditWriteContext ? false : true
  >,
  Assert<
    UserAccountReadContext extends UserAccountMutationContext ? false : true
  >,
  Assert<ReportReadContext extends ReportExportContext ? false : true>,
  Assert<SettingsProposeContext extends SettingsApplyContext ? false : true>,
  Assert<string extends keyof AuditMetadata ? false : true>,
  Assert<

      | "actor"
      | "action"
      | "resource"
      | "tenant"
      | "timestamp"
      | "metadata" extends keyof AuditEvent
      ? true
      : false
  >,
  Assert<

      | "bookings"
      | "payments"
      | "active_businesses"
      | "platform_activity" extends ReportMetrics["kind"]
      ? true
      : false
  >,
];

const id = "30000000-0000-4000-8000-000000000001";
const request = {
  scope: { kind: "organizations", organizationIds: [id] },
  reasonCode: "operational_reporting",
  justification: "Investigate a verified operational case.",
  ticketRef: null,
  correlationId: "admin-contract-check",
};

test("administrative request shape accepts bounded selectors but rejects broad scope", () => {
  assert.ok(adminAccessRequestSchema.safeParse(request).success);
  for (const scope of [
    { kind: "all" },
    { kind: "organizations", organizationIds: [] },
    { kind: "organizations", organizationIds: Array(101).fill(id) },
    { kind: "users", userIds: [] },
    { kind: "platform", area: "all_tenants" },
    { kind: "platform", area: "platform_audit", organizationId: id },
  ])
    assert.equal(
      adminAccessRequestSchema.safeParse({ ...request, scope }).success,
      false,
    );
});

test("client role, authorization, MFA and actor claims are not administrative DTO fields", () => {
  for (const injected of [
    { role: "platform_admin" },
    { authorized: true },
    { mfaVerifiedAt: new Date().toISOString() },
    { actorUserId: id },
    { approval: true },
  ]) {
    assert.equal(
      adminAccessRequestSchema.safeParse({ ...request, ...injected }).success,
      false,
    );
  }
  assert.equal(
    adminAccessRequestSchema.safeParse({ ...request, justification: " " })
      .success,
    false,
  );
});

test("platform setting inputs reject secret/role keys, type confusion and body approval", () => {
  assert.ok(
    platformSettingChangeSchema.safeParse({
      key: "booking.hold_minutes",
      value: 15,
      expectedRevision: 1,
    }).success,
  );
  assert.ok(
    platformSettingChangeSchema.safeParse({
      key: "moderation.review_required",
      value: true,
      expectedRevision: 1,
    }).success,
  );
  for (const input of [
    { key: "PAYMENTS_PROVIDER_API_KEY", value: "secret", expectedRevision: 1 },
    { key: "authorization.platform_admin", value: true, expectedRevision: 1 },
    { key: "moderation.review_required", value: 1, expectedRevision: 1 },
    { key: "booking.hold_minutes", value: true, expectedRevision: 1 },
    { key: "booking.hold_minutes", value: 15, expectedRevision: 0 },
    {
      key: "booking.hold_minutes",
      value: 15,
      expectedRevision: 1,
      approvedBy: id,
    },
  ])
    assert.equal(platformSettingChangeSchema.safeParse(input).success, false);
});

test("central admin capabilities remain absent from every customer and organization role", () => {
  for (const role of [
    "customer",
    "organization_owner",
    "organization_manager",
    "staff",
    "member",
  ] as const) {
    assert.ok(
      ROLE_PERMISSIONS[role].every(
        (permission) => (permission.scope as string) !== "platform",
      ),
    );
  }
  const grants = ROLE_PERMISSIONS.platform_admin.map(
    (p) => `${p.resource}:${p.action}`,
  );
  for (const key of [
    "moderation:decide",
    "report:export",
    "platform_setting:apply",
    "user:revoke_sessions",
    "audit:export",
  ])
    assert.ok(grants.includes(key));
  for (const key of [
    "audit:edit",
    "user:impersonate",
    "user:assign_role",
    "payment:refund",
    "booking:manage",
  ])
    assert.ok(!grants.includes(key));
});

for (const moduleName of [
  "admin",
  "organization-approvals",
  "user-management",
  "moderation",
  "reports",
  "platform-settings",
  "audit-logs",
]) {
  test(`${moduleName}: server-only administrative ports contain no working operations`, () => {
    const filename = path.join(
      process.cwd(),
      "src/modules",
      moduleName,
      "application/ports/contracts.server.ts",
    );
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    assert.ok(
      source.statements.some(
        (node) =>
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text === "server-only",
      ),
    );
    for (const statement of source.statements)
      assert.ok(
        ts.isImportDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement),
      );
    const publicFilename = path.join(
      process.cwd(),
      "src/modules",
      moduleName,
      "application/public.ts",
    );
    const publicSource = ts.createSourceFile(
      publicFilename,
      fs.readFileSync(publicFilename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of publicSource.statements)
      assert.ok(ts.isExportDeclaration(statement) && statement.isTypeOnly);
  });
}
