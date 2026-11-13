# webhooks

Owner: integrations/security maintainers; individual owner pending.
Owns raw-byte signature verification, authoritative account mapping, replay/deduplication and durable inbox contracts. Signature verification is not tenant authorization. No route or event handler exists.

Public API: `application/public.ts`, types only. Domain contracts have no provider
or framework dependencies. Ports and infrastructure are server-only; sensitive
values must not enter client props, logs or domain events. No stub implementation
pretends to succeed. Future adapters require trusted operation/account context.

See [integration architecture and policies](../../../docs/architecture/external-integrations.md)
for idempotency, verification, retries, timeouts, failure, observability and storage gaps.
