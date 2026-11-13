# ADR: centralized password authentication and database-backed sessions

Decision recorded before Phase 2 implementation, 2026-11-13.

Use bcryptjs (cost 12, 15-character minimum, 72-byte UTF-8 maximum) for password
hashing and iron-session for authenticated encryption/sealing of a host-only
HttpOnly session cookie. PostgreSQL remains authoritative: the sealed cookie
contains a random session token only; its SHA-256 digest identifies an expiring,
revocable session row. No role or tenant grant is accepted from the cookie/body.
This approach supports the existing long-running Node deployment and Next.js
Route Handlers without native password-hashing binaries. Argon2id would be a
reasonable future alternative after validating native deployment dependencies.
Never truncate passwords. Bcrypt cost must be load-tested on production hardware.

Registration creates an ordinary global user and credentials only. Duplicate
registration has the same accepted response; registration does not log in or
issue organization memberships/platform grants. Existing email identity cannot
be claimed by registration. Email ownership remains unverified until recovery
proof is consumed; privileged provisioning must verify email out of band.

Sessions expire after eight hours without sliding renewal. Login creates a fresh
random token; logout revokes it server-side. Password recovery uses random,
hashed, single-use, 15-minute proofs, revokes all sessions atomically, and queues
encrypted delivery material for a provider-neutral internal worker. Neither API
responses nor logs return recovery tokens. The user has deferred email provider
selection: delivery requires a future adapter to the implemented worker interface.
The worker constructs registered reset links using the configured trusted application
origin, never a request Host header. Failure is retryable and bounded by proof TTL.

Use PostgreSQL atomic fixed-window throttles (global endpoint budget plus keyed
account/token/session budgets), shared across replicas. Hash rate-limit selectors
with a server HMAC secret. These controls supplement ingress IP/connection limits;
never trust arbitrary X-Forwarded-For headers. Bound request bodies and reject
cross-origin mutation requests against an explicitly configured AUTH_ORIGIN.
Return no-store, consistent sanitized JSON with server-generated correlation IDs.

Authorization loads current active identity, memberships, organization status,
staff assignments and separate platform grants from PostgreSQL per operation.
Multiple organization memberships remain independent. Staff access requires
matching active store/booking assignments; there is no platform tenant override.
Customer resource access requires self ownership. Scope/permission helpers do not
replace tenant predicates in future repositories or commit-time rechecks.

Platform administration additionally requires fresh TOTP step-up. OTPAuth handles
TOTP validation; secrets are encrypted using iron-session, enrollment requires a
current password, and accepted steps cannot replay. Public endpoints never create
platform grants or owner memberships. These must be provisioned by an explicitly
authorized onboarding/operations process; none is exposed here. Sensitive admin
business actions still need the existing independent approval/audit controls and
are not implemented in Phase 2.

References: [iron-session](https://github.com/vvo/iron-session),
[bcryptjs](https://github.com/dcodeIO/bcrypt.js),
[OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
No authentication network/provider call occurs during imports or builds. Database
migrations remain reviewable and are not automatically executed against existing data.
