# Admin architecture

Owner: platform-security maintainers; individual owner pending.
Owns bounded administrative scope, request-bound operation contexts, independent
approval and prepared-audit evidence contracts. No context factory, policy engine,
admin handler, dashboard or unrestricted data gateway exists.

Other modules consume only public application types. Admin deliberately does not
import approval, reports, user-management, moderation, settings or audit-log modules;
future server composition supplies implementations of its consumer-owned ports.

See [centralized admin architecture](../../../docs/architecture/centralized-admin.md).
