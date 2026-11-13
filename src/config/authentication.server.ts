import "server-only";
import { z } from "zod";

export function readAuthenticationConfiguration(
  input: Readonly<Record<string, unknown>>,
) {
  const parsed = z
    .object({
      AUTH_ORIGIN: z.url(),
      AUTH_SECRET: z.string().min(64).max(512),
      NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    })
    .safeParse(input);
  if (
    !parsed.success ||
    Object.keys(input).some(
      (key) => key.startsWith("NEXT_PUBLIC_AUTH_") && input[key] !== undefined,
    )
  )
    throw new Error("Invalid authentication configuration.");
  const url = new URL(parsed.data.AUTH_ORIGIN);
  if (
    url.origin !== parsed.data.AUTH_ORIGIN ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        parsed.data.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("Invalid authentication configuration.");
  return {
    origin: url.origin,
    secret: parsed.data.AUTH_SECRET,
    secure: url.protocol === "https:",
    cookieName:
      url.protocol === "https:"
        ? "__Host-velvetbook_session"
        : "velvetbook_session",
    sessionSeconds: 8 * 60 * 60,
    resetSeconds: 15 * 60,
  };
}
export type AuthenticationConfiguration = ReturnType<
  typeof readAuthenticationConfiguration
>;
