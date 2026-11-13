# reports

Owner: platform-governance maintainers; individual owner pending.
Owns versioned aggregate report definitions, snapshots and private export contracts. Bookings, payments, active businesses and platform activity use explicit verified scope and data minimization.

Public API: `application/public.ts`, types only. Domain depends only on core.
Application ports require action-specific platform operation contexts; mutations
and exports require sensitive-operation evidence. No wildcard tenant scope,
client-provided roles or organization-owner bypass is accepted. Contexts and IDs
must be revalidated against target ownership and the exact request at execution.

See [centralized admin architecture](../../../docs/architecture/centralized-admin.md)
and [platform permission matrix](../../../docs/security/permission-matrix.md).
