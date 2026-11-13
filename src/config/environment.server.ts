import "server-only";
import { z } from "zod";
import type { Result } from "@/core/results";

const blankAsUnset = (value: unknown) => (value === "" ? undefined : value);
const optionalSecret = z.preprocess(blankAsUnset, z.string().min(1).optional());
const booleanFlag = z
  .preprocess(blankAsUnset, z.enum(["true", "false"]).default("false"))
  .transform((value) => value === "true");
const integerSetting = (fallback: number, maximum: number) =>
  z
    .preprocess(
      blankAsUnset,
      z
        .string()
        .regex(/^[1-9]\d*$/)
        .default(String(fallback)),
    )
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum));
const credentialNames = [
  "DATABASE_URL",
  "PAYMENTS_PROVIDER_API_KEY",
  "PAYMENTS_PROVIDER_ACCOUNT_REF",
  "PAYMENTS_WEBHOOK_SIGNING_SECRET",
  "REFUNDS_PROVIDER_API_KEY",
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "MAPS_SERVER_API_KEY",
  "EMAIL_PROVIDER_API_KEY",
  "EMAIL_SENDER_PROFILE",
  "SMS_PROVIDER_API_KEY",
  "PUSH_SERVICE_CREDENTIALS",
  "EVENTS_BROKER_URL",
] as const;
const capabilityRequirements = {
  DATABASE_ENABLED: ["DATABASE_URL"],
  PAYMENTS_ENABLED: [
    "PAYMENTS_PROVIDER_API_KEY",
    "PAYMENTS_PROVIDER_ACCOUNT_REF",
    "PAYMENTS_WEBHOOK_SIGNING_SECRET",
    "WEBHOOK_REPLAY_WINDOW_SECONDS",
  ],
  STORAGE_ENABLED: [
    "STORAGE_ENDPOINT",
    "STORAGE_BUCKET",
    "STORAGE_ACCESS_KEY_ID",
    "STORAGE_SECRET_ACCESS_KEY",
  ],
  MAPS_ENABLED: ["MAPS_SERVER_API_KEY"],
  EMAIL_ENABLED: ["EMAIL_PROVIDER_API_KEY", "EMAIL_SENDER_PROFILE"],
  SMS_ENABLED: ["SMS_PROVIDER_API_KEY"],
  PUSH_ENABLED: ["PUSH_SERVICE_CREDENTIALS"],
  EVENTS_ENABLED: ["EVENTS_BROKER_URL"],
} as const;

const environmentSchema = z
  .object({
    NODE_ENV: z.preprocess(
      blankAsUnset,
      z.enum(["development", "test", "production"]).default("development"),
    ),
    LOG_LEVEL: z.preprocess(
      blankAsUnset,
      z
        .enum(["trace", "debug", "info", "warn", "error", "fatal"])
        .default("info"),
    ),
    REQUEST_TIMEOUT_MS: integerSetting(10000, 300000),
    PAGINATION_DEFAULT_LIMIT: integerSetting(25, 1000),
    PAGINATION_MAXIMUM_LIMIT: integerSetting(100, 1000),
    DATABASE_ENABLED: booleanFlag,
    PAYMENTS_ENABLED: booleanFlag,
    STORAGE_ENABLED: booleanFlag,
    MAPS_ENABLED: booleanFlag,
    EMAIL_ENABLED: booleanFlag,
    SMS_ENABLED: booleanFlag,
    PUSH_ENABLED: booleanFlag,
    EVENTS_ENABLED: booleanFlag,
    DATABASE_URL: z.preprocess(
      blankAsUnset,
      z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    ),
    PAYMENTS_PROVIDER_API_KEY: optionalSecret,
    PAYMENTS_PROVIDER_ACCOUNT_REF: optionalSecret,
    PAYMENTS_WEBHOOK_SIGNING_SECRET: optionalSecret,
    REFUNDS_PROVIDER_API_KEY: optionalSecret,
    STORAGE_ENDPOINT: z.preprocess(
      blankAsUnset,
      z.url({ protocol: /^https?$/ }).optional(),
    ),
    STORAGE_BUCKET: optionalSecret,
    STORAGE_ACCESS_KEY_ID: optionalSecret,
    STORAGE_SECRET_ACCESS_KEY: optionalSecret,
    MAPS_SERVER_API_KEY: optionalSecret,
    EMAIL_PROVIDER_API_KEY: optionalSecret,
    EMAIL_SENDER_PROFILE: optionalSecret,
    SMS_PROVIDER_API_KEY: optionalSecret,
    PUSH_SERVICE_CREDENTIALS: optionalSecret,
    WEBHOOK_REPLAY_WINDOW_SECONDS: z.preprocess(
      blankAsUnset,
      z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(3600))
        .optional(),
    ),
    EVENTS_BROKER_URL: z.preprocess(blankAsUnset, z.url().optional()),
  })
  .superRefine((config, context) => {
    if (config.PAGINATION_DEFAULT_LIMIT > config.PAGINATION_MAXIMUM_LIMIT) {
      context.addIssue({
        code: "custom",
        path: ["PAGINATION_DEFAULT_LIMIT"],
        message: "Invalid pagination configuration",
      });
    }
    for (const [flag, required] of Object.entries(capabilityRequirements)) {
      if (config[flag as keyof typeof capabilityRequirements]) {
        for (const key of required) {
          if (config[key] === undefined)
            context.addIssue({
              code: "custom",
              path: [key],
              message: "Incomplete capability configuration",
            });
        }
      }
    }
  });

export type ServerEnvironment = Readonly<z.infer<typeof environmentSchema>>;
export interface EnvironmentValidationError {
  readonly code: "invalid_environment";
  readonly issues: readonly {
    readonly key: string;
    readonly code:
      | "invalid_value"
      | "invalid_type"
      | "incomplete_configuration"
      | "public_secret";
  }[];
}
/** Explicit bootstrap input only: no process.env read, logging, connection or import-time validation. */
export function validateEnvironment(
  input: Readonly<Record<string, unknown>>,
): Result<ServerEnvironment, EnvironmentValidationError> {
  const publicIssues = credentialNames
    .filter((name) => input[`NEXT_PUBLIC_${name}`] !== undefined)
    .map((name) => ({
      key: `NEXT_PUBLIC_${name}`,
      code: "public_secret" as const,
    }));
  const parsed = environmentSchema.safeParse(input);
  if (parsed.success && publicIssues.length === 0)
    return { ok: true, value: parsed.data };
  return {
    ok: false,
    error: {
      code: "invalid_environment",
      issues: [
        ...publicIssues,
        ...(parsed.success
          ? []
          : parsed.error.issues.map((issue) => ({
              key: String(issue.path[0] ?? "configuration"),
              code:
                issue.code === "custom"
                  ? ("incomplete_configuration" as const)
                  : issue.code === "invalid_type"
                    ? ("invalid_type" as const)
                    : ("invalid_value" as const),
            }))),
      ],
    },
  };
}
