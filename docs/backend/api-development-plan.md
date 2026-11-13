# Backend audit and API development plan

Current phase: [central authentication and authorization](authentication-status.md)
is implemented. See [auth setup](authentication-setup.md) and
[OpenAPI](openapi.json). Email delivery awaits provider selection; live
PostgreSQL verification is pending. Older phase/audit details below are historical.

Current update: [Phase 1 database infrastructure](database-infrastructure-status.md)
is implemented, with live PostgreSQL validation pending. The audit below preserves
the pre-infrastructure baseline. Business services and APIs remain absent.

Audited 2026-11-13. This phase changes documentation only. All HTTP paths below
are proposals; no endpoint, migration, repository or service is implemented here.

## Evidence and requirements baseline

Reviewed package.json, tsconfig.json, next.config.ts, drizzle.config.ts, ESLint
rules, src/app, every module's layers, src/db/schema, src/core, src/shared,
src/config, infrastructure placeholders, tests and architecture/security/database
documents. No separate signed-off product requirements document was found. The
comparison uses the repository's [customer requirements](../architecture/customer-booking-modules.md),
[partner requirements](../architecture/partner-modules.md),
[onboarding flow](../architecture/partner-onboarding.md),
[admin requirements](../architecture/centralized-admin.md) and
[integration requirements](../architecture/external-integrations.md). Product
acceptance criteria still need confirmation; proposed contracts are not delivered features.

## Current architecture and findings

The application is a modular monolith with 35 business modules and _template.
Presentation points to application, application to domain/core, and future
infrastructure adapters implement application ports. Cross-module imports use
public application types: the existing dependency inventory has 40 distinct
edges, all type-only. There is no runtime composition root or dependency container.
See [actual import graph](../architecture/module-dependencies.md).

| Area               | Observed state                                                                                                                                              | Consequence                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Packages           | Next 16.4.6, React/React DOM 19.3.0, Drizzle ORM ^0.45.4, pg ^8.23.1, Zod ^4.6.7; TypeScript ^5; Node >=20.9.0                                              | Driver installation does not constitute DB integration; no auth/provider SDK is selected |
| TypeScript         | strict, noEmit, bundler resolution, isolatedModules, incremental, @/* to src/*; Next-generated types included                                               | Preserve strict checking and generate route types on clean clones                        |
| Next config        | cacheComponents and partialPrefetching enabled; Tailwind Turbopack loader                                                                                   | Preserve configuration; design private caching and request-time auth deliberately        |
| App                | Starter page/layout/styles, no route handlers or Server Actions                                                                                             | No backend transport currently exists                                                    |
| Module application | Interfaces, DTOs, branded contexts and public type exports                                                                                                  | Even files named use-cases/manage.server.ts declare ports, not handlers                  |
| Infrastructure     | All 35 module index.ts files and shared index.ts export empty server-only placeholders                                                                      | All repositories, integrations, jobs and composition remain missing                      |
| Database           | 15 Drizzle table declarations; schema-only Kit config                                                                                                       | No client, pool, migration, seed or deployed constraint evidence                         |
| Core               | Result/errors, IDs, authorization, time/money, clock, transactions, logging, telemetry and health contracts                                                 | No clock/ID/transaction/logging/health implementations                                   |
| Executable helpers | Zod module input schemas, validateInput, pagination schema factory, environment parsing, sanitized error mapping; static role bundles and Drizzle callbacks | Real validation/mapping logic exists; no business workflow does                          |
| Environment        | Explicit-input validator with capability dependencies and public-secret checks                                                                              | Never invoked by a runtime bootstrap; flags activate no adapters                         |
| Guardrails         | Server-only, layer/cycle rules and architecture-only AST tests                                                                                              | Static enforcement cannot prove authentication, query isolation or safe concurrency      |

Installed Next guidance inspected: dist/docs/01-app/03-api-reference/03-file-conventions/route.md
and 01-app/02-guides/authentication-with-cache-components.md. Future dynamic route
params are promises. Session reads are request-time work with Cache Components;
authenticated UI must follow the installed streaming guidance. Preserve the
Node.js deployment model and check installed runtime restrictions before adding
route segment options. No code changes were needed for this audit.

### Customer, Organization, Staff and Admin comparison

| Actor / requirement                                              | Existing architecture                                                                   | Missing delivery                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Customer: profile, discovery, favorites                          | Self-bound contexts, profile/favorite tables, filter DTOs and validation                | Identity binding, queries, search/public projections and profile/favorite services                                      |
| Customer: availability and booking                               | Time ranges, snapshots, idempotency, booking/item schema and commit/policy ports        | Slot calculation, scheduling storage, transactional holds, expiry, cancellation/rescheduling and lifecycle execution    |
| Customer: deals, negotiation, reviews, messaging                 | Contracts; deals and reviews tables                                                     | Eligibility/redemption, immutable offers, conversations/messages, completion/moderation checks and participant services |
| Organization: multi-store catalog and staff                      | Tenant/member/store/staff/catalog tables and draft/repository ports                     | Bootstrap/invitations, scoped CRUD, revisions, soft-delete filters and membership safeguards                            |
| Organization: seven-section onboarding and publication           | Section DTOs, readiness/workflow/review ports and structural schemas                    | Section/submission/evidence persistence, readiness engine, review execution and publication policy                      |
| Staff: store/catalog and assigned bookings                       | Tenant role plus active assignment model; restricted update_assigned capability         | Verified assignment queries, permitted-field/transition rules and cross-store/person scheduling conflicts               |
| Admin: approvals, users, moderation, reports, settings and audit | Separate platform grant and finite scope contracts, sensitive contexts                  | Grant storage/verifiers, MFA, independent approval, domain services, aggregate/export storage and durable audit         |
| Shared integrations and operations                               | Provider-neutral ports, explicit config validation, delivery/health/telemetry contracts | Provider decisions/adapters, workers, persistence, monitoring, backups and deployment controls                          |

These actors should share identity/session validation, authorization, ownership,
transactions, repositories, booking lifecycle, money/time rules, audit, pagination,
error mapping and integration delivery. Staff is an access scope of the same
organization/booking system, not a separate backend. Organization owners/managers
can independently use customer capabilities as users. Platform administration has
no implicit customer identity or tenant membership. Separate transport views may
return different projections without duplicating domain services.

### Authentication and authorization contracts

Identity ports cover password/federated authentication, opaque session validation,
password reset and MFA challenge/verification. Authentication explicitly issues
no session; session issuance, renewal, rotation/logout/revocation, account links,
MFA enrollment/recovery and credential persistence must be designed. users stores
email/display name/disabledAt, not credentials or platform grants.

Authorization separates customer, organization and platform permissions.
TenantResolutionPort, PlatformAccessPort, OwnershipVerificationPort and
AuthorizationPort are interfaces only. Branded verified contexts are compile-time
contracts, not runtime proof. Candidate bundles grant owners/managers scoped
capabilities, staff assigned store/booking access, and ordinary members nothing.
Platform access requires a separate active grant and fresh MFA. Sensitive admin
contexts additionally bind finite scope, exact input fingerprint, reauthentication,
independent approval and durable audit intent.

Critical contract gap: older OnboardingReviewContext is weaker than centralized
SensitiveAdminContext. Consolidate it or restrict it to an internal bridge before
any review exposure. Payment/refund mutations have no current permission bundle;
add reviewed operation-specific permissions before implementing them. Membership
bootstrap, ownership transfer and last-owner/admin protection are also unresolved.

## Database relationships, constraints and required changes

Current physical declarations:

- Identity: users, customer_profiles (unique userId).
- Tenancy: organizations, organization_members (unique organization/user), stores
  (organization/id and organization/slug unique), staff (store/member unique).
- Catalog: services and products belong to a composite organization/store parent.
- Booking: bookings belongs to a store and customer user; optional tenant deal;
  booking_items references booking, service/product and optional staff within the
  same tenant/store.
- Commerce: deals is tenant-owned; payments references booking plus currency.
- Customer activity: favorites binds customer/store uniquely; reviews references
  booking plus tenant/store/customer and allows one review per booking.
- Audit: audit_logs has optional organization and actor user references.

All tables declare UUID PKs and timezone-aware creation timestamps. FKs use
RESTRICT; composite targets have corresponding unique keys and supporting index
prefixes. Money uses numeric(14,2), not JS floats. Checks constrain prices,
durations, state values, booking ranges, positive revisions where present,
request fingerprints, review rating/body, and service/product item exclusivity.
Unique lower(email), booking customer/idempotency, tenant payment/idempotency and
provider/account/payment reference prevent specific duplicates. Nullable composite
references use MATCH SIMPLE. No missing FK to an already-declared target was
identified in this graph; many required relationships await absent tables.

| Required persistence change                                                                                                         | Proposed relationships / enforcement                                                                                                                     | Gate                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Provider account links; session/revocation records; recovery/MFA evidence as required by selected provider                          | Link local identity to users; unique provider subject; one-time expiring hashed proof if locally stored                                                  | Authentication        |
| Platform grants; invitations/provisioning evidence                                                                                  | Grants to users, invitations to organization and inviter; protect last active owner/admin transactionally                                                | Bootstrap/admin       |
| Persist revisions for organizations, stores, staff, services and products                                                           | Positive revision, compare-and-swap updates; update updated_at explicitly                                                                                | Draft writes          |
| Onboarding drafts/sections, immutable submissions, selected stores and evidence history                                             | Tenant FK; composite tenant/store links; section uniqueness; immutable revision/fingerprint binding                                                      | Submit/review         |
| Asset metadata, business photos and visibility/publication                                                                          | Asset and photo ownership to verified tenant/store; scan/purpose state; approved submission relation                                                     | Upload/discovery      |
| Store hours, staff schedules, exceptions, staff-service eligibility and capacity/reservations                                       | Composite tenant/store/staff/service FKs; bounded intervals and eligible active assignments                                                              | Availability/bookings |
| Booking reservation/history and lifecycle mapping                                                                                   | Capacity conflict protocol, expired hold release, item containment and duration consistency; atomic totals and policy snapshot validation                | Booking writes        |
| Deal targets/redemptions and negotiation offers/acceptances                                                                         | Tenant-qualified service/store/booking/customer relationships, unique redemption/acceptance keys, limits and expiry                                      | Optional pricing      |
| Conversations, participants and messages                                                                                            | Tenant/store/customer parent links, sender membership in conversation, bounded attachments and retention                                                 | Messaging             |
| Provider account-to-tenant mapping; refund reservation/attempt ledger                                                               | Payment FK with tenant/currency; unique account identity; atomic remaining refundable balance and payment reconciliation                                 | Finance               |
| Outbox, consumer inbox, webhook receipts and worker leases                                                                          | Atomic aggregate/event append; unique provider/account/event and consumer/event keys; leases/retries/retention                                           | External effects      |
| Notification intent/delivery/preferences and suppression                                                                            | Verified recipient/purpose/consent, event/channel deduplication and durable retry state                                                                  | Delivery              |
| Admin change requests/approvals, approval cases, suspension history, moderation evidence, setting versions, report/export snapshots | Bind requester/independent approver, scope/input revisions; tenant/resource FKs where applicable; private export grants                                  | Admin features        |
| Extend/map audit_logs to full AuditEvent                                                                                            | Actor kind, occurrence/record time, operation/correlation, outcome, version and allowlisted metadata; restricted append role and durable outcome handoff | Sensitive writes      |
| Discovery location/category/projection storage                                                                                      | Store/publication source links; decide spatial/search indexes and taxonomy                                                                               | Search                |

Not all modules require their own table: maps/email may remain adapters and admin
may coordinate persisted controls. Proposed table names and normalization need DDL
design, not automatic creation of a table per interface.

Additional limitations to address during migration design:

- Existing FKs establish ownership consistency, not permission to read or mutate.
  Active membership/assignment, deleted/archived state and approved publication
  need scoped queries and rechecks; optional RLS is an unresolved extra defense.
- No overlap exclusion/capacity constraint, aggregate line-total consistency,
  payment/refund sum constraint or cross-row lifecycle enforcement exists.
  Organization locking alone needs review for a person working across tenants.
- Booking items can reference a valid staff assignment without proving service
  eligibility or current active membership. Reviews prove booking/customer identity,
  not completed-booking eligibility. Deal FK proves tenant identity, not eligibility,
  currency compatibility, time window or redemption availability.
- updated_at defaults do not update rows automatically. Text currency shape does
  not validate supported currencies. Store timezone/slug and profile locale/timezone
  need semantic validation. Generic JSON snapshots are not versioned schema proof.
- Organization status defaults active; this does not mean approved or bookable.
  Soft deletion and archival require explicit filtering. Audit JSON types do not
  enforce runtime allowlisting or append-only behavior.

Generate and review migrations only in a later implementation phase. Establish a
pool/client, migration job, least-privilege roles, disposable PostgreSQL tests and
restore/rollback or forward-fix procedure before considering schema work complete.

## Module implementation order and dependencies

| Stage | Modules / supporting work                                                             | Entry requirements and completion evidence                                                                                                            |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Decisions, DB/environment/composition, transactions, clock/IDs/logging                | Resolve identity/bootstrap/transport; review DDL; disposable PostgreSQL FK, rollback and scoped query tests                                           |
| 1     | identity, authorization; minimal admin and audit-logs foundation                      | Real sessions/revocation/MFA, trusted scope/ownership verifiers, default deny, separate grants, durable audit; forged/stale/cross-tenant denial tests |
| 2     | organizations, stores, staff, services, products, operating-hours                     | Bootstrap then tenant/store scoped repositories and revision-aware services; owner protection, archive and DST tests                                  |
| 3     | file-storage minimum, business-photos, visibility, onboarding, organization-approvals | Private quarantine/scan, immutable submissions, stronger review context and independent approval; draft-to-public journey                             |
| 4     | customers, discovery, favorites, availability, bookings                               | Approved listings and schedule/capacity inputs; concurrent holds, expiry, idempotency and cancellation/rescheduling tests                             |
| 5     | domain-events, webhooks, payments, refunds, notifications, email; maps where needed   | Durable delivery/service authority before provider calls; exact payment permissions, account mapping, replay and reconciliation tests                 |
| 6     | deals, negotiation, reviews, messaging                                                | Core booking stable; explicit pricing, eligibility, participant and retention rules                                                                   |
| 7     | user-management, moderation, reports, platform-settings; expanded admin/audit         | Implement finite-scope services, dual control, aggregate definitions and private audited exports                                                      |

Stages are dependency gates. Bring durable events forward for any earlier slice
with external effects; bring minimal moderation forward if required for publication.
Maps is needed earlier only if the chosen discovery experience depends on geocoding.
Approval and audit cannot wait until the final admin stage.

Runtime dependencies to inject through consumer-owned ports:

- Every private feature depends on identity and authorization; every persisted write
  depends on a scoped repository/transaction adapter and revision/idempotency rules.
- Onboarding consumes organizations, selected stores, catalog, staff, photos and
  visibility readiness; organization-approvals consumes onboarding plus admin controls.
- Discovery consumes approved publication, location/catalog and review projections.
  Availability consumes hours, services, staff eligibility, capacity and conflicts.
- Bookings commits revalidated availability, prices, snapshots and reservations in
  one transaction; advisory availability cannot authorize or reserve a booking.
- Payments/refunds consume booking ownership/account mapping and durable effects;
  notifications/email consume trusted intents. Provider calls stay outside DB locks.
- Admin consumers use admin scope/security and audit contracts. Reports consume
  bounded projections, not unrestricted repositories. Exports use private file storage.

## Proposed API endpoint inventory

No endpoints below exist. `/api/v1` is a planning convention pending Q-19; Route
Handlers versus Server Actions remains undecided. Braces mean path parameters.
In each cell comma-separated verbs denote distinct operations. `O` means
`/organizations/{organizationId}`, `S` means `O/stores/{storeId}` and `C` means
`/customer`, all below `/api/v1`. Organization/store IDs are untrusted selectors.
Draft updates use PATCH with expectedRevision; writes require idempotency where
replay would duplicate an effect. Archive/delete semantics require final policy.

| Module                 | Candidate HTTP operations                                                                                                                                                                                                                           | Scope / contract caveat                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| identity               | POST /auth/login; GET /auth/callback/{provider}; GET /auth/session; POST /auth/logout; POST /auth/session/renew; POST /auth/password-reset/request, /auth/password-reset/complete; POST /auth/mfa/challenges; POST /auth/mfa/challenges/{id}/verify | Provider-dependent, abuse-limited; issuance/renewal/signup/account-link/enrollment contracts still needed                            |
| authorization          | No public authorization or context-minting endpoint                                                                                                                                                                                                 | Trusted internal verifier per operation                                                                                              |
| organizations          | GET, PATCH O; GET O/memberships; POST O/invitations; PATCH O/memberships/{id}; POST /organizations                                                                                                                                                  | Owner/manager reads, owner-only organization/membership writes; create/invite/bootstrap are unresolved extensions                    |
| stores                 | GET, POST O/stores; GET, PATCH S                                                                                                                                                                                                                    | Tenant store permissions; staff assigned reads only                                                                                  |
| staff                  | GET, POST S/staff; GET, PATCH S/staff/{id}                                                                                                                                                                                                          | Tenant staff.read/manage; archive workflow requires policy                                                                           |
| services               | GET, POST S/services; GET, PATCH S/services/{id}                                                                                                                                                                                                    | catalog.read/manage; staff assigned-store read projection                                                                            |
| products               | GET, POST S/products; GET, PATCH S/products/{id}                                                                                                                                                                                                    | catalog.read/manage; no assumed inventory checkout API                                                                               |
| operating-hours        | GET, PATCH S/operating-hours; GET, PATCH S/staff/{id}/schedule                                                                                                                                                                                      | Choose exact permission mapping and exception model                                                                                  |
| business-photos        | GET, POST S/photos; PATCH, DELETE S/photos/{id}                                                                                                                                                                                                     | Reference verified assets, not arbitrary URLs; catalog/organization action mapping needs review                                      |
| visibility             | GET, PATCH S/visibility                                                                                                                                                                                                                             | Draft visibility is distinct from approved publication; settle permission mapping                                                    |
| onboarding             | GET O/onboarding; PATCH O/onboarding/sections/{section}; GET O/onboarding/readiness; POST O/onboarding/submissions                                                                                                                                  | read/update/submit; no tenant approval route                                                                                         |
| customers              | GET, PATCH C/profile                                                                                                                                                                                                                                | Session-derived self identity                                                                                                        |
| discovery              | GET /businesses; GET /businesses/{storeId}                                                                                                                                                                                                          | Eligible public projection; anonymous access and details permission need decision                                                    |
| favorites              | GET C/favorites; PUT, DELETE C/favorites/{storeId}                                                                                                                                                                                                  | Self-owned; verify selected store without leaking hidden data                                                                        |
| availability           | GET /businesses/{storeId}/availability                                                                                                                                                                                                              | Bounded advisory slots; customer permission until anonymous policy decided                                                           |
| bookings               | POST C/bookings; GET C/bookings; GET C/bookings/{id}; POST C/bookings/{id}/cancel, /reschedule; GET O/bookings; GET O/bookings/{id}; POST O/bookings/{id}/cancel, /reschedule, /transitions; GET /staff/bookings; PATCH /staff/bookings/{id}        | Self, tenant or assigned scope; define transition commands and staff allowlist; extend read-only repository/list/lifecycle contracts |
| deals                  | GET, POST O/deals; GET, PATCH O/deals/{id}; GET /businesses/{storeId}/deals                                                                                                                                                                         | Tenant read/manage; customer projection permission/eligibility needs review                                                          |
| negotiation            | POST C/negotiations; GET C/negotiations/{id}; POST C/negotiations/{id}/offers, /accept, /reject; GET O/negotiations; POST O/negotiations/{id}/offers, /accept, /reject                                                                              | Verified participants; define reject/expire action mapping; expiry is internal                                                       |
| reviews                | POST C/bookings/{id}/review; GET /businesses/{storeId}/reviews                                                                                                                                                                                      | Completed own booking; only approved review projections; anonymous policy unresolved                                                 |
| messaging              | GET, POST C/conversations; GET, POST C/conversations/{id}/messages; GET O/conversations; GET, POST O/conversations/{id}/messages                                                                                                                    | Participant checks; conversation creation/list contract extensions; no default staff access                                          |
| payments               | GET C/bookings/{id}/payments; GET O/bookings/{id}/payments; POST C/bookings/{id}/payment-attempts; GET C/payment-attempts/{id}; POST C/payment-attempts/{id}/cancel                                                                                 | Existing grants cover reads only; all mutations blocked on new reviewed permissions                                                  |
| refunds                | GET C/refunds/{id}; POST O/payments/{id}/refunds; GET O/payments/{id}/refunds                                                                                                                                                                       | Proposed extension; refund authority/customer read permissions and ledger required                                                   |
| notifications          | GET, PATCH C/notification-preferences; optional GET C/notifications                                                                                                                                                                                 | Self/consent; preference/inbox permissions and storage must be defined; delivery internal                                            |
| file-storage           | POST /assets/upload-intents; POST /assets/{id}/complete; GET /assets/{id}/download; DELETE /assets/{id}                                                                                                                                             | Purpose/tenant/owner-specific grants, quarantine and private reads; endpoint policy not selected                                     |
| maps                   | Optional POST /location/geocode                                                                                                                                                                                                                     | Prefer internal adapter; bounded allowlisted inputs, never a general provider proxy                                                  |
| email                  | No public dispatch endpoint                                                                                                                                                                                                                         | Internal registered-template intent only                                                                                             |
| webhooks               | POST /webhooks/{provider}                                                                                                                                                                                                                           | Raw-body provider signature, account mapping and durable replay-safe receipt; no browser session authority                           |
| domain-events          | No public append/publish/claim endpoint                                                                                                                                                                                                             | Trusted worker with transactional outbox/inbox                                                                                       |
| admin                  | GET /admin/access; POST /admin/change-requests; POST /admin/change-requests/{id}/approvals                                                                                                                                                          | Finite verified scope, fresh MFA; never return trusted context objects to clients; sensitive writes independently verified           |
| organization-approvals | GET /admin/organization-approvals; GET /admin/organization-approvals/{id}; POST /admin/organization-approvals/{id}/start-review, /decisions; POST /admin/organizations/{id}/suspend, /restore                                                       | Strong centralized review only; determine owner of organization lifecycle commands                                                   |
| user-management        | GET /admin/users; GET /admin/users/{id}; POST /admin/users/{id}/suspend, /restore, /revoke-sessions, /request-recovery                                                                                                                              | Minimized bounded lookup; self/privileged/last-admin safeguards                                                                      |
| moderation             | GET /admin/moderation/cases; GET /admin/moderation/cases/{id}; POST /admin/moderation/cases/{id}/decisions                                                                                                                                          | Verified evidence/policy revisions; user report submission contract still absent                                                     |
| reports                | GET /admin/reports/{kind}; POST /admin/report-exports; GET /admin/report-exports/{id}                                                                                                                                                               | Bounded aggregate-only, currency-separated, private export grants                                                                    |
| platform-settings      | GET /admin/settings; POST /admin/setting-changes; POST /admin/setting-changes/{id}/approve, /apply                                                                                                                                                  | Closed registry, independent approval, revision/fingerprint binding                                                                  |
| audit-logs             | GET /admin/audit-events; POST /admin/audit-exports; GET /admin/audit-exports/{id}; GET O/audit-events                                                                                                                                               | Separately authorized reads/exports; append internal, no edit/delete API                                                             |

Potential operations above deliberately surface gaps; they do not imply existing
ports or permission grants. Each implementation ticket must define request and
response DTOs, exact permission, error mapping, pagination, audit and persistence
before approving that endpoint. Do not expose authz, raw DB, generic integration,
audit append or worker internals through unrestricted HTTP.

## Security and release requirements

1. Authenticate server-side and load current session/user/grants. Use secure,
   HttpOnly cookie policy if cookies are chosen; rotate/revoke sessions and enforce
   expiry. Apply CSRF/origin checks to cookie-authenticated writes, OAuth state/PKCE
   where applicable, safe recovery responses and rate limits.
2. Resolve tenant/store and ownership from trusted data, deny unlisted actions,
   and bind every query, nested load, aggregate, cursor and export to self/tenant/
   assignment or finite platform scope. Recheck security-sensitive facts at commit.
3. Strictly validate and minimize inputs/outputs. Bound bodies, query windows,
   page sizes and uploads; sign/bind cursors to filters and scope. Never accept
   client roles, context brands, customer identity or monetary totals as authority.
4. Keep private data out of shared caches. Never cache an authorization decision
   beyond its safe freshness; test account/tenant switching and revocation. Apply
   explicit private response/cache policy and public listing eligibility filters.
5. Use exact admin permissions, fresh MFA/reauthentication, expiring scope/input
   evidence, independent approval and durable audit. No self-review, implicit
   all-tenant scope, last-admin removal or impersonation.
6. Commit reservations, revision changes, idempotency outcomes and required durable
   events/audit atomically. Prove racing holds, reschedules, expiration, retries,
   refund balance reservation and late payment behavior using real PostgreSQL.
7. Verify webhook raw bytes and replay window, deduplicate provider/account/event,
   reconcile uncertain outcomes and use trusted workers. Provider calls require
   bounded timeouts/retries and stable keys; never call them under booking locks.
8. Enforce file purpose/ownership, scanning/quarantine, private expiring grants,
   retention and SSRF-resistant provider endpoint configuration. Respect notification
   consent/suppression and message/report privacy.
9. Map errors to sanitized shared contracts; allowlist/redact logs and audit fields.
   Restrict DB roles, secrets, audit mutation and export access. Define backups,
   restoration, telemetry, retention and operational access before production.

Existing test suites explicitly assert no APIs, functions/classes in module
application code, database drivers or network calls. The first implementation PR
must deliberately replace the relevant architecture-only assertions with scoped
runtime/security tests while retaining layer, cycle, tenant and server-only rules.
Do not simply disable the architectural checks wholesale.

## Open questions and recommended first implementation steps

The [existing Q-01 through Q-20 register](../architecture/open-questions.md)
remains unresolved. Highest priority:

1. Confirm the product acceptance baseline and smallest bookable service journey;
   choose provider/session model, first-owner/admin provisioning and transport.
2. Resolve persisted revisions, schedule/capacity model, publication versus approval,
   review-context consolidation and audit storage before designing migrations.
3. Decide anonymous discovery, staff allowed transitions, cross-organization staff
   conflicts, cancellation/hold policy, currency/tax/rounding and payment permissions.
4. Select provider account mapping, worker authority, inbox/outbox and refund ledger;
   define retention, upload scanning, consent, finite admin scope and export policy.

Recommended first delivery: implement the persistence/bootstrap and trusted
identity/authorization foundation with denial tests; then a revision-aware
organization/store/service draft slice. Add minimal strong admin review/audit and
approved publication before customer discovery/availability/booking. Defer optional
negotiation/messaging and payment providers until concurrency and delivery gates pass.

Current command outcomes and module completion tracking are recorded in
[implementation-status.md](implementation-status.md). Passing offline checks or a
starter UI build does not establish production backend readiness.
