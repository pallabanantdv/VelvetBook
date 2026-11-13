import "server-only";
import { z } from "zod";

const optional = (value: unknown) => (value === "" ? undefined : value);
const integer = (fallback: number, maximum: number) =>
  z
    .preprocess(
      optional,
      z
        .string()
        .regex(/^[1-9]\d*$/)
        .default(String(fallback)),
    )
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum));

const schema = z.object({
  DATABASE_ENABLED: z.preprocess(
    optional,
    z.enum(["true", "false"]).default("false"),
  ),
  DATABASE_URL: z.preprocess(optional, z.string().optional()),
  NODE_ENV: z.preprocess(
    optional,
    z.enum(["development", "test", "production"]).default("development"),
  ),
  DATABASE_POOL_MAX: integer(10, 100),
  DATABASE_CONNECTION_TIMEOUT_MS: integer(5000, 60000),
  DATABASE_IDLE_TIMEOUT_MS: integer(30000, 300000),
  DATABASE_STATEMENT_TIMEOUT_MS: integer(15000, 300000),
  DATABASE_LOCK_TIMEOUT_MS: integer(5000, 60000),
  DATABASE_IDLE_TRANSACTION_TIMEOUT_MS: integer(15000, 300000),
  DATABASE_SSL_MODE: z.preprocess(
    optional,
    z.enum(["disable", "verify-full"]).optional(),
  ),
  DATABASE_SSL_CA: z.preprocess(optional, z.string().optional()),
});

/** Validate without leaking a URL, credentials, host, database name or Zod input. */
export function readDatabaseConfiguration(
  input: Readonly<Record<string, unknown>>,
) {
  const parsed = schema.safeParse(input);
  if (
    !parsed.success ||
    Object.keys(input).some(
      (key) =>
        /^NEXT_PUBLIC_(DATABASE_|MIGRATION_DATABASE_URL|TEST_DATABASE_URL)/.test(
          key,
        ) && input[key] !== undefined,
    )
  )
    throw new Error("Invalid database configuration.");
  const config = parsed.data;
  if (config.DATABASE_ENABLED !== "true")
    throw new Error("Database is disabled.");
  try {
    const url = new URL(config.DATABASE_URL ?? "");
    // Use explicit pg fields rather than a connectionString, which could override TLS.
    // Provider URL query options must be mapped to reviewed dedicated settings.
    if (
      !/^postgres(ql)?:$/.test(url.protocol) ||
      !url.hostname ||
      !url.username ||
      (url.port !== "" && (Number(url.port) < 1 || Number(url.port) > 65535)) ||
      !/^\/[^/]+$/.test(url.pathname) ||
      url.search ||
      url.hash
    )
      throw new Error();
    const sslMode =
      config.DATABASE_SSL_MODE ??
      (config.NODE_ENV === "production" ? "verify-full" : "disable");
    if (
      (config.NODE_ENV === "production" && sslMode === "disable") ||
      (sslMode === "disable" && config.DATABASE_SSL_CA)
    )
      throw new Error();
    return {
      host: url.hostname.replace(/^\[|\]$/g, ""),
      port: url.port ? Number(url.port) : 5432,
      database: decodeURIComponent(url.pathname.slice(1)),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl:
        sslMode === "disable"
          ? (false as const)
          : {
              rejectUnauthorized: true as const,
              ...(config.DATABASE_SSL_CA ? { ca: config.DATABASE_SSL_CA } : {}),
            },
      max: config.DATABASE_POOL_MAX,
      min: 0,
      connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
      statement_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
      query_timeout:
        config.DATABASE_STATEMENT_TIMEOUT_MS +
        config.DATABASE_CONNECTION_TIMEOUT_MS,
      lock_timeout: config.DATABASE_LOCK_TIMEOUT_MS,
      idle_in_transaction_session_timeout:
        config.DATABASE_IDLE_TRANSACTION_TIMEOUT_MS,
      application_name: "velvetbook",
      keepAlive: true,
    };
  } catch {
    throw new Error("Invalid database configuration.");
  }
}

export type DatabaseConfiguration = ReturnType<
  typeof readDatabaseConfiguration
>;
