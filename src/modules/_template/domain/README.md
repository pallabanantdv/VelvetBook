# Domain

Copy this module scaffold to a real bounded-context name before using it.
Place entities in `entities/`, value objects in `value-objects/`, and domain
contracts in `contracts/`. Add only concepts owned by this module. Import only
this module's domain and framework-independent `src/core` contracts.
No Next.js, Drizzle, Zod, Node APIs, environment reads, or external services.
