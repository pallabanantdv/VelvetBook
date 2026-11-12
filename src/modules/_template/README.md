# Module ownership template

Copy to `src/modules/<bounded-context>/` before use. No entity, use case, or adapter
is implemented here. Follow [module conventions](../README.md).

- Owner: assign the responsible team or maintainer before adding behavior.
- Scope: document the bounded context and excluded responsibilities.
- Owned data: list entities and future tables; no tables exist yet.
- Public API: explicitly export use-case contracts and DTOs from `application/public.ts`.
- Integrations: list consumer-owned ports and module contract dependencies.

There is no root barrel: choose explicit contracts or server composition entries.
