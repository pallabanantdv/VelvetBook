# stores

Owner: partner-domain maintainers (individual owner pending).
Owns store profile, timezone, and archival. Many stores may belong to one organization.

Public API: `application/public.ts`, type-only contracts. Domain entities are
framework-independent. Repository and application ports are server-only and have
no implementations. Structural Zod schemas live in `presentation/validation.server.ts`.
A successful parse never establishes tenant membership, ownership or authorization.

All operations require OrganizationOperationContext from trusted server composition.
Compare every entity/store/member/asset organization to its verified tenant before
access. IDs in drafts and targets are selectors, not authority. A save contract
must bind the authorized action and target; the context is not a blanket grant.
Use expectedRevision for proposed optimistic concurrency; null means create-only.
No revision storage or write behavior is implemented.

See [partner architecture](../../../docs/architecture/partner-modules.md) for
ownership, proposed semantics, persistence gaps, permission mappings and dependencies.
