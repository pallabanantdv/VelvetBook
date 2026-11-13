# Backend implementation status

Current phase: [central authentication and authorization](authentication-status.md)
is implemented. See [auth setup](authentication-setup.md) and
[OpenAPI](openapi.json). Email delivery awaits provider selection; live
PostgreSQL verification is pending. Older phase/audit details below are historical.

Current update: [Phase 1 database infrastructure](database-infrastructure-status.md)
is implemented, with live PostgreSQL validation pending. The audit below preserves
the pre-infrastructure baseline. Business services and APIs remain absent.

Baseline: 2026-11-13. See the [audit and API development plan](api-development-plan.md)
for evidence, requirements comparison, endpoint proposals, dependencies and gates.
No APIs or business functionality were implemented in this phase.

## Status definitions

- **Contracts**: entities, DTOs, ports and layer scaffolding exist. This does not
  mean complete requirements, runtime enforcement or an implemented use case.
- **Validation**: executable structural Zod schemas exist. They do not query data,
  authorize callers or prove business eligibility.
- **Declared storage**: Drizzle metadata only; no migrations or live database.
- **Missing**: no implementation. All module repositories, services/handlers,
  provider adapters and APIs are missing at this baseline.

## Module tracker

Every row has contracts. Runtime service/repository and API columns remain Missing
until actual behavior and its security/integration evidence land. Stages correspond
to the development plan; supporting pieces may be brought forward when required.

| Module                 | Executable module logic today | Declared storage coverage                                     | Service / repository | API           | Next work / stage                                                                                    |
| ---------------------- | ----------------------------- | ------------------------------------------------------------- | -------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| identity               | None                          | users only; no credentials/session/account links              | Missing              | Missing       | Provider, session lifecycle, MFA/recovery adapters (1)                                               |
| authorization          | Static role/name bundles only | Memberships/staff partial; platform grants absent             | Missing              | Internal only | Trusted tenant/platform/ownership/exact-action verifiers (1)                                         |
| organizations          | Validation                    | organizations, organization_members; revisions/invites absent | Missing              | Missing       | Bootstrap, scoped repository, draft/membership service (2)                                           |
| stores                 | Validation                    | stores; revision absent                                       | Missing              | Missing       | Tenant/store repository, draft service, timezone/slug policy (2)                                     |
| staff                  | Validation                    | staff assignments; revisions/scheduling eligibility absent    | Missing              | Missing       | Active assignment management, staff projection and safeguards (2)                                    |
| services               | Validation                    | services; revision/eligibility absent                         | Missing              | Missing       | Scoped catalog repository and price/duration service (2)                                             |
| products               | Validation                    | products; revision absent                                     | Missing              | Missing       | Scoped repository, SKU/archive and inventory decision (2)                                            |
| operating-hours        | Validation                    | None                                                          | Missing              | Missing       | Store/staff hours, exceptions, DST service (2)                                                       |
| business-photos        | Validation                    | None                                                          | Missing              | Missing       | Verified asset/photo ownership and persistence (3)                                                   |
| visibility             | Validation                    | None                                                          | Missing              | Missing       | Draft/publication persistence and approval policy (3)                                                |
| onboarding             | Validation                    | None                                                          | Missing              | Missing       | Seven sections, readiness, immutable submission and revisions (3)                                    |
| customers              | Validation                    | customer_profiles                                             | Missing              | Missing       | Session-self repository and profile service (4)                                                      |
| discovery              | Validation                    | No public/location/category projection                        | Missing              | Missing       | Publication-filtered search and detail queries (4)                                                   |
| favorites              | Validation                    | favorites                                                     | Missing              | Missing       | Self-scoped queries and idempotent add/remove (4)                                                    |
| availability           | Validation                    | No hours/capacity/reservation storage                         | Missing              | Missing       | Source adapters, slot calculation and bounded query service (4)                                      |
| bookings               | Validation                    | bookings, booking_items; reservations/history absent          | Missing              | Missing       | Transactional commit, policies, lifecycle, lists, hold expiry (4)                                    |
| deals                  | Validation                    | deals; targets/redemptions absent                             | Missing              | Missing       | Eligibility, limits and transactional redemption (6)                                                 |
| negotiation            | Validation                    | None                                                          | Missing              | Missing       | Immutable participant offers, acceptance, expiry (6)                                                 |
| reviews                | Validation                    | reviews                                                       | Missing              | Missing       | Completed-own-booking checks and moderated projections (6)                                           |
| messaging              | Validation                    | None                                                          | Missing              | Missing       | Participant access, conversation/message repository and retention (6)                                |
| payments               | None                          | payments attempts; account mapping/ledger incomplete          | Missing              | Missing       | Mutation permissions, account adapter and reconciliation (5)                                         |
| refunds                | None                          | payments.refund_status summary only                           | Missing              | Missing       | Dedicated refund ledger, balance reservations and authority (5)                                      |
| notifications          | None                          | None                                                          | Missing              | Missing       | Intent/preferences/consent/delivery repositories and retry service (5)                               |
| file-storage           | None                          | None                                                          | Missing              | Missing       | Asset grants, upload/scan/quarantine and private read adapter (3 minimum, 5 expanded)                |
| maps                   | None                          | None                                                          | Missing              | Optional      | Provider selection, bounded geocoding and privacy (as needed)                                        |
| email                  | None                          | None                                                          | Missing              | Internal only | Registered rendering/dispatch adapter and suppression (5)                                            |
| webhooks               | None                          | None                                                          | Missing              | Missing       | Raw signature verification, account mapping and durable inbox (5)                                    |
| domain-events          | None                          | None                                                          | Missing              | Internal only | Transactional outbox/inbox, worker leases and delivery (5 or earlier)                                |
| admin                  | Validation                    | No grants/change requests/approvals/scope evidence            | Missing              | Missing       | MFA, finite scope and sensitive action verifiers (1 minimum, 7 expanded)                             |
| organization-approvals | None                          | No approval/submission history                                | Missing              | Missing       | Consolidate review path, independent decisions and lifecycle bridge (3)                              |
| user-management        | None                          | users.disabled_at only; no suspension history                 | Missing              | Missing       | Minimized lookups, suspend/restore/session recovery safeguards (7)                                   |
| moderation             | None                          | reviews.status only; no cases/evidence/reports                | Missing              | Missing       | Evidence/source lifecycle service and decision history (7 or publication gate)                       |
| reports                | None                          | No report/export snapshots                                    | Missing              | Missing       | Bounded aggregate projections, versioned definitions and private exports (7)                         |
| platform-settings      | Validation                    | None                                                          | Missing              | Missing       | Closed setting registry, revisioned changes and approved apply (7)                                   |
| audit-logs             | None                          | audit_logs; richer event envelope absent                      | Missing              | Missing       | Trusted append, durable audit intent/outcome, redaction and restricted reads (1 minimum, 7 expanded) |

_template is a reusable scaffold, excluded from the 35-module count. A file named
manage.server.ts is currently an interface declaration, not a working use case.
Separate Customer/Organization/Staff/Admin implementations do not exist; actor
scopes are designed around shared backend modules.

## Shared infrastructure tracker

| Capability                       | Current evidence                                                        | Remaining implementation                                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dependency and server boundaries | ESLint rules, cycle checks, server-only markers                         | Retain rules while replacing architecture-only no-implementation assertions                |
| Input validation                 | validateInput, bounded pagination factory and feature schemas           | Complete per-operation schemas, semantic checks, output validation and cursor verification |
| Environment                      | validateEnvironment handles explicit input and capability prerequisites | Server bootstrap invocation, selected-provider completeness and secret operations          |
| Response/error contracts         | ApiResponse types and executable sanitized error mapping                | Transport composition, legacy feature-error classification and request IDs                 |
| Persistence                      | 15 proposed tables, offline metadata tests                              | Pool/client, reviewed migrations/roles, scoped adapters and real PostgreSQL tests          |
| Transactions                     | TransactionManager/TransactionContext interfaces                        | Rollback/retry/locking adapter and concurrency evidence                                    |
| Core IDs/time/money              | Branded IDs, clock/generator, money/time contracts                      | Real adapters and deterministic validation/arithmetic/policy helpers                       |
| Observability and health         | Logger/metrics/tracer/health interfaces                                 | Redacting adapters, correlation, probes, alerts and worker telemetry                       |
| Integration effects              | Context/failure/provider ports                                          | Trusted service actors, outbox/inbox, adapters, reconciliation and workers                 |
| Operations                       | Vendor-neutral deployment proposal                                      | Hosting/region, pooling, least privilege, backups/restore, retention and SLOs              |

## Completion criteria for future updates

Replace Missing with In progress or Complete only with linked implementation and
validation evidence. Complete requires the module's applicable schema/migration,
scoped repository, service, transport (or explicit internal-only designation),
permissions and semantic validation, sanitized output/error mapping, audit and
meaningful unit/security/PostgreSQL integration checks. External effects additionally
need retry/idempotency/reconciliation tests. Structural contract tests alone cannot
mark a runtime module complete. Record date, PR/commit, owner and remaining blockers
when work starts; owners have not been assigned in this repository.

## Verification for this audit

Executed with Node v24.13.0 on Windows. npm.cmd invokes the existing scripts;
PowerShell's npm.ps1 launcher is blocked by local execution policy.

| Existing command      | Result on 2026-11-13                                                       | Scope of evidence                                                       |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| npm.cmd run lint      | Passed, exit 0                                                             | ESLint, zero warnings                                                   |
| npm.cmd run typecheck | Passed, exit 0                                                             | next typegen then strict tsc --noEmit                                   |
| npm.cmd run build     | Passed, exit 0                                                             | Next 16.4.6 production build; static / and /_not-found only             |
| npm.cmd test          | Passed on retry outside restricted sandbox: 102 tests, zero failures/skips | Offline contract/schema/architecture checks; no DB/provider integration |

Initial test execution failed before assertions because tsx called Windows account
lookup and received uv_os_get_passwd ENOMEM. The same unmodified command succeeded
outside the restricted sandbox. This was an environment failure, not a business
test regression. The generated project-tree document was refreshed for the added
documentation files; its consistency check is included in the final test run.

No schema, business code, API, Next.js configuration or UI changes were made. No
database connection/migration/seed or business provider call was performed. The
existing build may use cached or downloaded Google Font assets. Runtime authorization,
PostgreSQL constraints, booking races, provider contracts and end-to-end journeys
remain unverified because those implementations do not exist.
