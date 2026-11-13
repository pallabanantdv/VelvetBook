import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { validateEnvironment } from "@/config/environment.server";
import type { ApplicationErrorCategory } from "@/core/errors";
import type { ResponseMetadata } from "@/shared/presentation/api-contracts";
import {
  mapApplicationError,
  mapUnexpectedError,
} from "@/shared/presentation/error-mapping.server";
import { validateInput } from "@/shared/validation/input.server";
import { createPaginationInputSchema } from "@/shared/validation/pagination.server";

const meta = {
  requestId: "request",
  correlationId: "correlation",
} as ResponseMetadata;
test("architecture configuration works without credentials and parses false explicitly", () => {
  const result = validateEnvironment({
    NODE_ENV: "production",
    DATABASE_ENABLED: "false",
    LOG_LEVEL: "",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.DATABASE_ENABLED, false);
  assert.equal(result.value.LOG_LEVEL, "info");
  assert.equal(result.value.PAGINATION_DEFAULT_LIMIT, 25);
  assert.equal(result.value.DATABASE_URL, undefined);
});
test("configuration rejects invalid booleans, integers, protocols and incomplete capabilities", () => {
  for (const input of [
    { DATABASE_ENABLED: "yes" },
    { REQUEST_TIMEOUT_MS: "-1" },
    { REQUEST_TIMEOUT_MS: "1.5" },
    { REQUEST_TIMEOUT_MS: "Infinity" },
    { DATABASE_URL: "https://example.com" },
    { PAYMENTS_ENABLED: "true" },
    { DATABASE_ENABLED: "true" },
    { PAGINATION_DEFAULT_LIMIT: "101", PAGINATION_MAXIMUM_LIMIT: "100" },
  ]) {
    assert.equal(validateEnvironment(input).ok, false);
  }
  assert.equal(
    validateEnvironment({
      DATABASE_ENABLED: "true",
      DATABASE_URL: "postgresql://user:secret@localhost/db",
    }).ok,
    true,
  );
});
test("environment failures never echo secrets and reject public credential aliases", () => {
  const result = validateEnvironment({
    DATABASE_URL: "private-sentinel",
    NEXT_PUBLIC_DATABASE_URL: "private-sentinel",
  });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes("private-sentinel"), false);
  if (result.ok) return;
  assert.ok(
    result.error.issues.some((issue) => issue.code === "public_secret"),
  );
});
const statuses: Record<ApplicationErrorCategory, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
  internal: 500,
};
for (const category of Object.keys(statuses) as ApplicationErrorCategory[]) {
  test(`public mapping for ${category} suppresses internal messages and codes`, () => {
    const result = mapApplicationError(
      {
        kind: "application",
        category,
        code: "private-sentinel",
        message: "private-sentinel",
        issues: [{ field: "name", code: "required" }],
      },
      meta,
    );
    assert.equal(result.status, statuses[category]);
    assert.equal(result.body.ok, false);
    assert.deepEqual(result.body.meta, meta);
    assert.equal(JSON.stringify(result).includes("private-sentinel"), false);
    assert.equal(
      result.body.error.issues !== undefined,
      category === "validation",
    );
  });
}
test("unexpected errors map to a generic response and validation issues are bounded", () => {
  assert.equal(mapUnexpectedError(meta).status, 500);
  const result = mapApplicationError(
    {
      kind: "application",
      category: "validation",
      code: "bad",
      message: "private",
      issues: Array.from({ length: 70 }, () => ({
        field: "name",
        code: "required" as const,
        secret: "private",
      })),
    },
    meta,
  );
  assert.equal(result.body.error.issues?.length, 50);
  assert.equal(JSON.stringify(result).includes("private"), false);
});
test("input validation exposes only allowlisted schema fields and no input or Zod messages", () => {
  const schema = z.strictObject({
    name: z.string().min(2),
    password: z.string().min(20),
    items: z.array(z.object({ title: z.string() })),
  });
  const result = validateInput(
    schema,
    {
      name: "a",
      password: "secret-sentinel",
      items: [{ title: 3 }],
      "private-key-sentinel": true,
    },
    ["name", "items.*.title"],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(
    result.error.issues.some((issue) => issue.field === "items.*.title"),
  );
  assert.ok(result.error.issues.some((issue) => issue.field === null));
  assert.equal(JSON.stringify(result).includes("secret-sentinel"), false);
  assert.equal(JSON.stringify(result).includes("private-key-sentinel"), false);
});
test("pagination defaults, cursor and integer bounds are explicit without coercion", () => {
  const schema = createPaginationInputSchema({
    defaultLimit: 25,
    maximumLimit: 100,
  });
  assert.deepEqual(schema.parse({}), { cursor: null, limit: 25 });
  assert.equal(
    schema.safeParse({ cursor: "opaque", limit: 100 }).success,
    true,
  );
  for (const input of [
    { limit: 101 },
    { limit: 0 },
    { limit: 1.5 },
    { limit: "25" },
    { cursor: "" },
    { extra: true },
  ])
    assert.equal(schema.safeParse(input).success, false);
  assert.throws(
    () => createPaginationInputSchema({ defaultLimit: 101, maximumLimit: 100 }),
    RangeError,
  );
});
