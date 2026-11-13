import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseClient } from "@/db/client.server";
import type { IdentitySecurity } from "@/modules/identity/application/ports/runtime.server";

/** Implement with a selected transactional email provider; do not log this payload. */
export interface PasswordResetDelivery {
  send(input: {
    email: string;
    resetUrl: string;
    idempotencyKey: string;
  }): Promise<void>;
}

/** Internal worker entry point. No provider is selected or invoked by default. */
export async function deliverPasswordResets(
  db: DatabaseClient["db"],
  security: IdentitySecurity,
  origin: string,
  provider: PasswordResetDelivery,
  maximum = 10,
) {
  if (maximum < 1 || maximum > 100 || !Number.isInteger(maximum))
    throw new Error("Invalid delivery batch size.");
  let sent = 0;
  for (let index = 0; index < maximum; index += 1) {
    const claimed = await db.execute(sql`WITH candidate AS (
      SELECT d.id FROM auth_reset_deliveries d JOIN auth_password_resets r ON r.id=d.reset_id
      WHERE d.delivered_at IS NULL AND d.attempts < 5 AND (d.lease_until IS NULL OR d.lease_until < now())
        AND r.consumed_at IS NULL AND r.expires_at > now()
      ORDER BY d.created_at FOR UPDATE OF d SKIP LOCKED LIMIT 1)
      UPDATE auth_reset_deliveries d SET lease_until=now()+interval '5 minutes', attempts=attempts+1, updated_at=now()
      FROM candidate WHERE d.id=candidate.id RETURNING d.id,d.reset_id,d.sealed_proof`);
    const row = claimed.rows[0];
    if (!row) break;
    const target =
      await db.execute(sql`SELECT u.email, r.token_hash FROM auth_password_resets r JOIN users u ON u.id=r.user_id
      WHERE r.id=${String(row.reset_id)} AND r.consumed_at IS NULL AND r.expires_at > now() AND u.disabled_at IS NULL`);
    const proof = await security.open(String(row.sealed_proof), "reset", 900);
    if (
      !proof ||
      !target.rows[0] ||
      security.digest(proof) !== target.rows[0].token_hash
    )
      continue;
    try {
      await provider.send({
        email: String(target.rows[0].email),
        resetUrl: `${origin}/reset-password#token=${encodeURIComponent(proof)}`,
        idempotencyKey: String(row.id),
      });
      await db.execute(
        sql`UPDATE auth_reset_deliveries SET delivered_at=now(), updated_at=now() WHERE id=${String(row.id)}`,
      );
      sent += 1;
    } catch {
      // Lease expires before bounded retry; ambiguous sends use the same provider key.
      // Raw provider exceptions and reset URLs are never logged or returned.
    }
  }
  return { sent };
}
