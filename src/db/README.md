# PostgreSQL architecture — proposed

This phase declares a reviewable schema, not a live database. No PostgreSQL
client, pool, connection, repository, migration, seed, or API exists. `pg` is
installed for the future Node.js adapter but is not imported or instantiated.
The schema is a proposal and must be reviewed before any migration is generated.

## Layout and ownership

`schema/` groups storage definitions by owning domain: `identity`,
`organizations`, `catalog`, `bookings`, `commerce`, and `audit`. These are storage
namespaces, not a requirement to create six feature modules. Domain/application
code never imports Drizzle schemas or inferred database row types. Future owning
module infrastructure maps persistence records to domain/application contracts.
Foreign keys may reference other schema files directly; never import the schema
barrel from a schema file. The barrel is only a tooling/composition entry point.

Every schema file imports `server-only`, protecting direct and transitive client
imports. Offline tools use the `react-server` resolution condition to load the
marker outside Next.js; this does not remove the Next.js client boundary.

## Offline verification

```sh
npm run db:check
npm run typecheck
npm run lint
npm run test:architecture
```

`db:check` uses Node, tsx, Drizzle metadata, and Drizzle Kit's pure snapshot
serializer. It checks table inventory, UUID primary keys, foreign-key types and
unique targets, tenant/store consistency, index coverage, identifier lengths,
money precision, and critical checks. It writes no migration files and executes
no SQL. It does not prove PostgreSQL accepts the DDL or validate query plans;
database integration checks remain deferred until a connection is authorized.

`drizzle.config.ts` names PostgreSQL, the schema entry point, and a future output
directory, but deliberately omits `dbCredentials`. It does not read environment
variables. `DATABASE_URL` in `.env.example` remains empty. No connection, migrate,
push, seed, or studio scripts are provided. Future tooling that loads the schema
must retain the server condition used in `db:check`.

## Conventions

- UUID `id` primary keys use PostgreSQL `gen_random_uuid()` defaults. PostgreSQL
  15+ is the proposed deployment baseline; no extension is declared.
- Physical tables use snake_case in PostgreSQL's public schema. Logical domain
  grouping lives in source directories, not separate PostgreSQL schemas.
- All mutable rows have `created_at` and `updated_at`, `timestamptz NOT NULL
DEFAULT now()`. Updates must explicitly set `updated_at`; no trigger or
  ORM-only update hook is implied. Audit rows have only `created_at`.
- Tenant-owned rows require `organization_id`. Tenant-to-tenant references use
  composite foreign keys; store-scoped references also include `store_id`.
  Global users and organizations are roots. Audit organization is nullable only
  for platform events. A nullable member of a composite FK uses PostgreSQL's
  default MATCH SIMPLE, allowing an absent optional relationship.
- All foreign keys use RESTRICT on delete and default NO ACTION on update.
  Every FK has a leading-column index or unique constraint supporting it.
  There are no cascades or automated retention jobs.
- Tenant FKs prevent inconsistent relationships, not unauthorized reads. No RLS,
  tenant query filter, membership policy, or authorization implementation exists.
- Money is `numeric(14,2)` (12 integral digits), represented by Drizzle as strings.
  No JavaScript floating-point calculations are introduced. Amount checks reject
  NaN and negatives; payment/fixed-deal amounts must be positive. Percentages use
  `numeric(5,2)` in `(0,100]`. Currency is uppercase `char(3)`; the pattern does
  not validate the ISO currency registry. Only two-decimal currencies are proposed.
- Only services and products have `deleted_at`: catalog retirement must preserve
  booked references and snapshots. Future queries explicitly filter it; no
  automatic scope exists. SKU uniqueness survives soft deletion. Other rows use
  explicit lifecycle status, archive, or disable fields rather than generic soft
  deletion. Archival does not automatically disable descendants.
- Bookings, items, payments, memberships, and audit logs retain history. Audit is
  append-only by convention only; grants/triggers and retention are not implemented.
  User disabling is not erasure; privacy/anonymization policy remains open.

## Proposed relationships and open questions

Every relationship below is proposed, not a settled business requirement.

| Proposal in schema                                                                                                                 | Decision still needed                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| One global user can hold memberships in many organizations, each with owner/manager/staff/member role                              | Role permissions, multiple roles, last-owner protection, invitations before signup, membership history                     |
| Staff is one membership assignment per store; the same member can work at multiple stores                                          | Contractors without accounts, staff capabilities, cross-store scheduling, inactive membership effects                      |
| Services and products belong to one store                                                                                          | Organization-wide catalogs, shared SKUs, variants, inventory and staff-service eligibility                                 |
| Booking belongs to one store and one registered customer; a booking may contain service and product lines                          | Guests, retail-only orders, group appointments, multi-store orders, minimum one line                                       |
| Service line has quantity one, positive duration, optional staff; product line has positive integer quantity and no staff/duration | Multiple staff per service, per-line appointment times, overlap prevention, time zones/DST and availability                |
| Line name, price, and duration are snapshots; line currency is inherited from booking                                              | Preventing cross-currency catalog selection, total reconciliation, taxes, rounding, edits after confirmation               |
| One optional organization-wide deal per booking; percentage or fixed amount                                                        | Eligibility, store scope, stacking, redemption limits, booking/fixed-deal currency match, immutable discount snapshots     |
| Multiple payment attempts per booking, matching its tenant and currency                                                            | Partial capture, refunds, settlement, ledger, provider-account namespace, webhook lifecycle and overpayment prevention     |
| Provider payment reference is unique per provider; request idempotency unique per organization                                     | Whether provider references are only unique per merchant account and how retries are scoped                                |
| Audit actor is an optional global user; subject is a polymorphic UUID reference without an FK                                      | System/service actors, actor snapshotting, subject integrity, payload allowlist/redaction, retention and tamper resistance |

Row checks enforce simple numeric, status, and relationship shape rules. They do
not enforce temporal availability, membership activity, soft-deleted selection,
deal eligibility, nonempty bookings, line-to-header totals, payment sums, or
cross-row status transitions. These require future domain/application behavior
and possibly additional database constraints after decisions are confirmed.

See the [data dictionary](../../../docs/database/data-dictionary.md) and
[proposed Mermaid ERD](../../../docs/database/erd.md).

The declaration approach follows the official [Drizzle constraints guide](https://orm.drizzle.team/docs/indexes-constraints)
and [schema-only configuration reference](https://orm.drizzle.team/docs/drizzle-config-file).
