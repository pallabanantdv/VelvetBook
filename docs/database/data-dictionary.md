# PostgreSQL data dictionary

The initial migration is drizzle/0000_database_foundation.sql. Phase 1 database
infrastructure is implemented; live PostgreSQL validation is pending. No existing
database was changed. See [setup/workflow](development-setup.md).

The physical model is finalized for initial migration review; unresolved business
relationships remain proposed. See [decisions and open
questions](../../src/db/README.md). Names below are physical PostgreSQL names.
**Required** means NOT NULL. A dash in the default column means no default.
All FK deletes are RESTRICT; IDs are immutable by convention.

## Shared columns

Phase 1 also persists revision (integer, NOT NULL, default 1, CHECK > 0) on
organizations, stores, staff, services and products, matching existing domain
contracts. customer_profiles, bookings and payments already have this column.
No trigger increments revisions or updates updated_at: future repository writes
must use compare-and-swap and set both explicitly.

New named checks: organizations_revision_check, stores_revision_check,
staff_revision_check, services_revision_check, products_revision_check,
stores_slug_check, stores_timezone_check, products_sku_check,
payments_request_check, payments_provider_check, audit_metadata_object_check and
audit_labels_check. Product SKU and payment idempotency/provider/account labels
must be nonblank; a non-null provider_payment_id must also be nonblank. Existing
primary/unique/foreign keys and supporting indexes were reviewed and preserved;
no redundant key or FK to a polymorphic audit subject was added.

Migration metadata lives separately in drizzle.__drizzle_migrations with id serial
primary key, hash text NOT NULL and created_at bigint (migration order timestamp).
It is managed by Drizzle and intentionally excluded from the 15 business-table
exports/ERD. Execution verifies its history against checked-in hashes.

Every table has the first two columns. All except `audit_logs` have `updated_at`.

| Column     | Type        | Required | Default           | Meaning                                            |
| ---------- | ----------- | -------- | ----------------- | -------------------------------------------------- |
| id         | uuid PK     | yes      | gen_random_uuid() | Stable row identity                                |
| created_at | timestamptz | yes      | now()             | Creation instant                                   |
| updated_at | timestamptz | yes      | now()             | Last explicit update; not automatically maintained |

## Identity: users

Global account record, without a global partner role or credentials model.

| Column       | Type         | Required | Default | Meaning                                         |
| ------------ | ------------ | -------- | ------- | ----------------------------------------------- |
| email        | varchar(254) | yes      | —       | Nonempty, trimmed email; unique on lower(email) |
| display_name | text         | yes      | —       | Display label                                   |
| disabled_at  | timestamptz  | no       | —       | Account disabling, not soft deletion or erasure |

Index: unique `users_email_ci_uidx` on `lower(email)`. Email format validation,
authentication provider links, email verification, and erasure are deferred.

## Organizations: organizations

| Column | Type         | Required | Default | Meaning                                                                   |
| ------ | ------------ | -------- | ------- | ------------------------------------------------------------------------- |
| name   | text         | yes      | —       | Tenant display name                                                       |
| slug   | varchar(100) | yes      | —       | Globally unique lowercase alphanumeric slug with single hyphen separators |
| status | text         | yes      | active  | active / suspended / closed                                               |

Unique: `slug`. Status and slug shape have CHECK constraints.

## Organizations: organization_members

| Column          | Type    | Required | Default | Meaning                                                       |
| --------------- | ------- | -------- | ------- | ------------------------------------------------------------- |
| organization_id | uuid FK | yes      | —       | organizations.id                                              |
| user_id         | uuid FK | yes      | —       | users.id                                                      |
| role            | text    | yes      | member  | owner / manager / staff / member, scoped to this organization |
| status          | text    | yes      | active  | active / suspended / revoked                                  |

Unique: `(organization_id,user_id)` and `(organization_id,id)`.
Index: `(user_id)`. Role and status have CHECK constraints. The unique membership
pair represents a current membership record; historical changes need audit events
or a future membership-history model.

## Organizations: stores

| Column          | Type         | Required | Default | Meaning                                            |
| --------------- | ------------ | -------- | ------- | -------------------------------------------------- |
| organization_id | uuid FK      | yes      | —       | organizations.id                                   |
| name            | text         | yes      | —       | Store name                                         |
| slug            | varchar(100) | yes      | —       | Stable identifier unique within organization       |
| timezone        | text         | yes      | —       | Proposed IANA timezone, future validation required |
| address         | text         | no       | —       | Unstructured location; address modeling deferred   |
| archived_at     | timestamptz  | no       | —       | Operational retirement without deleting history    |

Unique: `(organization_id,id)` and `(organization_id,slug)`. Store slug is
case-sensitive with lowercase alphanumeric segments separated by single hyphens.
Timezone must be nonblank; IANA validity remains application policy.

## Organizations: staff

| Column                 | Type        | Required | Default | Meaning                        |
| ---------------------- | ----------- | -------- | ------- | ------------------------------ |
| organization_id        | uuid        | yes      | —       | Tenant scope                   |
| store_id               | uuid        | yes      | —       | Store assignment               |
| organization_member_id | uuid        | yes      | —       | Member holding this assignment |
| archived_at            | timestamptz | no       | —       | Assignment retirement          |

FKs: `(organization_id,store_id)` to stores `(organization_id,id)`;
`(organization_id,organization_member_id)` to organization_members `(organization_id,id)`.
Unique: `(organization_id,store_id,id)` and `(organization_id,store_id,organization_member_id)`.
Index: `(organization_id,organization_member_id)`.

## Catalog: services

| Column           | Type          | Required | Default | Meaning                                      |
| ---------------- | ------------- | -------- | ------- | -------------------------------------------- |
| organization_id  | uuid          | yes      | —       | Tenant scope                                 |
| store_id         | uuid          | yes      | —       | Owning store                                 |
| name             | text          | yes      | —       | Current service name                         |
| description      | text          | no       | —       | Current description                          |
| duration_minutes | integer       | yes      | —       | Positive nominal duration                    |
| price            | numeric(14,2) | yes      | —       | Nonnegative finite two-decimal price         |
| currency         | char(3)       | yes      | —       | Uppercase three-letter currency code         |
| deleted_at       | timestamptz   | no       | —       | Soft retirement preserving booked references |

FK: `(organization_id,store_id)` to stores `(organization_id,id)`.
Unique: `(organization_id,store_id,id)`, also supporting store lookup/FK checks.
CHECKs: positive duration, nonnegative non-NaN price, currency pattern.

## Catalog: products

| Column          | Type          | Required | Default | Meaning                                                    |
| --------------- | ------------- | -------- | ------- | ---------------------------------------------------------- |
| organization_id | uuid          | yes      | —       | Tenant scope                                               |
| store_id        | uuid          | yes      | —       | Owning store                                               |
| sku             | varchar(100)  | yes      | —       | Store-local, case-sensitive SKU; not reused after deletion |
| name            | text          | yes      | —       | Current product name                                       |
| description     | text          | no       | —       | Current description                                        |
| price           | numeric(14,2) | yes      | —       | Nonnegative finite two-decimal price                       |
| currency        | char(3)       | yes      | —       | Uppercase three-letter code                                |
| deleted_at      | timestamptz   | no       | —       | Soft retirement preserving booked references               |

FK: `(organization_id,store_id)` to stores `(organization_id,id)`.
Unique: `(organization_id,store_id,id)` and `(organization_id,store_id,sku)`.
CHECKs: nonnegative non-NaN price and currency pattern. No inventory is modeled.

## Bookings: bookings

| Column           | Type          | Required | Default | Meaning                                                                       |
| ---------------- | ------------- | -------- | ------- | ----------------------------------------------------------------------------- |
| organization_id  | uuid          | yes      | —       | Tenant scope                                                                  |
| store_id         | uuid          | yes      | —       | One booking store                                                             |
| customer_user_id | uuid FK       | yes      | —       | Global users.id; customer need not be a tenant member                         |
| deal_id          | uuid          | no       | —       | Optional organization-wide deal                                               |
| status           | text          | yes      | pending | pending / confirmed / in_progress / completed / cancelled / expired / no_show |
| starts_at        | timestamptz   | yes      | —       | Scheduled booking start instant                                               |
| ends_at          | timestamptz   | yes      | —       | Scheduled end, strictly after start                                           |
| total_amount     | numeric(14,2) | yes      | —       | Nonnegative finite payable total snapshot; reconciliation deferred            |
| currency         | char(3)       | yes      | —       | Currency inherited by item prices and enforced for payments                   |

FKs: customer to users; `(organization_id,store_id)` to stores `(organization_id,id)`;
`(organization_id,deal_id)` to deals `(organization_id,id)`.
Unique: `(organization_id,store_id,id)` and `(organization_id,id,currency)`.
Indexes: `(organization_id,store_id,starts_at)`, `(customer_user_id,starts_at)`,
`(organization_id,deal_id)`. CHECKs enforce status, time ordering, total, and currency shape.

## Bookings: booking_items

| Column           | Type          | Required    | Default | Meaning                                                 |
| ---------------- | ------------- | ----------- | ------- | ------------------------------------------------------- |
| organization_id  | uuid          | yes         | —       | Inherited booking tenant                                |
| store_id         | uuid          | yes         | —       | Inherited booking store                                 |
| booking_id       | uuid          | yes         | —       | Parent booking                                          |
| kind             | text          | yes         | —       | service / product                                       |
| service_id       | uuid          | conditional | —       | Required only for service lines                         |
| product_id       | uuid          | conditional | —       | Required only for product lines                         |
| staff_id         | uuid          | no          | —       | Optional staff assignment; service lines only           |
| name_snapshot    | text          | yes         | —       | Name captured when booked                               |
| quantity         | integer       | yes         | —       | Exactly one for services; positive integer for products |
| unit_price       | numeric(14,2) | yes         | —       | Nonnegative finite snapshot, in parent booking currency |
| duration_minutes | integer       | conditional | —       | Positive service duration snapshot; NULL for products   |

Four composite FKs: `(organization_id,store_id,<booking/service/product/staff>_id)`
to the corresponding parent's `(organization_id,store_id,id)`. Each has an index
with those columns in the same order. CHECKs enforce the kind-dependent shape,
quantity, duration, and price. No line total or ordering is duplicated.

## Commerce: deals

| Column          | Type          | Required    | Default | Meaning                                                            |
| --------------- | ------------- | ----------- | ------- | ------------------------------------------------------------------ |
| organization_id | uuid FK       | yes         | —       | organizations.id                                                   |
| code            | varchar(64)   | yes         | —       | Organization-local uppercase letters/digits/underscore/hyphen code |
| name            | text          | yes         | —       | Display label                                                      |
| kind            | text          | yes         | —       | percentage / fixed                                                 |
| percentage      | numeric(5,2)  | conditional | —       | Required for percentage deals, greater than zero and at most 100   |
| amount          | numeric(14,2) | conditional | —       | Positive finite fixed discount; NULL for percentage deals          |
| currency        | char(3)       | conditional | —       | Required uppercase code for fixed deals, NULL for percentage deals |
| starts_at       | timestamptz   | yes         | —       | Eligibility window begins                                          |
| ends_at         | timestamptz   | no          | —       | Optional end, strictly after start                                 |
| archived_at     | timestamptz   | no          | —       | Withdrawn from future use, retained for references                 |

Unique: `(organization_id,id)` and `(organization_id,code)`; codes are not reused.
CHECKs enforce code pattern, window, and mutually exclusive percentage/fixed values.
No redemption or eligibility table exists.

## Commerce: payments

| Column              | Type          | Required | Default    | Meaning                                                  |
| ------------------- | ------------- | -------- | ---------- | -------------------------------------------------------- |
| organization_id     | uuid          | yes      | —          | Tenant scope                                             |
| booking_id          | uuid          | yes      | —          | Booking being paid                                       |
| amount              | numeric(14,2) | yes      | —          | Positive finite payment attempt amount                   |
| currency            | char(3)       | yes      | —          | Must match referenced booking currency                   |
| status              | text          | yes      | initiating | initiating / pending / succeeded / failed / cancelled    |
| provider            | varchar(64)   | yes      | —          | Proposed provider namespace                              |
| provider_payment_id | text          | no       | —          | External reference once assigned, never card credentials |
| idempotency_key     | varchar(128)  | yes      | —          | Tenant-local unique request key                          |

FK: `(organization_id,booking_id,currency)` to bookings `(organization_id,id,currency)`.
Index: the FK column tuple. Unique: `(organization_id,idempotency_key)` and
`(provider,provider_account_ref,provider_payment_id)`. PostgreSQL permits multiple NULL provider
references. CHECKs enforce positive non-NaN amount, currency shape, and status.

## Audit: audit_logs

Uses shared `id` and `created_at`, with no `updated_at` or soft deletion.

| Column          | Type    | Required | Default      | Meaning                                                         |
| --------------- | ------- | -------- | ------------ | --------------------------------------------------------------- |
| organization_id | uuid FK | no       | —            | organizations.id; NULL only for platform events by convention   |
| actor_user_id   | uuid FK | no       | —            | users.id; NULL for system/unknown actors                        |
| action          | text    | yes      | —            | Event action label                                              |
| subject_type    | text    | yes      | —            | Polymorphic entity kind                                         |
| subject_id      | uuid    | no       | —            | Polymorphic reference; intentionally no FK                      |
| metadata        | jsonb   | yes      | empty object | Unvalidated event context; future writers must allowlist/redact |

Indexes: `(organization_id,created_at)`, `(actor_user_id,created_at)`,
`(organization_id,subject_type,subject_id)`. Append-only behavior, tenant/platform
event shape, grants, and retention are not enforced yet. Metadata must be a JSON
object; action/subject_type must be nonblank. This is not a metadata allowlist.

## Phase 6: booking extensions

| Table.column                 | Type         | Required      | Default | Meaning                                                                                  |
| ---------------------------- | ------------ | ------------- | ------- | ---------------------------------------------------------------------------------------- |
| bookings.hold_expires_at     | timestamptz  | while pending | none    | Pending requires a deadline after created_at; elapsed-time transitions are not automatic |
| bookings.revision            | integer      | yes           | 1       | Positive optimistic version                                                              |
| bookings.idempotency_key     | varchar(128) | yes           | none    | Nonempty key unique per customer                                                         |
| bookings.request_fingerprint | varchar(64)  | yes           | none    | Lowercase 64-hex server-generated normalized request digest                              |
| bookings.policy_snapshot     | jsonb        | yes           | none    | JSON object; typed policy/version validation is a future application responsibility      |
| booking_items.starts_at      | timestamptz  | service only  | none    | Per-service UTC start snapshot; NULL for product                                         |
| booking_items.ends_at        | timestamptz  | service only  | none    | Service end must follow start; NULL for product                                          |

Booking states now include in_progress, expired and no_show. New unique constraints:
bookings `(customer_user_id,idempotency_key)` and
`(organization_id,store_id,id,customer_user_id)`; items
`(organization_id,store_id,booking_id,id)`. New indexes: bookings
`(status,hold_expires_at)` and items `(organization_id,store_id,staff_id,starts_at,ends_at)`.
CHECKs cover revision, request shape, policy object and service/product timing shape.
These do not enforce overlap, header containment, capacity or cross-row lifecycle.

## Identity: customer_profiles

Uses shared UUID id and created_at/updated_at conventions. It is global per user,
not tenant-owned. Domain profile revision is now stored as a positive integer.

| Column       | Type    | Required | Default | Meaning                                                          |
| ------------ | ------- | -------- | ------- | ---------------------------------------------------------------- |
| user_id      | uuid FK | yes      | none    | users.id; unique one profile per user                            |
| display_name | text    | yes      | none    | Customer display profile; precedence over user label is proposed |
| locale       | text    | yes      | none    | Future validated locale                                          |
| timezone     | text    | no       | none    | Future validated IANA timezone                                   |
| revision     | integer | yes      | 1       | Positive optimistic version                                      |

## Customers: favorites

Uses shared id and timestamps; no soft-delete field. Unfavorite semantics are a
future authorized mutation, not an implemented delete.

| Column           | Type    | Required | Meaning                        |
| ---------------- | ------- | -------- | ------------------------------ |
| customer_user_id | uuid FK | yes      | users.id, derived from session |
| organization_id  | uuid    | yes      | Store tenant                   |
| store_id         | uuid    | yes      | Referenced store               |

Composite FK `(organization_id,store_id)` -> stores `(organization_id,id)`;
unique `(customer_user_id,organization_id,store_id)`; index `(organization_id,store_id)`.

## Customers: reviews

Uses shared id and timestamps. Exactly zero or one review per booking is proposed.

| Column           | Type    | Required | Default | Meaning                                    |
| ---------------- | ------- | -------- | ------- | ------------------------------------------ |
| organization_id  | uuid    | yes      | none    | Booking tenant                             |
| store_id         | uuid    | yes      | none    | Booking store                              |
| booking_id       | uuid    | yes      | none    | Reviewed booking                           |
| customer_user_id | uuid    | yes      | none    | Must match booking customer                |
| rating           | integer | yes      | none    | CHECK between 1 and 5                      |
| body             | text    | yes      | none    | CHECK trimmed length 1–5000                |
| status           | text    | yes      | pending | CHECK pending/published/rejected/withdrawn |

FK `(organization_id,store_id,booking_id,customer_user_id)` -> bookings
`(organization_id,store_id,id,customer_user_id)`, with supporting index.
Unique `(organization_id,booking_id)` and index `(organization_id,store_id,created_at)`.
Completion eligibility and author authorization are future checks, not FK behavior.

## Phase 7: payment extensions

Payment status defaults to initiating; initiating/pending/succeeded/failed/cancelled
are allowed. Refund summaries do not modify charge status.

| Column               | Type         | Required | Default | Meaning                                                               |
| -------------------- | ------------ | -------- | ------- | --------------------------------------------------------------------- |
| provider_account_ref | varchar(128) | yes      | none    | Logical account namespace, not a credential                           |
| refund_status        | text         | yes      | none    | none/pending/partially_refunded/refunded/failed; default literal none |
| request_fingerprint  | varchar(64)  | yes      | none    | CHECK lowercase 64-hex normalized request digest                      |
| revision             | integer      | yes      | 1       | CHECK positive                                                        |

Provider references are unique on `(provider,provider_account_ref,provider_payment_id)`.
The existing tenant-local idempotency key remains unique. Refund reservations,
remaining refundable balance, webhook inbox, delivery attempts and transactional
event outbox are not represented by tables yet. No schema implies exactly-once
provider execution. Negotiation and messaging storage also remain undecided.

## Phase 2 identity and authorization

Migration 0001_authentication_and_grants adds seven global tables and nullable
users.email_verified_at (timestamptz, no default). Public registration never
creates organization memberships or platform grants. Existing users receive no
credentials, verified status or privileges from migration.

### auth_credentials

| Column        | Type                     | Required | Default           |
| ------------- | ------------------------ | -------- | ----------------- |
| id            | uuid                     | yes      | gen_random_uuid() |
| user_id       | uuid                     | yes      | none              |
| password_hash | text                     | yes      | none              |
| created_at    | timestamp with time zone | yes      | now()             |
| updated_at    | timestamp with time zone | yes      | now()             |

FK (user_id) to users (id), RESTRICT.

Unique: credentials_user_unique (user_id).

### auth_mfa

| Column             | Type                     | Required | Default           |
| ------------------ | ------------------------ | -------- | ----------------- |
| id                 | uuid                     | yes      | gen_random_uuid() |
| user_id            | uuid                     | yes      | none              |
| sealed_secret      | text                     | yes      | none              |
| confirmed          | boolean                  | yes      | false             |
| last_accepted_step | integer                  | yes      | 0                 |
| created_at         | timestamp with time zone | yes      | now()             |
| updated_at         | timestamp with time zone | yes      | now()             |

FK (user_id) to users (id), RESTRICT.

Unique: mfa_user_unique (user_id).

CHECK: mfa_step_check.

### auth_password_resets

| Column      | Type                     | Required | Default           |
| ----------- | ------------------------ | -------- | ----------------- |
| id          | uuid                     | yes      | gen_random_uuid() |
| user_id     | uuid                     | yes      | none              |
| token_hash  | text                     | yes      | none              |
| expires_at  | timestamp with time zone | yes      | none              |
| consumed_at | timestamp with time zone | no       | none              |
| created_at  | timestamp with time zone | yes      | now()             |
| updated_at  | timestamp with time zone | yes      | now()             |

FK (user_id) to users (id), RESTRICT.

Unique: resets_token_unique (token_hash).

Index: resets_user_idx.

Index: resets_expiry_idx.

CHECK: resets_hash_check.

CHECK: resets_expiry_check.

### auth_rate_limits

| Column            | Type                     | Required | Default           |
| ----------------- | ------------------------ | -------- | ----------------- |
| id                | uuid                     | yes      | gen_random_uuid() |
| bucket_key        | text                     | yes      | none              |
| window_started_at | timestamp with time zone | yes      | none              |
| hits              | integer                  | yes      | 1                 |
| created_at        | timestamp with time zone | yes      | now()             |
| updated_at        | timestamp with time zone | yes      | now()             |

Unique: rate_bucket_unique (bucket_key).

Index: rate_window_idx.

CHECK: rate_hits_check.

### auth_reset_deliveries

| Column       | Type                     | Required | Default           |
| ------------ | ------------------------ | -------- | ----------------- |
| id           | uuid                     | yes      | gen_random_uuid() |
| reset_id     | uuid                     | yes      | none              |
| sealed_proof | text                     | yes      | none              |
| delivered_at | timestamp with time zone | no       | none              |
| lease_until  | timestamp with time zone | no       | none              |
| attempts     | integer                  | yes      | 0                 |
| created_at   | timestamp with time zone | yes      | now()             |
| updated_at   | timestamp with time zone | yes      | now()             |

FK (reset_id) to auth_password_resets (id), RESTRICT.

Unique: reset_delivery_unique (reset_id).

Index: reset_delivery_pending_idx.

CHECK: reset_delivery_attempts_check.

### auth_sessions

| Column          | Type                     | Required | Default           |
| --------------- | ------------------------ | -------- | ----------------- |
| id              | uuid                     | yes      | gen_random_uuid() |
| user_id         | uuid                     | yes      | none              |
| token_hash      | text                     | yes      | none              |
| expires_at      | timestamp with time zone | yes      | none              |
| revoked_at      | timestamp with time zone | no       | none              |
| mfa_verified_at | timestamp with time zone | no       | none              |
| created_at      | timestamp with time zone | yes      | now()             |
| updated_at      | timestamp with time zone | yes      | now()             |

FK (user_id) to users (id), RESTRICT.

Unique: sessions_token_unique (token_hash).

Index: sessions_user_idx.

Index: sessions_expiry_idx.

CHECK: sessions_hash_check.

CHECK: sessions_expiry_check.

### platform_grants

| Column     | Type                     | Required | Default           |
| ---------- | ------------------------ | -------- | ----------------- |
| id         | uuid                     | yes      | gen_random_uuid() |
| user_id    | uuid                     | yes      | none              |
| role       | text                     | yes      | 'platform_admin'  |
| status     | text                     | yes      | 'active'          |
| created_at | timestamp with time zone | yes      | now()             |
| updated_at | timestamp with time zone | yes      | now()             |

FK (user_id) to users (id), RESTRICT.

Unique: platform_grant_user_unique (user_id).

CHECK: platform_grant_role_check.

CHECK: platform_grant_status_check.

Credential password_hash values are bcrypt cost 12, never plaintext. token_hash
contains SHA-256 random proof digests. expires_at exceeds created_at; revoked_at
and consumed_at are nullable. Session mfa_verified_at records server TOTP proof.
auth_mfa holds encrypted sealed_secret; confirmed defaults false and nonnegative
last_accepted_step defaults 0. No raw secret/proof is stored.

Delivery sealed_proof is encrypted with distinct purpose and expiry. reset_id is
unique; nonnegative attempts defaults 0. delivered_at and lease_until are nullable.
Limiter bucket_key is an HMAC digest; hits defaults 1 and is positive.
window_started_at controls expiry. platform_grants permits only platform_admin
and active/revoked status; inserts require authorized internal provisioning.
No automated retention deletion or grant provisioning is supplied.
