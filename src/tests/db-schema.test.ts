import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { generateDrizzleJson } from "drizzle-kit/api";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import config from "../../drizzle.config";
import * as schema from "../db/schema";

const tables = Object.values(schema).map(getTableConfig);
const names = (columns: { name: string }[]) => columns.map((c) => c.name);
const same = (a: string[], b: string[]) =>
  JSON.stringify(a) === JSON.stringify(b);
const expectedTables = [
  "users",
  "organizations",
  "organization_members",
  "stores",
  "staff",
  "services",
  "products",
  "bookings",
  "booking_items",
  "deals",
  "payments",
  "audit_logs",
  "customer_profiles",
  "favorites",
  "reviews",
];

test("physical Mermaid ERD names match the proposed schema inventory", () => {
  const erd = fs.readFileSync("docs/database/erd.md", "utf8");
  const declared = [...erd.matchAll(/^ {4}([a-z_]+) \{$/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(declared.sort(), [...expectedTables].sort());
});

test("review ownership and request idempotency are backed by composite constraints", () => {
  const review = getTableConfig(schema.reviews);
  const owner = review.foreignKeys.find(
    (fk) => fk.getName() === "reviews_booking_customer_fk",
  );
  assert.ok(owner);
  assert.deepEqual(names(owner.reference().columns), [
    "organization_id",
    "store_id",
    "booking_id",
    "customer_user_id",
  ]);
  assert.deepEqual(names(owner.reference().foreignColumns), [
    "organization_id",
    "store_id",
    "id",
    "customer_user_id",
  ]);
  const booking = getTableConfig(schema.bookings);
  assert.ok(
    booking.uniqueConstraints.some((constraint) =>
      same(names(constraint.columns), ["customer_user_id", "idempotency_key"]),
    ),
  );
});

test("Drizzle Kit serializes exactly the proposed tables without credentials or a connection", () => {
  assert.equal(config.dialect, "postgresql");
  assert.equal("dbCredentials" in config, false);
  // Pure in-memory metadata serialization: no migration generation or execution.
  const snapshot = generateDrizzleJson(schema);
  assert.deepEqual(
    Object.values(snapshot.tables)
      .map((t) => {
        assert.ok(typeof t === "object" && t !== null && "name" in t);
        return t.name;
      })
      .sort(),
    [...expectedTables].sort(),
  );
  assert.equal(new Set(tables.map((t) => t.name)).size, expectedTables.length);
});

test("all tables have a UUID primary key and time-zone-aware creation time", () => {
  for (const table of tables) {
    const primary = table.columns.filter((c) => c.primary);
    assert.deepEqual(names(primary), ["id"], table.name);
    assert.equal(primary[0].getSQLType(), "uuid");
    assert.ok(primary[0].hasDefault);
    for (const name of table.name === "audit_logs"
      ? ["created_at"]
      : ["created_at", "updated_at"]) {
      const column = table.columns.find((c) => c.name === name);
      assert.ok(column?.notNull && column.hasDefault, `${table.name}.${name}`);
      assert.match(column.getSQLType(), /timestamp with time zone/);
    }
    for (const column of table.columns)
      assert.equal(column.onUpdateFn, undefined);
  }
});

test("foreign keys have matching types and reference existing complete unique keys", () => {
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const ref = fk.reference();
      const target = getTableConfig(ref.foreignTable);
      assert.ok(
        tables.some((t) => t.name === target.name),
        fk.getName(),
      );
      assert.deepEqual(
        ref.columns.map((c) =>
          table.columns.find((column) => column.name === c.name)!.getSQLType(),
        ),
        ref.foreignColumns.map((c) =>
          target.columns.find((column) => column.name === c.name)!.getSQLType(),
        ),
      );
      const uniqueKeys = [
        names(target.columns.filter((c) => c.primary)),
        ...target.uniqueConstraints.map((u) => names(u.columns)),
      ];
      assert.ok(
        uniqueKeys.some((key) => same(key, names(ref.foreignColumns))),
        fk.getName(),
      );
      assert.equal(fk.onDelete, "restrict", fk.getName());
    }
  }
});

test("tenant/store foreign keys cannot reference another tenant or store", () => {
  for (const table of tables) {
    if (!["users", "customer_profiles"].includes(table.name)) {
      const tenant = table.columns.find((c) => c.name === "organization_id");
      if (table.name !== "organizations") assert.ok(tenant, table.name);
      if (tenant && table.name !== "audit_logs")
        assert.ok(tenant.notNull, table.name);
    }
    for (const fk of table.foreignKeys) {
      const ref = fk.reference();
      const target = getTableConfig(ref.foreignTable);
      for (const scope of ["organization_id", "store_id"]) {
        if (
          table.columns.some((c) => c.name === scope) &&
          target.columns.some((c) => c.name === scope)
        ) {
          const position = ref.columns.findIndex((c) => c.name === scope);
          assert.ok(position >= 0, `${fk.getName()} must include ${scope}`);
          assert.equal(ref.foreignColumns[position].name, scope);
        }
      }
    }
  }
});

test("every foreign key has a supporting index prefix", () => {
  for (const table of tables) {
    const indexed = [
      names(table.columns.filter((c) => c.primary)),
      ...table.uniqueConstraints.map((u) => names(u.columns)),
      ...table.indexes.map((i) =>
        i.config.columns.map((c) => ("name" in c ? c.name : undefined)),
      ),
    ];
    for (const fk of table.foreignKeys) {
      const columns = names(fk.reference().columns);
      assert.ok(
        indexed.some((key) =>
          same(key.slice(0, columns.length) as string[], columns),
        ),
        fk.getName(),
      );
    }
  }
});

test("index and constraint names fit PostgreSQL identifiers and avoid collisions", () => {
  const indexNames = new Set<string>();
  for (const table of tables) {
    const localNames = new Set<string>();
    for (const name of [
      `${table.name}_pkey`,
      ...table.uniqueConstraints.map((u) => u.getName()),
      ...table.indexes.map((i) => i.config.name),
    ]) {
      assert.ok(name);
      assert.ok(Buffer.byteLength(name) <= 63, name);
      assert.ok(!indexNames.has(name), name);
      indexNames.add(name);
      localNames.add(name);
    }
    for (const name of [
      ...table.checks.map((c) => c.name),
      ...table.foreignKeys.map((f) => f.getName()),
    ]) {
      assert.ok(Buffer.byteLength(name) <= 63, name);
      assert.ok(!localNames.has(name), name);
      localNames.add(name);
    }
  }
});

test("money stays decimal strings with explicit precision, not floating point", () => {
  const money = [
    schema.services.price,
    schema.products.price,
    schema.bookingItems.unitPrice,
    schema.bookings.totalAmount,
    schema.payments.amount,
    schema.deals.amount,
  ];
  for (const column of money) {
    assert.equal(column.getSQLType().replaceAll(" ", ""), "numeric(14,2)");
    assert.equal(column.dataType, "string");
  }
  assert.equal(
    schema.deals.percentage.getSQLType().replaceAll(" ", ""),
    "numeric(5,2)",
  );
});

test("critical check constraints serialize to SQL without parameters", () => {
  const dialect = new PgDialect();
  const checks = new Map(
    tables.flatMap((t) =>
      t.checks.map((c) => {
        const query = dialect.sqlToQuery(c.value);
        assert.equal(query.params.length, 0, c.name);
        return [c.name, query.sql] as const;
      }),
    ),
  );
  for (const name of [
    "items_kind_check",
    "deals_value_check",
    "bookings_window_check",
    "services_duration_check",
    "payments_status_check",
  ]) {
    assert.ok(checks.has(name), name);
  }
  assert.match(checks.get("items_kind_check")!, /service_id[\s\S]*is not null/);
  assert.match(checks.get("items_kind_check")!, /product_id[\s\S]*is not null/);
  for (const name of [
    "services_price_check",
    "products_price_check",
    "items_price_check",
    "bookings_total_check",
    "payments_amount_check",
    "deals_value_check",
  ]) {
    assert.match(checks.get(name)!, /'NaN'::numeric/);
  }
});

test("payments inherit booking currency and only catalog rows use soft deletion", () => {
  const payment = getTableConfig(schema.payments);
  const fk = payment.foreignKeys.find(
    (key) => key.getName() === "payments_booking_currency_fk",
  );
  assert.ok(fk);
  assert.deepEqual(names(fk.reference().columns), [
    "organization_id",
    "booking_id",
    "currency",
  ]);
  assert.deepEqual(names(fk.reference().foreignColumns), [
    "organization_id",
    "id",
    "currency",
  ]);
  assert.deepEqual(
    tables
      .filter((t) => t.columns.some((c) => c.name === "deleted_at"))
      .map((t) => t.name)
      .sort(),
    ["products", "services"],
  );
  assert.ok(
    !getTableConfig(schema.users).columns.some((c) => c.name === "role"),
  );
});
