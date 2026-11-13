# Identity and authorization architecture

Phase 4 defines contracts and proposed policy data only. Nothing authenticates
or authorizes requests yet. There are no login routes, session implementations,
cookies, JWT issuance, real authorization handlers, or database operations.

## Trust boundaries

Identity verifies who is acting. Authorization verifies the requested action on
a particular resource, including tenant/ownership constraints. A role bundle is
only a candidate capability: it never replaces resource checks. Missing context,
unknown permission, stale security state, or unavailable verification fails closed.

UserIdentity, SessionContext, TenantContext, Membership, Role, and Permission are
explicit types. Shared identifiers live in core. Existing core authorization
interfaces remain generic boundaries, not an alternative enforcement mechanism;
future VelvetBook operations use the scoped authorization module contracts.

Role namespaces are separate: customer privileges follow the authenticated local
identity; organization privileges come from current membership; platform-admin
privileges come from a separately provisioned active platform grant. Provider
claims cannot grant local roles. Roles in one organization never apply in another.
Owner is not platform admin, and platform admin is not organization owner.

Pure contract types may be imported type-only. Secret-bearing port declarations,
policy data, and infrastructure entry points are marked server-only. Never expose
session or ownership context objects as client props. The public type API does
not authorize runtime serialization. Type brands prevent accidental construction,
but casts/JSON cannot establish trust; future adapters must validate server state.

## Mandatory sequence for every future server operation

1. Validate transport input shape, size, and canonical identifiers. Treat URL,
   body, header, host/subdomain, and token organization IDs as untrusted selectors.
   Client user IDs, roles, prices, staff assignments, and owner claims are not authority.
2. Validate authentication through SessionValidationPort. Reject missing, expired,
   revoked, forged, disabled-user, or unverifiable evidence. Revalidate per operation;
   rendering a protected page or hiding UI does not secure subsequent operations.
3. Select an explicit scope. For organization operations, TenantResolutionPort
   verifies current active membership for `session.identity.userId`, the selected
   organization, active organization state, and current store assignments. Do not
   construct TenantContext from the selector or fall back to another tenant.
4. Resolve minimal resource/parent facts through OwnershipVerificationPort. Tenant
   lookups bind to verified organization; customer lookups bind to user ownership.
   Compare store and all parent-child IDs. Return uniform access denial for missing
   or inaccessible resources. No cross-tenant lookup may expose resource data.
5. Invoke AuthorizationPort with exact scope/resource/action, authenticated subject,
   verified target facts, and the required tenant or platform context. It must bind
   every context's subject to the session, match the permission to the target kind,
   and check role plus row/store/customer/staff constraints. Staff's booking reads
   and updates require matching active store assignment AND assigned booking items.
6. Only after success execute the intended future use case. Recheck mutable state
   close to the operation and enforce tenant predicates in every query, list,
   aggregate, export, and nested load. Use transactions/version checks when needed
   to avoid time-of-check/time-of-use races; a proof is not perpetual authorization.
7. Record the future security audit outcome with subject, tenant, action, resource,
   decision, and correlation ID. Redact credential, reset, MFA, and session evidence;
   minimize PII and normalize public errors. No audit writer is implemented here.

Server Actions, Route Handlers, jobs, uploads, webhooks, and internal callers must
cross an equivalent trusted boundary. They must not bypass checks by invoking an
application port directly. Provider verification has Phase 7 contracts, but no
verifier or service-actor authorization implementation exists. Worker/webhook
effects stay unsupported until actor permissions and trusted context construction
are reviewed.

## Customers, collections, and creation

Customers do not need tenant memberships to read/cancel their own bookings or
read their own payments. Payment ownership follows booking.customer_user_id,
not the payment organization alone. Profile access compares the local user ID.
This is a distinct customer path: it grants no tenant-wide access.

Existing resources use `AuthorizationTarget.kind = existing`. Collection/create
targets use a verified parent and requested resource kind; authorization must
validate the parent-child relationship and output/query scope. For a new customer
booking, verify an active publicly bookable store and derive customer user ID
from the validated session; client organization/customer IDs cannot be copied.
The earlier schema has no public-bookability flag: booking creation remains denied
until that rule is defined. No target proof alone permits creation.

Organization lists use an organization/store parent, never an unrestricted query.
Staff booking lists must filter to assignments, not load all rows then filter in
memory. Platform collections have an explicit platform-only target form; customer
and organization requests cannot use it. Each future operation must declare its
target/parent kind, field-level visibility, and allowed mutation fields.

## Platform administration

PlatformAccessPort requires authoritative active grant verification and sufficiently
fresh MFA. Grant storage, provisioning, emergency access, and freshness duration
are undecided; no grant can be inferred from email, organization role, or provider
metadata. Platform operations are explicitly enumerated in the matrix and audited.
They do not expose tenant booking/payment data, impersonate customers, or bypass
tenant membership. A platform administrator who is also a member must use the
organization path for that membership; never merge namespaces into wildcard access.

## Open decisions

- Authentication provider, credential storage, session mechanism, revocation,
  verification freshness, MFA enrollment/recovery and step-up policies.
- Membership invitations, multiple roles, last-owner protection and ownership
  transfer. Membership management excludes assigning owner, self-elevation, and
  platform grants until dedicated workflows are designed.
- Store-specific manager scope, staff field visibility, allowed booking transitions,
  customer cancellation policy, verified-email requirements, public-bookability.
- Platform grant storage/provisioning, suspension recovery, PII visibility, audit
  access and tamper resistance. Suspension blocks tenant/customer business actions;
  account recovery and platform recovery require explicitly defined separate paths.
- Policy versioning, context TTL/revalidation, concurrency semantics, RLS and query
  enforcement. No schema-only FK or TypeScript type substitutes for authorization.

The proposed deny-by-default and per-request verification approach follows
[OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
