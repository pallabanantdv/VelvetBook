# audit-logs

Owner: platform-governance maintainers; individual owner pending.
Owns immutable audit-event contracts, trusted append-only writers and authorized bounded query/export ports. No audit database writer, searchable store, redaction engine or export implementation exists.

Public API: `application/public.ts`, types only. Domain depends only on core.
Application ports require action-specific platform operation contexts; mutations
and exports require sensitive-operation evidence. No wildcard tenant scope,
client-provided roles or organization-owner bypass is accepted. Contexts and IDs
must be revalidated against target ownership and the exact request at execution.

See [centralized admin architecture](../../../docs/architecture/centralized-admin.md)
and [platform permission matrix](../../../docs/security/permission-matrix.md).
