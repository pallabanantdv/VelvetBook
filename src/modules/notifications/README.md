# notifications

Owner: integrations/security maintainers; individual owner pending.
Owns notification intent, recipient preferences, channel orchestration and delivery state. Email/SMS/push dispatch remain contracts; no queue, SDK or device connection exists.

Public API: `application/public.ts`, types only. Domain contracts have no provider
or framework dependencies. Ports and infrastructure are server-only; sensitive
values must not enter client props, logs or domain events. No stub implementation
pretends to succeed. Future adapters require trusted operation/account context.

See [integration architecture and policies](../../../docs/architecture/external-integrations.md)
for idempotency, verification, retries, timeouts, failure, observability and storage gaps.
