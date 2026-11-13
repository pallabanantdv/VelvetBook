# Phase 2 implementation status

Implemented 2026-11-13. The selected email provider and live PostgreSQL validation
remain deployment prerequisites. No business APIs were introduced.

| Capability                                | Status                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Auth decision before implementation       | Documented in authentication-decision.md                                                              |
| Registration/login/logout/current-user    | Implemented as eight auth-only handlers including recovery and MFA                                    |
| Password hashing                          | bcryptjs cost 12, no truncation, strict byte bounds                                                   |
| Sessions                                  | iron-session seals plus PostgreSQL token digest, expiry and revocation                                |
| Password recovery                         | Atomic one-use proof consumption/password update/session revocation; encrypted durable delivery queue |
| Recovery email transport                  | Deferred by user; provider-neutral leased worker interface implemented, no automatic send             |
| Organization roles / multiple memberships | Current active membership checks; independent roles per tenant                                        |
| Staff                                     | Active verified store and booking item assignment required                                            |
| Platform admin                            | Separate active grant, verified email, confirmed TOTP and fresh step-up                               |
| Public elevation protection               | No roles/tenant selectors in registration; no public grant/provisioning endpoint                      |
| Rate limiting                             | Atomic shared PostgreSQL global/account/proof/user windows                                            |
| Route helpers                             | Session, customer ownership, tenant/store/assignment and platform capability checks                   |
| Zod / responses                           | Strict bodies, bounded streaming reads, sanitized shared envelopes and private cookies/cache policy   |
| OpenAPI                                   | Eight documented endpoints in openapi.json                                                            |
| Schema migration                          | Additive 0001 authentication/grants migration; not applied to existing data                           |
| Unit/HTTP integration tests               | Implemented using real crypto libraries and isolated test-only store                                  |
| PostgreSQL integration tests              | Implemented; require disposable TEST_DATABASE_URL                                                     |

Sensitive admin business operations still require finite verified data scopes,
independent approval and durable audit intent from the existing admin architecture.
The platform capability helper is not that workflow. Other feature-specific
ownership verifiers remain later work; unsupported ownership paths deny by default.
Owner/admin provisioning and factor recovery must use a separately authorized,
audited process; none is exposed through these endpoints.

See [authentication setup](authentication-setup.md),
[OpenAPI](openapi.json) and [decision](../security/authentication-decision.md).

## Verification

Executed with Node v24.13.0 on Windows, using npm.cmd where PowerShell policy
blocks npm.ps1. TypeScript test/Drizzle commands used Windows account access
required by the loader, as in Phase 1.

| Command                                              | Result                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| npm test                                             | Passed: 120 tests, zero failures/skips; real crypto and HTTP integration plus offline schema/security/architecture checks |
| npm run lint                                         | Passed: exit 0, zero warnings                                                                                             |
| npm run typecheck                                    | Passed: Next route types and strict TypeScript                                                                            |
| npm run build                                        | Passed: eight dynamic auth routes, existing page and framework not-found only                                             |
| npm run format:check                                 | Passed                                                                                                                    |
| npm run db:migrations:check                          | Passed                                                                                                                    |
| npm run db:generate -- --name=verify_phase2_no_drift | Passed: no schema changes, no extra migration                                                                             |
| npm run db:migrate:plan                              | Passed: initial and auth migrations validated/fingerprinted offline                                                       |
| npm audit --omit=dev                                 | Passed: zero production dependency advisories reported                                                                    |
| npm run auth:test:integration                        | Blocked: TEST_DATABASE_URL absent; no live assertions executed                                                            |
| npm run db:test                                      | Blocked: both PostgreSQL suites reject absent explicit disposable target; no silent skips                                 |

The session-tampering test was corrected to alter authenticated seal bytes rather
than the library's ignored trailing version marker. Final checks include production
cookie flags, proof-to-delivery digest binding, OpenAPI/route inventory and updated
ERD/dictionary coverage for all 22 tables. No test relaxes cryptographic validation
or scope checks to accept a failure.

No local PostgreSQL/Docker executable or configured test URL was available. No
existing database was migrated or modified, no grants were provisioned and no reset
email was sent. Configure a disposable PostgreSQL database to finish live constraint,
transaction and cross-tenant verification. Configure the chosen email adapter/job
to activate delivery; queued recovery alone does not deliver email to a user.
