# Phase 2 authentication and authorization

The [decision recorded before implementation](../security/authentication-decision.md)
selects bcryptjs, iron-session, PostgreSQL sessions and OTPAuth. Eight auth-only
endpoints are specified in [OpenAPI 3.1](openapi.json). No organization, booking,
payment or admin business endpoint is enabled.

## Deployment configuration

Apply the reviewed 0001_authentication_and_grants migration using the existing
[database workflow](../database/development-setup.md). The seven new auth/grant
tables and nullable users.email_verified_at are additive. Existing user rows are
not assigned credentials or roles. No live migration was executed in this phase.

Configure server-only values in .env.local or the deployment secret store:

```dotenv
AUTH_ORIGIN=http://localhost:3000
AUTH_SECRET=replace-with-a-cryptographically-random-secret-at-least-64-characters
DATABASE_ENABLED=true
```

Generate AUTH_SECRET with a secure password manager or Node crypto.randomBytes(48)
encoded as base64; do not use the example string. Configure DATABASE_URL/TLS as in
Phase 1. Production AUTH_ORIGIN must be an HTTPS origin with no path/trailing slash.
Do not prefix auth/database secrets with NEXT_PUBLIC_. Changes require process
restart. Builds/imports do not require auth secrets or connect to PostgreSQL.

AUTH_SECRET protects cookie seals, encrypted reset delivery material and TOTP
secrets, and HMACs throttle keys. Losing/changing it invalidates all seals and
existing enrolled factors. Plan an approved key migration/re-enrollment procedure
before rotation; arbitrary replacement is not a safe factor-recovery mechanism.
Restrict access and backups accordingly. Separate seal purposes prevent recovery
material from being used as a session cookie.

Production cookies are __Host-velvetbook_session, Secure, HttpOnly, SameSite=Lax,
Path=/ with no Domain attribute. Local HTTP uses velvetbook_session. Sessions expire
after eight hours, never slide, and are checked against the database on every use.
Only SHA-256 random-token digests are stored in auth_sessions. Login issues a fresh
token. Logout revokes its row and expires the cookie. Recovery revokes all sessions.
Disabled users, expired sessions and revoked grants fail closed. Responses use
no-store/no-referrer/nosniff, and IDs are generated server-side. Cookies/passwords,
TOTP seeds, reset links and raw errors must not be logged by ingress/APM/body capture.

## Endpoint behavior

| Method | Path below /api/v1/auth  | Behavior                                                                                                 |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| POST   | /register                | Strict email/displayName/password only; identical 202 for existing/new email, no auto-login or grants    |
| POST   | /login                   | Generic 401 for unknown/disabled/wrong-password; new session cookie on success                           |
| POST   | /logout                  | Idempotent revoke/clear, including no cookie                                                             |
| GET    | /me                      | Minimal current user, expiry, MFA timestamp and own active organization memberships                      |
| POST   | /password-reset/request  | Identical 202 for known/unknown accounts; enqueue encrypted proof for eligible account                   |
| POST   | /password-reset/complete | Single-use 15-minute proof; hash new password, verify email ownership and revoke all sessions atomically |
| POST   | /mfa/enroll              | Existing session plus current password; return secret/otpauth URI for enrollment                         |
| POST   | /mfa/verify              | Existing session plus six-digit TOTP; confirm factor and step up session                                 |

Every POST requires an Origin header exactly matching AUTH_ORIGIN. Cross-site
Sec-Fetch-Site is also rejected. JSON endpoint bodies are bounded to 8192 bytes
even without Content-Length; unknown properties are rejected. Logout needs no body.
Passwords require 15 characters and at most 72 UTF-8 bytes; no silent bcrypt
truncation. Login accepts existing passwords up to that same byte bound. Account
emails are lowercased; surrounding whitespace is invalid. Registration does not
override an existing identity, including a preexisting user without credentials.

Errors follow the shared ApiResponse envelope. Validation errors contain no raw
input. Login returns the same unauthenticated result across account states; signup
and reset have generic accepted responses. Successful account creation and unknown
recovery are not distinguishable by response fields/status. Backend timing cannot
be assumed perfectly indistinguishable; retain abuse detection at ingress.

## Recovery delivery: provider deferred by user

The reset endpoint persists an auth_password_resets digest plus an encrypted
auth_reset_deliveries record in one transaction. Unknown/disabled accounts do not
create recovery proofs. API responses never return them. No email provider or SMTP
credentials are selected, so requesting recovery currently queues delivery; it
does not send an email. Completion and revocation are implemented and testable
through a configured provider/test adapter.

An owning internal job may call deliverPasswordResets(db, security, trustedOrigin,
provider). Implement PasswordResetDelivery.send for the selected transactional
email service. Jobs must supply server configuration rather than request input.
The worker atomically leases at most 100 records per call, sends outside DB locks,
uses stable provider idempotency keys, and marks successful delivery. Failed/ambiguous
sends retry after a five-minute lease, at most five attempts and only before proof
expiry. Delivery is at-least-once; the provider should honor idempotency keys.
The link points to trustedOrigin/reset-password#token=... so the proof is not sent
in HTTP query/referrer logs. The future frontend must read the fragment, remove
it from browser history and submit the proof via POST /password-reset/complete.
No reset UI or automatic worker scheduling is included in this backend phase.

## Permissions and privileged provisioning

The existing role matrix remains the capability source. DatabaseAuthorization
reloads active sessions/users and current authority on every call. Owner/manager
permissions come from that organization's active membership, with independent roles
in each organization. Ordinary member has no tenant capabilities. Staff must have
an active assignment to the verified target store; booking access also requires
an item assigned to that same member. Broad staff collection access is denied.
Foreign IDs and resource-kind/permission mismatches deny. Client roles and tenant
selectors never establish authority.

Route-local helpers exported from src/infrastructure/authentication/routes.server.ts:

- requireAuthentication(request): authenticate current cookie; return minimal session.
- requireValidatedSession(request): bridge the existing SessionValidationPort to an
  opaque SessionContext after authoritative validation; never serialize this context.
- requireOrganizationPermission(request, organizationId, permission, target): return
  verified tenant/member/store/staff facts after permission and target checks.
- requireCustomerPermission(request, permission, target): enforce self profile or
  own booking/payment. Self collections return userId for mandatory query filtering.
- requirePlatformPermission(request, permission): require separate active platform
  grant, verified email, confirmed factor and MFA within the last ten minutes.

Use helpers inside each future Route Handler. There is no edge middleware bypass
or blanket admin tenant override. Returned scopes are not unrestricted repositories;
future queries must retain user/organization/store/assignment predicates and recheck
authority under the transaction when needed. Existing generic architecture ports
for other resource kinds are not implementations: unsupported ownership paths deny
until their owning slices provide verified facts. Platform helper checks capability,
not the finite data scope/independent approvals required by sensitive admin services.

Public registration creates customer identity only. There is deliberately no API,
default seeded admin, email-based elevation, or environment role allowlist for
granting owner/admin status. An authorized onboarding/operations process must
provision existing organization_members or platform_grants with audit evidence
and last-owner/admin safeguards. Those provisioning business workflows remain
outside Phase 2. Verify email ownership out of band before privileged provisioning;
platform access explicitly requires users.email_verified_at. Organization membership
creation is not automatically available to self-registered users.

TOTP enrollment requires password reauthentication. Confirmed factors cannot be
overwritten using enrollment; accepted steps cannot replay across sessions. MFA
recovery/disable and independent admin approvals require a later audited procedure,
not a password-reset bypass. Synchronize app/database clocks; an expired/stale
factor/session or grant is never accepted as authority.

## Rate limiting and operations

PostgreSQL UPSERT provides atomic limits shared by all replicas. Defaults: login
five attempts/account/15 minutes; registration and reset requests three/account/hour;
MFA five/user/15 minutes; reset completion five/proof/15 minutes. Global endpoint
budgets allow 60 requests/minute (current-user: 1000). Both successes and failures
consume a budget; successful login does not reset it. HMAC keys avoid persisting
email/token selectors. Requests fail closed if the database/limiter is unavailable.
The conservative global budget can reduce availability during an attack; configure
appropriate ingress limits for the deployment before production. Arbitrary proxy
IP headers are not trusted. Retry-After is currently 60 seconds; account windows can
require longer cooldown. Pool bounds and PostgreSQL timeouts from Phase 1 apply.

Set ingress TLS, connection/IP limits and body/header timeouts. Set request tracing
to exclude credentials/cookies/reset/TOTP material. Retention/cleanup of expired
sessions, consumed proofs, delivered encrypted material and old limiter buckets
must be implemented as an approved bounded maintenance job; no data is automatically
deleted by this phase. Monitor aggregate auth failures/queue lag without account PII.

## Validation

```sh
npm test
npm run auth:test:integration
npm run lint
npm run typecheck
npm run build
npm run db:migrations:check
```

Offline tests cover real bcrypt/iron-session/TOTP, service flows with a test-only
store, HTTP response/cookie/origin/body behavior and static permission denials.
PostgreSQL integration tests cover transactional credentials/sessions/recovery,
multiple memberships, permission failure, expired/revoked sessions, foreign tenant
resources, assigned staff, customer ownership and separate grant/fresh-MFA checks.
They require explicit disposable TEST_DATABASE_URL ending in _test, apply additive
migrations there, and roll back all fixture data through an outer transaction and
service savepoints. db:test runs both database and auth PostgreSQL suites.

No local PostgreSQL/Docker or configured test database was available at this phase's
start. Live database verification must be reported independently from offline tests;
missing prerequisites are failures, not silent skips. Do not claim production auth
readiness until live checks, email delivery and deployment abuse controls are verified.
