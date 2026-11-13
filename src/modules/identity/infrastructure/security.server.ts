import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { sealData, unsealData } from "iron-session";
import { Secret, TOTP } from "otpauth";
import type { IdentitySecurity } from "../application/ports/runtime.server";

// One library-generated cost-12 dummy hash is shared across unknown-user attempts.
let dummyHash: Promise<string> | undefined;
export function createIdentitySecurity(secret: string): IdentitySecurity {
  return {
    hash: (password) => {
      if (password.length < 15 || Buffer.byteLength(password, "utf8") > 72)
        throw new Error("Invalid password length.");
      return hash(password, 12);
    },
    verify: async (password, encoded) => {
      if (Buffer.byteLength(password, "utf8") > 72) return false;
      try {
        return await compare(password, encoded);
      } catch {
        return false;
      }
    },
    dummyVerify: async (password) => {
      dummyHash ??= hash(randomBytes(32).toString("hex"), 12);
      await compare(password, await dummyHash);
    },
    token: () => randomBytes(32).toString("base64url"),
    digest: (value) => createHash("sha256").update(value).digest("hex"),
    limiterKey: (value) =>
      createHmac("sha256", secret).update(value).digest("hex"),
    seal: (value, purpose, ttl) =>
      sealData({ value, purpose }, { password: secret, ttl }),
    open: async (value, purpose, ttl) => {
      try {
        const data = await unsealData<{ value?: unknown; purpose?: unknown }>(
          value,
          { password: secret, ttl },
        );
        return data.purpose === purpose && typeof data.value === "string"
          ? data.value
          : null;
      } catch {
        return null;
      }
    },
    newTotp: (email) => {
      const secret = new Secret({ size: 20 });
      return {
        secret: secret.base32,
        uri: new TOTP({
          issuer: "VelvetBook",
          label: email,
          secret,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
        }).toString(),
      };
    },
    totpStep: (secret, token, now) => {
      const otp = new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });
      const delta = otp.validate({
        token,
        timestamp: now.getTime(),
        window: 1,
      });
      return delta === null ? null : Math.floor(now.getTime() / 30000) + delta;
    },
  };
}
