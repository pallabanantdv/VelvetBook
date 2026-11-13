# Module conventions

VelvetBook is a modular monolith: one deployable application, explicit feature
ownership, and inward dependencies. `_template` is a copyable scaffold, not a
running feature. Copy it to `src/modules/<lower-kebab-case-bounded-context>/`.
Fill in its ownership README before adding behavior. Remove unused placeholder
folders when the feature takes shape; do not invent entities or fake adapters.

```text
<module>/
  README.md
  domain/
    entities/
    value-objects/
    contracts/
  application/
    public.ts
    use-cases/
    dtos/
    ports/
  infrastructure/
    index.ts
    persistence/
    external/
  presentation/
    contracts.ts
```

## Ownership and imports

The module owner controls entities, invariants, contracts, and future schema.
Only that module's adapters access its future tables. Shared database mechanics
belong in `src/db`, shared external adapters in `src/infrastructure`, and stable
domain-neutral contracts in `src/core`. No database operations exist yet.

| Source         | Allowed internal dependencies                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| Core           | Core only                                                                        |
| Domain         | Own domain and core                                                              |
| Application    | Own application, own domain, core                                                |
| Infrastructure | Own infrastructure, application, domain, core; shared infrastructure, db, config |
| Presentation   | Own presentation, application, core                                              |

The direction is `presentation -> application -> domain`. Infrastructure
implements application ports. Domain and application cannot import packages or
outer layers. Infrastructure may import external SDKs and future database
libraries. Presentation is currently contracts only: no framework imports or
actual routes. `server-only` is allowed in outer layers and application execution
files, but forbidden in pure domain/core contracts.

Application, infrastructure, and presentation may reference another module only
through **type-only** imports of its `application/public.ts`. Domain cannot import
other modules. Use consumer-owned ports for runtime integration; a future server
composition root in `src/app` or a dedicated `*.server.ts` file injects adapters.
Do not instantiate adapters inside use cases or add a service locator.
No composition runtime or fake implementation is supplied now.

Keep DTOs transport-neutral. Explicitly export public contract types; avoid
`export *` and barrels mixing types with implementations. Private executable
application/presentation files belong under `server/` or use `*.server.ts`.
Every infrastructure executable file imports `server-only`; Next.js rejects
transitive client imports. Pure contract types can be shared within these rules.

## Enforcement

`npm run lint` checks aliases, relative imports, re-exports, literal dynamic
imports, require calls, type imports, and local source cycles (including type
cycles). Nonliteral module loads in architecture layers are rejected.
Core/domain/application also prohibit direct use of `process`, `fetch`, `window`,
and `document`. Lint is not a security sandbox: review data ownership and indirect
global access. Do not add aliases or custom module resolution without updating
`tooling/eslint/architecture.mjs` and its checks.

`npm run test:architecture` verifies the rules without implementing features.

Phase 5 adds the nine [partner modules](../../docs/architecture/partner-modules.md)
and dependency/lifecycle diagrams. `presentation/validation.server.ts` may import
Zod for structural validation; domain/application remain package-independent.
Public exports remain type-only.

Phases 6/7 add [customer/booking architecture](../../docs/architecture/customer-booking-modules.md)
and [external integration architecture](../../docs/architecture/external-integrations.md).
Integration modules provide server-only ports and empty adapters; no SDK/provider
is selected and domain code remains package-independent.

Phase 8 adds [centralized admin contracts](../../docs/architecture/centralized-admin.md).
Admin owns shared platform operation/control contracts and imports none of its
consumers. Approval coordination depends one-way on onboarding public types;
reports and audit access require explicit verified platform data scope.
