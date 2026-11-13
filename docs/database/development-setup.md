# PostgreSQL development and migration workflow

Phase 1 adds database infrastructure only. No business APIs, authentication,
repositories or booking services are enabled. PostgreSQL 15+ is supported by the
schema; the optional local Compose service uses PostgreSQL 17. Live PostgreSQL
verification must pass before claiming a supported deployment is ready.

## Local setup

Use the project's supported Node.js and npm versions. On PowerShell, use npm.cmd
if execution policy prevents loading npm.ps1. Install dependencies with npm ci.
Copy .env.example to .env.local at the repository root. Never commit credentials.

If Docker Compose is installed:

```sh
docker compose -f compose.database.yml up -d --wait
```

This starts a loopback-only database named velvetbook_dev with a named volume.
The Compose password is for local development only. To stop it without deleting
data, use `docker compose -f compose.database.yml stop`. Do not remove volumes or
reset a database containing data without approval. A native PostgreSQL installation
or separately provisioned private development instance works too.

Set these values in .env.local for the supplied local service:

```dotenv
DATABASE_ENABLED=true
DATABASE_URL=postgresql://velvetbook:local-development-only@127.0.0.1:5432/velvetbook_dev
DATABASE_POOL_MAX=10
DATABASE_SSL_MODE=disable
```

URL-encode username/password/database components when necessary. URI query
parameters are deliberately refused so they cannot override TLS or timeout policy.
Configure SSL with DATABASE_SSL_MODE and optional multiline PEM DATABASE_SSL_CA.
Production defaults to verify-full and refuses disable; certificate verification
is never turned off. For a provider URI containing sslmode, remove that query
parameter and configure the equivalent verified TLS setting here.

Next.js loads environment files itself. Standalone health/migration tools use
@next/env's root environment-file precedence, keeping shell variables authoritative.
The integration runner uses test precedence (.env.test.local, .env.test, .env;
not .env.local). Set TEST_DATABASE_URL in the shell or .env.test.local.

## Runtime client and pooling

Import getDatabase from src/db/client.server.ts only on the server. Its result
exposes the typed Drizzle db, pg pool, sanitized idleConnectionFailures counter
and close(). Importing it does not validate secrets or connect; getDatabase()
validates and lazily constructs a reusable process-global pool, including during
Next development reloads. The first query opens a socket. createDatabase(input)
provides an explicit isolated lifecycle for tools/tests. Call closeDatabase() from
an owning long-running process's shutdown hook, never after each request. A restart
is required after changing runtime connection settings. No signal hooks or database
queries are installed in the existing UI/build.

| Setting                              | Default                                    | Limit / behavior                                        |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------- |
| DATABASE_ENABLED                     | false                                      | Explicit opt-in; getDatabase refuses disabled state     |
| DATABASE_POOL_MAX                    | 10                                         | 1-100 connections per process; minimum retained count 0 |
| DATABASE_CONNECTION_TIMEOUT_MS       | 5000                                       | Bounded acquisition/connection timeout, max 60000       |
| DATABASE_IDLE_TIMEOUT_MS             | 30000                                      | Idle connection eviction, max 300000                    |
| DATABASE_STATEMENT_TIMEOUT_MS        | 15000                                      | PostgreSQL statement timeout, max 300000                |
| DATABASE_LOCK_TIMEOUT_MS             | 5000                                       | Lock wait timeout, max 60000                            |
| DATABASE_IDLE_TRANSACTION_TIMEOUT_MS | 15000                                      | Protect abandoned transactions, max 300000              |
| DATABASE_SSL_MODE                    | disable locally; verify-full in production | Only these modes; production requires verify-full       |
| DATABASE_SSL_CA                      | unset                                      | Optional private CA, verified TLS only                  |

The driver query timeout is statement timeout plus connection timeout. Driver SQL
logging is disabled and idle pool errors are counted without exposing raw errors.
Monitoring should observe the sanitized counter; request failures must still use
the shared sanitized error boundary in future services. Keep pool settings within
the PostgreSQL connection budget: replicas × pool maximum + jobs/migrations/admin
connections must leave operational headroom. For example, four replicas with max
10 use up to 40 application sessions. No production capacity was assumed or tested.

The selected deployment is a long-running Node.js server. For a future serverless
deployment, reduce per-instance pool size (often 1-2 initially), bound replica
concurrency and use a provider pooler after validating driver/session settings.
Migration jobs always use a direct or session-pooling endpoint with one connection;
transaction pooling is incompatible with the session-level migration lock.

See [node-postgres pool lifecycle](https://node-postgres.com/apis/pool) and
[pool sizing](https://node-postgres.com/guides/pool-sizing). Future transactions
must use a single checked-out client; pool.query is not a transaction boundary.

## Generate and review migrations offline

```sh
npm run db:generate -- --name=describe_the_change
npm run db:migrations:check
npm run db:check
npm run db:migrate:plan
```

Generation uses the installed Drizzle Kit with the react-server condition so
server-only schema markers remain intact. drizzle.config.ts intentionally has no
credentials; generation and plan inspection do not contact a database. Check in
SQL, snapshots and meta/_journal.json together. Do not edit historical migrations
after application; create a new migration. The initial 0000_database_foundation.sql
creates the 15 existing tables and finalized Phase 1 checks/revisions/indexes.

Review every statement, lock impact, data compatibility and the exact target.
db:migrate:plan validates the journal and conservative additive-DDL allowlist, then
prints a SHA-256 fingerprint of the ordered migration hashes/timestamps. The
fingerprint covers all checked-in migrations, not just pending ones. It must be
recomputed after an intentional migration change. The guard is not a complete SQL
parser or security sandbox; trusted reviewed SQL is still mandatory. Unsupported
DDL, destructive commands, backfills, functions and concurrent indexes are refused
by the automated runner. Handle these in a separately designed and explicitly
approved workflow; no destructive override or down/reset/push command is supplied.

Reference: [Drizzle generation](https://orm.drizzle.team/docs/drizzle-kit-generate)
and [migration approaches](https://orm.drizzle.team/docs/migrations). Installed
0.31.x Kit produces numbered SQL plus snapshots/journal; newer documentation may
show a different layout. The repository's installed tooling is authoritative.

## Apply a reviewed migration

Use a dedicated migration identity, not the application's least-privilege role.
Review SQL and obtain any deployment approvals before setting these private values:

```dotenv
MIGRATION_DATABASE_URL=postgresql://migration_user:encoded_password@host:5432/velvetbook_dev
MIGRATION_DATABASE_NAME=velvetbook_dev
MIGRATION_APPROVED_SHA256=the_exact_sha256_from_db_migrate_plan
```

```sh
npm run db:migrate
npm run db:health
```

Migration execution never falls back to DATABASE_URL. It requires explicit target
name confirmation and the reviewed fingerprint, uses a pool maximum of 1 and a
60-second statement timeout, checks current_database(), acquires a session advisory
lock, and verifies applied hashes/timestamps against a complete prefix of the
checked-in history. Drizzle then executes pending DDL and journal entries in a
transaction. The journal is drizzle.__drizzle_migrations; its metadata schema/table
may remain after a failed initial attempt, while failed business DDL rolls back.
A second invocation is a no-op when files/history match. Always close/release the
migration session, including on failure.

The initial migration refuses adoption if public contains existing tables but no
applied history. Never mark existing tables as migrated or regenerate a baseline
blindly. Inventory/back up the target and review a compatibility/baseline procedure
separately. The runner does not delete existing data or auto-repair divergent history.
Advisory locking coordinates this runner only; restrict other DDL access and serialize
deployment jobs. Migrations never run automatically on builds, imports or requests.

For production: take and verify a restorable backup, test reviewed migrations on
a representative copy, assess new constraints against existing rows, schedule
locks/maintenance, deploy through the migration job, then verify health/schema and
application compatibility. Prefer expand/backfill/contract changes and forward fixes.
Any data removal, type conversion or rollback that can lose data needs explicit
approval and a reviewed recovery plan. Application grants should allow only
required DML, not schema changes; restrict audit update/delete separately. This
phase provides no database user/grant provisioning or RLS policy.

## Internal health verification

checkDatabaseHealth(client) in src/db/health.server.ts runs a bounded SELECT 1
through the configured pool and returns component/status/code, checkedAt and
durationMs only. Failures return down/unavailable, without host/database/user,
URL, SQL or driver details. db:health prints that sanitized result and exits nonzero
when unavailable. It is an internal CLI/utility, not an HTTP route, and verifies
connectivity rather than migration readiness, permissions or application behavior.

## Disposable PostgreSQL integration tests

Provision a dedicated empty database; the suite refuses names that do not end in
_test and never falls back to the application URL. With the optional Compose server:

```sh
docker compose -f compose.database.yml exec database createdb -U velvetbook velvetbook_test
```

If it already exists, reuse it; do not reset/delete it. Configure in .env.test.local:

```dotenv
TEST_DATABASE_URL=postgresql://velvetbook:local-development-only@127.0.0.1:5432/velvetbook_test
DATABASE_SSL_MODE=disable
```

```sh
npm run db:test
```

The suite applies only checked-in additive migrations to that explicit disposable
target, verifies migration idempotency, Drizzle/pg connectivity and health, then
creates unique fixtures in a transaction. Savepoints isolate expected FK/unique/
CHECK violations. Fixtures always roll back, including the RESTRICT-delete test
which targets only its own fixture. It never truncates/drops a database, schema
or existing table. Successful migrations remain for subsequent runs. Do not use a
database with real data merely because its name ends in _test.

Coverage includes case-insensitive email, tenant membership, staff/catalog tenant
FKs, store-local SKU, positive revisions/durations, nonnegative finite prices,
booking windows/policy/hold checks, review customer ownership, payment currency,
deal alternatives, audit metadata, item shape, favorite uniqueness and fixture
rollback. Offline npm test checks pool/configuration/redaction/migration guards,
schema-snapshot agreement and all existing contract/boundary tests. db:test is
separate and fails clearly when TEST_DATABASE_URL is absent; no silent skip.

No real PostgreSQL/Docker binary or configured database URL was available during
implementation. Therefore live connectivity/DDL/constraint tests remain pending
until this setup is run in an environment with PostgreSQL. Record the actual results
in the [Phase 1 status](../backend/database-infrastructure-status.md).
