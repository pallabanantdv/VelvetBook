# negotiation

Owner: customer/booking-domain maintainers; individual owner pending.
Public contracts: `application/public.ts` (types only). Domain data is independent
of frameworks and other feature domains. Ports and validation are server-only.
No repository, algorithm, policy, transport or provider implementation exists.

Customer context requires a validated session and request-specific customer
AuthorizedOperation. Organization callers, where accepted, require a verified
active tenant and matching organization-scoped permission. IDs in DTOs are
untrusted selectors; bind customer user ID from session, resolve store/tenant
server-side, and verify nested ownership before any future operation.
New capabilities without an explicit permission remain denied by default.

See [Phase 6 architecture](../../../docs/architecture/customer-booking-modules.md)
for ownership, dependencies, lifecycle, persistence gaps and concurrency requirements.
