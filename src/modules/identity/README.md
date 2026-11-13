# Identity module

Phase 2 runtime: application/authentication.server.ts implements orchestration
through IdentityStore/IdentitySecurity ports. infrastructure contains bcrypt/iron/
TOTP adapters, PostgreSQL persistence and the existing SessionValidationPort bridge.
See [setup and limitations](../../../docs/backend/authentication-setup.md).
Public cross-module imports remain types only; server composition wires implementations.

Owner: identity/security maintainers (individual owner to be assigned).
Owns canonical user identity, authentication-provider contracts, validated session
context, password-reset and future MFA contracts. Authorization owns privileges;
identity must not import authorization or derive privileges from provider claims.

The public API is `application/public.ts`, exporting types only. Sensitive port
contracts use `*.server.ts`; infrastructure entry points import `server-only`.
Pure domain/context types contain no secrets and require no framework imports.
Never serialize a SessionContext, credential evidence, reset proof, or MFA proof
to clients or logs merely because its type is visible.

`UserIdentity` is a local user, not a provider profile. Session validation must
verify evidence, expiry, revocation, active user state, subject binding, and MFA
assurance against authoritative server data. It must refresh security state on
each operation; roles/tenant selectors in a token are not authority. An
authentication result is not an issued session, and an MFA result is not an
automatically upgraded SessionContext.

Password reset must avoid account enumeration, use single-use expiring proofs,
throttle abuse, validate password policy, and revoke affected sessions. MFA must
bind a challenge to the same session/user and purpose, expire it, consume it
once, and reject replay. Current TOTP binds proof to the authenticated user/session
and consumes accepted time steps. The older generic challenge/provider contracts
remain future extension points; the runtime uses the concrete password/TOTP flow.

Password/session/TOTP persistence and auth endpoints are implemented in Phase 2.
Email transport selection is deferred by the user; reset delivery remains queued
until an adapter is configured. Factor recovery, federation and privileged grant
provisioning remain separately authorized future workflows. See the current
[authentication setup](../../../docs/backend/authentication-setup.md) alongside the
historical [security architecture](../../../docs/security/architecture.md).
