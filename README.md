# VelvetBook

Current phase: [central authentication and authorization](docs/backend/authentication-status.md)
is implemented. See [auth setup](docs/backend/authentication-setup.md) and
[OpenAPI](docs/backend/openapi.json). Email delivery awaits provider selection; live
PostgreSQL verification is pending. Older phase/audit details below are historical.

**Current backend phase:** PostgreSQL/Drizzle infrastructure now includes a lazy
server-only pool, guarded migration tooling and internal health utility. See
[database setup](docs/database/development-setup.md) and
[Phase 1 status](docs/backend/database-infrastructure-status.md). Business services
and APIs remain unimplemented. Architecture history below predates this phase;
use the current database documents for connection/migration status.

Next.js App Router, React, strict TypeScript, and npm. Existing UI, Tailwind,
Next.js settings, and the `@/*` alias to `src/*` are preserved. Zod is available
for future validation. PostgreSQL/Drizzle schema architecture is declared and proposed;
runtime database integration is deferred.
There are no database connections, API endpoints, or business services.

The [final architecture audit](docs/architecture/audit-results.md) indexes the
complete [project tree](docs/architecture/project-tree.md), editable system/domain
diagrams, actual module dependencies and the module-by-module
[future API roadmap](docs/architecture/future-api-roadmap.md). It distinguishes
existing contracts from runtime controls and lists unresolved implementation gates.

## Development

Use Node.js 20.9 or newer; prefer an actively supported LTS release.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Copy `.env.example` to `.env.local` if needed.
No variables are required yet: `DATABASE_URL` is an empty placeholder for future
server-side configuration. No validation or connection runs now. Never commit
secrets or prefix database credentials with `NEXT_PUBLIC_`.

Production: `npm run build`, then `npm start`. The preserved `next/font/google`
configuration downloads Geist during builds and requires access to Google's font
service.

## Architecture

All layers live directly under `src/`. Empty directories have `.gitkeep` files.

```text
src/
  app/              App Router pages, layouts, global styles, route composition
  modules/          Identity, authorization, and a reusable module scaffold
  core/             Framework-independent domain types and contracts
  infrastructure/   Future server-only external system adapters
  db/               Proposed PostgreSQL/Drizzle schema organized by domain
  shared/           Reusable UI and environment-neutral utilities
  config/           Public and private application configuration
  types/            Cross-cutting TypeScript types
  tests/            Offline schema and security architecture checks
```

Keep routing in `app`, features in `modules`, external system details in
`infrastructure` and `db`, and `core` independent of Next.js and database
implementations. Share environment-neutral code through `shared` and `types`.
Avoid barrel exports that mix client and server modules.

The backend follows a modular monolith with clean architecture. See the
[module conventions and allowed imports](src/modules/README.md),
[copyable scaffold](src/modules/_template/README.md), and
[core contract ownership](src/core/README.md). ESLint enforces dependencies and
local import cycles. `npm run test:architecture` verifies these rules.

Phase 3 adds [database architecture and open questions](src/db/README.md), a
[data dictionary](docs/database/data-dictionary.md), and a
[proposed Mermaid ERD](docs/database/erd.md). `drizzle.config.ts` is schema-only:
no credentials, client, migration, seed, or connection is configured.

Phase 4 adds identity/authentication and scoped authorization contracts. See the
[security architecture](docs/security/architecture.md),
[proposed permission matrix](docs/security/permission-matrix.md), and
[future authorization test specifications](docs/security/authorization-test-specifications.md).
No authentication/session or authorization handler is implemented.

Phase 5 defines [partner modules and onboarding architecture](docs/architecture/partner-modules.md):
organizations, onboarding, stores, staff, services, products, business-photos,
visibility and operating-hours. Workflow handlers, queries, uploads and new storage
are deferred; structural validation schemas are provided at module boundaries.

Phase 6 adds [customer/booking contracts and concurrency diagrams](docs/architecture/customer-booking-modules.md)
for customers, discovery, favorites, availability, bookings, deals, negotiation,
reviews and messaging. Phase 7 adds [external integration architecture](docs/architecture/external-integrations.md)
for payments, refunds, notifications, file-storage, maps, email, webhooks and domain-events.
Both phases remain architecture-only; no live integration or booking/payment
workflow is implemented. The proposed database ERD/dictionary includes their
declared schema changes and explicitly lists deferred storage.

Phase 8 adds [centralized admin architecture](docs/architecture/centralized-admin.md)
for admin, organization-approvals, user-management, moderation, reports,
platform-settings and audit-logs. Platform-only contracts require bounded verified
scope; sensitive actions require independent approval and audit evidence. No admin
operation, query, endpoint or dashboard is implemented.

## Server boundaries

App Router components are Server Components by default. Add `"use client"` only
for interactive entry points. Every backend module must start with
`import "server-only"`. Next.js rejects direct and transitive imports of these
modules into Client Components at build time.

ESLint requires this marker and prohibits `"use client"` in executable files under
`src/db/`, `src/infrastructure/`, module `infrastructure/` directories, any
`server/` directory, and `*.server.*` files. Pure domain/core contracts remain
framework-independent and do not import the marker.
Place backend code in those paths, including private environment configuration
such as `src/config/env.server.ts` and future feature services under
`src/modules/<feature>/server/`. Declaration files are exempt. Never pass secrets
to Client Components through props or public configuration.

The preserved `cacheComponents: true` setting uses the default Node.js runtime.
The installed Next.js version disallows route-level `runtime` exports with Cache
Components enabled, so none is added. Deploy to a Node.js environment.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run format:check
npm run db:check
npm run test:security
npm run test:partner-contracts
npm run test:integrations
npm run test:admin-contracts
npm run build
```

Type checking generates Next.js route types first, including on fresh clones.
ESLint uses Next.js Core Web Vitals and TypeScript rules plus server boundary
rules. Prettier handles formatting; `npm run format` applies it. Architecture
checks use Node's built-in test runner. `db:check` serializes the proposed schema
in memory and checks its metadata without executing SQL or writing migrations.
Connection pooling, migrations and database integration tests remain deferred.

Phase 9 adds [shared backend infrastructure](docs/architecture/shared-backend-infrastructure.md):
typed errors, future JSON response contracts, sanitized error mapping, structured
logging, explicit server environment validation, transaction/pagination ports and
health/telemetry contracts. No routes, connections or concrete adapters are added.
`npm test` discovers all contract and architecture suites using the existing Node
runner and tsx loader. See the [testing strategy](docs/testing-strategy.md) for
current verification and future integration, security and end-to-end coverage.
