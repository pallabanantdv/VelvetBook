# Core contracts

Core is a small shared kernel jointly owned by module maintainers. Changes need
review from consumers. Add only stable concepts shared across bounded contexts;
feature entities, policies, DTOs, and repository contracts stay in their module.

- `errors.ts`: structural application error data, not HTTP status codes.
- `results.ts`: discriminated success/failure values, without runtime factories.
- `identifiers.ts`: nominal identifiers and shared user/session/tenant ID aliases,
  without unchecked constructors.
- `authorization.ts`: generic principal and authorization boundary, without policy.
  Scoped VelvetBook security contracts live in the authorization module; this
  generic interface is not a second enforcement mechanism.
- `abstractions.ts`: clock and identifier-generation ports, without implementations.
- `money.ts`: proposed string-decimal money shape; no calculations or validation.
- `time.ts`: proposed half-open UTC range shape; no date arithmetic.
- `request-context.ts`, `logging.ts`, `observability.ts`: diagnostic identifiers,
  structured logging and bounded telemetry ports, without sinks or SDKs.
- `validation.ts`, `pagination.ts`: input validation and cursor-page contracts.
- `transactions.ts`: tenant/platform transaction scope and opaque participation proof.
- `health.ts`: internal liveness/readiness and bounded probe contracts, without routes.
- `integrations.ts`: opaque server-derived integration context and sanitized
  failure vocabulary; no credential reader, retry loop or runtime implementation.

Use direct `import type` imports. Core imports only core, never Next.js, Zod,
Drizzle, Node APIs, or features. These pure contracts need no server-only marker.
Concrete implementations must live behind a server boundary.
