# Testing strategy

Phase 1 database update: npm test includes offline database configuration/pool,
migration guard/history safety and snapshot agreement checks. npm run db:test is
a separate live PostgreSQL suite requiring an explicit disposable TEST_DATABASE_URL
ending in _test. It fails if missing and never falls back to DATABASE_URL. See
[database setup and test safety](database/development-setup.md). Existing business
contract tests remain offline; they are not authentication or booking execution tests.

`npm test` uses Node's built-in test runner and the existing tsx loader. The
cross-platform discovery script explicitly finds all src/tests/**/\*.test.ts and
tooling/eslint/**/*.test.mjs files, sorts them, and fails if none exist. Suites run
serially to avoid filesystem fixture races. The react-server export condition
allows testing server-only modules in Node; it does not remove production client
boundary enforcement. No additional runner dependency or live service is needed.

## Unit and architecture

Test pure schemas, error sanitization, configuration profiles, permissions and
schema declarations without starting Next.js or connecting to infrastructure.
Use discriminated Results and strict compilation for contract compatibility.
Architecture tests exercise forbidden imports, server markers and cycle detection;
lint applies those same rules to the actual source tree. Shared tests cover both
successful parsing and invalid input, disabled/incomplete capabilities, secret
leakage, exact status mappings and pagination bounds. Do not implement fake
production services just to satisfy tests. No coverage percentage is claimed.

## Integration (future, opt-in)

Use disposable isolated PostgreSQL instances, explicit test credentials and
reviewed migrations. Verify composite tenant FKs, unique constraints, rollback
on Result failures/exceptions, isolation conflicts, bounded whole-transaction
retries, idempotency and atomic outbox persistence. Test adapter serialization,
timeouts and failure classification against provider sandboxes or controlled
test servers. Live integrations must never be part of the default unit command.
No database integration suite or migration execution is introduced in Phase 9.

## Security

Continue the authorization specifications for unauthenticated requests, stale or
suspended memberships, cross-tenant resource IDs, explicit platform scope,
step-up controls and audit requirements. Add request/header bounds, error and log
redaction, credential/public-env leaks, cursor tampering, enumeration prevention,
webhook signature/replay rejection and duplicate event handling as handlers appear.
Contract tests demonstrate architecture only; they do not prove runtime controls
that have not been implemented.

## End-to-end (future)

Once routes and workflows exist, run browser/server scenarios for onboarding,
booking conflicts, cancellation, payment outcomes and administrative decisions in
an isolated environment. Use synthetic identities and test-provider credentials;
assert tenant isolation and audit outcomes as well as visible results. No E2E
framework, routes, sessions or real provider is introduced at this stage.

## Verification pipeline

Use npm ci, npm run lint, npm run typecheck, npm test, npm run format:check and
npm run build. Existing UI fonts require Google Fonts access for a production
build; build still requires no database or integration credentials. Build/typegen
may update ignored generated Next.js types. Tests and lint supplement TypeScript;
none replaces future integration, security or end-to-end verification.
