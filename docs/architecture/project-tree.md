# Audited project tree

Complete authored-file tree, including empty scaffold directories and .gitkeep files.
Excluded: .git, node_modules, .next, coverage, out, build, generated next-env.d.ts
and tsconfig.tsbuildinfo, and private .env files. Public assets are included.
Regenerate after file changes with `node tooling/architecture/inventory.mjs --write`.

```text
velvet-book/
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── README.md
├── compose.database.yml
├── docs/
│   ├── architecture/
│   │   ├── architecture-decisions.md
│   │   ├── audit-results.md
│   │   ├── backend-architecture.md
│   │   ├── booking-workflow.md
│   │   ├── centralized-admin.md
│   │   ├── customer-booking-modules.md
│   │   ├── database-erd.md
│   │   ├── deployment-proposal.md
│   │   ├── external-integrations.md
│   │   ├── frontend-flow.md
│   │   ├── future-api-roadmap.md
│   │   ├── module-dependencies.md
│   │   ├── open-questions.md
│   │   ├── partner-modules.md
│   │   ├── partner-onboarding.md
│   │   ├── project-tree.md
│   │   ├── security-and-tenancy.md
│   │   ├── shared-backend-infrastructure.md
│   │   └── system-context.md
│   ├── backend/
│   │   ├── api-development-plan.md
│   │   ├── authentication-setup.md
│   │   ├── authentication-status.md
│   │   ├── database-infrastructure-status.md
│   │   ├── implementation-status.md
│   │   └── openapi.json
│   ├── database/
│   │   ├── data-dictionary.md
│   │   ├── development-setup.md
│   │   └── erd.md
│   ├── security/
│   │   ├── architecture.md
│   │   ├── authentication-decision.md
│   │   ├── authorization-test-specifications.md
│   │   └── permission-matrix.md
│   └── testing-strategy.md
├── drizzle/
│   ├── 0000_database_foundation.sql
│   ├── 0001_authentication_and_grants.sql
│   └── meta/
│       ├── 0000_snapshot.json
│       ├── 0001_snapshot.json
│       └── _journal.json
├── drizzle.config.ts
├── eslint.config.mjs
├── next.config.ts
├── package-lock.json
├── package.json
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── auth/
│   │   │           ├── login/
│   │   │           │   └── route.ts
│   │   │           ├── logout/
│   │   │           │   └── route.ts
│   │   │           ├── me/
│   │   │           │   └── route.ts
│   │   │           ├── mfa/
│   │   │           │   ├── enroll/
│   │   │           │   │   └── route.ts
│   │   │           │   └── verify/
│   │   │           │       └── route.ts
│   │   │           ├── password-reset/
│   │   │           │   ├── complete/
│   │   │           │   │   └── route.ts
│   │   │           │   └── request/
│   │   │           │       └── route.ts
│   │   │           └── register/
│   │   │               └── route.ts
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── config/
│   │   ├── .gitkeep
│   │   ├── authentication.server.ts
│   │   ├── database.server.ts
│   │   └── environment.server.ts
│   ├── core/
│   │   ├── .gitkeep
│   │   ├── README.md
│   │   ├── abstractions.ts
│   │   ├── authorization.ts
│   │   ├── errors.ts
│   │   ├── health.ts
│   │   ├── identifiers.ts
│   │   ├── integrations.ts
│   │   ├── logging.ts
│   │   ├── money.ts
│   │   ├── observability.ts
│   │   ├── pagination.ts
│   │   ├── request-context.ts
│   │   ├── results.ts
│   │   ├── time.ts
│   │   ├── transactions.ts
│   │   └── validation.ts
│   ├── db/
│   │   ├── .gitkeep
│   │   ├── README.md
│   │   ├── client.server.ts
│   │   ├── health.server.ts
│   │   ├── migrations.server.ts
│   │   └── schema/
│   │       ├── audit/
│   │       │   └── audit-logs.ts
│   │       ├── bookings/
│   │       │   ├── booking-items.ts
│   │       │   └── bookings.ts
│   │       ├── catalog/
│   │       │   ├── products.ts
│   │       │   └── services.ts
│   │       ├── commerce/
│   │       │   ├── deals.ts
│   │       │   └── payments.ts
│   │       ├── common.ts
│   │       ├── customers/
│   │       │   ├── favorites.ts
│   │       │   └── reviews.ts
│   │       ├── identity/
│   │       │   ├── authentication.ts
│   │       │   ├── customer-profiles.ts
│   │       │   └── users.ts
│   │       ├── index.ts
│   │       └── organizations/
│   │           ├── organization-members.ts
│   │           ├── organizations.ts
│   │           ├── staff.ts
│   │           └── stores.ts
│   ├── infrastructure/
│   │   ├── .gitkeep
│   │   ├── authentication/
│   │   │   ├── reset-delivery.server.ts
│   │   │   ├── routes.server.ts
│   │   │   └── runtime.server.ts
│   │   └── index.ts
│   ├── modules/
│   │   ├── .gitkeep
│   │   ├── README.md
│   │   ├── _template/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── README.md
│   │   │   │   ├── dtos/
│   │   │   │   │   └── .gitkeep
│   │   │   │   ├── ports/
│   │   │   │   │   └── .gitkeep
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── .gitkeep
│   │   │   ├── domain/
│   │   │   │   ├── README.md
│   │   │   │   ├── contracts/
│   │   │   │   │   └── .gitkeep
│   │   │   │   ├── entities/
│   │   │   │   │   └── .gitkeep
│   │   │   │   └── value-objects/
│   │   │   │       └── .gitkeep
│   │   │   ├── infrastructure/
│   │   │   │   ├── README.md
│   │   │   │   ├── external/
│   │   │   │   │   └── .gitkeep
│   │   │   │   ├── index.ts
│   │   │   │   └── persistence/
│   │   │   │       └── .gitkeep
│   │   │   └── presentation/
│   │   │       ├── README.md
│   │   │       └── contracts.ts
│   │   ├── admin/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── contexts.ts
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── audit-logs/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── authorization/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── access.server.ts
│   │   │   │   ├── contexts.ts
│   │   │   │   ├── operation-context.ts
│   │   │   │   ├── policy/
│   │   │   │   │   └── role-permissions.server.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── authorization.server.ts
│   │   │   │   │   ├── ownership.server.ts
│   │   │   │   │   └── tenant-resolution.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   ├── membership.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   └── roles.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── access.server.ts
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── availability/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── bookings/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── business-photos/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── asset-verification.server.ts
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── customers/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── deals/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── discovery/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── domain-events/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── email/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── favorites/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── file-storage/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── identity/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── authentication.server.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── authentication.server.ts
│   │   │   │   │   ├── mfa.server.ts
│   │   │   │   │   ├── password-reset.server.ts
│   │   │   │   │   ├── runtime.server.ts
│   │   │   │   │   └── session-validation.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── session-context.ts
│   │   │   ├── domain/
│   │   │   │   └── identity.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── index.ts
│   │   │   │   ├── postgres.server.ts
│   │   │   │   ├── security.server.ts
│   │   │   │   └── session-validation.server.ts
│   │   │   └── presentation/
│   │   │       ├── contracts.ts
│   │   │       └── validation.server.ts
│   │   ├── maps/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── messaging/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── moderation/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── negotiation/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── notifications/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── onboarding/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   ├── contracts.ts
│   │   │   │   │   └── sections.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── repository.server.ts
│   │   │   │   │   ├── review-repository.server.ts
│   │   │   │   │   └── workflow.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── operating-hours/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── organization-approvals/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── organizations/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── payments/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── platform-settings/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       ├── contracts.ts
│   │   │       └── validation.server.ts
│   │   ├── products/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── refunds/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── reports/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── reviews/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── services/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── staff/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── stores/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   ├── user-management/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── contracts.server.ts
│   │   │   │   └── public.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── contracts.ts
│   │   ├── visibility/
│   │   │   ├── README.md
│   │   │   ├── application/
│   │   │   │   ├── dtos/
│   │   │   │   │   └── contracts.ts
│   │   │   │   ├── ports/
│   │   │   │   │   └── repository.server.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── use-cases/
│   │   │   │       └── manage.server.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── model.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── index.ts
│   │   │   └── presentation/
│   │   │       └── validation.server.ts
│   │   └── webhooks/
│   │       ├── README.md
│   │       ├── application/
│   │       │   ├── ports/
│   │       │   │   └── contracts.server.ts
│   │       │   └── public.ts
│   │       ├── domain/
│   │       │   └── entities/
│   │       │       └── model.ts
│   │       ├── infrastructure/
│   │       │   └── index.ts
│   │       └── presentation/
│   │           └── contracts.ts
│   ├── shared/
│   │   ├── .gitkeep
│   │   ├── presentation/
│   │   │   ├── api-contracts.ts
│   │   │   └── error-mapping.server.ts
│   │   └── validation/
│   │       ├── input.server.ts
│   │       └── pagination.server.ts
│   ├── tests/
│   │   ├── .gitkeep
│   │   ├── admin-contracts.test.ts
│   │   ├── authentication.test.ts
│   │   ├── database-infrastructure.test.ts
│   │   ├── db-schema.test.ts
│   │   ├── final-architecture-audit.test.ts
│   │   ├── integration/
│   │   │   ├── authentication.integration.ts
│   │   │   └── database.integration.ts
│   │   ├── integration-contracts.test.ts
│   │   ├── partner-contracts.test.ts
│   │   ├── security-architecture.test.ts
│   │   ├── shared-infrastructure.test.ts
│   │   └── support/
│   │       └── memory-identity.ts
│   └── types/
│       └── .gitkeep
├── tooling/
│   ├── architecture/
│   │   └── inventory.mjs
│   ├── database/
│   │   └── cli.ts
│   ├── eslint/
│   │   ├── architecture.mjs
│   │   ├── architecture.test.mjs
│   │   ├── final-audit.test.mjs
│   │   └── shared-boundaries.test.mjs
│   └── test/
│       └── run.mjs
└── tsconfig.json
```
