# Future authorization unit-test specifications

These specifications describe behavior required of future implementations. They
are **not passing behavior tests**: Phase 4 has no validators, resolution adapters,
or decision engine. Current `npm run test:security` checks static policy structure,
schema role alignment, and compile-time trust boundaries only. Do not introduce
fake production allow/deny handlers to satisfy this plan.

Use fixed clock values and isolated in-memory test doubles for future ports.
Assert allowed/denied results AND that protected use cases/repositories/audit
outputs are not invoked incorrectly. Each denial should expose a normalized public
error without leaking whether another user's resource exists.

| ID          | Given / when                                                                          | Required result                                                             |
| ----------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| AUTHN-01    | Missing, malformed, forged, expired or revoked evidence                               | Unauthenticated; no protected work                                          |
| AUTHN-02    | Valid evidence for disabled or deleted local identity                                 | Deny despite valid provider signature                                       |
| AUTHN-03    | Provider/session contains attacker-supplied tenant or platform role                   | Ignore privilege claims; load authoritative state                           |
| AUTHN-04    | Identity/session provider unavailable                                                 | Fail closed; no stale allow fallback                                        |
| AUTHN-05    | Expiry boundary reached using fixed clock                                             | Deny at expiry, not only after it                                           |
| TENANT-01   | Selector for organization without active membership                                   | Deny; no fallback tenant or data leakage                                    |
| TENANT-02   | Membership belongs to a different session user                                        | Deny even if organization matches                                           |
| TENANT-03   | Active membership, suspended/closed organization                                      | Deny tenant operations                                                      |
| TENANT-04   | Suspended/revoked membership, active organization                                     | Deny, including previously validated sessions                               |
| TENANT-05   | Body/header/path/token tenant selectors conflict                                      | Reject ambiguity; never choose permissive value                             |
| TENANT-06   | Same user owns A but is staff in B                                                    | A owner role cannot be reused in B                                          |
| TENANT-07   | Client constructs/deserializes context-like JSON                                      | Reverify server state; serialized fields confer no trust                    |
| OWN-01      | Resource ID belongs to another organization/store                                     | Deny before exposing resource or executing work                             |
| OWN-02      | Nested booking/item/service/staff IDs cross scope                                     | Deny every mismatched relation                                              |
| OWN-03      | Proof subject differs from session subject                                            | Deny replayed proof                                                         |
| OWN-04      | Proof resource kind differs from permission or collection parent is invalid           | Deny mismatched target                                                      |
| OWN-05      | Membership revoked/resource moved between verification and write                      | Revalidate under transaction/version policy; deny stale grant               |
| CUSTOMER-01 | Customer reads own booking/payment or updates own profile                             | Candidate allow only with server ownership facts and field policy           |
| CUSTOMER-02 | Same operation on another user's resource, same tenant                                | Deny horizontal escalation                                                  |
| CUSTOMER-03 | Nonmember reads own booking                                                           | Allow through customer path only; tenant lists still deny                   |
| CUSTOMER-04 | Booking creation supplies another customer/organization ID                            | Derive user and tenant from verified session/store; reject mismatch         |
| CUSTOMER-05 | Public-bookability/cancellation policy missing or organization inactive               | Deny creation/cancellation until explicit policy exists                     |
| RBAC-01     | Unknown/missing role, action, resource, or scope                                      | Deny by default                                                             |
| RBAC-02     | Each proposed matrix entry, valid resource constraints                                | Candidate allow; no role implies other namespaces                           |
| RBAC-03     | Each absent matrix entry across all roles                                             | Deny; test the complete role-permission cross product                       |
| RBAC-04     | Manager attempts membership/owner/platform role changes                               | Deny all escalation                                                         |
| RBAC-05     | Owner attempts platform grants, owner transfer or last-owner removal                  | Deny until dedicated workflows exist                                        |
| STAFF-01    | Staff role and active same-store assignment, booking item assigned to them            | Allow only defined fields/transitions                                       |
| STAFF-02    | Staff assigned to store but not booking item                                          | Deny booking read/update                                                    |
| STAFF-03    | Staff role without assignment, archived assignment, other store, or mismatched member | Deny                                                                        |
| STAFF-04    | Staff assignment exists but role is member                                            | Deny; assignment is not a role grant                                        |
| STAFF-05    | Staff list/export attempts unrestricted tenant query                                  | Require assignment-bound predicate; deny missing filter                     |
| PLATFORM-01 | Tenant owner/manager attempts platform operation                                      | Deny regardless of tenant authority                                         |
| PLATFORM-02 | Active platform admin attempts tenant booking/payment operation without membership    | Deny; no automatic bypass or impersonation                                  |
| PLATFORM-03 | Platform grant revoked/absent or MFA missing/stale                                    | Deny platform operation                                                     |
| PLATFORM-04 | Active local grant and fresh MFA for listed platform operation                        | Candidate allow with audited minimal visibility                             |
| PLATFORM-05 | Organization/customer request uses platform collection target                         | Reject; incompatible contract/scope                                         |
| RESET-01    | Unknown versus known reset identifier                                                 | Indistinguishable successful public response and no token disclosure        |
| RESET-02    | Expired/reused reset proof or concurrent reuse                                        | Deny; consume once atomically                                               |
| RESET-03    | Successful credential replacement                                                     | Enforce password policy and revoke affected sessions                        |
| MFA-01      | Challenge belongs to another subject/session, expired or replayed                     | Deny; cannot elevate assurance                                              |
| MFA-02      | Primary authentication or MFA payload claims platform role                            | No local privilege grant                                                    |
| BOUNDARY-01 | New Server Action, route, job, internal caller or export omits authz                  | Integration/architecture check fails before release                         |
| BOUNDARY-02 | List, aggregate, batch, cache or nested load crosses tenant/user scopes               | Deny/filter by server scope at source; no cache bleed                       |
| AUDIT-01    | Allow/deny/error outcome recorded                                                     | Subject, scope, action and correlation; no password/token/reset/MFA secrets |

Implementation tests must cover input validation, denial paths, concurrency,
revocation, selector tampering, and output minimization as well as successful
matrix entries. Integration tests must eventually verify PostgreSQL query tenant
predicates; offline metadata tests cannot prove authorization.
