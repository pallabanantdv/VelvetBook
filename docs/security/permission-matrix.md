# Proposed permission matrix

Phase 5 adds these proposed capabilities; all existing scope/ownership/MFA checks
still apply. No running authorization handler is introduced.

| Additional permission                          | Owner         | Manager       | Staff/member | Platform admin             |
| ---------------------------------------------- | ------------- | ------------- | ------------ | -------------------------- |
| organization / store.create                    | Tenant parent | Tenant parent | Deny         | Deny                       |
| organization / onboarding.read, update, submit | Tenant        | Tenant        | Deny         | Deny                       |
| platform / onboarding.read, review             | Deny          | Deny          | Deny         | Verified target, fresh MFA |

Onboarding access does not imply access to downstream organization, catalog or
staff mutations. Partner confirmation and platform review are different operations.

Entries are candidate capabilities, conditional on active identity, valid session,
tenant/resource ownership, lifecycle rules, and fresh security state. `—` means
deny. Unlisted actions deny. No matrix row is a running authorization handler.
Static definitions live in `authorization/application/policy/role-permissions.server.ts`.

| Scope / resource.action                | Customer                               | Owner                            | Manager | Staff                                               | Platform admin                         |
| -------------------------------------- | -------------------------------------- | -------------------------------- | ------- | --------------------------------------------------- | -------------------------------------- |
| customer / profile.read, update        | Self                                   | —                                | —       | —                                                   | —                                      |
| customer / booking.create              | Verified bookable store, self customer | —                                | —       | —                                                   | —                                      |
| customer / booking.read, cancel        | Own booking only                       | —                                | —       | —                                                   | —                                      |
| customer / payment.read                | Own booking's payments                 | —                                | —       | —                                                   | —                                      |
| organization / organization.read       | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / organization.update     | —                                      | Tenant                           | —       | —                                                   | —                                      |
| organization / membership.read         | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / membership.manage       | —                                      | Restricted membership management | —       | —                                                   | —                                      |
| organization / store.read              | —                                      | Tenant                           | Tenant  | Assigned stores                                     | —                                      |
| organization / store.update            | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / catalog.read            | —                                      | Tenant                           | Tenant  | Assigned stores                                     | —                                      |
| organization / catalog.manage          | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / staff.read, manage      | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / booking.read            | —                                      | Tenant                           | Tenant  | Assigned store and booking items                    | —                                      |
| organization / booking.manage          | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / booking.update_assigned | —                                      | —                                | —       | Assigned store and booking items, restricted fields | —                                      |
| organization / payment.read            | —                                      | Tenant                           | Tenant  | —                                                   | —                                      |
| organization / audit.read              | —                                      | Tenant                           | —       | —                                                   | —                                      |
| platform / organization.read, suspend  | —                                      | —                                | —       | —                                                   | Explicit platform operation, fresh MFA |
| platform / user.read, disable          | —                                      | —                                | —       | —                                                   | Explicit platform operation, fresh MFA |
| platform / audit.read                  | —                                      | —                                | —       | —                                                   | Explicit platform operation, fresh MFA |

`member` has an empty organization bundle and no organization capabilities. A staff
assignment alone does not grant staff role; staff role without an active matching
assignment grants no store/booking access. Owners/managers can separately use the
customer path as authenticated users, but their organization bundle never grants
access to another customer's personal profile.

Persistence mapping: owner -> organization_owner, manager -> organization_manager,
staff -> staff, member -> member. These mappings are static data, not verified
membership loaders. Earlier proposed `admin` is renamed `manager`; no migration
ran. Platform grants are never membership roles. Manager/staff cannot assign roles.
Owner membership management excludes ownership transfer, last-owner removal,
self-elevation and platform-admin grants pending dedicated policies. Staff update
fields and booking transitions must be defined before enabling operations.

All permissions remain proposed. No wildcard `*`, role inheritance, cross-tenant
platform override, payment mutation/refund, customer-data export, or account
impersonation capability is defined.
