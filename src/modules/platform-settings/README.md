# platform-settings

Owner: platform-governance maintainers; individual owner pending.
Owns a closed nonsecret setting registry, revisions and propose/approve/apply contracts. No environment mutation, feature flag engine, credential storage or live configuration update exists.

Public API: `application/public.ts`, types only. Domain depends only on core.
Application ports require action-specific platform operation contexts. Proposal
and approval recording require prepared-action evidence; apply requires the
stronger sensitive context with independent approval. No wildcard tenant scope,
client-provided roles or organization-owner bypass is accepted. Contexts and IDs
must be revalidated against target ownership and the exact request at execution.

See [centralized admin architecture](../../../docs/architecture/centralized-admin.md)
and [platform permission matrix](../../../docs/security/permission-matrix.md).
