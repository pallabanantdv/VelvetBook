import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { payments } from "../db/schema/commerce/payments";
import type { IntegrationCallContext } from "../core/integrations";
import type {
  PaymentState,
  PaymentRefundState,
} from "../modules/payments/application/public";
import type {
  VerifiedWebhook,
  ResolvedWebhookAccount,
} from "../modules/webhooks/application/public";
import type {
  DomainEvent,
  CommittedOutboxRecord,
  EventTransactionContext,
} from "../modules/domain-events/application/public";
import type { StoredAssetPolicy } from "../modules/file-storage/application/public";

type Assert<T extends true> = T;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type IntegrationTypeChecks = [
  Assert<
    Equal<NonNullable<typeof payments.status.enumValues>[number], PaymentState>
  >,
  Assert<
    Equal<
      NonNullable<typeof payments.refundStatus.enumValues>[number],
      PaymentRefundState
    >
  >,
  Assert<
    Omit<IntegrationCallContext, symbol> extends IntegrationCallContext
      ? false
      : true
  >,
  Assert<Omit<VerifiedWebhook, symbol> extends VerifiedWebhook ? false : true>,
  Assert<
    Omit<ResolvedWebhookAccount, symbol> extends ResolvedWebhookAccount
      ? false
      : true
  >,
  Assert<
    Omit<CommittedOutboxRecord, symbol> extends CommittedOutboxRecord
      ? false
      : true
  >,
  Assert<
    Omit<EventTransactionContext, symbol> extends EventTransactionContext
      ? false
      : true
  >,
  Assert<
    Equal<
      Extract<StoredAssetPolicy, { purpose: "document" }>["access"],
      "private"
    >
  >,
  Assert<
    Extract<
      DomainEvent,
      { type: "booking.confirmed.v1" }
    >["payload"] extends Extract<
      DomainEvent,
      { type: "payment.succeeded.v1" }
    >["payload"]
      ? false
      : true
  >,
];

const modules = [
  "payments",
  "refunds",
  "notifications",
  "file-storage",
  "maps",
  "email",
  "webhooks",
  "domain-events",
];
const root = process.cwd();
for (const moduleName of modules) {
  test(`${moduleName}: ports stay server-only declarations with no live implementation`, () => {
    const file = path.join(
      root,
      "src/modules",
      moduleName,
      "application/ports/contracts.server.ts",
    );
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
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
    for (const statement of source.statements) {
      assert.ok(
        ts.isImportDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement),
        `Executable declaration in ${moduleName}`,
      );
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const name = statement.moduleSpecifier.text;
        assert.ok(
          name === "server-only" ||
            name.startsWith("@/core/") ||
            name.startsWith("@/modules/") ||
            name.startsWith("../../domain/"),
          name,
        );
      }
    }
    const publicFile = path.join(
      root,
      "src/modules",
      moduleName,
      "application/public.ts",
    );
    const publicSource = ts.createSourceFile(
      publicFile,
      fs.readFileSync(publicFile, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of publicSource.statements)
      assert.ok(ts.isExportDeclaration(statement) && statement.isTypeOnly);
  });
}

test("integration environment examples are empty and server-only", () => {
  const content = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  const pairs = content
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => line.split("="));
  const env = new Map(pairs.map(([key, ...value]) => [key, value.join("=")]));
  for (const key of [
    "PAYMENTS_PROVIDER_API_KEY",
    "PAYMENTS_WEBHOOK_SIGNING_SECRET",
    "STORAGE_SECRET_ACCESS_KEY",
    "MAPS_SERVER_API_KEY",
    "EMAIL_PROVIDER_API_KEY",
    "SMS_PROVIDER_API_KEY",
    "PUSH_SERVICE_CREDENTIALS",
    "EVENTS_BROKER_URL",
  ]) {
    assert.equal(env.get(key), "", key);
  }
  assert.ok([...env.keys()].every((key) => !key.startsWith("NEXT_PUBLIC_")));
});

test("financial states remain distinct from refund outcome states", () => {
  assert.deepEqual(payments.status.enumValues, [
    "initiating",
    "pending",
    "succeeded",
    "failed",
    "cancelled",
  ]);
  assert.deepEqual(payments.refundStatus.enumValues, [
    "none",
    "pending",
    "partially_refunded",
    "refunded",
    "failed",
  ]);
});
