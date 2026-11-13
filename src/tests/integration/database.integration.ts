import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
import type { PoolClient } from "pg";
import { sql } from "drizzle-orm";
import { createDatabase } from "@/db/client.server";
import { checkDatabaseHealth } from "@/db/health.server";
import {
  executeMigrationPlan,
  readMigrationPlan,
} from "@/db/migrations.server";

loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

test("PostgreSQL migrations, connectivity, rollback and relational constraints", async (t) => {
  // Fail explicitly rather than silently skip real database verification.
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Configure TEST_DATABASE_URL for a disposable database ending in _test. No fallback to DATABASE_URL is permitted.",
  );
  const url = new URL(process.env.TEST_DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  assert.match(
    databaseName,
    /^[a-z0-9_]+_test$/,
    "Only a disposable *_test database is accepted.",
  );
  if (process.env.DATABASE_URL) {
    const app = new URL(process.env.DATABASE_URL);
    assert.ok(
      app.hostname !== url.hostname ||
        (app.port || "5432") !== (url.port || "5432") ||
        app.pathname !== url.pathname,
      "TEST_DATABASE_URL must not target the application database.",
    );
  }
  const database = createDatabase({
    ...process.env,
    NODE_ENV: "test",
    DATABASE_ENABLED: "true",
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    DATABASE_POOL_MAX: "2",
  });
  try {
    const connection = await database.pool.connect();
    try {
      await t.test(
        "migration target and fingerprint guards run before DDL",
        async () => {
          const plan = readMigrationPlan();
          await assert.rejects(
            executeMigrationPlan(connection, plan, "unapproved", databaseName),
          );
          await assert.rejects(
            executeMigrationPlan(
              connection,
              plan,
              plan.fingerprint,
              databaseName + "_wrong",
            ),
          );
        },
      );
      const plan = readMigrationPlan();
      // Additive migrations on explicit disposable target only; never reset/drop it.
      await executeMigrationPlan(
        connection,
        plan,
        plan.fingerprint,
        databaseName,
      );
      await t.test(
        "migration execution is repeatable and verifies immutable history",
        async () => {
          const before = await connection.query(
            "SELECT count(*) FROM drizzle.__drizzle_migrations",
          );
          await executeMigrationPlan(
            connection,
            plan,
            plan.fingerprint,
            databaseName,
          );
          const after = await connection.query(
            "SELECT count(*) FROM drizzle.__drizzle_migrations",
          );
          assert.deepEqual(after.rows, before.rows);
        },
      );
      await t.test("pool health and Drizzle query both connect", async () => {
        assert.equal((await checkDatabaseHealth(database)).status, "up");
        const result = await database.db.execute(sql`SELECT 1 AS value`);
        assert.equal(result.rows[0].value, 1);
      });
      await connection.query("BEGIN");
      const customer = randomUUID(),
        otherCustomer = randomUUID(),
        org = randomUUID(),
        otherOrg = randomUUID();
      const store = randomUUID(),
        otherStore = randomUUID(),
        member = randomUUID(),
        staff = randomUUID();
      const service = randomUUID(),
        product = randomUUID(),
        booking = randomUUID();
      const suffix = randomUUID();
      try {
        await connection.query(
          "INSERT INTO users (id,email,display_name) VALUES ($1,$2,$3),($4,$5,$3)",
          [
            customer,
            `customer-${suffix}@example.test`,
            "Fixture",
            otherCustomer,
            `other-${suffix}@example.test`,
          ],
        );
        await connection.query(
          "INSERT INTO organizations (id,name,slug) VALUES ($1,$2,$3),($4,$2,$5)",
          [org, "Fixture", `org-${suffix}`, otherOrg, `other-${suffix}`],
        );
        await connection.query(
          "INSERT INTO stores (id,organization_id,name,slug,timezone) VALUES ($1,$2,$3,$4,$5),($6,$7,$3,$4,$5)",
          [store, org, "Fixture", "store", "UTC", otherStore, otherOrg],
        );
        await connection.query(
          "INSERT INTO organization_members (id,organization_id,user_id,role) VALUES ($1,$2,$3,$4)",
          [member, org, customer, "staff"],
        );
        await connection.query(
          "INSERT INTO staff (id,organization_id,store_id,organization_member_id) VALUES ($1,$2,$3,$4)",
          [staff, org, store, member],
        );
        await connection.query(
          "INSERT INTO services (id,organization_id,store_id,name,duration_minutes,price,currency) VALUES ($1,$2,$3,$4,30,20,$5)",
          [service, org, store, "Service", "USD"],
        );
        await connection.query(
          "INSERT INTO products (id,organization_id,store_id,sku,name,price,currency) VALUES ($1,$2,$3,$4,$4,10,$5)",
          [product, org, store, "sku", "USD"],
        );
        await connection.query(
          `INSERT INTO bookings (id,organization_id,store_id,customer_user_id,status,starts_at,ends_at,total_amount,currency,idempotency_key,request_fingerprint,policy_snapshot)
          VALUES ($1,$2,$3,$4,'confirmed',now(),now()+interval '30 minutes',20,'USD',$5,$6,'{}')`,
          [booking, org, store, customer, suffix, "a".repeat(64)],
        );

        async function rejectsCode(
          name: string,
          query: string,
          values: unknown[],
          code: string,
        ) {
          await t.test(name, async () => {
            await connection.query("SAVEPOINT expected_violation");
            try {
              await assert.rejects(
                connection.query(query, values),
                (error: { code?: string }) => error.code === code,
              );
            } finally {
              await connection.query(
                "ROLLBACK TO SAVEPOINT expected_violation",
              );
              await connection.query("RELEASE SAVEPOINT expected_violation");
            }
          });
        }
        await constraintChecks(connection, rejectsCode, {
          customer,
          otherCustomer,
          org,
          otherOrg,
          store,
          otherStore,
          member,
          staff,
          service,
          product,
          booking,
          suffix,
        });
      } finally {
        await connection.query("ROLLBACK");
      }
      await t.test("all fixture rows rolled back", async () => {
        const result = await connection.query(
          "SELECT id FROM users WHERE id = $1",
          [customer],
        );
        assert.equal(result.rowCount, 0);
      });
    } finally {
      connection.release();
    }
  } finally {
    await database.close();
  }
});

async function constraintChecks(
  connection: PoolClient,
  rejects: (
    name: string,
    query: string,
    values: unknown[],
    code: string,
  ) => Promise<void>,
  f: Record<string, string>,
) {
  await rejects(
    "email uniqueness is case insensitive",
    "INSERT INTO users (email,display_name) VALUES ($1,$2)",
    [`CUSTOMER-${f.suffix}@EXAMPLE.TEST`, "Fixture"],
    "23505",
  );
  await rejects(
    "tenant membership is unique",
    "INSERT INTO organization_members (organization_id,user_id) VALUES ($1,$2)",
    [f.org, f.customer],
    "23505",
  );
  await rejects(
    "staff cannot use another tenant store",
    "INSERT INTO staff (organization_id,store_id,organization_member_id) VALUES ($1,$2,$3)",
    [f.org, f.otherStore, f.member],
    "23503",
  );
  await rejects(
    "catalog cannot reference another tenant store",
    "UPDATE services SET store_id=$1 WHERE id=$2",
    [f.otherStore, f.service],
    "23503",
  );
  await rejects(
    "revision must be positive",
    "UPDATE stores SET revision=0 WHERE id=$1",
    [f.store],
    "23514",
  );
  await rejects(
    "duration must be positive",
    "UPDATE services SET duration_minutes=0 WHERE id=$1",
    [f.service],
    "23514",
  );
  await rejects(
    "price must not be negative",
    "UPDATE products SET price=-1 WHERE id=$1",
    [f.product],
    "23514",
  );
  await rejects(
    "price must not be NaN",
    "UPDATE products SET price='NaN' WHERE id=$1",
    [f.product],
    "23514",
  );
  await rejects(
    "store-local SKU is unique",
    "INSERT INTO products (organization_id,store_id,sku,name,price,currency) VALUES ($1,$2,$3,$3,10,$4)",
    [f.org, f.store, "sku", "USD"],
    "23505",
  );
  await rejects(
    "booking window must be ordered",
    "UPDATE bookings SET ends_at=starts_at WHERE id=$1",
    [f.booking],
    "23514",
  );
  await rejects(
    "customer booking request is idempotent",
    `INSERT INTO bookings
    (organization_id,store_id,customer_user_id,status,starts_at,ends_at,total_amount,currency,idempotency_key,request_fingerprint,policy_snapshot)
    SELECT organization_id,store_id,customer_user_id,status,starts_at,ends_at,total_amount,currency,idempotency_key,request_fingerprint,policy_snapshot FROM bookings WHERE id=$1`,
    [f.booking],
    "23505",
  );
  await rejects(
    "booking policy is an object",
    "UPDATE bookings SET policy_snapshot='[]' WHERE id=$1",
    [f.booking],
    "23514",
  );
  await rejects(
    "pending booking requires hold deadline",
    "UPDATE bookings SET status='pending' WHERE id=$1",
    [f.booking],
    "23514",
  );
  await rejects(
    "review must belong to booking customer",
    "INSERT INTO reviews (organization_id,store_id,booking_id,customer_user_id,rating,body) VALUES ($1,$2,$3,$4,5,$5)",
    [f.org, f.store, f.booking, f.otherCustomer, "Review"],
    "23503",
  );
  await rejects(
    "payment currency must match booking",
    "INSERT INTO payments (organization_id,booking_id,amount,currency,provider,provider_account_ref,request_fingerprint,idempotency_key) VALUES ($1,$2,20,$3,$4,$5,$6,$7)",
    [f.org, f.booking, "EUR", "test", "account", "a".repeat(64), randomUUID()],
    "23503",
  );
  await rejects(
    "deal value alternatives are exclusive",
    "INSERT INTO deals (organization_id,code,name,kind,percentage,amount,currency,starts_at) VALUES ($1,'TEST','Test','percentage',10,10,'USD',now())",
    [f.org],
    "23514",
  );
  const paymentKey = randomUUID();
  await connection.query(
    `INSERT INTO payments
    (organization_id,booking_id,amount,currency,provider,provider_account_ref,provider_payment_id,request_fingerprint,idempotency_key)
    VALUES ($1,$2,20,'USD','test',$3,$4,$5,$6)`,
    [f.org, f.booking, f.suffix, "payment", "a".repeat(64), paymentKey],
  );
  await rejects(
    "provider payment reference is unique within account",
    `INSERT INTO payments
    (organization_id,booking_id,amount,currency,provider,provider_account_ref,provider_payment_id,request_fingerprint,idempotency_key)
    VALUES ($1,$2,20,'USD','test',$3,'payment',$4,$5)`,
    [f.org, f.booking, f.suffix, "a".repeat(64), randomUUID()],
    "23505",
  );
  await rejects(
    "payment request is idempotent within tenant",
    `INSERT INTO payments
    (organization_id,booking_id,amount,currency,provider,provider_account_ref,request_fingerprint,idempotency_key)
    VALUES ($1,$2,20,'USD','test',$3,$4,$5)`,
    [f.org, f.booking, f.suffix, "a".repeat(64), paymentKey],
    "23505",
  );
  await rejects(
    "audit metadata must be an object",
    "INSERT INTO audit_logs (action,subject_type,metadata) VALUES ('test','test','[]')",
    [],
    "23514",
  );
  await rejects(
    "referenced organizations cannot be deleted",
    "DELETE FROM organizations WHERE id=$1",
    [f.org],
    "23503",
  );
  await connection.query(
    "INSERT INTO booking_items (organization_id,store_id,booking_id,kind,product_id,name_snapshot,quantity,unit_price) VALUES ($1,$2,$3,$4,$5,$6,1,10)",
    [f.org, f.store, f.booking, "product", f.product, "Product"],
  );
  await rejects(
    "product line cannot carry service assignment",
    "UPDATE booking_items SET staff_id=$1 WHERE booking_id=$2",
    [f.staff, f.booking],
    "23514",
  );
  await connection.query(
    "INSERT INTO favorites (customer_user_id,organization_id,store_id) VALUES ($1,$2,$3)",
    [f.customer, f.org, f.store],
  );
  await rejects(
    "favorite store is unique per customer",
    "INSERT INTO favorites (customer_user_id,organization_id,store_id) VALUES ($1,$2,$3)",
    [f.customer, f.org, f.store],
    "23505",
  );
}
