# Final architecture-only audit

Audit date: 2026-11-13. Scope: authored repository sources, configuration, public
assets, tests and documentation. Generated artifacts, dependency internals and
Git internals are excluded from the authored-file tree. Relevant installed Next.js
guidance was read before tooling changes. Existing feature/UI/settings code is
preserved; audit changes are documentation, offline inventory tooling and tests.

## Findings

| Area                    | Finding and evidence                                                                                                                             | Assessment                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Shared backend          | 35 contract modules across customer, partner, staff, admin and integrations; one core/identity/authorization layer                               | Shared design confirmed; no actor-specific backend implementations                                      |
| Module dependencies     | 40 distinct cross-module edges, all type-only public application imports; AST inventory plus lint/cycle tests                                    | Inward boundaries enforced for current sources; no detected cycles                                      |
| Server boundaries       | db, infrastructure and *.server files require server-only; no authored client components import backend                                          | Static boundary checks; no authenticated runtime yet                                                    |
| Tenant isolation        | Opaque verified contexts, exact permissions, customer ownership, finite admin scopes and composite tenant/store FKs                              | Coherent proposal; no query scoping/verifiers/RLS implemented                                           |
| Permissions             | Separate customer, membership/store and platform bundles; staff assigned-only, ordinary member empty                                             | Candidate permissions tested; actual decisions and grant storage absent                                 |
| Database                | 15 tables with UUID PKs, FKs to unique typed targets, supporting index prefixes, numeric precision and critical checks                           | Offline metadata/serialization verified; no PostgreSQL DDL or query-plan validation                     |
| Dictionary/ERD          | Current physical table inventory matches ERD; audit test checks all table/column names in dictionary                                             | Corrected stale provider/account uniqueness and storage namespace wording; semantic review still needed |
| Architecture-only scope | AST checks reject API route/action declarations, provider/driver imports, network/DB call patterns and module implementations outside validation | No implemented APIs, live integrations, connections or business operations found                        |
| Runtime helpers         | Starter rendering, schema callbacks, Zod validation/config parsing, pagination and fixed error mapping do execute                                | Boundary helpers only; not a behavior-free repository                                                   |

The static audit is not a general proof against arbitrary code execution or
malicious dynamic access. It combines full source parsing/import inspection,
targeted manual review and tests. Do not claim authentication, concurrency safety
or production readiness from these results.

## Material implementation risks

1. The older onboarding review context is weaker than sensitive centralized admin
   contexts. The bridge is only a port; consolidate/restrict direct review before exposure.
2. Partner entity revision contracts outpace schema columns. Onboarding, hours,
   visibility, photos and several integration/admin entities have no persistence.
   audit_logs lacks dedicated fields for the full audit event envelope.
3. Composite FKs do not prevent unauthorized reads. Authentication, ownership,
   query predicates, platform scope verification, session revocation and MFA need
   real implementations and negative integration tests.
4. Booking overlap/capacity and financial totals are not database-enforced. The
   coarse organization-lock protocol, outbox/inbox, refund ledger and worker
   authority must exist and be tested before accepting bookings/payments.
5. Initial owner/admin provisioning, public visibility, anonymous discovery,
   retention and provider selection remain unsettled. Existing active defaults
   must not be interpreted as approval or public bookability.

See [open questions](open-questions.md) for the full gate list. No migrations,
seeds, PostgreSQL connections, provider requests, routes or business functionality
were introduced during this audit. The production build may fetch existing
Google Fonts assets; that is a build dependency, not a live business integration.

## Verification

Executed locally on Node.js v24.13.0 and npm 11.6.2:

| Command           | Actual result                                                     |
| ----------------- | ----------------------------------------------------------------- |
| npm run lint      | Passed, exit 0, zero warnings                                     |
| npm run typecheck | Passed, exit 0; Next.js route type generation and strict tsc      |
| npm test          | Passed, exit 0; 102 tests, zero failures or skips                 |
| npm run build     | Passed, exit 0; static / and framework-generated /_not-found only |

The first test run passed 101/102: one new roadmap assertion assumed single-space
Markdown cells. Prettier aligns table cells; the assertion now accepts whitespace
and the complete suite passes. No application change was required. Tests used the
existing react-server condition and tsx loader with Windows account access; no
database/provider was contacted. Production build retained all existing Next.js
settings and starter UI. Database results are offline metadata evidence only.

## Architecture document index

- [System context](system-context.md) and [frontend flow](frontend-flow.md)
- [Backend architecture](backend-architecture.md) and [actual module dependencies](module-dependencies.md)
- [Database ERD and review](database-erd.md), [physical ERD](../database/erd.md), [data dictionary](../database/data-dictionary.md)
- [Booking workflow](booking-workflow.md) and [partner onboarding](partner-onboarding.md)
- [Security and tenancy](security-and-tenancy.md) and [permission matrix](../security/permission-matrix.md)
- [Deployment proposal](deployment-proposal.md), [decisions](architecture-decisions.md), [open questions](open-questions.md)
- [Complete tree](project-tree.md), [future API roadmap](future-api-roadmap.md), [testing strategy](../testing-strategy.md)

Completed architecture: 2 identity/security modules, 9 partner modules, 9
customer/booking modules, 8 external/delivery modules and 7 centralized admin
modules, plus shared infrastructure and the reusable scaffold. Staff is a tenant
module/access scope over the shared booking architecture, not a separate backend.
Next stage: resolve the critical decisions, implement trusted identity/scope and
persistence foundations, then deliver a small reviewed partner/approval/booking
slice with real security, transaction and end-to-end evidence.
