# Identity module

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
once, and reject replay. Enrollment, credential storage, provider selection,
revocation storage, and recovery policy are open decisions.

No provider, session, cookie, JWT, hashing, reset delivery, MFA adapter, or login
API is implemented. No identity persistence beyond the earlier users proposal
has been added. See the [security architecture](../../../docs/security/architecture.md)
and [future test specifications](../../../docs/security/authorization-test-specifications.md).
