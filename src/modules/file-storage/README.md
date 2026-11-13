# file-storage

Owner: integrations/security maintainers; individual owner pending.
Owns private asset references, constrained transfer intents and inspection contracts. Business photos/documents are modeled; no upload handler, URL signer, scanning implementation or provider exists.

Public API: `application/public.ts`, types only. Domain contracts have no provider
or framework dependencies. Ports and infrastructure are server-only; sensitive
values must not enter client props, logs or domain events. No stub implementation
pretends to succeed. Future adapters require trusted operation/account context.

See [integration architecture and policies](../../../docs/architecture/external-integrations.md)
for idempotency, verification, retries, timeouts, failure, observability and storage gaps.
