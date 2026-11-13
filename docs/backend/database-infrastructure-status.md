# Phase 1 database infrastructure status

Implemented 2026-11-13 for a long-running Node.js server. No business APIs added.

| Deliverable                  | Status                               | Evidence / remaining gate                                                                                                                 |
| ---------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Environment/configuration    | Implemented                          | Strict database config, enabled gate, URL parsing, verified production TLS and redacted errors                                            |
| pg/Drizzle runtime           | Implemented                          | Lazy server-only process-reused pool; typed schema, bounded timeouts, idle error handling and shutdown utilities                          |
| Pooling                      | Implemented                          | Per-process default max 10, configurable bounds, deployment sizing documented                                                             |
| Schema review                | Implemented for current model        | 15 existing tables retained, tenant/store/currency/customer FKs preserved, revision and basic checks completed                            |
| Migration generation         | Implemented                          | Offline db:generate, checked-in initial SQL/snapshot/journal and consistency check                                                        |
| Migration execution          | Implemented; live validation pending | Explicit migration credentials/target/fingerprint, additive guard, session lock, history verification and Drizzle transactional execution |
| Health utility               | Implemented; live success pending    | Internal sanitized SELECT 1 utility/CLI, no endpoint                                                                                      |
| Offline database validation  | Implemented                          | Configuration/TLS/pool lifecycle, error redaction, guard and snapshot tests                                                               |
| PostgreSQL integration suite | Implemented; live run pending        | Explicit *_test target, migrations/connectivity/constraint/rollback tests; no local PostgreSQL/Docker or configured URL available         |
| Development setup            | Implemented                          | Optional loopback-only Compose PostgreSQL service and safe setup/migration instructions                                                   |
| Database documentation       | Updated                              | Physical ERD, dictionary, schema README, migration/deployment workflow                                                                    |

This phase finalizes the current physical model for initial migration review; it
does not settle missing product requirements. Auth provider/session/grant tables,
onboarding, schedules, asset/publication, capacity reservations, refund ledgers,
inbox/outbox and richer admin/audit storage remain future scoped changes. No table
was invented merely to satisfy an unimplemented contract. Repositories/services,
authorization verifiers and business APIs remain missing for all modules.

Audit constraints do not provide append-only enforcement or metadata allowlisting;
runtime user/grant provisioning and tenant authorization are still required. Booking
overlap, line/header totals, staff eligibility, lifecycle transitions and financial
aggregate consistency remain outside this infrastructure phase.

See [setup and safe workflow](../database/development-setup.md). Existing audit/plan
documents describe the pre-infrastructure baseline and must be read with this
current status. No existing database was modified during implementation.

## Validation results

Verified on Node v24.13.0, Windows, using npm.cmd to avoid PowerShell script policy.

| Command                                           | Actual result                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| npm run lint                                      | Passed, exit 0, zero warnings                                                                                |
| npm run typecheck                                 | Passed, exit 0; Next route types and strict TypeScript                                                       |
| npm run build                                     | Passed, exit 0; starter / and framework /_not-found only                                                     |
| npm run format:check                              | Passed, exit 0                                                                                               |
| npm test                                          | Passed, exit 0; 108 offline tests, zero failures/skips                                                       |
| npm run db:generate -- --name=database_foundation | Generated initial 15-table migration, snapshot and journal offline                                           |
| npm run db:generate -- --name=verify_no_drift     | Passed; no schema changes, no additional migration created                                                   |
| npm run db:migrations:check                       | Passed; journal/snapshot consistency                                                                         |
| npm run db:migrate:plan                           | Passed; generated reviewed-plan fingerprint without database access                                          |
| npm run db:migrate                                | Expected refusal, exit 1: explicit credentials, target and fingerprint absent; no SQL executed               |
| npm run db:health                                 | Expected configuration failure, exit 1: database disabled/unconfigured; sanitized output                     |
| npm run db:test                                   | Blocked, exit 1: TEST_DATABASE_URL absent and no local PostgreSQL/Docker executable; live assertions not run |

The TypeScript/Drizzle loaders initially failed under the restricted sandbox with
uv_os_get_passwd ENOMEM. The same commands succeeded with Windows account lookup
access. An initial offline test compared undefined in-memory snapshot fields with
persisted JSON; comparing their serialized representations corrected that test.
The final 108-test suite includes refreshed project-tree consistency and migration
target/history safety checks. No schema/runtime behavior was altered to bypass a
failing check. Final live PostgreSQL verification remains a required follow-up.
