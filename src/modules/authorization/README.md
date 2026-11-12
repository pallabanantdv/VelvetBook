# Authorization module

Owner: authorization/security maintainers (individual owner to be assigned).
Owns scoped roles and permissions, membership contracts, verified tenant/platform
contexts, ownership verification, and the authorization port. Identity is consumed
only through type imports of its public application contracts; domain imports
only local domain types and core identifiers.

Public API: `application/public.ts`, types only. Static proposed permission bundles
live in `application/policy/role-permissions.server.ts`. That file is server-only
and is **not an authorization engine**. Infrastructure has an empty server-only
entry point; no database access, grant loader, or decision handler exists.

`TenantContext` requires an active membership for the authenticated user and an
active organization. A platform admin has a separately resolved PlatformContext,
not a wildcard tenant membership. Customer access uses self/ownership predicates,
not a fabricated tenant membership. All verified contexts are opaque branded
types; no unsafe constructor or deserialization function is provided. Brands are
compile-time guardrails, not cryptographic proof; never bypass them with casts.

ResourceOwnership contains server-loaded facts, **not permission**. Verification
must bind to the subject and verified tenant; authorization must still compare
scope, resource kind, owner, staff assignment, current role, and freshness. An
AuthorizedOperation is request-bound and cannot be cached as a general capability.

Persistence: the proposed membership table now uses owner/manager/staff/member.
The earlier proposed `admin` name is replaced by `manager`; no migration or data
conversion ran. `member` deliberately grants no organization operations. Staff
also requires active matching store assignments. Platform grants are not stored
in memberships; their persistence/provisioning is still deferred.

See [operation enforcement](../../../docs/security/architecture.md),
[permission matrix](../../../docs/security/permission-matrix.md), and
[future authorization test specifications](../../../docs/security/authorization-test-specifications.md).
